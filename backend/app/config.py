import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # ============================================
    # DATABASE
    # ============================================
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "employee_erp")

    # ============================================
    # SECURITY — JWT
    # ============================================
    JWT_SECRET = os.getenv(
        "JWT_SECRET",
        "d6825655662b9243318510300bc86ac6c1eabc34d09dc9ef0dd99361d50ec9e06426069a205eca90f90761c9bc5f331a6bffefa3d97cc0ce2fdb26d78a108f99"
    )
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

    # ============================================
    # FILE UPLOADS
    # ============================================
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
    MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 5))
    MAX_CONTENT_LENGTH = MAX_FILE_SIZE_MB * 1024 * 1024

    # ============================================
    # CORS — Multiple origins
    # ============================================
    _cors_env = os.getenv(
        "CORS_ORIGIN",
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173,"
        "http://13.127.26.179:3000"
    )
    CORS_ORIGIN = [o.strip() for o in _cors_env.split(",") if o.strip()]

    # ============================================
    # SERVER
    # ============================================
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
    FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"

    # ============================================
    # PAGINATION
    # ============================================
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", 50))
    MAX_PAGE_SIZE = int(os.getenv("MAX_PAGE_SIZE", 200))

    # ============================================
    # LOGGING
    # ============================================
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # ============================================
    # VALIDATION
    # ============================================
    @classmethod
    def validate(cls):
        """Sanity-check critical config."""
        errors = []

        if not cls.MONGO_URI:
            errors.append("MONGO_URI is required")

        if not cls.JWT_SECRET or len(cls.JWT_SECRET) < 32:
            errors.append("JWT_SECRET must be at least 32 characters")

        if cls.JWT_EXPIRY_HOURS < 1 or cls.JWT_EXPIRY_HOURS > 720:
            errors.append("JWT_EXPIRY_HOURS must be between 1 and 720")

        if errors:
            raise ValueError("Config errors:\n  - " + "\n  - ".join(errors))

        return True

    # ============================================
    # HELPERS
    # ============================================
    @classmethod
    def is_production(cls):
        return cls.FLASK_ENV == "production"

    @classmethod
    def is_development(cls):
        return cls.FLASK_ENV == "development"