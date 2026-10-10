from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import holidays
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _serialize(doc):
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    return doc


def create_holiday(data):
    name = (data.get("name") or "").strip()
    date_str = data.get("date")
    if not name or not date_str:
        raise ValueError("name and date are required")

    year = int(data.get("year") or str(date_str)[:4])

    doc = {
        "name": name,
        "date": date_str,
        "year": year,
        "type": data.get("type", "National"),
        "description": (data.get("description") or "").strip(),
        "is_optional": bool(data.get("is_optional", False)),
        "created_at": now_ist(),
        "updated_at": now_ist(),
    }
    res = holidays().insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize(doc)


def list_holidays(year=None):
    q = {}
    if year:
        try:
            q["year"] = int(year)
        except (ValueError, TypeError):
            pass
    cursor = holidays().find(q).sort("date", 1)
    return [_serialize(d) for d in cursor]


def update_holiday(holiday_id, data):
    oid = _oid(holiday_id)
    if not oid:
        raise ValueError("Invalid holiday id")

    update = {}
    for k in ["name", "date", "type", "description", "is_optional"]:
        if k in data:
            update[k] = data[k]

    if "date" in update and update["date"]:
        update["year"] = int(str(update["date"])[:4])

    update["updated_at"] = now_ist()

    res = holidays().update_one({"_id": oid}, {"$set": update})
    if res.matched_count == 0:
        raise ValueError("Holiday not found")
    return _serialize(holidays().find_one({"_id": oid}))


def delete_holiday(holiday_id):
    oid = _oid(holiday_id)
    if not oid:
        raise ValueError("Invalid holiday id")
    res = holidays().delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise ValueError("Holiday not found")
    return {"deleted": True}


def get_available_years():
    years = sorted(
        set(d.get("year") for d in holidays().find({}, {"year": 1}) if d.get("year")),
        reverse=True,
    )
    current = now_ist().year
    if current not in years:
        years.insert(0, current)
    return years


def seed_default_holidays(year=2026):
    defaults = [
        {"name": "New Year", "date": f"{year}-01-01", "type": "National"},
        {"name": "Pongal", "date": f"{year}-01-14", "type": "Festival"},
        {"name": "Republic Day", "date": f"{year}-01-26", "type": "National"},
        {"name": "Holi", "date": f"{year}-03-14", "type": "Festival"},
        {"name": "Good Friday", "date": f"{year}-04-03", "type": "National"},
        {"name": "Tamil New Year", "date": f"{year}-04-14", "type": "Regional"},
        {"name": "Independence Day", "date": f"{year}-08-15", "type": "National"},
        {"name": "Gandhi Jayanti", "date": f"{year}-10-02", "type": "National"},
        {"name": "Ayudha Pooja", "date": f"{year}-10-20", "type": "Festival"},
        {"name": "Deepavali", "date": f"{year}-10-21", "type": "Festival"},
        {"name": "Christmas", "date": f"{year}-12-25", "type": "National"},
    ]
    created = 0
    for h in defaults:
        h["year"] = year
        if not holidays().find_one({"date": h["date"], "name": h["name"]}):
            create_holiday(h)
            created += 1
    return {"created": created, "year": year}