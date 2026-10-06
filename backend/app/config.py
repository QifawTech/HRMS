import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "employee_erp")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 8))
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
    MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 5))
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))