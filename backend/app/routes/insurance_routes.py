from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import insurance_service as svc

insurance_bp = Blueprint("insurances", __name__)


# ============================================
# LIST / GET (all roles)
# ============================================

@insurance_bp.route("", methods=["GET"])
@token_required
def list_insurances():
    """All roles can view active insurances."""
    return jsonify(svc.list_insurances(active_only=True)), 200


@insurance_bp.route("/<insurance_id>", methods=["GET"])
@token_required
def get_insurance(insurance_id):
    ins = svc.get_insurance(insurance_id)
    if not ins:
        return jsonify({"error": "Insurance not found"}), 404
    return jsonify(ins), 200


# ============================================
# CREATE (Manager only)
# ============================================

@insurance_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_insurance():
    data = request.get_json() or {}
    try:
        ins_id = svc.create_insurance(data)
        return jsonify({
            "insurance_id": ins_id,
            "message": "Insurance created successfully",
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# UPDATE (Manager only)
# ============================================

@insurance_bp.route("/<insurance_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_insurance(insurance_id):
    data = request.get_json() or {}
    try:
        mods = svc.update_insurance(insurance_id, data)
        return jsonify({"message": "Insurance updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# DELETE (Manager only)
# ============================================

@insurance_bp.route("/<insurance_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_insurance(insurance_id):
    try:
        mods = svc.delete_insurance(insurance_id)
        if mods == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Insurance deactivated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500