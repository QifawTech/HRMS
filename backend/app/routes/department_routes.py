from flask import Blueprint, request, jsonify
from pymongo.errors import DuplicateKeyError
from app.middleware.auth_middleware import token_required, role_required
from app.services import department_service as svc

department_bp = Blueprint("departments", __name__)


@department_bp.route("", methods=["GET"])
@token_required
def list_departments():
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_departments(search or None)), 200


@department_bp.route("/<dept_id>", methods=["GET"])
@token_required
def get_department(dept_id):
    d = svc.get_department(dept_id)
    if not d:
        return jsonify({"error": "Department not found"}), 404
    return jsonify(d), 200


@department_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_department():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Department name is required"}), 422
    if len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 422
    if len(name) > 100:
        return jsonify({"error": "Name too long"}), 422

    try:
        new_id = svc.create_department(name, data.get("description"))
        return jsonify({
            "department_id": new_id,
            "message": "Department created successfully"
        }), 201
    except DuplicateKeyError:
        return jsonify({"error": "Department name already exists"}), 409
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@department_bp.route("/<dept_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_department(dept_id):
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Department name is required"}), 422
    if len(name) < 2:
        return jsonify({"error": "Name too short"}), 422

    try:
        mods = svc.update_department(dept_id, name, data.get("description"))
        if mods == 0:
            return jsonify({"error": "Not found or no changes"}), 404
        return jsonify({"message": "Department updated"}), 200
    except DuplicateKeyError:
        return jsonify({"error": "Department name already exists"}), 409
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@department_bp.route("/<dept_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def deactivate_department(dept_id):
    mods = svc.deactivate_department(dept_id)
    if mods == 0:
        return jsonify({"error": "Department not found"}), 404
    return jsonify({"message": "Department deactivated"}), 200