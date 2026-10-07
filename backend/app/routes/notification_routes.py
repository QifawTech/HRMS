from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required
from app.services import notification_service as svc

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("", methods=["GET"])
@token_required
def list_my():
    employee_id = request.user.get("employee_id")
    unread_only = request.args.get("unread_only", "false").lower() == "true"
    return jsonify(svc.list_my_notifications(employee_id, unread_only)), 200


@notification_bp.route("/unread-count", methods=["GET"])
@token_required
def unread_count():
    employee_id = request.user.get("employee_id")
    return jsonify({"count": svc.unread_count(employee_id)}), 200


@notification_bp.route("/<notif_id>/read", methods=["POST"])
@token_required
def mark_read(notif_id):
    employee_id = request.user.get("employee_id")
    mods = svc.mark_read(notif_id, employee_id)
    if mods == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Marked as read"}), 200


@notification_bp.route("/mark-all-read", methods=["POST"])
@token_required
def mark_all_read():
    employee_id = request.user.get("employee_id")
    count = svc.mark_all_read(employee_id)
    return jsonify({"message": f"Marked {count} as read"}), 200


@notification_bp.route("/<notif_id>", methods=["DELETE"])
@token_required
def delete(notif_id):
    employee_id = request.user.get("employee_id")
    count = svc.delete_notification(notif_id, employee_id)
    if count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Deleted"}), 200