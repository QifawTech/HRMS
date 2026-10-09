from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import holiday_service as hs

holiday_bp = Blueprint("holidays", __name__)


# ============================================
# LIST — GET /api/holidays?year=2026
# ============================================
@holiday_bp.route("", methods=["GET"])
@token_required
def list_holidays():
    year = request.args.get("year")
    try:
        return jsonify(hs.list_holidays(year)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# CREATE — POST /api/holidays
# ============================================
@holiday_bp.route("", methods=["POST"])
@token_required
@role_required("MANAGER")
def create_holiday():
    try:
        return jsonify(hs.create_holiday(request.get_json() or {})), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# UPDATE — PUT /api/holidays/<id>
# ============================================
@holiday_bp.route("/<holiday_id>", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_holiday(holiday_id):
    try:
        return jsonify(hs.update_holiday(holiday_id, request.get_json() or {})), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# DELETE — DELETE /api/holidays/<id>
# ============================================
@holiday_bp.route("/<holiday_id>", methods=["DELETE"])
@token_required
@role_required("MANAGER")
def delete_holiday(holiday_id):
    try:
        return jsonify(hs.delete_holiday(holiday_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# AVAILABLE YEARS — GET /api/holidays/years
# ============================================
@holiday_bp.route("/years", methods=["GET"])
@token_required
def available_years():
    try:
        return jsonify(hs.get_available_years()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ============================================
# SEED DEFAULTS — POST /api/holidays/seed
# ============================================
@holiday_bp.route("/seed", methods=["POST"])
@token_required
@role_required("MANAGER")
def seed_defaults():
    try:
        year = (request.get_json() or {}).get("year", 2026)
        return jsonify(hs.seed_default_holidays(year)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400