# from flask import Blueprint, request, jsonify
# from app.middleware.auth_middleware import token_required, role_required
# from app.services import settings_service as svc
# from app.utils.file_handler import save_company_logo

# settings_bp = Blueprint("settings", __name__)

# # ============================================
# # COMPANY SETTINGS
# # ============================================

# @settings_bp.route("/company", methods=["GET"])
# @token_required
# def get_company():
#     return jsonify(svc.get_settings()), 200


# @settings_bp.route("/company", methods=["PUT"])
# @token_required
# @role_required("MANAGER")
# def update_company():
#     data = request.get_json() or {}
#     try:
#         svc.update_settings(data, request.user.get("user_id"))
#         return jsonify({"message": "Settings updated"}), 200
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 422
#     except Exception as e:
#         return jsonify({"error": f"Failed: {str(e)}"}), 500


# # ============================================
# # ACCOUNT
# # ============================================

# @settings_bp.route("/account", methods=["GET"])
# @token_required
# def get_account():
#     return jsonify(svc.get_my_account(request.user.get("user_id"))), 200


# @settings_bp.route("/account/email", methods=["PUT"])
# @token_required
# def update_email():
#     data = request.get_json() or {}
#     try:
#         new_email = svc.update_email(
#             request.user.get("user_id"),
#             data.get("new_email"),
#             data.get("current_password"),
#         )
#         return jsonify({
#             "message": "Email updated",
#             "new_email": new_email,
#         }), 200
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 422
#     except Exception as e:
#         return jsonify({"error": f"Failed: {str(e)}"}), 500


# @settings_bp.route("/account/password", methods=["PUT"])
# @token_required
# def update_password():
#     data = request.get_json() or {}
#     try:
#         svc.update_password(
#             request.user.get("user_id"),
#             data.get("current_password"),
#             data.get("new_password"),
#         )
#         return jsonify({"message": "Password updated"}), 200
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 422
#     except Exception as e:
#         return jsonify({"error": f"Failed: {str(e)}"}), 500

# # ============================================
# # Company Logo Upload
# # ============================================

# @settings_bp.route("/company/logo", methods=["POST"])
# @token_required
# @role_required("MANAGER")
# def upload_logo():
#     if "file" not in request.files:
#         return jsonify({"error": "No file provided"}), 400

#     file = request.files["file"]

#     try:
#         meta = save_company_logo(file)
#         # Save URL to settings
#         svc.update_settings(
#             {"company_logo_url": meta["logo_url"]},
#             request.user.get("user_id"),
#         )
#         return jsonify({
#             "logo_url": meta["logo_url"],
#             "message": "Logo uploaded",
#         }), 200
#     except ValueError as e:
#         return jsonify({"error": str(e)}), 422
#     except Exception as e:
#         return jsonify({"error": f"Upload failed: {str(e)}"}), 500



from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import token_required, role_required
from app.services import settings_service as svc
from app.utils.file_handler import save_company_logo
from app.db import get_db  # <--- NEW IMPORT (PT slabs ku)
from app.services.professional_tax_service import ensure_pt_slabs_seeded  # <--- NEW IMPORT (auto-seed)

settings_bp = Blueprint("settings", __name__)

# ============================================
# COMPANY SETTINGS
# ============================================

@settings_bp.route("/company", methods=["GET"])
@token_required
def get_company():
    return jsonify(svc.get_settings()), 200


@settings_bp.route("/company", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_company():
    data = request.get_json() or {}
    try:
        svc.update_settings(data, request.user.get("user_id"))
        return jsonify({"message": "Settings updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# ACCOUNT
# ============================================

@settings_bp.route("/account", methods=["GET"])
@token_required
def get_account():
    return jsonify(svc.get_my_account(request.user.get("user_id"))), 200


@settings_bp.route("/account/email", methods=["PUT"])
@token_required
def update_email():
    data = request.get_json() or {}
    try:
        new_email = svc.update_email(
            request.user.get("user_id"),
            data.get("new_email"),
            data.get("current_password"),
        )
        return jsonify({
            "message": "Email updated",
            "new_email": new_email,
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


@settings_bp.route("/account/password", methods=["PUT"])
@token_required
def update_password():
    data = request.get_json() or {}
    try:
        svc.update_password(
            request.user.get("user_id"),
            data.get("current_password"),
            data.get("new_password"),
        )
        return jsonify({"message": "Password updated"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# ============================================
# Company Logo Upload
# ============================================

@settings_bp.route("/company/logo", methods=["POST"])
@token_required
@role_required("MANAGER")
def upload_logo():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    try:
        meta = save_company_logo(file)
        # Save URL to settings
        svc.update_settings(
            {"company_logo_url": meta["logo_url"]},
            request.user.get("user_id"),
        )
        return jsonify({
            "logo_url": meta["logo_url"],
            "message": "Logo uploaded",
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


# ============================================
# PROFESSIONAL TAX SLABS
# ============================================

@settings_bp.route("/professional-tax", methods=["GET"])
@token_required
def get_pt_slabs():
    """
    Manager dashboard la PT slabs ah view panna.
    Ithu dhaan mukkiyam: DB empty ah irundha, default slabs auto-seed aagum.
    """
    # Mukkiyam: Slabs empty ah irundha, default values insert aagum
    ensure_pt_slabs_seeded()

    db = get_db()
    slabs = list(
        db.professional_tax_slabs.find({}, {"_id": 0}).sort("min_salary", 1)
    )
    return jsonify(slabs), 200


@settings_bp.route("/professional-tax", methods=["PUT"])
@token_required
@role_required("MANAGER")
def update_pt_slabs():
    """Manager dashboard la PT slabs ah edit panni save panna."""
    data = request.get_json() or {}
    new_slabs = data.get("slabs", [])

    if not isinstance(new_slabs, list):
        return jsonify({"error": "Invalid data format. 'slabs' must be a list."}), 400

    db = get_db()
    try:
        # Pazhaya slabs ah delete panni, pudhu slabs ah insert pannum
        db.professional_tax_slabs.delete_many({})
        if new_slabs:
            db.professional_tax_slabs.insert_many(new_slabs)

        return jsonify({"message": "Professional Tax Slabs updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update slabs: {str(e)}"}), 500