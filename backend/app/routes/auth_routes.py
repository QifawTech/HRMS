from flask import Blueprint, request, jsonify
import bcrypt
import jwt
from datetime import datetime, timedelta
from app.db import users, employees
from app.config import Config
from app.middleware.auth_middleware import token_required
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login endpoint - returns JWT token."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 422

    # Find user
    user = users().find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Check if active
    if not user.get("is_active", True):
        return jsonify({"error": "Account is deactivated"}), 403

    # Verify password
    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    # Find employee record
    emp = employees().find_one({"user_id": user["_id"]})

    # Generate JWT
    payload = {
        "user_id": str(user["_id"]),
        "employee_id": str(emp["_id"]) if emp else None,
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")

    return jsonify({
        "token": token,
        "role": user["role"],
        "user": {
            "user_id": str(user["_id"]),
            "employee_id": str(emp["_id"]) if emp else None,
            "email": user["email"],
            "first_name": emp.get("first_name") if emp else None,
            "last_name": emp.get("last_name") if emp else None,
        }
    }), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    """Get current user info from token."""
    return jsonify({"user": request.user}), 200