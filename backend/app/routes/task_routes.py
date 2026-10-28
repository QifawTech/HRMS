from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import task_service as svc
from app.utils.file_handler import save_task_file

task_bp = Blueprint("tasks", __name__)


# ============================================
# MANAGER
# ============================================

@task_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_tasks():
    status = request.args.get("status", "").strip()
    employee_id = request.args.get("employee_id", "").strip()
    priority = request.args.get("priority", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_tasks(
        status or None, employee_id or None,
        priority or None, search or None,
    )), 200


@task_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.stats()), 200


@task_bp.route("/<task_id>", methods=["GET"])
@token_required
def get_task(task_id):
    t = svc.get_task(task_id)
    if not t:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(t), 200


@task_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_task():
    data = request.get_json() or {}
    try:
        task_id = svc.create_task(data, request.user.get("user_id"))
        return jsonify({"task_id": task_id, "message": "Task assigned"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@task_bp.route("/<task_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_task(task_id):
    data = request.get_json() or {}
    mods = svc.update_task(task_id, data)
    if mods == 0:
        return jsonify({"error": "Not found or no changes"}), 404
    return jsonify({"message": "Task updated"}), 200


@task_bp.route("/<task_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_task(task_id):
    mods = svc.delete_task(task_id)
    if mods == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Task deleted"}), 200


@task_bp.route("/<task_id>/review", methods=["POST"])
@token_required
@role_required("MANAGER")
def review_plan(task_id):
    """Manager approves or requests changes."""
    data = request.get_json() or {}
    action = data.get("action")
    comment = data.get("comment", "")

    try:
        emp_id = request.user.get("employee_id")
        svc.review_plan(task_id, emp_id, action, comment)
        return jsonify({"message": f"Plan {action.lower()}"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# EMPLOYEE
# ============================================

@task_bp.route("/my", methods=["GET"])
@token_required
def my_tasks():
    employee_id = request.user.get("employee_id")
    status = request.args.get("status", "").strip()
    search = request.args.get("search", "").strip()
    return jsonify(svc.my_tasks(employee_id, status or None, search or None)), 200


@task_bp.route("/my/stats", methods=["GET"])
@token_required
def my_stats():
    employee_id = request.user.get("employee_id")
    return jsonify(svc.my_stats(employee_id)), 200


@task_bp.route("/<task_id>/submit-plan", methods=["POST"])
@token_required
def submit_plan(task_id):
    """Employee submits workflow plan (with optional file)."""
    employee_id = request.user.get("employee_id")

    # Handle multipart with optional file
    text_plan = request.form.get("text_plan", "")
    file_data = {}

    if "file" in request.files:
        file = request.files["file"]
        if file and file.filename:
            try:
                meta = save_task_file(file)
                file_data = {
                    "file_id": meta["file_id"],
                    "file_path": meta["file_path"],
                    "file_name": meta["file_name"],
                    "file_size": meta["file_size"],
                    "mime_type": meta["mime_type"],
                }
            except ValueError as e:
                return jsonify({"error": str(e)}), 422

    if not text_plan.strip() and not file_data:
        return jsonify({"error": "Provide text plan or upload file"}), 422

    plan_data = {
        "text_plan": text_plan,
        **file_data,
    }

    try:
        svc.submit_plan(task_id, employee_id, plan_data)
        return jsonify({"message": "Plan submitted"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@task_bp.route("/<task_id>/start-work", methods=["POST"])
@token_required
def start_work(task_id):
    """Employee starts work after approval."""
    employee_id = request.user.get("employee_id")
    try:
        svc.start_work(task_id, employee_id)
        return jsonify({"message": "Work started"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@task_bp.route("/<task_id>/complete", methods=["POST"])
@token_required
def complete_task(task_id):
    """Employee completes task."""
    employee_id = request.user.get("employee_id")
    data = request.get_json() or {}
    try:
        svc.complete_task(task_id, employee_id, data.get("completion_notes", ""))
        return jsonify({"message": "Task completed"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ✅ NEW: Transfer Task Endpoint
@task_bp.route("/<task_id>/transfer", methods=["POST"])
@token_required
def transfer_task(task_id):
    """Employee transfers task to another employee."""
    employee_id = request.user.get("employee_id")
    data = request.get_json() or {}
    new_employee_id = data.get("new_employee_id")
    note = data.get("note", "")

    if not new_employee_id:
        return jsonify({"error": "New employee ID required"}), 400

    try:
        svc.transfer_task(task_id, employee_id, new_employee_id, note)
        return jsonify({"message": "Task transferred successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


import os
from flask import send_file
from app.utils.file_handler import get_file_full_path


@task_bp.route("/files/<file_id>", methods=["GET"])
def download_task_file(file_id):
    """
    Download a task workflow file.
    Public route — file_id is UUID (unguessable).
    """
    from app.db import tasks

    if not file_id or file_id == "undefined":
        return jsonify({"error": "Invalid file ID"}), 400

    # Search tasks by file_id
    t = tasks().find_one({"workflow_plan.file_id": file_id})

    # Fallback: search by file_path containing the id
    if not t:
        t = tasks().find_one(
            {"workflow_plan.file_path": {"$regex": file_id, "$options": "i"}}
        )

    if not t:
        return jsonify({"error": "File not found"}), 404

    wp = t.get("workflow_plan", {})
    file_path = wp.get("file_path")

    if not file_path:
        return jsonify({"error": "File path missing"}), 404

    full_path = get_file_full_path(file_path)

    if not os.path.exists(full_path):
        return jsonify({"error": "File not on server"}), 404

    return send_file(
        full_path,
        as_attachment=True,
        download_name=wp.get("file_name", "file"),
        mimetype=wp.get("mime_type", "application/octet-stream"),
    )