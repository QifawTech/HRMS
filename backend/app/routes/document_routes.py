import os
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, request, jsonify, send_file

from app.middleware.auth_middleware import token_required, role_required
from app.services import document_service as svc
from app.utils.file_handler import save_document_file, get_file_full_path
from app.db import documents as docs_col


document_bp = Blueprint("documents", __name__)


# ============================================
# FILE DOWNLOAD (public — UUID based)
# ============================================

@document_bp.route("/files/<file_id>", methods=["GET"])
def download_file(file_id):
    """Public download by file_id (UUID — unguessable)."""
    if not file_id or file_id == "undefined":
        return jsonify({"error": "Invalid file ID"}), 400

    doc = docs_col().find_one({"file_id": file_id})
    if not doc:
        return jsonify({"error": "File not found"}), 404

    full_path = get_file_full_path(doc["file_path"])
    if not os.path.exists(full_path):
        return jsonify({"error": "File not on server"}), 404

    return send_file(
        full_path,
        as_attachment=True,
        download_name=doc.get("file_name", "file"),
        mimetype=doc.get("mime_type", "application/octet-stream"),
    )


# ============================================
# FILE UPLOAD
# ============================================

@document_bp.route("/upload", methods=["POST"])
@token_required
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    try:
        meta = save_document_file(file)
        return jsonify(meta), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


# ============================================
# SHARED — Categories
# ============================================

@document_bp.route("/categories", methods=["GET"])
@token_required
def categories():
    return jsonify({
        "manager": svc.MANAGER_CATEGORIES,
        "employee": svc.EMPLOYEE_CATEGORIES,
    }), 200


# ============================================
# MANAGER ROUTES
# ============================================

@document_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_docs():
    emp_id = request.args.get("employee_id", "").strip()
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    uploaded_by = request.args.get("uploaded_by", "").strip()
    return jsonify(svc.list_documents(
        emp_id or None,
        category or None,
        search or None,
        uploaded_by or None,
    )), 200


@document_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.stats()), 200


@document_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_doc():
    data = request.get_json() or {}
    try:
        doc_id = svc.create_document(
            data,
            request.user.get("user_id"),
            "MANAGER",
        )
        return jsonify({
            "document_id": doc_id,
            "message": "Document uploaded",
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@document_bp.route("/<doc_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_doc(doc_id):
    mods = svc.delete_document(doc_id)
    if mods == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Deleted"}), 200


# ============================================
# EMPLOYEE ROUTES
# ============================================

@document_bp.route("/my", methods=["GET"])
@token_required
def list_my_docs():
    """Employee: list own documents."""
    emp_id = request.user.get("employee_id")
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    uploaded_by = request.args.get("uploaded_by", "").strip()
    return jsonify(svc.my_documents(
        emp_id,
        category or None,
        search or None,
        uploaded_by or None,
    )), 200


@document_bp.route("/my/stats", methods=["GET"])
@token_required
def my_stats():
    """Employee: own stats."""
    emp_id = request.user.get("employee_id")
    return jsonify(svc.my_stats(emp_id)), 200


@document_bp.route("/my", methods=["POST"])
@token_required
def create_my_doc():
    """Employee: upload own document."""
    emp_id = request.user.get("employee_id")
    data = request.get_json() or {}
    data["employee_id"] = emp_id

    category = (data.get("doc_category") or "").strip()
    if category not in svc.EMPLOYEE_CATEGORIES:
        return jsonify({"error": "Invalid category for employee"}), 422

    try:
        doc_id = svc.create_document(
            data,
            request.user.get("user_id"),
            "EMPLOYEE",
        )
        return jsonify({
            "document_id": doc_id,
            "message": "Document uploaded",
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@document_bp.route("/my/<doc_id>", methods=["DELETE"])
@token_required
def delete_my_doc(doc_id):
    """Employee: delete own upload (only EMPLOYEE-uploaded)."""
    emp_id = request.user.get("employee_id")

    try:
        oid = ObjectId(doc_id)
        emp_oid = ObjectId(emp_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "Invalid ID"}), 400

    doc = docs_col().find_one({"_id": oid, "employee_id": emp_oid})
    if not doc:
        return jsonify({"error": "Not found"}), 404

    if doc.get("uploaded_by_role") != "EMPLOYEE":
        return jsonify({
            "error": "Cannot delete manager-uploaded documents"
        }), 403

    svc.delete_document(doc_id)
    return jsonify({"message": "Deleted"}), 200