from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import resignation_service as svc

resignation_bp = Blueprint("resignations", __name__)


# ============================================
# EMPLOYEE
# ============================================

@resignation_bp.route("/my", methods=["GET"])
@token_required
def my_resignation():
    employee_id = request.user.get("employee_id")
    return jsonify(svc.my_resignation(employee_id) or {}), 200


@resignation_bp.route("/apply", methods=["POST"])
@token_required
def apply():
    employee_id = request.user.get("employee_id")
    data = request.get_json() or {}
    try:
        svc.apply_resignation(employee_id, data)
        return jsonify({"message": "Resignation application submitted"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@resignation_bp.route("/cancel", methods=["POST"])
@token_required
def cancel():
    employee_id = request.user.get("employee_id")
    try:
        svc.cancel_resignation(employee_id)
        return jsonify({"message": "Resignation cancelled"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# MANAGER
# ============================================

@resignation_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_all():
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_resignations(
        status or None,
        search or None,
    )), 200


@resignation_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.stats()), 200


@resignation_bp.route("/<emp_id>/review", methods=["POST"])
@token_required
@role_required("MANAGER")
def review(emp_id):
    data = request.get_json() or {}
    action = data.get("action")
    comment = data.get("comment", "")
    notice_end = data.get("notice_end")

    mgr_emp_id = request.user.get("employee_id")

    try:
        svc.review_resignation(emp_id, mgr_emp_id, action, comment, notice_end)
        return jsonify({"message": f"Resignation {action.lower()}ed"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# EDIT NOTICE (Last Working Day)
# ============================================

@resignation_bp.route("/<emp_id>/edit-notice", methods=["PUT"])
@token_required
@role_required("MANAGER")
def edit_notice(emp_id):
    """Manager updates last working day after accepting resignation."""
    data = request.get_json() or {}
    new_last_day = data.get("last_working_day")
    reason = data.get("reason", "")

    if not new_last_day:
        return jsonify({"error": "last_working_day is required"}), 422

    mgr_emp_id = request.user.get("employee_id")

    try:
        svc.edit_resignation_notice(
            emp_id, mgr_emp_id, new_last_day, reason
        )
        return jsonify({"message": "Last working day updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@resignation_bp.route("/<emp_id>/complete", methods=["POST"])
@token_required
@role_required("MANAGER")
def complete(emp_id):
    mgr_emp_id = request.user.get("employee_id")
    try:
        svc.complete_resignation(emp_id, mgr_emp_id)
        return jsonify({"message": "Resignation completed"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400