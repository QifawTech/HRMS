# from flask import Blueprint, request, jsonify
# from app.middleware.auth_middleware import token_required, role_required
# from app.services import attendance_service as svc

# attendance_bp = Blueprint("attendance", __name__)


# # ============================================
# # Employee routes
# # ============================================

# @attendance_bp.route("/today", methods=["GET"])
# @token_required
# def today_status():
#     employee_id = request.user.get("employee_id")
#     if not employee_id:
#         return jsonify({"error": "Employee ID not found"}), 400
#     return jsonify(svc.get_today_status(employee_id)), 200


# @attendance_bp.route("/check-in", methods=["POST"])
# @token_required
# def check_in():
#     employee_id = request.user.get("employee_id")
#     if not employee_id:
#         return jsonify({"error": "Employee ID not found"}), 400
#     try:
#         record_id = svc.check_in(employee_id)
#         return jsonify({"message": "Checked in successfully", "record_id": record_id}), 201
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 400
#     except Exception as e:
#         return jsonify({"error": f"Failed: {str(e)}"}), 500


# @attendance_bp.route("/check-out", methods=["POST"])
# @token_required
# def check_out():
#     employee_id = request.user.get("employee_id")
#     if not employee_id:
#         return jsonify({"error": "Employee ID not found"}), 400

#     data = request.get_json() or {}
#     early_reason = data.get("early_reason")

#     try:
#         result = svc.check_out(employee_id, early_reason)
#         return jsonify({
#             "message": "Checked out successfully",
#             **result,
#         }), 200
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 400
#     except Exception as e:
#         return jsonify({"error": f"Failed: {str(e)}"}), 500

from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import attendance_service as svc

attendance_bp = Blueprint("attendance", __name__)


# ============================================
# Employee routes
# ============================================

@attendance_bp.route("/today", methods=["GET"])
@token_required
def today_status():
    employee_id = request.user.get("employee_id")
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400
    return jsonify(svc.get_today_status(employee_id)), 200


@attendance_bp.route("/check-in", methods=["POST"])
@token_required
def check_in():
    employee_id = request.user.get("employee_id")
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400
    
    data = request.get_json() or {}
    is_second_shift = data.get("is_second_shift", False)  # ✅ New
    
    try:
        # Service ku is_second_shift ah pass pandrom
        result = svc.check_in(employee_id, is_second_shift=is_second_shift)
        return jsonify({"message": "Checked in successfully", **result}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@attendance_bp.route("/check-out", methods=["POST"])
@token_required
def check_out():
    employee_id = request.user.get("employee_id")
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400

    data = request.get_json() or {}
    early_reason = data.get("early_reason")
    is_second_shift = data.get("is_second_shift", False) # ✅ New

    try:
        result = svc.check_out(employee_id, early_reason, is_second_shift=is_second_shift)
        return jsonify({
            "message": "Checked out successfully",
            **result,
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500

@attendance_bp.route("/my-history", methods=["GET"])
@token_required
def my_history():
    employee_id = request.user.get("employee_id")
    days = int(request.args.get("days", 30))
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400
    return jsonify(svc.get_employee_attendance(employee_id, days)), 200


# ============================================
# Manager routes
# ============================================

@attendance_bp.route("/all", methods=["GET"])
@token_required
@role_required("MANAGER")
def all_attendance():
    target_date = request.args.get("date", "").strip()
    dept_id = request.args.get("department_id", "").strip()
    search = request.args.get("search", "").strip()

    return jsonify(svc.get_attendance_by_date(
        target_date or None,
        dept_id or None,
        search or None,
    )), 200


@attendance_bp.route("/recent", methods=["GET"])
@token_required
@role_required("MANAGER")
def recent_days():
    days = int(request.args.get("days", 3))
    dept_id = request.args.get("department_id", "").strip()
    return jsonify(svc.get_recent_days(days, dept_id or None)), 200

@attendance_bp.route("/my-monthly", methods=["GET"])
@token_required
def my_monthly():
    """Employee: Get own monthly attendance report."""
    employee_id = request.user.get("employee_id")
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400

    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)

    return jsonify(svc.get_employee_monthly_report(employee_id, year, month)), 200


@attendance_bp.route("/employee/<emp_id>/monthly", methods=["GET"])
@token_required
@role_required("MANAGER")
def employee_monthly(emp_id):
    """Manager: Get any employee's monthly report."""
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)

    data = svc.get_employee_monthly_report(emp_id, year, month)
    if not data:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify(data), 200