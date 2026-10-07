from app.db import get_db
from pymongo import ASCENDING, DESCENDING

def init_indexes():
    """Create all MongoDB indexes for the ERP system."""
    db = get_db()

    # users collection
    db.users.create_index("email", unique=True)
    db.users.create_index("role")

    # employees collection
    db.employees.create_index("user_id", unique=True)
    db.employees.create_index("employee_code", unique=True)
    db.employees.create_index("department_id")
    db.employees.create_index("designation_id")
    db.employees.create_index("status")

    # departments collection
    db.departments.create_index("name", unique=True)

    # designations collection
    db.designations.create_index("title", unique=True)
    db.designations.create_index("department_id")

    # attendance collection (unique per employee per day)
    db.attendance.create_index(
        [("employee_id", ASCENDING), ("date", ASCENDING)], unique=True
    )
    db.attendance.create_index("date")

    # leave types
    db.leave_types.create_index("name", unique=True)

    # leave requests
    db.leave_requests.create_index("status")
    db.leave_requests.create_index("employee_id")

    # payroll (unique per employee per month)
    db.payroll.create_index(
        [("employee_id", ASCENDING), ("month", ASCENDING)], unique=True
    )

    # documents
    db.documents.create_index("employee_id")

    # announcements
    db.announcements.create_index("created_at")

    # notifications
    db.notifications.create_index([("employee_id", ASCENDING), ("is_read", ASCENDING)])

    # company settings
    db.company_settings.create_index("setting_key", unique=True)

    # audit logs
    db.audit_logs.create_index("user_id")
    db.audit_logs.create_index("created_at")

    print("✅ All indexes created successfully")

if __name__ == "__main__":
    init_indexes()