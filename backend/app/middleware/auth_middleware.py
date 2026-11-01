from functools import wraps
from flask import request, jsonify
import jwt
from app.config import Config

def token_required(f):
    """Decorator to require valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token missing"}), 401

        token = auth_header.split(" ")[1]

        try:
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated

def role_required(*roles):
    """Decorator to require specific role or roles. ADMIN and SUPER_ADMIN have manager privileges."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_role = (request.user.get("role") or "").strip().upper()
            allowed = {r.strip().upper() for r in roles}
            if "MANAGER" in allowed:
                allowed.update(["ADMIN", "SUPER_ADMIN"])
            if user_role not in allowed:
                return jsonify({"error": "Forbidden - insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
