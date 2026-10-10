from datetime import datetime, date, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from app.db import leave_requests, leave_types, employees, notifications
from app.utils.helpers import serialize, serialize_list
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _parse_date(s):
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


# ============================================
# FINANCIAL YEAR HELPERS (Apr-Mar)
# ============================================

def get_financial_year(ref_date=None):
    """
    Returns (start_date, end_date, fy_label) for the given date's FY.
    Indian FY: April 1 - March 31
    """
    d = ref_date or date.today()
    if isinstance(d, datetime):
        d = d.date()

    if d.month >= 4:
        start = date(d.year, 4, 1)
        end = date(d.year + 1, 3, 31)
        label = f"FY {d.year}-{str(d.year + 1)[2:]}"
    else:
        start = date(d.year - 1, 4, 1)
        end = date(d.year, 3, 31)
        label = f"FY {d.year - 1}-{str(d.year)[2:]}"

    return start, end, label


# ============================================
# DEFAULT LEAVE TYPES (CL + SL only)
# ============================================

DEFAULT_LEAVE_TYPES = [
    {"name": "Casual Leave", "max_days_per_year": 12, "code": "CL"},
    {"name": "Sick Leave", "max_days_per_year": 12, "code": "SL"},
]


def ensure_default_leave_types():
    """
    Auto-seed CL + SL if not exist.
    Deactivate Earned Leave, Unpaid Leave, and any other types.
    """
    try:
        # Ensure CL + SL exist and are active
        for lt in DEFAULT_LEAVE_TYPES:
            existing = leave_types().find_one({"name": lt["name"]})
            if not existing:
                now = now_ist()
                leave_types().insert_one({
                    "name": lt["name"],
                    "code": lt["code"],
                    "max_days_per_year": lt["max_days_per_year"],
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                })
            else:
                # Ensure settings are correct
                leave_types().update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "is_active": True,
                        "max_days_per_year": lt["max_days_per_year"],
                        "code": lt.get("code", existing.get("code", "")),
                        "updated_at": now_ist(),
                    }},
                )

        # Deactivate everything else (Earned, Unpaid, etc.)
        allowed_names = [lt["name"] for lt in DEFAULT_LEAVE_TYPES]
        leave_types().update_many(
            {"name": {"$nin": allowed_names}, "is_active": True},
            {"$set": {"is_active": False, "updated_at": now_ist()}},
        )
    except Exception as e:
        print(f"[Leave Types] Seed failed: {e}")


# ============================================
# Leave Types
# ============================================

def list_leave_types():
    """List only active leave types (CL + SL)."""
    ensure_default_leave_types()
    docs = list(leave_types().find({"is_active": True}).sort("name", 1))
    return serialize_list(docs)


# ============================================
# SANDWICH LEAVE DETECTION
# ============================================

def _check_sandwich(employee_id, start, end, leave_type_code):
    """
    Detect sandwich: If casual leave is taken on Friday and Monday,
    the weekend in between is automatically counted.
    Our simple rule: enforce minimum 3-day continuous leave if spanning weekend.
    Actually simplest: Weekend days WITHIN the leave range are counted (auto in days diff).
    This check ensures no separate Fri + Mon pattern.
    """
    oid = _oid(employee_id)
    if not oid:
        return

    # Check if employee has an approved/pending leave immediately before or after
    # that would create a sandwich pattern
    if leave_type_code != "CL":
        return  # Sandwich rule only for Casual Leave

    # Look for existing leave within 4 days before/after
    window_start = (start - timedelta(days=4)).isoformat()
    window_end = (end + timedelta(days=4)).isoformat()

    existing = list(leave_requests().find({
        "employee_id": oid,
        "status": {"$in": ["Pending", "Approved"]},
        "start_date": {"$lte": window_end},
        "end_date": {"$gte": window_start},
    }))

    for ex in existing:
        ex_start = _parse_date(ex["start_date"])
        ex_end = _parse_date(ex["end_date"])
        if not ex_start or not ex_end:
            continue

        # If existing leave ends just before this one (within 1-2 days gap that is weekend)
        # Or starts just after this one
        gap_after = (start - ex_end).days - 1
        gap_before = (ex_start - end).days - 1

        if 0 < gap_after <= 3 or 0 < gap_before <= 3:
            # Sandwich detected
            raise ValueError(
                "Sandwich leave not allowed. Cannot take separate leaves with "
                "weekend gap. Please apply as a single continuous leave."
            )


# ============================================
# Employee side
# ============================================

