from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import shifts, employees
from app.utils.helpers import serialize, serialize_list


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.utcnow()


# ============================================
# DEFAULT SHIFTS (seeded on first load)
# ============================================
DEFAULT_SHIFTS = [
    {"name": "General Shift", "start_time": "09:30", "end_time": "17:30", "grace_period_minutes": 15},
    {"name": "Morning Shift", "start_time": "06:00", "end_time": "14:00", "grace_period_minutes": 15},
    {"name": "Evening Shift", "start_time": "14:00", "end_time": "22:00", "grace_period_minutes": 15},
    {"name": "Night Shift",   "start_time": "22:00", "end_time": "06:00", "grace_period_minutes": 15},
]


def ensure_default_shifts():
    """Seed default shifts if collection is empty."""
    try:
        if shifts().count_documents({}) == 0:
            docs = []
            for s in DEFAULT_SHIFTS:
                docs.append({
                    **s,
                    "is_active": True,
                    "created_at": _now(),
                    "updated_at": _now(),
                })
            shifts().insert_many(docs)
            print("[Shifts] Default shifts seeded.")
    except Exception as e:
        print(f"[Shifts] Seed failed: {e}")


def _valid_time(t):
    if not t or ":" not in t:
        return False
    try:
        h, m = t.split(":")
        h, m = int(h), int(m)
        return 0 <= h <= 23 and 0 <= m <= 59
    except Exception:
        return False


# ============================================
# LIST / GET
# ============================================

def list_shifts(active_only=True):
    ensure_default_shifts()
    query = {"is_active": True} if active_only else {}
    docs = list(shifts().find(query).sort("start_time", 1))
    return serialize_list(docs)


def get_shift(shift_id):
    oid = _oid(shift_id)
    if not oid:
        return None
    doc = shifts().find_one({"_id": oid})
    return serialize(doc) if doc else None


# ============================================
# CREATE / UPDATE / DELETE
# ============================================

def create_shift(data):
    name = (data.get("name") or "").strip()
    start_time = (data.get("start_time") or "").strip()
    end_time = (data.get("end_time") or "").strip()
    grace = int(data.get("grace_period_minutes", 15))

    if not name:
        raise ValueError("Shift name is required")
    if not _valid_time(start_time) or not _valid_time(end_time):
        raise ValueError("Invalid time format (HH:MM)")
    if start_time == end_time:
        raise ValueError("Start and end time cannot be same")
    if grace < 0 or grace > 120:
        raise ValueError("Grace must be 0-120 minutes")

    if shifts().find_one({"name": name, "is_active": True}):
        raise ValueError("A shift with this name already exists")

    now = _now()
    doc = {
        "name": name,
        "start_time": start_time,
        "end_time": end_time,
        "grace_period_minutes": grace,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = shifts().insert_one(doc)
    return str(result.inserted_id)


def update_shift(shift_id, data):
    oid = _oid(shift_id)
    if not oid:
        raise ValueError("Invalid shift ID")

    existing = shifts().find_one({"_id": oid})
    if not existing:
        raise ValueError("Shift not found")

    update_fields = {"updated_at": _now()}

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise ValueError("Shift name is required")
        dup = shifts().find_one({"name": name, "is_active": True, "_id": {"$ne": oid}})
        if dup:
            raise ValueError("A shift with this name already exists")
        update_fields["name"] = name

    if "start_time" in data:
        t = (data["start_time"] or "").strip()
        if not _valid_time(t):
            raise ValueError("Invalid start time")
        update_fields["start_time"] = t

    if "end_time" in data:
        t = (data["end_time"] or "").strip()
        if not _valid_time(t):
            raise ValueError("Invalid end time")
        update_fields["end_time"] = t

    if "grace_period_minutes" in data:
        try:
            g = int(data["grace_period_minutes"])
            if g < 0 or g > 120:
                raise ValueError("Grace must be 0-120")
            update_fields["grace_period_minutes"] = g
        except (ValueError, TypeError):
            raise ValueError("Invalid grace period")

    r = shifts().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


def delete_shift(shift_id):
    """Soft delete — mark as inactive. Also unassign from employees."""
    oid = _oid(shift_id)
    if not oid:
        raise ValueError("Invalid shift ID")

    existing = shifts().find_one({"_id": oid})
    if not existing:
        raise ValueError("Shift not found")

    # Check if any employee is using this shift
    in_use = employees().count_documents({"shift_id": oid, "status": "ACTIVE"})
    if in_use > 0:
        raise ValueError(
            f"Cannot delete — {in_use} active employee(s) assigned to this shift. "
            "Reassign them first."
        )

    r = shifts().update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": _now()}},
    )
    return r.modified_count