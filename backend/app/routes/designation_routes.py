from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import designation_service as svc

designation_bp = Blueprint("designations", __name__)


# ============================================
# LIST / GET
# ============================================

@designation_bp.route("", methods=["GET"])
@token_required
def list_designations():
    search = request.args.get("search", "").strip()
    return jsonify(svc.list_designations(search or None)), 200


@designation_bp.route("/<designation_id>", methods=["GET"])
@token_required
def get_designation(designation_id):
    d = svc.get_designation(designation_id)
    if not d:
        return jsonify({"error": "Designation not found"}), 404
    return jsonify(d), 200


# ============================================
# CREATE
# ============================================

@designation_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_designation():
    data = request.get_json() or {}
    try:
        designation_id = svc.create_designation(data)
        return jsonify({
            "designation_id": designation_id,
            "message": "Designation created successfully",
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# UPDATE
# ============================================

@designation_bp.route("/<designation_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_designation(designation_id):
    data = request.get_json() or {}
    try:
        mods = svc.update_designation(designation_id, data)
        if mods == 0:
            return jsonify({"error": "Not found or no changes"}), 404
        return jsonify({"message": "Designation updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# DEACTIVATE
# ============================================

@designation_bp.route("/<designation_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def deactivate_designation(designation_id):
    try:
        mods = svc.deactivate_designation(designation_id)
        if mods == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Designation deactivated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500