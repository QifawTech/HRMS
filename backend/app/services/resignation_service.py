from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import employees, notifications
from app.utils.helpers import serialize, serialize_list
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return now_ist()


def _parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def _get_notice_period_days():
    """Read notice period from settings. Default 15."""
    try:
        from app.services.settings_service import get_settings
        settings = get_settings()
        return int(settings.get("notice_period_days", 15))
    except Exception:
        return 15


# ============================================
# EMPLOYEE
# ============================================

def apply_resignation(employee_id, data):
    """Employee applies for resignation."""
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    if emp.get("status") != "ACTIVE":
        raise ValueError("Cannot apply — account is not active")

    if emp.get("resignation_status") == "Pending":
        raise ValueError("You already have a pending resignation request")

    if emp.get("resignation_status") == "Accepted":
        raise ValueError("Your resignation is already accepted")

    reason = (data.get("reason") or "").strip()
    last_day_str = data.get("last_working_day")

    if not reason:
        raise ValueError("Reason is required")
    if len(reason) < 10:
        raise ValueError("Please provide a detailed reason (min 10 chars)")

    last_day = _parse_date(last_day_str)
    if not last_day:
        raise ValueError("Valid last working day required")

    today = now_ist().date()
    if last_day <= today:
        raise ValueError("Last working day must be in the future")

    # ✅ Read notice period from settings
    required_notice = _get_notice_period_days()
    notice_days = (last_day - today).days
    if notice_days < required_notice:
        raise ValueError(
            f"Minimum {required_notice} days notice required. "
            f"You've given {notice_days} days."
        )

    now = _now()

    employees().update_one(
        {"_id": oid},
        {
            "$set": {
                "resignation_status": "Pending",
                "resignation_reason": reason,
                "resignation_last_day": last_day_str,
                "resignation_applied_at": now,
                "resignation_notice_end": None,
                "resignation_reviewed_by": None,
                "resignation_reviewed_by_name": None,
                "resignation_reviewed_at": None,
                "resignation_review_comment": "",
                "resignation_completed_at": None,
                "updated_at": now,
            }
        },
    )

    from app.db import users
    manager_users = list(users().find({"role": "MANAGER", "is_active": True}))
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

    for mu in manager_users:
        mgr_emp = employees().find_one({"user_id": mu["_id"]})
        if mgr_emp:
            notifications().insert_one({
                "employee_id": mgr_emp["_id"],
                "title": "Resignation Applied",
                "message": f"{emp_name} ({emp.get('employee_code')}) has applied for resignation",
                "type": "RESIGNATION_APPLIED",
                "link": "/manager/resignations",
                "related_id": oid,
                "from_employee_id": oid,
                "from_name": emp_name,
                "is_read": False,
                "read_at": None,
                "created_at": now,
            })

    return True


def my_resignation(employee_id):
    """Get own resignation status."""
    oid = _oid(employee_id)
    if not oid:
        return None

    emp = employees().find_one({"_id": oid})
    if not emp:
        return None

    return {
        "resignation_status": emp.get("resignation_status", "None"),
        "resignation_reason": emp.get("resignation_reason"),
        "resignation_last_day": emp.get("resignation_last_day"),
        "resignation_applied_at": emp.get("resignation_applied_at").isoformat()
        if emp.get("resignation_applied_at")
        else None,
        "resignation_notice_end": emp.get("resignation_notice_end"),
        "resignation_reviewed_at": emp.get("resignation_reviewed_at").isoformat()
        if emp.get("resignation_reviewed_at")
        else None,
        "resignation_reviewed_by_name": emp.get("resignation_reviewed_by_name"),
        "resignation_review_comment": emp.get("resignation_review_comment"),
        "resignation_completed_at": emp.get("resignation_completed_at").isoformat()
        if emp.get("resignation_completed_at")
        else None,
        "status": emp.get("status"),
        "notice_period_days": _get_notice_period_days(),   # ✅ Send to frontend
    }


