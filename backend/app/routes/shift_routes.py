from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import shift_service as svc

shift_bp = Blueprint("shifts", __name__)


@shift_bp.route("", methods=["GET"])
@token_required
def list_shifts():
    """All roles can view shifts (for dropdowns)."""
    return jsonify(svc.list_shifts(active_only=True)), 200


@shift_bp.route("/<shift_id>", methods=["GET"])
@token_required
def get_shift(shift_id):
    s = svc.get_shift(shift_id)
    if not s:
        return jsonify({"error": "Shift not found"}), 404
    return jsonify(s), 200


@shift_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_shift():
    data = request.get_json() or {}
    try:
        sid = svc.create_shift(data)
        return jsonify({"shift_id": sid, "message": "Shift created"}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@shift_bp.route("/<shift_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_shift(shift_id):
    data = request.get_json() or {}
    try:
        mods = svc.update_shift(shift_id, data)
        if mods == 0:
            return jsonify({"message": "No changes"}), 200
        return jsonify({"message": "Shift updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@shift_bp.route("/<shift_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_shift(shift_id):
    try:
        mods = svc.delete_shift(shift_id)
        if mods == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Shift deactivated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500