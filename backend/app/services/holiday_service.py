from datetime import datetime, date
from bson import ObjectId
from bson.errors import InvalidId
from app.db import holidays
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return now_ist()


# ============================================
# ✅ COMPREHENSIVE INDIAN HOLIDAYS (Year-wise)
# ============================================
# Fixed holidays (same date every year)
# + Festival holidays (dates vary year to year)
# Source: Indian Government + Major Religious Festivals
# ============================================

FIXED_HOLIDAYS = [
    # ============ NATIONAL ============
    {"name": "New Year's Day", "date": "01-01", "type": "National", "description": "New Year celebration", "is_optional": False},
    {"name": "Republic Day", "date": "01-26", "type": "National", "description": "India's Constitution Day", "is_optional": False},
    {"name": "Independence Day", "date": "08-15", "type": "National", "description": "India's Independence", "is_optional": False},
    {"name": "Gandhi Jayanti", "date": "10-02", "type": "National", "description": "Mahatma Gandhi's Birthday", "is_optional": False},

    # ============ HINDU ============
    {"name": "Pongal / Makar Sankranti", "date": "01-14", "type": "Festival", "description": "Harvest Festival", "is_optional": False},
    {"name": "Tamil New Year", "date": "04-14", "type": "Regional", "description": "Tamil New Year (Puthandu)", "is_optional": False},
    {"name": "Ambedkar Jayanti", "date": "04-14", "type": "National", "description": "Dr. B.R. Ambedkar's Birthday", "is_optional": False},

    # ============ CHRISTIAN ============
    {"name": "Christmas", "date": "12-25", "type": "Festival", "description": "Birth of Jesus Christ", "is_optional": False},

    # ============ GENERAL ============
    {"name": "May Day / Labour Day", "date": "05-01", "type": "National", "description": "International Workers' Day", "is_optional": False},
]


