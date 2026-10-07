from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import report_service as svc

report_bp = Blueprint("reports", __name__)


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