def cancel_resignation(employee_id):
    """Employee cancels own pending resignation."""
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    if emp.get("resignation_status") != "Pending":
        raise ValueError("No pending resignation to cancel")

    employees().update_one(
        {"_id": oid},
        {
            "$set": {
                "resignation_status": "None",
                "resignation_reason": None,
                "resignation_last_day": None,
                "resignation_applied_at": None,
                "updated_at": _now(),
            }
        },
    )
    return True


# ============================================
# MANAGER
# ============================================

def list_resignations(status=None, search=None):
    """Manager: list resignation requests."""
    query = {"resignation_status": {"$ne": "None"}}

    if status and status in ("Pending", "Accepted", "Rejected", "Completed"):
        query["resignation_status"] = status

    docs = list(employees().find(query).sort("resignation_applied_at", -1))

    result = []
    for emp in docs:
        if search:
            s = search.lower()
            name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".lower()
            code = (emp.get("employee_code") or "").lower()
            if s not in name and s not in code:
                continue

        result.append({
            "_id": str(emp["_id"]),
            "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
            "employee_code": emp.get("employee_code"),
            "email": None,
            "resignation_status": emp.get("resignation_status"),
            "resignation_reason": emp.get("resignation_reason"),
            "resignation_last_day": emp.get("resignation_last_day"),
            "resignation_applied_at": emp.get("resignation_applied_at").isoformat()
            if emp.get("resignation_applied_at")
            else None,
            "resignation_notice_end": emp.get("resignation_notice_end"),
            "resignation_reviewed_by_name": emp.get("resignation_reviewed_by_name"),
            "resignation_reviewed_at": emp.get("resignation_reviewed_at").isoformat()
            if emp.get("resignation_reviewed_at")
            else None,
            "resignation_review_comment": emp.get("resignation_review_comment"),
            "resignation_completed_at": emp.get("resignation_completed_at").isoformat()
            if emp.get("resignation_completed_at")
            else None,
            "status": emp.get("status"),
        })

    return result


