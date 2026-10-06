# from flask import Blueprint, request, jsonify
# from app.middleware.auth_middleware import token_required, role_required
# from app.services import payroll_service as svc

# payroll_bp = Blueprint("payroll", __name__)


# # ============================================
# # Manager
# # ============================================

# @payroll_bp.route("", methods=["GET"])
# @token_required
# @role_required("MANAGER")
# def list_payrolls():
#     month = request.args.get("month", "").strip()
#     emp_id = request.args.get("employee_id", "").strip()
#     search = request.args.get("search", "").strip()
#     status = request.args.get("status", "").strip()
#     return jsonify(svc.list_payrolls(
#         month or None, emp_id or None, search or None, status or None
#     )), 200


# @payroll_bp.route("/stats", methods=["GET"])
# @token_required
# @role_required("MANAGER")
# def stats():
#     month = request.args.get("month", "").strip()
#     return jsonify(svc.stats(month or None)), 200


# @payroll_bp.route("/company-info", methods=["GET"])
# @token_required
# def company_info():
#     return jsonify(svc.get_company_info()), 200


# @payroll_bp.route("/generate", methods=["POST"])
# @token_required
# @role_required("MANAGER")
# def generate():
#     data = request.get_json() or {}
#     emp_id = data.get("employee_id")
#     month = data.get("month")

#     if not emp_id:
#         return jsonify({"error": "Employee is required"}), 422
#     if not month:
#         return jsonify({"error": "Month is required"}), 422

#     try:
#         payroll_id = svc.generate_payroll(
#             emp_id, month, data, request.user.get("user_id")
#         )
#         return jsonify({
#             "payroll_id": payroll_id,
#             "message": "Payslip generated",
#         }), 201
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 422
#     except Exception as e:
#         return jsonify({"error": f"Failed: {str(e)}"}), 500


# @payroll_bp.route("/<payroll_id>", methods=["GET"])
# @token_required
# def get_payroll(payroll_id):
#     p = svc.get_payroll(payroll_id)
#     if not p:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify(p), 200


# @payroll_bp.route("/<payroll_id>/mark-paid", methods=["POST"])
# @token_required
# @role_required("MANAGER")
# def mark_paid(payroll_id):
#     mods = svc.mark_paid(payroll_id)
#     if mods == 0:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify({"message": "Marked as paid"}), 200


# @payroll_bp.route("/<payroll_id>", methods=["DELETE"])
# @token_required
# @role_required("MANAGER")
# def delete_payroll(payroll_id):
#     count = svc.delete_payroll(payroll_id)
#     if count == 0:
#         return jsonify({"error": "Not found"}), 404
#     return jsonify({"message": "Deleted"}), 200


# # ============================================
# # Employee
# # ============================================

# @payroll_bp.route("/my", methods=["GET"])
# @token_required
# def my_payslips():
#     emp_id = request.user.get("employee_id")
#     return jsonify(svc.my_payslips(emp_id)), 200


from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import payroll_service as svc

payroll_bp = Blueprint("payroll", __name__)


# ============================================
# Manager
# ============================================

@payroll_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_payrolls():
    month = request.args.get("month", "").strip()
    emp_id = request.args.get("employee_id", "").strip()
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    return jsonify(svc.list_payrolls(
        month or None, emp_id or None, search or None, status or None
    )), 200


@payroll_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    month = request.args.get("month", "").strip()
    return jsonify(svc.stats(month or None)), 200


@payroll_bp.route("/company-info", methods=["GET"])
@token_required
def company_info():
    return jsonify(svc.get_company_info()), 200


@payroll_bp.route("/generate", methods=["POST"])
@token_required
@role_required("MANAGER")
def generate():
    data = request.get_json() or {}
    emp_id = data.get("employee_id")
    month = data.get("month")

    if not emp_id:
        return jsonify({"error": "Employee is required"}), 422
    if not month:
        return jsonify({"error": "Month is required"}), 422

    # ============================================
    # FIX: Manager/Employee related fields mattum extract pannunga.
    # Frontend la irundhu 'pt_amount' vandha, adha IGNORE pannunga.
    # Professional Tax ellame employee.salary la irundhu mattum edukka vendum.
    # ============================================
    overrides = {
        "paid_days": data.get("paid_days", 30),
        "lop_days": data.get("lop_days", 0),
        "basic": data.get("basic"),
        "hra": data.get("hra"),
        "special_allowance": data.get("special_allowance"),
        "pf_applicable": data.get("pf_applicable"),
        "esi_applicable": data.get("esi_applicable"),
        "pt_applicable": data.get("pt_applicable"),
        "tds_applicable": data.get("tds_applicable"),
        "pf_percent": data.get("pf_percent"),
        "esi_percent": data.get("esi_percent"),
        "tds_amount": data.get("tds_amount"),
        "other_deduction": data.get("other_deduction", 0),
        "remarks": data.get("remarks"),
    }
    # None values ah remove pannunga (fallback to employee salary)
    overrides = {k: v for k, v in overrides.items() if v is not None}

    try:
        payroll_id = svc.generate_payroll(
            emp_id, month, overrides, request.user.get("user_id")
        )
        return jsonify({
            "payroll_id": payroll_id,
            "message": "Payslip generated",
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@payroll_bp.route("/<payroll_id>", methods=["GET"])
@token_required
def get_payroll(payroll_id):
    p = svc.get_payroll(payroll_id)
    if not p:
        return jsonify({"error": "Not found"}), 404
    return jsonify(p), 200


@payroll_bp.route("/<payroll_id>/mark-paid", methods=["POST"])
@token_required
@role_required("MANAGER")
def mark_paid(payroll_id):
    mods = svc.mark_paid(payroll_id)
    if mods == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Marked as paid"}), 200


@payroll_bp.route("/<payroll_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_payroll(payroll_id):
    count = svc.delete_payroll(payroll_id)
    if count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Deleted"}), 200


# ============================================
# Employee
# ============================================

@payroll_bp.route("/my", methods=["GET"])
@token_required
def my_payslips():
    emp_id = request.user.get("employee_id")
    return jsonify(svc.my_payslips(emp_id)), 200