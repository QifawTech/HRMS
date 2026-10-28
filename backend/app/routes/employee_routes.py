from flask import Blueprint, request, jsonify, Response
from app.middleware.auth_middleware import token_required, role_required
from app.services import employee_service as svc
from app.services.professional_tax_service import calculate_professional_tax
from app.utils.file_handler import save_profile_picture
from app.services.employee_service import confirm_employee
from app.utils.time_utils import now_ist

import base64


employee_bp = Blueprint("employees", __name__)


# ============================================
# MANAGER — LIST / GET
# ============================================

@employee_bp.route("", methods=["GET"])
@token_required
# @role_required("MANAGER")
def list_employees():
    search = request.args.get("search", "").strip()
    dept_id = request.args.get("department_id", "").strip()
    status = request.args.get("status", "").strip()
    employment_type = request.args.get("employment_type", "").strip()
    page = request.args.get("page", type=int)
    limit = request.args.get("limit", type=int)

    return jsonify(svc.list_employees(
        search or None,
        dept_id or None,
        status or None,
        employment_type or None,
        page=page,
        limit=limit,
    )), 200


@employee_bp.route("/next-code", methods=["GET"])
@token_required
@role_required("MANAGER")
def next_code():
    return jsonify({"employee_code": svc.generate_employee_code()}), 200


# ============================================
# Professional Tax Auto-Calculation
# ============================================

@employee_bp.route("/calculate-pt", methods=["POST"])
@token_required
@role_required("MANAGER")
def calculate_pt():
    data = request.get_json() or {}
    monthly_salary = data.get("monthly_salary", 0)
    try:
        monthly_salary = float(monthly_salary)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid monthly_salary"}), 400
    if monthly_salary < 0:
        return jsonify({"error": "Salary cannot be negative"}), 400
    result = calculate_professional_tax(monthly_salary)
    return jsonify(result), 200


# ============================================
# CREATE
# ============================================

@employee_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_employee():
    data = request.get_json() or {}
    try:
        emp_id = svc.create_employee(data)
        return jsonify({
            "employee_id": emp_id,
            "message": "Employee created successfully"
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed to create: {str(e)}"}), 500


# ============================================
# GET / UPDATE
# ============================================

@employee_bp.route("/<emp_id>", methods=["GET"])
@token_required
@role_required("MANAGER")
def get_employee(emp_id):
    emp = svc.get_employee(emp_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify(emp), 200


@employee_bp.route("/<emp_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_employee(emp_id):
    data = request.get_json() or {}
    try:
        mods = svc.update_employee(emp_id, data)
        if mods == 0:
            return jsonify({"error": "Not found or no changes"}), 404
        return jsonify({"message": "Employee updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# DEACTIVATE
# ============================================

@employee_bp.route("/<emp_id>/deactivate", methods=["POST"])
@token_required
@role_required("MANAGER")
def deactivate_employee(emp_id):
    data = request.get_json(silent=True) or {}
    manager_id = request.user.get("employee_id")

    mods = svc.deactivate_employee(
        emp_id,
        reason=data.get("reason"),
        resignation_date=data.get("resignation_date"),
        manager_id=manager_id,
    )
    if mods == 0:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify({"message": "Employee deactivated"}), 200


# ============================================
# PERMANENT DELETE
# ============================================

@employee_bp.route("/<emp_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_employee(emp_id):
    import traceback
    try:
        result = svc.permanent_delete_employee(emp_id)
        return jsonify({
            "message": "Employee permanently deleted",
            **result,
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@employee_bp.route("/<emp_id>/reactivate", methods=["POST"])
@token_required
@role_required("MANAGER")
def reactivate_employee(emp_id):
    mods = svc.reactivate_employee(emp_id)
    if mods == 0:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify({"message": "Employee reactivated"}), 200


# ============================================
# TERMINATE EMPLOYEE
# ============================================

@employee_bp.route("/<emp_id>/terminate", methods=["POST"])
@token_required
@role_required("MANAGER")
def terminate_employee(emp_id):
    data = request.get_json() or {}
    manager_id = request.user.get("employee_id")
    try:
        mods = svc.terminate_employee(
            emp_id,
            terminate_date=data.get("terminate_date"),
            reason=data.get("reason"),
            manager_id=manager_id,
        )
        if mods == 0:
            return jsonify({"error": "Employee not found"}), 404
        return jsonify({"message": "Employee terminated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# CONFIRM INTERN → PERMANENT
# ============================================

@employee_bp.route("/<emp_id>/confirm", methods=["POST"])
@token_required
@role_required("MANAGER")
def confirm_employee_route(emp_id):
    try:
        data = request.get_json() or {}
        result = confirm_employee(emp_id, data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed to confirm: {str(e)}"}), 500


# ============================================
# EMPLOYEE PROFILE (Self-service)
# ============================================

@employee_bp.route("/me", methods=["GET"])
@token_required
def get_my_profile():
    emp_id = request.user.get("employee_id")
    profile = svc.get_my_profile(emp_id)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(profile), 200


@employee_bp.route("/me/profile-picture", methods=["POST"])
@token_required
def upload_profile_picture():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    emp_id = request.user.get("employee_id")
    try:
        meta = save_profile_picture(file)
        url = svc.update_profile_picture(emp_id, meta)
        return jsonify({
            "picture_url": url,
            "message": "Profile picture updated",
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@employee_bp.route("/me/profile", methods=["PUT"])
@token_required
def update_my_profile():
    data = request.get_json() or {}
    emp_id = request.user.get("employee_id")

    allowed = {}
    if "phone" in data:
        allowed["phone"] = (data["phone"] or "").strip() or None
    if "address" in data:
        allowed["address"] = (data["address"] or "").strip() or None

    if not allowed:
        return jsonify({"error": "No permitted fields to update"}), 422

    from app.db import employees
    from bson import ObjectId

    try:
        oid = ObjectId(emp_id)
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    allowed["updated_at"] = now_ist()
    employees().update_one({"_id": oid}, {"$set": allowed})
    return jsonify({"message": "Profile updated"}), 200


# ============================================
# PROFILE PICTURE — Serve from MongoDB
# ============================================

@employee_bp.route("/<emp_id>/picture", methods=["GET"])
def get_profile_picture(emp_id):
    from app.db import employees as emp_coll
    from bson import ObjectId

    try:
        oid = ObjectId(emp_id)
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    emp = emp_coll().find_one({"_id": oid})
    if not emp:
        return jsonify({"error": "Employee not found"}), 404

    pic_data = emp.get("profile_picture_data")
    mime = emp.get("profile_picture_mime", "image/jpeg")

    if not pic_data:
        return jsonify({"error": "No picture"}), 404

    try:
        decoded = base64.b64decode(pic_data)
    except Exception:
        return jsonify({"error": "Invalid image data"}), 500

    return Response(
        decoded,
        mimetype=mime,
        headers={"Cache-Control": "public, max-age=86400"},
    )