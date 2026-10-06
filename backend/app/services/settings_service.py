from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import company_settings, employees, users
import bcrypt
import re


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.utcnow()


DEFAULTS = {
    "company_name": "Employee ERP",
    "company_address": "",
    "company_tagline": "",
    "company_footer": "",
    "company_logo_url": "",
    "signatory_name": "",
    "signatory_title": "Authorized Signatory",
    "work_start_time": "09:30",
    "work_end_time": "17:30",
    "grace_period_minutes": 15,
    "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "basic_percent": 50,
    "hra_percent_of_basic": 40,
    "pf_percent": 12,
    "esi_percent": 0.75,
    "pt_amount": 200,
    "tds_percent": 0,
    # NEW: Forgot logout settings
    "forgot_logout_enabled": True,
    "forgot_logout_max_per_month": 3,
    "forgot_logout_fine_amount": 200,
}


def get_settings():
    doc = company_settings().find_one({"_id": "company_config"})
    if not doc:
        doc = {"_id": "company_config", **DEFAULTS, "updated_by": None, "updated_at": _now()}
        company_settings().insert_one(doc)

    return {
        "company_name": doc.get("company_name", DEFAULTS["company_name"]),
        "company_address": doc.get("company_address", ""),
        "company_tagline": doc.get("company_tagline", ""),
        "company_footer": doc.get("company_footer", ""),
        "company_logo_url": doc.get("company_logo_url", ""),
        "signatory_name": doc.get("signatory_name", ""),
        "signatory_title": doc.get("signatory_title", "Authorized Signatory"),
        "work_start_time": doc.get("work_start_time", DEFAULTS["work_start_time"]),
        "work_end_time": doc.get("work_end_time", DEFAULTS["work_end_time"]),
        "grace_period_minutes": doc.get("grace_period_minutes", 15),
        "working_days": doc.get("working_days", DEFAULTS["working_days"]),
        "basic_percent": doc.get("basic_percent", 50),
        "hra_percent_of_basic": doc.get("hra_percent_of_basic", 40),
        "pf_percent": doc.get("pf_percent", 12),
        "esi_percent": doc.get("esi_percent", 0.75),
        "pt_amount": doc.get("pt_amount", 200),
        "tds_percent": doc.get("tds_percent", 0),
        # NEW
        "forgot_logout_enabled": doc.get("forgot_logout_enabled", True),
        "forgot_logout_max_per_month": doc.get("forgot_logout_max_per_month", 3),
        "forgot_logout_fine_amount": doc.get("forgot_logout_fine_amount", 200),
    }