# Year-specific festival holidays (dates change every year)
# 2025, 2026, 2027 — including Muslim, Hindu, Christian festivals
YEAR_SPECIFIC_HOLIDAYS = {
    2025: [
        {"name": "Holi", "date": "03-14", "type": "Festival", "description": "Festival of Colors", "is_optional": False},
        {"name": "Eid-ul-Fitr", "date": "03-31", "type": "Festival", "description": "End of Ramadan", "is_optional": False},
        {"name": "Ram Navami", "date": "04-06", "type": "Festival", "description": "Birth of Lord Rama", "is_optional": False},
        {"name": "Good Friday", "date": "04-18", "type": "Festival", "description": "Christian Holy Day", "is_optional": False},
        {"name": "Bakrid (Eid-ul-Adha)", "date": "06-07", "type": "Festival", "description": "Festival of Sacrifice", "is_optional": False},
        {"name": "Muharram", "date": "07-06", "type": "Festival", "description": "Islamic New Year", "is_optional": False},
        {"name": "Raksha Bandhan", "date": "08-09", "type": "Festival", "description": "Sibling Bond Festival", "is_optional": False},
        {"name": "Janmashtami", "date": "08-16", "type": "Festival", "description": "Birth of Lord Krishna", "is_optional": False},
        {"name": "Milad-un-Nabi", "date": "09-05", "type": "Festival", "description": "Birthday of Prophet Muhammad", "is_optional": False},
        {"name": "Ganesh Chaturthi", "date": "08-27", "type": "Festival", "description": "Birth of Lord Ganesha", "is_optional": False},
        {"name": "Dussehra (Vijayadashami)", "date": "10-02", "type": "Festival", "description": "Victory of Good over Evil", "is_optional": False},
        {"name": "Diwali (Deepavali)", "date": "10-20", "type": "Festival", "description": "Festival of Lights", "is_optional": False},
        {"name": "Bhai Dooj", "date": "10-23", "type": "Festival", "description": "Sibling Bond Festival", "is_optional": True},
        {"name": "Guru Nanak Jayanti", "date": "11-05", "type": "Festival", "description": "Birth of Guru Nanak", "is_optional": False},
    ],
    2026: [
        {"name": "Holi", "date": "03-04", "type": "Festival", "description": "Festival of Colors", "is_optional": False},
        {"name": "Eid-ul-Fitr", "date": "03-20", "type": "Festival", "description": "End of Ramadan", "is_optional": False},
        {"name": "Ram Navami", "date": "03-27", "type": "Festival", "description": "Birth of Lord Rama", "is_optional": False},
        {"name": "Good Friday", "date": "04-03", "type": "Festival", "description": "Christian Holy Day", "is_optional": False},
        {"name": "Bakrid (Eid-ul-Adha)", "date": "05-27", "type": "Festival", "description": "Festival of Sacrifice", "is_optional": False},
        {"name": "Muharram", "date": "06-26", "type": "Festival", "description": "Islamic New Year", "is_optional": False},
        {"name": "Raksha Bandhan", "date": "08-28", "type": "Festival", "description": "Sibling Bond Festival", "is_optional": False},
        {"name": "Janmashtami", "date": "09-04", "type": "Festival", "description": "Birth of Lord Krishna", "is_optional": False},
        {"name": "Milad-un-Nabi", "date": "08-25", "type": "Festival", "description": "Birthday of Prophet Muhammad", "is_optional": False},
        {"name": "Ganesh Chaturthi", "date": "09-14", "type": "Festival", "description": "Birth of Lord Ganesha", "is_optional": False},
        {"name": "Dussehra (Vijayadashami)", "date": "10-20", "type": "Festival", "description": "Victory of Good over Evil", "is_optional": False},
        {"name": "Diwali (Deepavali)", "date": "11-08", "type": "Festival", "description": "Festival of Lights", "is_optional": False},
        {"name": "Bhai Dooj", "date": "11-11", "type": "Festival", "description": "Sibling Bond Festival", "is_optional": True},
        {"name": "Guru Nanak Jayanti", "date": "11-24", "type": "Festival", "description": "Birth of Guru Nanak", "is_optional": False},
    ],
    2027: [
        {"name": "Holi", "date": "03-22", "type": "Festival", "description": "Festival of Colors", "is_optional": False},
        {"name": "Eid-ul-Fitr", "date": "03-10", "type": "Festival", "description": "End of Ramadan", "is_optional": False},
        {"name": "Ram Navami", "date": "04-15", "type": "Festival", "description": "Birth of Lord Rama", "is_optional": False},
        {"name": "Good Friday", "date": "03-26", "type": "Festival", "description": "Christian Holy Day", "is_optional": False},
        {"name": "Bakrid (Eid-ul-Adha)", "date": "05-17", "type": "Festival", "description": "Festival of Sacrifice", "is_optional": False},
        {"name": "Muharram", "date": "06-15", "type": "Festival", "description": "Islamic New Year", "is_optional": False},
        {"name": "Raksha Bandhan", "date": "08-17", "type": "Festival", "description": "Sibling Bond Festival", "is_optional": False},
        {"name": "Janmashtami", "date": "08-25", "type": "Festival", "description": "Birth of Lord Krishna", "is_optional": False},
        {"name": "Milad-un-Nabi", "date": "08-14", "type": "Festival", "description": "Birthday of Prophet Muhammad", "is_optional": False},
        {"name": "Ganesh Chaturthi", "date": "09-04", "type": "Festival", "description": "Birth of Lord Ganesha", "is_optional": False},
        {"name": "Dussehra (Vijayadashami)", "date": "10-09", "type": "Festival", "description": "Victory of Good over Evil", "is_optional": False},
        {"name": "Diwali (Deepavali)", "date": "10-29", "type": "Festival", "description": "Festival of Lights", "is_optional": False},
        {"name": "Bhai Dooj", "date": "11-01", "type": "Festival", "description": "Sibling Bond Festival", "is_optional": True},
        {"name": "Guru Nanak Jayanti", "date": "11-14", "type": "Festival", "description": "Birth of Guru Nanak", "is_optional": False},
    ],
}


# ============================================
# SEED DEFAULT HOLIDAYS
# ============================================

