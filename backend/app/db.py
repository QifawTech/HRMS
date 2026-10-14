from pymongo import MongoClient
from pymongo.errors import PyMongoError
from app.config import Config

_client = None
_db = None


def get_db():
    """
    Singleton MongoDB database with production-ready connection pool.
    ✅ Pool: 50 connections (scales for ECS)
    ✅ Keep-alive: 5 min pool, reduces cold start
    ✅ Timeouts: Reasonable for Atlas network
    """
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(
                Config.MONGO_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=30000,
                maxPoolSize=50,              # ✅ Max connections
                minPoolSize=5,               # ✅ Keep warm
                maxIdleTimeMS=300000,        # ✅ 5 min idle
                retryWrites=True,
                retryReads=True,
            )
            _client.admin.command("ping")
            _db = _client[Config.MONGO_DB_NAME]
        except PyMongoError as e:
            raise RuntimeError(f"MongoDB connection failed: {e}")
    return _db


def close_db():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None


def warmup():
    """
    Pre-establish connections at app start.
    ✅ Reduces first-request latency.
    """
    try:
        db = get_db()
        # Warm up major collections
        db["employees"].estimated_document_count()
        db["users"].estimated_document_count()
        db["departments"].estimated_document_count()
        db["attendance"].estimated_document_count()
        print("✅ MongoDB connections warmed up")
        return True
    except Exception as e:
        print(f"⚠️  MongoDB warmup failed: {e}")
        return False


# ============================================
# Collection accessors
# ============================================
def users():                    return get_db()["users"]
def employees():                return get_db()["employees"]
def departments():              return get_db()["departments"]
def designations():             return get_db()["designations"]
def attendance():               return get_db()["attendance"]
def leave_types():              return get_db()["leave_types"]
def leave_requests():           return get_db()["leave_requests"]
def payroll():                  return get_db()["payroll"]
def documents():                return get_db()["documents"]
def announcements():            return get_db()["announcements"]
def notifications():            return get_db()["notifications"]
def company_settings():         return get_db()["company_settings"]
def audit_logs():               return get_db()["audit_logs"]
def tasks():                    return get_db()["tasks"]
def shifts():                   return get_db()["shifts"]
def insurances():               return get_db()["insurances"]
def holidays():                 return get_db()["holidays"]
def confirmations():            return get_db()["employee_confirmations"]
def employee_confirmations():   return get_db()["employee_confirmations"]
def projects():                 return get_db()["projects"]
def complaints():               return get_db()["complaints"]
def resignations():             return get_db()["resignations"]