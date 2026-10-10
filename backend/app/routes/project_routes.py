from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import project_service as svc

project_bp = Blueprint("projects", __name__)


@project_bp.route("", methods=["GET"])
@token_required
@role_required("MANAGER")
def list_projects():
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    return jsonify(svc.list_projects(search or None, status or None)), 200


@project_bp.route("/stats", methods=["GET"])
@token_required
@role_required("MANAGER")
def stats():
    return jsonify(svc.get_project_stats()), 200


@project_bp.route("/my", methods=["GET"])
@token_required
def my_projects():
    emp_id = request.user.get("employee_id")
    return jsonify(svc.get_my_projects(emp_id)), 200


@project_bp.route("/<project_id>", methods=["GET"])
@token_required
@role_required("MANAGER")
def get_project(project_id):
    p = svc.get_project(project_id)
    if not p:
        return jsonify({"error": "Not found"}), 404
    return jsonify(p), 200


@project_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_project():
    try:
        return jsonify(svc.create_project(request.get_json() or {})), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@project_bp.route("/<project_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_project(project_id):
    try:
        return jsonify(svc.update_project(project_id, request.get_json() or {})), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@project_bp.route("/<project_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_project(project_id):
    try:
        return jsonify(svc.delete_project(project_id)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500