def seed_default_holidays(year):
    """
    Seed comprehensive Indian holidays for a given year.
    Includes: National, Hindu, Muslim, Christian festivals.
    """
    try:
        year = int(year)
    except (ValueError, TypeError):
        raise ValueError("Invalid year")

    # ✅ Delete existing holidays for this year first (fresh seed)
    existing_count = holidays().count_documents({"year": year})
    
    # Check if we already seeded
    if existing_count > 0:
        return {
            "created": 0,
            "existing": existing_count,
            "message": f"{existing_count} holidays already exist for {year}",
        }

    created = 0

    # 1. Add fixed holidays
    for h in FIXED_HOLIDAYS:
        month, day = h["date"].split("-")
        full_date = f"{year}-{month}-{day}"

        # Check duplicate
        if holidays().find_one({"date": full_date, "year": year}):
            continue

        holidays().insert_one({
            "name": h["name"],
            "date": full_date,
            "year": year,
            "type": h["type"],
            "description": h.get("description", ""),
            "is_optional": h.get("is_optional", False),
            "created_at": _now(),
            "updated_at": _now(),
        })
        created += 1

    # 2. Add year-specific festival holidays
    year_holidays = YEAR_SPECIFIC_HOLIDAYS.get(year, [])

    # If not configured for this year, use 2026 as base and adjust year
    if not year_holidays:
        year_holidays = YEAR_SPECIFIC_HOLIDAYS.get(2026, [])

    for h in year_holidays:
        month, day = h["date"].split("-")
        full_date = f"{year}-{month}-{day}"

        # Check duplicate
        if holidays().find_one({"date": full_date, "year": year}):
            continue

        holidays().insert_one({
            "name": h["name"],
            "date": full_date,
            "year": year,
            "type": h["type"],
            "description": h.get("description", ""),
            "is_optional": h.get("is_optional", False),
            "created_at": _now(),
            "updated_at": _now(),
        })
        created += 1

    return {
        "created": created,
        "year": year,
        "message": f"Added {created} holidays for {year}",
    }


# ============================================
# CRUD
# ============================================

def list_holidays(year=None):
    query = {}
    if year:
        query["year"] = int(year)

    docs = list(holidays().find(query).sort("date", 1))
    return [_serialize(d) for d in docs]


def create_holiday(data):
    name = (data.get("name") or "").strip()
    date_str = (data.get("date") or "").strip()

    if not name or not date_str:
        raise ValueError("Name and date required")

    try:
        dt = datetime.fromisoformat(date_str)
    except Exception:
        raise ValueError("Invalid date format")

    year = dt.year

    # Check duplicate
    if holidays().find_one({"date": date_str, "year": year}):
        raise ValueError(f"Holiday already exists on {date_str}")

    doc = {
        "name": name,
        "date": date_str,
        "year": year,
        "type": data.get("type", "National"),
        "description": (data.get("description") or "").strip(),
        "is_optional": bool(data.get("is_optional", False)),
        "created_at": _now(),
        "updated_at": _now(),
    }

    result = holidays().insert_one(doc)
    return str(result.inserted_id)


def update_holiday(holiday_id, data):
    oid = _oid(holiday_id)
    if not oid:
        raise ValueError("Invalid holiday ID")

    update = {"updated_at": _now()}

    if "name" in data:
        update["name"] = (data["name"] or "").strip()

    if "date" in data:
        date_str = (data["date"] or "").strip()
        try:
            dt = datetime.fromisoformat(date_str)
            update["date"] = date_str
            update["year"] = dt.year
        except Exception:
            raise ValueError("Invalid date format")

    if "type" in data:
        update["type"] = data["type"]

    if "description" in data:
        update["description"] = (data["description"] or "").strip()

    if "is_optional" in data:
        update["is_optional"] = bool(data["is_optional"])

    r = holidays().update_one({"_id": oid}, {"$set": update})
    if r.matched_count == 0:
        raise ValueError("Holiday not found")

    return r.modified_count


def delete_holiday(holiday_id):
    oid = _oid(holiday_id)
    if not oid:
        return 0

    r = holidays().delete_one({"_id": oid})
    return r.deleted_count


def get_available_years():
    """Get all unique years from holidays collection."""
    years = holidays().distinct("year")
    current_year = date.today().year

    # Add current year and next 2 years
    for y in [current_year, current_year + 1, current_year + 2]:
        if y not in years:
            years.append(y)

    return sorted(set(years))


def _serialize(doc):
    """Serialize holiday document."""
    if not doc:
        return None

    return {
        "_id": str(doc["_id"]),
        "name": doc.get("name"),
        "date": doc.get("date"),
        "year": doc.get("year"),
        "type": doc.get("type", "National"),
        "description": doc.get("description", ""),
        "is_optional": doc.get("is_optional", False),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "updated_at": doc["updated_at"].isoformat() if doc.get("updated_at") else None,
    }