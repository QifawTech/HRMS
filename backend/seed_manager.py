"""Seed the first MANAGER account."""
import bcrypt
from datetime import datetime
from app.db import users, employees

EMAIL = "manager@company.com"
PASSWORD = "Manager@123"


def seed():
    # Check if exists
    if users().find_one({"email": EMAIL}):
        print(f"⚠️  Manager already exists: {EMAIL}")
        return

    # Hash password
    pw_hash = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Insert user
    user_id = users().insert_one({
        "email": EMAIL,
        "password_hash": pw_hash,
        "role": "MANAGER",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }).inserted_id

    # Insert employee record
    employees().insert_one({
        "user_id": user_id,
        "employee_code": "MGR001",
        "first_name": "Admin",
        "last_name": "Manager",
        "phone": None,
        "address": None,
        "date_of_birth": None,
        "date_of_joining": datetime.utcnow(),
        "department_id": None,
        "designation_id": None,
        "manager_id": None,
        "status": "ACTIVE",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    print("=" * 50)
    print("✅ Manager account created!")
    print(f"   Email    : {EMAIL}")
    print(f"   Password : {PASSWORD}")
    print("=" * 50)


if __name__ == "__main__":
    seed()