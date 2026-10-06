from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import forgot_logout_service as svc

forgot_logout_bp = Blueprint("forgot_logout", __name__)


@forgot_logout_bp.route("/eligibility", methods=["GET"])
@token_required
def eligibility():
    emp_id = request.user.get("employee_id")
    if not emp_id:
        return jsonify({"error": "Employee ID not found"}), 400
    return jsonify(svc.check_in_eligibility(emp_id)), 200


@forgot_logout_bp.route("/send", methods=["POST"])
@token_required
def send():
    emp_id = request.user.get("employee_id")
    data = request.get_json() or {}
    try:
        req_id = svc.send_request(emp_id, data)
        return jsonify({
            "request_id": req_id,
            "message": "Request sent to manager"
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@forgot_logout_bp.route("/my", methods=["GET"])
@token_required
def my_requests():
    emp_id = request.user.get("employee_id")
    return jsonify(svc.my_requests(emp_id)), 200


@forgot_logout_bp.route("/my-usage", methods=["GET"])
@token_required
def my_usage():
    emp_id = request.user.get("employee_id")
    return jsonify(svc.calculate_fine(emp_id)), 200


@forgot_logout_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_all():
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_requests(status or None, search or None)), 200


@forgot_logout_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.stats()), 200


@forgot_logout_bp.route("/<req_id>/review", methods=["POST"])
@token_required
@role_required("MANAGER")
def review(req_id):
    data = request.get_json() or {}
    action = data.get("action")
    comment = data.get("comment", "")
    mgr_emp_id = request.user.get("employee_id")

    try:
        svc.review_request(req_id, mgr_emp_id, action, comment)
        return jsonify({"message": f"Request {action.lower()}d"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500