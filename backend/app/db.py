from pymongo import MongoClient
from pymongo.errors import PyMongoError
from app.config import Config

_client = None
_db = None

def get_db():
    """Return a singleton MongoDB database object."""
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
            _client.admin.command("ping")  # force connection check
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

# Collection accessors
def users():            return get_db()["users"]
def employees():        return get_db()["employees"]
def departments():      return get_db()["departments"]
def designations():     return get_db()["designations"]
def attendance():       return get_db()["attendance"]
def leave_types():      return get_db()["leave_types"]
def leave_requests():   return get_db()["leave_requests"]
def payroll():          return get_db()["payroll"]
def documents():        return get_db()["documents"]
def announcements():    return get_db()["announcements"]
def notifications():    return get_db()["notifications"]
def company_settings(): return get_db()["company_settings"]
def audit_logs():       return get_db()["audit_logs"]
def tasks():            return get_db()["tasks"]
def shifts():           return get_db()["shifts"]
def forgot_logout_requests(): return get_db()["forgot_logout_requests"]