def update_settings(data, manager_user_id):
    update_fields = {"updated_at": _now()}

    if "company_name" in data:
        cn = (data["company_name"] or "").strip()
        if not cn:
            raise ValueError("Company name is required")
        update_fields["company_name"] = cn

    for field in [
        "company_address", "company_tagline", "company_footer",
        "company_logo_url", "signatory_name", "signatory_title",
    ]:
        if field in data:
            update_fields[field] = (data[field] or "").strip()

    if "work_start_time" in data:
        t = (data["work_start_time"] or "").strip()
        if not _valid_time(t):
            raise ValueError("Invalid work start time (HH:MM)")
        update_fields["work_start_time"] = t

    if "work_end_time" in data:
        t = (data["work_end_time"] or "").strip()
        if not _valid_time(t):
            raise ValueError("Invalid work end time (HH:MM)")
        update_fields["work_end_time"] = t

    if "grace_period_minutes" in data:
        try:
            g = int(data["grace_period_minutes"])
            if g < 0 or g > 60:
                raise ValueError("Grace must be 0-60")
            update_fields["grace_period_minutes"] = g
        except (ValueError, TypeError):
            raise ValueError("Invalid grace period")

    if "working_days" in data:
        wd = data["working_days"]
        if not isinstance(wd, list):
            raise ValueError("Working days must be a list")
        update_fields["working_days"] = wd

    # Payroll numeric fields
    numeric_fields = {
        "basic_percent": (0, 100),
        "hra_percent_of_basic": (0, 100),
        "pf_percent": (0, 50),
        "esi_percent": (0, 10),
        "pt_amount": (0, 10000),
        "tds_percent": (0, 50),
    }
    for field, (min_v, max_v) in numeric_fields.items():
        if field in data:
            try:
                v = float(data[field])
                if v < min_v or v > max_v:
                    raise ValueError(f"{field} must be between {min_v} and {max_v}")
                update_fields[field] = v
            except (ValueError, TypeError):
                raise ValueError(f"Invalid value for {field}")

    # NEW: Forgot logout settings
    if "forgot_logout_enabled" in data:
        update_fields["forgot_logout_enabled"] = bool(data["forgot_logout_enabled"])

    if "forgot_logout_max_per_month" in data:
        try:
            v = int(data["forgot_logout_max_per_month"])
            if v < 0 or v > 10:
                raise ValueError("Max per month must be 0-10")
            update_fields["forgot_logout_max_per_month"] = v
        except (ValueError, TypeError):
            raise ValueError("Invalid max forgot-logout value")

    if "forgot_logout_fine_amount" in data:
        try:
            v = float(data["forgot_logout_fine_amount"])
            if v < 0 or v > 100000:
                raise ValueError("Fine amount must be 0-100000")
            update_fields["forgot_logout_fine_amount"] = v
        except (ValueError, TypeError):
            raise ValueError("Invalid fine amount")

    mgr_oid = _oid(manager_user_id)
    mgr_emp = employees().find_one({"user_id": mgr_oid}) if mgr_oid else None
    update_fields["updated_by"] = mgr_emp["_id"] if mgr_emp else None

    company_settings().update_one(
        {"_id": "company_config"},
        {"$set": update_fields},
        upsert=True,
    )
    return True


def _valid_time(t):
    if not t or ":" not in t:
        return False
    try:
        h, m = t.split(":")
        h = int(h); m = int(m)
        return 0 <= h <= 23 and 0 <= m <= 59
    except Exception:
        return False


# ============================================
# ACCOUNT
# ============================================

def get_my_account(user_id):
    oid = _oid(user_id)
    if not oid:
        return {}
    u = users().find_one({"_id": oid}, {"email": 1, "role": 1})
    if not u:
        return {}
    return {"email": u.get("email"), "role": u.get("role")}


def update_email(user_id, new_email, current_password):
    oid = _oid(user_id)
    if not oid:
        raise ValueError("Invalid user ID")
    new_email = (new_email or "").strip().lower()
    if not new_email:
        raise ValueError("New email is required")
    if "@" not in new_email or "." not in new_email:
        raise ValueError("Invalid email format")
    user = users().find_one({"_id": oid})
    if not user:
        raise ValueError("User not found")
    if not bcrypt.checkpw(
        (current_password or "").encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    ):
        raise ValueError("Current password is incorrect")
    if new_email == user["email"]:
        raise ValueError("New email must be different")
    existing = users().find_one({"email": new_email})
    if existing:
        raise ValueError("Email is already in use")
    users().update_one(
        {"_id": oid},
        {"$set": {"email": new_email, "updated_at": _now()}},
    )
    employees().update_one(
        {"user_id": oid},
        {"$set": {"email": new_email, "updated_at": _now()}},
    )
    return new_email


def update_password(user_id, current_password, new_password):
    oid = _oid(user_id)
    if not oid:
        raise ValueError("Invalid user ID")
    if not new_password:
        raise ValueError("New password is required")
    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters")
    user = users().find_one({"_id": oid})
    if not user:
        raise ValueError("User not found")
    if not bcrypt.checkpw(
        (current_password or "").encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    ):
        raise ValueError("Current password is incorrect")
    if current_password == new_password:
        raise ValueError("New password must be different from current")
    new_hash = bcrypt.hashpw(
        new_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")
    users().update_one(
        {"_id": oid},
        {"$set": {"password_hash": new_hash, "updated_at": _now()}},
    )
    return True

def validate_password(pwd):
    if len(pwd) < 8:
        raise ValueError("Password must be 8+ characters")
    if not re.search(r"[A-Z]", pwd):
        raise ValueError("Must contain uppercase letter")
    if not re.search(r"[0-9]", pwd):
        raise ValueError("Must contain number")