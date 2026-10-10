"""
One-time migration: Add +5:30 hours to OLD data (before fix).
Run this ONLY ONCE. Then delete the script.
"""
from datetime import timedelta, datetime
from app.db import (
    employees, attendance, leave_requests, payroll,
    notifications, documents, announcements, tasks, users,
)

# Cutoff date — data BEFORE this date is old (UTC)
# Update this to when you applied the timezone fix
CUTOFF = datetime(2026, 10, 10, 0, 0, 0)


def migrate(collection_fn, date_fields, name):
    offset = timedelta(hours=5, minutes=30)
    count = 0
    skipped = 0
    for doc in collection_fn().find({}):
        updates = {}
        for field in date_fields:
            val = doc.get(field)
            if val and hasattr(val, "year"):
                # Check if this is old data
                if val < CUTOFF:
                    updates[field] = val + offset
        if updates:
            collection_fn().update_one(
                {"_id": doc["_id"]}, {"$set": updates}
            )
            count += 1
        else:
            skipped += 1
    print(f"✅ {name}: {count} migrated, {skipped} skipped (already correct)")


if __name__ == "__main__":
    print("🚀 Migrating OLD data (UTC → IST)...\n")
    migrate(announcements, ["created_at", "updated_at"], "announcements")
    migrate(notifications, ["created_at"], "notifications")
    migrate(employees, ["created_at", "updated_at", "date_of_joining", "end_date"], "employees")
    migrate(attendance, ["check_in", "check_out", "created_at"], "attendance")
    migrate(leave_requests, ["created_at", "reviewed_at"], "leave_requests")
    migrate(payroll, ["created_at", "payment_date"], "payroll")
    migrate(documents, ["created_at"], "documents")
    migrate(tasks, ["created_at", "due_date"], "tasks")
    migrate(users, ["created_at", "updated_at"], "users")
    print("\n🎉 Done!")