def apply_leave(employee_id, data):
    """Employee applies for leave."""
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    leave_type_id = _oid(data.get("leave_type_id"))
    if not leave_type_id:
        raise ValueError("Leave type is required")

    start = _parse_date(data.get("start_date"))
    end = _parse_date(data.get("end_date"))
    if not start or not end:
        raise ValueError("Valid start and end dates required")
    if end < start:
        raise ValueError("End date must be after start date")

    today = date.today()
    is_same_day = start == today
    is_past = start < today

    if is_past:
        raise ValueError("Cannot apply leave for past dates")

    # Get leave type
    lt = leave_types().find_one({"_id": leave_type_id, "is_active": True})
    if not lt:
        raise ValueError("Invalid or inactive leave type")

    lt_code = lt.get("code", "")
    lt_name = lt["name"]

    # Sick leave: allow same day
    # Casual leave: allow same day but flag it
    same_day_flag = is_same_day and lt_code == "CL"

    # ============================================
    # Check FY-based balance
    # ============================================
    fy_start, fy_end, fy_label = get_financial_year(start)
    current_fy_start, current_fy_end, _ = get_financial_year(today)

    # Ensure leave is within current FY (or next FY if applying in advance)
    if start < current_fy_start or end > current_fy_end:
        raise ValueError(
            "Leave dates must be within current financial year "
            f"({current_fy_start.strftime('%d %b %Y')} - {current_fy_end.strftime('%d %b %Y')})"
        )

    # Calculate days requested
    total_days = (end - start).days + 1

    # Get existing usage in current FY
    usage_pipeline = [
        {
            "$match": {
                "employee_id": oid,
                "leave_type_id": leave_type_id,
                "status": {"$in": ["Pending", "Approved"]},
                "start_date": {
                    "$gte": current_fy_start.isoformat(),
                    "$lte": current_fy_end.isoformat(),
                },
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$total_days"}}},
    ]
    usage_res = list(leave_requests().aggregate(usage_pipeline))
    used_days = usage_res[0]["total"] if usage_res else 0

    max_days = lt.get("max_days_per_year", 12)
    available = max_days - used_days

    if total_days > available:
        raise ValueError(
            f"Insufficient balance. You have {available} day(s) of {lt_name} "
            f"remaining (used {used_days}/{max_days})."
        )

    # ============================================
    # Check overlap
    # ============================================
    overlapping = leave_requests().find_one({
        "employee_id": oid,
        "status": {"$in": ["Pending", "Approved"]},
        "start_date": {"$lte": data["end_date"]},
        "end_date": {"$gte": data["start_date"]},
    })
    if overlapping:
        raise ValueError("You already have a leave request for these dates")

    # ============================================
    # Sandwich check
    # ============================================
    _check_sandwich(oid, start, end, lt_code)

    # ============================================
    # Insert leave request
    # ============================================
    now = now_ist()
    result = leave_requests().insert_one({
        "employee_id": oid,
        "leave_type_id": leave_type_id,
        "start_date": data["start_date"],
        "end_date": data["end_date"],
        "total_days": total_days,
        "reason": (data.get("reason") or "").strip(),
        "status": "Pending",
        "is_same_day": same_day_flag,
        "fy_label": fy_label,
        "reviewed_by": None,
        "reviewed_at": None,
        "manager_comment": "",
        "created_at": now,
        "updated_at": now,
    })

    # ============================================
    # Notify all managers
    # ============================================
    emp = employees().find_one({"_id": oid})
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "Employee"

    from app.db import users
    manager_users = list(users().find({"role": "MANAGER", "is_active": True}))

    days_str = f"{total_days} day" + ("s" if total_days > 1 else "")
    same_day_text = " [SAME DAY]" if same_day_flag else ""

    for mu in manager_users:
        mgr_emp = employees().find_one({"user_id": mu["_id"]})
        if mgr_emp:
            notifications().insert_one({
                "employee_id": mgr_emp["_id"],
                "title": f"Leave Applied{same_day_text}",
                "message": f"{emp_name} applied for {lt_name} ({days_str})",
                "type": "LEAVE_APPLIED",
                "link": "/manager/leaves",
                "related_id": result.inserted_id,
                "is_read": False,
                "read_at": None,
                "created_at": now,
            })

    return str(result.inserted_id)


def my_leaves(employee_id):
    """Get employee's own leave requests with reviewer info."""
    oid = _oid(employee_id)
    if not oid:
        return []

    docs = list(
        leave_requests()
        .find({"employee_id": oid})
        .sort("created_at", -1)
    )

    for d in docs:
        lt = leave_types().find_one({"_id": d["leave_type_id"]})
        d["leave_type_name"] = lt["name"] if lt else "Unknown"
        d["leave_type_code"] = lt.get("code", "") if lt else ""

        reviewer_name = None
        if d.get("reviewed_by"):
            rev = employees().find_one({"_id": d["reviewed_by"]})
            if rev:
                reviewer_name = f"{rev.get('first_name', '')} {rev.get('last_name', '')}".strip()
        d["reviewer_name"] = reviewer_name

    return serialize_list(docs)


def cancel_leave(employee_id, leave_id):
    """Employee cancels own pending leave."""
    emp_oid = _oid(employee_id)
    leave_oid = _oid(leave_id)
    if not emp_oid or not leave_oid:
        return 0

    r = leave_requests().update_one(
        {
            "_id": leave_oid,
            "employee_id": emp_oid,
            "status": "Pending",
        },
        {
            "$set": {
                "status": "Cancelled",
                "updated_at": now_ist(),
            }
        },
    )
    return r.modified_count


def my_leave_stats(employee_id):
    """
    FY-based stats for CL and SL.
    Returns list with: name, code, total, used, available, fy_label.
    """
    oid = _oid(employee_id)
    if not oid:
        return []

    ensure_default_leave_types()

    fy_start, fy_end, fy_label = get_financial_year()
    types = list(leave_types().find({"is_active": True}).sort("name", 1))

    stats = []
    for lt in types:
        pipeline = [
            {
                "$match": {
                    "employee_id": oid,
                    "leave_type_id": lt["_id"],
                    "status": "Approved",
                    "start_date": {
                        "$gte": fy_start.isoformat(),
                        "$lte": fy_end.isoformat(),
                    },
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$total_days"}}},
        ]
        result = list(leave_requests().aggregate(pipeline))
        used_days = result[0]["total"] if result else 0

        max_days = lt.get("max_days_per_year", 12)

        stats.append({
            "leave_type_id": str(lt["_id"]),
            "name": lt["name"],
            "code": lt.get("code", ""),
            "total": max_days,
            "used": used_days,
            "available": max(0, max_days - used_days),
            "fy_label": fy_label,
            "fy_start": fy_start.isoformat(),
            "fy_end": fy_end.isoformat(),
        })

    return stats


# ============================================
# Manager side
# ============================================

def list_all_leaves(status=None, search=None):
    """Manager: list all leave requests."""
    query = {}
    if status and status in ("Pending", "Approved", "Rejected", "Cancelled"):
        query["status"] = status

    docs = list(leave_requests().find(query).sort("created_at", -1))

    result = []
    for d in docs:
        emp = employees().find_one({"_id": d["employee_id"]})
        lt = leave_types().find_one({"_id": d["leave_type_id"]})

        emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}" if emp else "Unknown"
        emp_code = emp.get("employee_code") if emp else None
        lt_name = lt["name"] if lt else "Unknown"
        lt_code = lt.get("code", "") if lt else ""

        if search:
            s = search.lower()
            if s not in emp_name.lower() and s not in (emp_code or "").lower():
                continue

        reviewer_name = None
        if d.get("reviewed_by"):
            reviewer = employees().find_one({"_id": d["reviewed_by"]})
            if reviewer:
                reviewer_name = f"{reviewer.get('first_name', '')} {reviewer.get('last_name', '')}"

        d["employee_name"] = emp_name
        d["employee_code"] = emp_code
        d["leave_type_name"] = lt_name
        d["leave_type_code"] = lt_code
        d["reviewer_name"] = reviewer_name
        result.append(d)

    return serialize_list(result)


def leave_stats():
    """Manager dashboard stats."""
    return {
        "pending": leave_requests().count_documents({"status": "Pending"}),
        "approved": leave_requests().count_documents({"status": "Approved"}),
        "rejected": leave_requests().count_documents({"status": "Rejected"}),
        "total": leave_requests().count_documents({}),
    }


def review_leave(leave_id, manager_employee_id, action, comment=""):
    """Manager approves/rejects a leave."""
    leave_oid = _oid(leave_id)
    mgr_oid = _oid(manager_employee_id)
    if not leave_oid:
        raise ValueError("Invalid leave ID")

    if action not in ("Approved", "Rejected"):
        raise ValueError("Invalid action")

    leave = leave_requests().find_one({"_id": leave_oid})
    if not leave:
        raise ValueError("Leave not found")
    if leave["status"] != "Pending":
        raise ValueError(f"Leave already {leave['status']}")

    now = now_ist()
    leave_requests().update_one(
        {"_id": leave_oid},
        {
            "$set": {
                "status": action,
                "reviewed_by": mgr_oid,
                "reviewed_at": now,
                "manager_comment": (comment or "").strip(),
                "updated_at": now,
            }
        },
    )

    lt = leave_types().find_one({"_id": leave["leave_type_id"]})
    lt_name = lt["name"] if lt else "Leave"

    notifications().insert_one({
        "employee_id": leave["employee_id"],
        "title": f"Leave {action}",
        "message": f"Your {lt_name} leave has been {action.lower()}",
        "type": "LEAVE_APPROVED" if action == "Approved" else "LEAVE_REJECTED",
        "link": "/employee/leaves",
        "related_id": leave_oid,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    return True


def get_pending_reminders():
    """
    Returns upcoming leaves starting tomorrow — for scheduler/cron.
    Use this with a daily scheduler (e.g., cron job) to send reminders.
    """
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    docs = list(leave_requests().find({
        "status": "Approved",
        "start_date": tomorrow,
    }))

    reminders = []
    for d in docs:
        emp = employees().find_one({"_id": d["employee_id"]})
        lt = leave_types().find_one({"_id": d["leave_type_id"]})
        reminders.append({
            "employee_id": str(d["employee_id"]),
            "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "",
            "leave_type": lt["name"] if lt else "Leave",
            "start_date": d["start_date"],
            "end_date": d["end_date"],
            "leave_id": str(d["_id"]),
        })
    return reminders