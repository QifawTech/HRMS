from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import report_service as svc
from datetime import datetime
from app.utils.time_utils import now_ist


# ✅ STEP 1: Blueprint FIRST (top la)
report_bp = Blueprint("reports", __name__)


# ============================================
# EXISTING ROUTES
# ============================================

@report_bp.route("/summary", methods=["GET"])
@token_required
@role_required("MANAGER")
def summary():
    return jsonify(svc.summary_stats()), 200


@report_bp.route("/employees", methods=["GET"])
@token_required
@role_required("MANAGER")
def employees_report():
    filters = {
        "department_id": request.args.get("department_id", "").strip(),
        "status": request.args.get("status", "").strip(),
        "search": request.args.get("search", "").strip(),
    }
    return jsonify(svc.employee_report(filters)), 200


@report_bp.route("/attendance", methods=["GET"])
@token_required
@role_required("MANAGER")
def attendance_report():
    filters = {
        "start_date": request.args.get("start_date", "").strip(),
        "end_date": request.args.get("end_date", "").strip(),
        "department_id": request.args.get("department_id", "").strip(),
        "employee_id": request.args.get("employee_id", "").strip(),
        "status": request.args.get("status", "").strip(),
    }
    return jsonify(svc.attendance_report(filters)), 200


@report_bp.route("/leaves", methods=["GET"])
@token_required
@role_required("MANAGER")
def leaves_report():
    filters = {
        "start_date": request.args.get("start_date", "").strip(),
        "end_date": request.args.get("end_date", "").strip(),
        "department_id": request.args.get("department_id", "").strip(),
        "employee_id": request.args.get("employee_id", "").strip(),
        "status": request.args.get("status", "").strip(),
        "leave_type_id": request.args.get("leave_type_id", "").strip(),
    }
    return jsonify(svc.leave_report(filters)), 200


@report_bp.route("/departments", methods=["GET"])
@token_required
@role_required("MANAGER")
def departments_report():
    return jsonify(svc.department_report()), 200


@report_bp.route("/employee/<emp_id>/full", methods=["GET"])
@token_required
@role_required("MANAGER")
def employee_full_report(emp_id):
    data = svc.employee_full_report(emp_id)
    if not data:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify(data), 200


# ============================================
# ✅ NEW: MONTHLY SUMMARY (bottom la — blueprint ku apuram)
# ============================================

@report_bp.route("/monthly-summary", methods=["GET"])
@token_required
@role_required("MANAGER")
def monthly_summary():
    """
    GET /api/reports/monthly-summary?year=2026&month=10
    """
    try:
        year = int(request.args.get("year", now_ist().year))
        month = int(request.args.get("month", now_ist().month))

        from app.services.report_service import get_monthly_working_summary
        data = get_monthly_working_summary(year, month)
        return jsonify(data), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500