def review_resignation(emp_id, manager_emp_id, action, comment="", notice_end=None):
    """
    Manager approves/rejects resignation.
    action: "Accept" | "Reject"
    notice_end: YYYY-MM-DD (required if Accept)
    """
    oid = _oid(emp_id)
    mgr_oid = _oid(manager_emp_id)
    if not oid or not mgr_oid:
        raise ValueError("Invalid IDs")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    if emp.get("resignation_status") != "Pending":
        raise ValueError(f"Cannot review resignation in '{emp.get('resignation_status')}' status")

    mgr = employees().find_one({"_id": mgr_oid})
    mgr_name = (
        f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
        if mgr
        else "Manager"
    )

    now = _now()
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

    if action == "Accept":
        if not notice_end:
            raise ValueError("Notice period end date is required")

        notice_date = _parse_date(notice_end)
        if not notice_date:
            raise ValueError("Invalid notice end date")

        today = now_ist().date()
        if notice_date < today:
            raise ValueError("Notice end date cannot be in the past")

        employees().update_one(
            {"_id": oid},
            {
                "$set": {
                    "resignation_status": "Accepted",
                    "resignation_notice_end": notice_end,
                    "resignation_reviewed_by": mgr_oid,
                    "resignation_reviewed_by_name": mgr_name,
                    "resignation_reviewed_at": now,
                    "resignation_review_comment": (comment or "").strip(),
                    "status": "RESIGNED",
                    "updated_at": now,
                }
            },
        )

        notifications().insert_one({
            "employee_id": oid,
            "title": "Resignation Accepted",
            "message": f"Your resignation has been accepted. Last working day: {notice_end}.",
            "type": "RESIGNATION_ACCEPTED",
            "link": "/employee/resignation",
            "related_id": oid,
            "from_employee_id": mgr_oid,
            "from_name": mgr_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    elif action == "Reject":
        if not comment.strip():
            raise ValueError("Reason required for rejection")

        employees().update_one(
            {"_id": oid},
            {
                "$set": {
                    "resignation_status": "Rejected",
                    "resignation_reviewed_by": mgr_oid,
                    "resignation_reviewed_by_name": mgr_name,
                    "resignation_reviewed_at": now,
                    "resignation_review_comment": comment.strip(),
                    "updated_at": now,
                }
            },
        )

        notifications().insert_one({
            "employee_id": oid,
            "title": "Resignation Rejected",
            "message": f"Your resignation was rejected. Reason: {comment}",
            "type": "RESIGNATION_REJECTED",
            "link": "/employee/resignation",
            "related_id": oid,
            "from_employee_id": mgr_oid,
            "from_name": mgr_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    else:
        raise ValueError("Invalid action")

    return True


# ============================================
# EDIT NOTICE (Last Working Day update)
# ============================================

def edit_resignation_notice(emp_id, manager_emp_id, new_last_day, reason=None):
    """Manager edits last working day after acceptance."""
    oid = _oid(emp_id)
    mgr_oid = _oid(manager_emp_id)
    if not oid or not mgr_oid:
        raise ValueError("Invalid IDs")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    if emp.get("resignation_status") != "Accepted":
        raise ValueError(
            f"Cannot edit — resignation is in '{emp.get('resignation_status')}' status. "
            "Only accepted resignations can be edited."
        )

    notice_date = _parse_date(new_last_day)
    if not notice_date:
        raise ValueError("Valid last working day required")

    today = now_ist().date()
    if notice_date < today:
        raise ValueError("Last working day cannot be in the past")

    mgr = employees().find_one({"_id": mgr_oid})
    mgr_name = (
        f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
        if mgr
        else "Manager"
    )

    now = _now()
    update_data = {
        "resignation_notice_end": new_last_day,
        "resignation_review_comment": (reason or "").strip(),
        "resignation_reviewed_by": mgr_oid,
        "resignation_reviewed_by_name": mgr_name,
        "resignation_reviewed_at": now,
        "updated_at": now,
    }

    employees().update_one({"_id": oid}, {"$set": update_data})

    notifications().insert_one({
        "employee_id": oid,
        "title": "Last Working Day Updated",
        "message": f"Your last working day has been updated to {new_last_day}.",
        "type": "RESIGNATION_UPDATED",
        "link": "/employee/resignation",
        "related_id": oid,
        "from_employee_id": mgr_oid,
        "from_name": mgr_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    return True


def complete_resignation(emp_id, manager_emp_id):
    """Manager completes the resignation — employee becomes fully inactive."""
    oid = _oid(emp_id)
    mgr_oid = _oid(manager_emp_id)
    if not oid or not mgr_oid:
        raise ValueError("Invalid IDs")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    if emp.get("resignation_status") != "Accepted":
        raise ValueError("Only accepted resignations can be completed")

    mgr = employees().find_one({"_id": mgr_oid})
    mgr_name = (
        f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
        if mgr
        else "Manager"
    )

    now = _now()

    employees().update_one(
        {"_id": oid},
        {
            "$set": {
                "resignation_status": "Completed",
                "resignation_completed_at": now,
                "status": "RESIGNED",
                "updated_at": now,
            }
        },
    )

    from app.db import users
    users().update_one(
        {"_id": emp["user_id"]},
        {"$set": {"is_active": False, "updated_at": now}},
    )

    notifications().insert_one({
        "employee_id": oid,
        "title": "Resignation Completed",
        "message": f"Your resignation is now complete. Thank you for your service.",
        "type": "RESIGNATION_COMPLETED",
        "link": "/employee/resignation",
        "related_id": oid,
        "from_employee_id": mgr_oid,
        "from_name": mgr_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    return True


def stats():
    """Manager dashboard stats."""
    return {
        "pending": employees().count_documents({"resignation_status": "Pending"}),
        "accepted": employees().count_documents({"resignation_status": "Accepted"}),
        "rejected": employees().count_documents({"resignation_status": "Rejected"}),
        "completed": employees().count_documents({"resignation_status": "Completed"}),
        "resigned": employees().count_documents({"status": "RESIGNED"}),
    }