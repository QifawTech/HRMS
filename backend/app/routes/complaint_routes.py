from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import complaint_service as svc

complaint_bp = Blueprint("complaints", __name__)


# ============================================
# EMPLOYEE: create + list mine
# ============================================

@complaint_bp.route("", methods=["POST"])
@token_required
def create_complaint():
    try:
        emp_id = request.user.get("employee_id")
        data = request.get_json() or {}
        return jsonify(svc.create_complaint(emp_id, data)), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@complaint_bp.route("/my", methods=["GET"])
@token_required
def my_complaints():
    emp_id = request.user.get("employee_id")
    status = request.args.get("status", "").strip()
    return jsonify(svc.list_my_complaints(emp_id, status or None)), 200


# ============================================
# MANAGER: list all + stats
# ============================================

@complaint_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.stats()), 200


@complaint_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_all():
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    category = request.args.get("category", "").strip()
    return jsonify(
        svc.list_all_complaints(search or None, status or None, category or None)
    ), 200


# ============================================
# GET single
# ============================================

@complaint_bp.route("/<complaint_id>", methods=["GET"])
@token_required
def get_one(complaint_id):
    c = svc.get_complaint(complaint_id)
    if not c:
        return jsonify({"error": "Not found"}), 404

    # Employees can only see own
    if request.user.get("role") != "MANAGER":
        if c["employee_id"] != request.user.get("employee_id"):
            return jsonify({"error": "Forbidden"}), 403

    return jsonify(c), 200


# ============================================
# MANAGER: update status
# ============================================

@complaint_bp.route("/<complaint_id>/status", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_status(complaint_id):
    try:
        data = request.get_json() or {}
        data["manager_id"] = request.user.get("employee_id")
        return jsonify(svc.update_status(complaint_id, data)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# DELETE (manager only)
# ============================================

@complaint_bp.route("/<complaint_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_complaint(complaint_id):
    try:
        return jsonify(svc.delete_complaint(complaint_id)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500