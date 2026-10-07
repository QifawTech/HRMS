"""Seed default leave types."""
from datetime import datetime
from app.db import leave_types

DEFAULT_TYPES = [
    {"name": "Casual Leave", "max_days_per_year": 12, "is_paid": True,
     "description": "For personal reasons"},
    {"name": "Sick Leave", "max_days_per_year": 10, "is_paid": True,
     "description": "For medical reasons"},
    {"name": "Earned Leave", "max_days_per_year": 15, "is_paid": True,
     "description": "Accumulated paid leave"},
    {"name": "Unpaid Leave", "max_days_per_year": 30, "is_paid": False,
     "description": "Leave without pay"},
]


def seed():
    for t in DEFAULT_TYPES:
        existing = leave_types().find_one({"name": t["name"]})
        if existing:
            print(f"⚠️  '{t['name']}' already exists")
            continue

        leave_types().insert_one({
            **t,
            "is_active": True,
            "created_at": datetime.utcnow(),
        })
        print(f"✅ Created: {t['name']}")

    print(f"\nTotal leave types: {leave_types().count_documents({})}")


if __name__ == "__main__":
    seed()