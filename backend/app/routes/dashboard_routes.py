from datetime import date
from flask import Blueprint, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.db import (
    employees,
    departments,
    leave_requests,
    attendance,
    attendance as att_collection,
)

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/manager-stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def manager_stats():
    """Get dashboard stats for manager."""
    today = date.today().isoformat()

    total_employees = employees().count_documents({"status": "ACTIVE"})

    present_today = attendance().count_documents({
        "date": today,
        "check_in": {"$ne": None},
    })

    pending_leaves = leave_requests().count_documents({"status": "Pending"})

    total_departments = departments().count_documents({"is_active": True})

    # Additional: working now (checked-in, not checked-out)
    working_now = attendance().count_documents({
        "date": today,
        "check_in": {"$ne": None},
        "check_out": None,
    })

    return jsonify({
        "total_employees": total_employees,
        "present_today": present_today,
        "working_now": working_now,
        "pending_leaves": pending_leaves,
        "total_departments": total_departments,
    }), 200


@dashboard_bp.route("/employee-stats", methods=["GET"])
@token_required
def employee_stats():
    """Employee dashboard quick stats."""
    from flask import request

    employee_id = request.user.get("employee_id")
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400

    from bson import ObjectId

    try:
        emp_oid = ObjectId(employee_id)
    except Exception:
        return jsonify({"error": "Invalid employee ID"}), 400

    today = date.today().isoformat()

    today_att = attendance().find_one({
        "employee_id": emp_oid,
        "date": today,
    })

    my_pending_leaves = leave_requests().count_documents({
        "employee_id": emp_oid,
        "status": "Pending",
    })

    my_approved_leaves = leave_requests().count_documents({
        "employee_id": emp_oid,
        "status": "Approved",
    })

    return jsonify({
        "today_check_in": today_att.get("check_in") if today_att else None,
        "today_check_out": today_att.get("check_out") if today_att else None,
        "today_status": today_att.get("status") if today_att else "NOT_MARKED",
        "my_pending_leaves": my_pending_leaves,
        "my_approved_leaves": my_approved_leaves,
    }), 200