from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import leave_service as svc

leave_bp = Blueprint("leaves", __name__)


# ============================================
# Shared
# ============================================

@leave_bp.route("/types", methods=["GET"])
@token_required
def list_types():
    return jsonify(svc.list_leave_types()), 200


@leave_bp.route("/financial-year", methods=["GET"])
@token_required
def financial_year():
    """Get current financial year info."""
    start, end, label = svc.get_financial_year()
    return jsonify({
        "label": label,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }), 200


# ============================================
# Employee
# ============================================

@leave_bp.route("", methods=["POST"])
@token_required
def apply():
    employee_id = request.user.get("employee_id")
    if not employee_id:
        return jsonify({"error": "Employee ID not found"}), 400

    data = request.get_json() or {}
    try:
        leave_id = svc.apply_leave(employee_id, data)
        return jsonify({
            "leave_id": leave_id,
            "message": "Leave request submitted"
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@leave_bp.route("/my", methods=["GET"])
@token_required
def my_leaves():
    employee_id = request.user.get("employee_id")
    return jsonify(svc.my_leaves(employee_id)), 200


@leave_bp.route("/my/stats", methods=["GET"])
@token_required
def my_stats():
    employee_id = request.user.get("employee_id")
    return jsonify(svc.my_leave_stats(employee_id)), 200


@leave_bp.route("/<leave_id>/cancel", methods=["POST"])
@token_required
def cancel(leave_id):
    employee_id = request.user.get("employee_id")
    mods = svc.cancel_leave(employee_id, leave_id)
    if mods == 0:
        return jsonify({"error": "Cannot cancel this leave"}), 400
    return jsonify({"message": "Leave cancelled"}), 200


# ============================================
# Manager
# ============================================

@leave_bp.route("/all", methods=["GET"])
@token_required
@role_required("MANAGER")
def all_leaves():
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_all_leaves(status or None, search or None)), 200


@leave_bp.route("/<leave_id>/review", methods=["POST"])
@token_required
@role_required("MANAGER")
def review(leave_id):
    manager_id = request.user.get("employee_id")
    data = request.get_json() or {}
    action = data.get("action")
    comment = data.get("comment", "")

    try:
        svc.review_leave(leave_id, manager_id, action, comment)
        return jsonify({"message": f"Leave {action.lower()}"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@leave_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.leave_stats()), 200


@leave_bp.route("/pending-reminders", methods=["GET"])
@token_required
@role_required("MANAGER")
def pending_reminders():
    """Leaves starting tomorrow — for reminder scheduler."""
    return jsonify(svc.get_pending_reminders()), 200