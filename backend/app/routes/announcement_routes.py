import os
from flask import Blueprint, request, jsonify, send_file
from app.middleware.auth_middleware import token_required, role_required
from app.services import announcement_service as svc
from app.utils.file_handler import save_announcement_file, get_file_full_path

announcement_bp = Blueprint("announcements", __name__)


# ============================================
# SHARED
# ============================================

@announcement_bp.route("/upload", methods=["POST"])
@token_required
@role_required("MANAGER")
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    try:
        meta = save_announcement_file(file)
        return jsonify(meta), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@announcement_bp.route("/files/<file_id>", methods=["GET"])
@token_required
def download_file(file_id):
    """Download an attached file by scanning announcements."""
    from app.db import announcements
    from bson import ObjectId

    anns = announcements().find({"attachments.file_id": file_id})
    for ann in anns:
        for att in ann.get("attachments", []):
            if att.get("file_id") == file_id:
                full_path = get_file_full_path(att["file_path"])
                if os.path.exists(full_path):
                    return send_file(
                        full_path,
                        as_attachment=True,
                        download_name=att["file_name"],
                        mimetype=att.get("mime_type", "application/octet-stream"),
                    )
    return jsonify({"error": "File not found"}), 404


# ============================================
# MANAGER
# ============================================

@announcement_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_all():
    target_type = request.args.get("target_type", "").strip()
    priority = request.args.get("priority", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_announcements(
        target_type or None,
        priority or None,
        search or None,
    )), 200


@announcement_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.stats()), 200


@announcement_bp.route("/<ann_id>", methods=["GET"])
@token_required
def get_one(ann_id):
    doc = svc.get_announcement(ann_id)
    if not doc:
        return jsonify({"error": "Not found"}), 404
    return jsonify(doc), 200


@announcement_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create():
    data = request.get_json() or {}
    try:
        ann_id = svc.create_announcement(data, request.user.get("user_id"))
        return jsonify({
            "announcement_id": ann_id,
            "message": "Announcement published successfully",
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@announcement_bp.route("/<ann_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update(ann_id):
    data = request.get_json() or {}
    mods = svc.update_announcement(ann_id, data)
    if mods == 0:
        return jsonify({"error": "Not found or no changes"}), 404
    return jsonify({"message": "Updated"}), 200


@announcement_bp.route("/<ann_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete(ann_id):
    mods = svc.delete_announcement(ann_id)
    if mods == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Deleted"}), 200


@announcement_bp.route("/<ann_id>/seen-list", methods=["GET"])
@token_required
@role_required("MANAGER")
def seen_list(ann_id):
    data = svc.get_seen_list(ann_id)
    if not data:
        return jsonify({"error": "Not found"}), 404
    return jsonify(data), 200


# ============================================
# EMPLOYEE
# ============================================

@announcement_bp.route("/my", methods=["GET"])
@token_required
def my_list():
    employee_id = request.user.get("employee_id")
    target_type = request.args.get("target_type", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.my_announcements(
        employee_id,
        target_type or None,
        search or None,
    )), 200


@announcement_bp.route("/my/stats", methods=["GET"])
@token_required
def my_stats():
    employee_id = request.user.get("employee_id")
    return jsonify(svc.my_stats(employee_id)), 200


@announcement_bp.route("/<ann_id>/seen", methods=["POST"])
@token_required
def mark_seen(ann_id):
    employee_id = request.user.get("employee_id")
    mods = svc.mark_seen(ann_id, employee_id)
    if mods == 0:
        return jsonify({"message": "Already seen"}), 200
    return jsonify({"message": "Marked as seen"}), 200