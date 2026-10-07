# from datetime import datetime, date, timedelta
# from calendar import monthrange
# from bson import ObjectId
# from bson.errors import InvalidId
# from app.db import (
#     employees, attendance, forgot_logout_requests,
#     notifications, users, company_settings, shifts,
# )
# from app.utils.helpers import serialize, serialize_list


# def _oid(s):
#     try:
#         return ObjectId(s)
#     except (InvalidId, TypeError):
#         return None


# def _now():
#     return datetime.utcnow()


# def _parse_date(s):
#     if not s:
#         return None
#     try:
#         return datetime.strptime(s, "%Y-%m-%d").date()
#     except Exception:
#         return None


# # ============================================
# # CONFIG HELPERS
# # ============================================

# def _get_config():
#     doc = company_settings().find_one({"_id": "company_config"}) or {}
#     return {
#         "enabled": doc.get("forgot_logout_enabled", True),
#         "max_per_month": doc.get("forgot_logout_max_per_month", 3),
#         "fine_amount": doc.get("forgot_logout_fine_amount", 200),
#     }


# def _get_shift_end_for(employee_id, target_date_str):
#     """Compute the shift end datetime for the given date."""
#     # Handle both ObjectId and string
#     if isinstance(employee_id, ObjectId):
#         oid = employee_id
#     else:
#         oid = _oid(employee_id)
#     if not oid:
#         return None

#     emp = employees().find_one({"_id": oid}, {"shift_id": 1})
#     start_h, start_m, end_h, end_m = 9, 30, 17, 30

#     if emp and emp.get("shift_id"):
#         sh = shifts().find_one({"_id": emp["shift_id"]})
#         if sh:
#             try:
#                 start_h, start_m = map(int, sh["start_time"].split(":"))
#                 end_h, end_m = map(int, sh["end_time"].split(":"))
#             except Exception:
#                 pass
#     else:
#         doc = company_settings().find_one({"_id": "company_config"}) or {}
#         try:
#             start_h, start_m = map(int, doc.get("work_start_time", "09:30").split(":"))
#             end_h, end_m = map(int, doc.get("work_end_time", "17:30").split(":"))
#         except Exception:
#             pass

#     d = _parse_date(target_date_str)
#     if not d:
#         return None

#     base = datetime(d.year, d.month, d.day, end_h, end_m, 0, 0)
#     if (end_h, end_m) <= (start_h, start_m):
#         base = base + timedelta(days=1)
#     return base


# # ============================================
# # DETECT FORGOTTEN LOGOUT
# # ============================================

# def get_unclosed_sessions(employee_id):
#     """
#     Return unclosed past attendance records (not today).
#     Excludes:
#     - Records with an APPROVED forgot-logout request
#     - Records that are auto_closed
#     """
#     oid = _oid(employee_id)
#     if not oid:
#         return []

#     today_str = date.today().isoformat()
#     query = {
#         "employee_id": oid,
#         "date": {"$lt": today_str},
#         "check_in": {"$ne": None},
#         "check_out": None,
#         "auto_closed": {"$ne": True},
#     }
#     records = list(attendance().find(query).sort("date", 1))

#     result = []
#     for r in records:
#         approved = forgot_logout_requests().find_one({
#             "employee_id": oid,
#             "date": r["date"],
#             "status": "Approved",
#         })
#         if approved:
#             continue
#         result.append(r)
#     return result


# def check_in_eligibility(employee_id):
#     """
#     Returns:
#       {"allowed": True} if employee can check-in
#       {"allowed": False, ...} if blocked
#     """
#     config = _get_config()
#     if not config["enabled"]:
#         return {"allowed": True}

#     unclosed = get_unclosed_sessions(employee_id)
#     if not unclosed:
#         return {"allowed": True}

#     oldest = unclosed[0]
#     return {
#         "allowed": False,
#         "blocked_date": oldest["date"],
#         "total_unclosed": len(unclosed),
#         "reason": "FORGOT_LOGOUT",
#     }


# # ============================================
# # MONTHLY COUNT + FINE
# # ============================================

# def get_monthly_usage(employee_id, year=None, month=None):
#     oid = _oid(employee_id)
#     if not oid:
#         return 0

#     today = date.today()
#     y = year or today.year
#     m = month or today.month

#     first = date(y, m, 1).isoformat()
#     last = date(y, m, monthrange(y, m)[1]).isoformat()

#     return forgot_logout_requests().count_documents({
#         "employee_id": oid,
#         "date": {"$gte": first, "$lte": last},
#         "status": {"$in": ["Pending", "Approved"]},
#     })


# def calculate_fine(employee_id, year=None, month=None):
#     config = _get_config()
#     usage = get_monthly_usage(employee_id, year, month)
#     max_allowed = config["max_per_month"]
#     fine_amount = config["fine_amount"]

#     excess = max(0, usage - max_allowed)
#     total_fine = excess * fine_amount

#     return {
#         "usage": usage,
#         "max_allowed": max_allowed,
#         "excess": excess,
#         "fine_per_occurrence": fine_amount,
#         "total_fine": total_fine,
#     }


# def get_fine_details_for_month(employee_id, year=None, month=None):
#     """Return list of fined occurrences (date + amount)."""
#     oid = _oid(employee_id)
#     if not oid:
#         return []

#     today = date.today()
#     y = year or today.year
#     m = month or today.month

#     first = date(y, m, 1).isoformat()
#     last = date(y, m, monthrange(y, m)[1]).isoformat()

#     config = _get_config()
#     max_allowed = config["max_per_month"]
#     fine_amount = config["fine_amount"]

#     requests = list(
#         forgot_logout_requests()
#         .find({
#             "employee_id": oid,
#             "date": {"$gte": first, "$lte": last},
#             "status": "Approved",
#         })
#         .sort("date", 1)
#     )

#     details = []
#     for idx, req in enumerate(requests):
#         if idx >= max_allowed:
#             details.append({
#                 "date": req["date"],
#                 "amount": fine_amount,
#                 "reason": req.get("reason", ""),
#             })
#     return details


# # ============================================
# # EMPLOYEE: SEND REQUEST
# # ============================================

# def send_request(employee_id, data):
#     oid = _oid(employee_id)
#     if not oid:
#         raise ValueError("Invalid employee ID")

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         raise ValueError("Employee not found")

#     reason = (data.get("reason") or "").strip()
#     if not reason or len(reason) < 10:
#         raise ValueError("Please provide a detailed reason (min 10 characters)")

#     unclosed = get_unclosed_sessions(employee_id)
#     if not unclosed:
#         raise ValueError("No forgotten logout found for you")

#     target = unclosed[0]

#     existing = forgot_logout_requests().find_one({
#         "employee_id": oid,
#         "date": target["date"],
#         "status": "Pending",
#     })
#     if existing:
#         raise ValueError("You already have a pending request for this date")

#     now = _now()
#     emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

#     result = forgot_logout_requests().insert_one({
#         "employee_id": oid,
#         "employee_name": emp_name,
#         "employee_code": emp.get("employee_code"),
#         "date": target["date"],
#         "attendance_id": target["_id"],
#         "reason": reason,
#         "status": "Pending",
#         "reviewed_by": None,
#         "reviewed_by_name": None,
#         "reviewed_at": None,
#         "review_comment": "",
#         "is_fine_applied": False,
#         "created_at": now,
#         "updated_at": now,
#     })

#     manager_users = list(users().find({"role": "MANAGER", "is_active": True}))
#     for mu in manager_users:
#         mgr_emp = employees().find_one({"user_id": mu["_id"]})
#         if mgr_emp:
#             notifications().insert_one({
#                 "employee_id": mgr_emp["_id"],
#                 "title": "Forgot Logout Request",
#                 "message": f"{emp_name} ({emp.get('employee_code')}) forgot to logout on {target['date']}",
#                 "type": "FORGOT_LOGOUT_REQUEST",
#                 "link": "/manager/forgot-logout",
#                 "related_id": result.inserted_id,
#                 "from_employee_id": oid,
#                 "from_name": emp_name,
#                 "is_read": False,
#                 "read_at": None,
#                 "created_at": now,
#             })

#     return str(result.inserted_id)


# def my_requests(employee_id, limit=20):
#     oid = _oid(employee_id)
#     if not oid:
#         return []

#     docs = list(
#         forgot_logout_requests()
#         .find({"employee_id": oid})
#         .sort("created_at", -1)
#         .limit(limit)
#     )
#     return serialize_list(docs)


# # ============================================
# # MANAGER: LIST / REVIEW
# # ============================================

# def list_requests(status=None, search=None):
#     query = {}
#     if status and status in ("Pending", "Approved", "Rejected"):
#         query["status"] = status

#     docs = list(forgot_logout_requests().find(query).sort("created_at", -1))

#     result = []
#     for d in docs:
#         if search:
#             s = search.lower()
#             name = (d.get("employee_name") or "").lower()
#             code = (d.get("employee_code") or "").lower()
#             if s not in name and s not in code:
#                 continue
#         result.append(serialize(d))
#     return result


# def review_request(req_id, manager_emp_id, action, comment=""):
#     """
#     Manager approves/rejects a forgot-logout request.
#     action: "Approve" | "Reject"
#     """
#     rid = _oid(req_id)
#     mgr_oid = _oid(manager_emp_id)
#     if not rid or not mgr_oid:
#         raise ValueError("Invalid IDs")

#     req = forgot_logout_requests().find_one({"_id": rid})
#     if not req:
#         raise ValueError("Request not found")

#     if req.get("status") != "Pending":
#         raise ValueError(f"Cannot review request in '{req.get('status')}' status")

#     mgr = employees().find_one({"_id": mgr_oid})
#     mgr_name = (
#         f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
#         if mgr
#         else "Manager"
#     )

#     now = _now()
#     emp_oid = req["employee_id"]

#     # ============================================
#     # APPROVE
#     # ============================================
#     if action == "Approve":
#         # Find the attendance record
#         auto_close_time = _get_shift_end_for(emp_oid, req["date"])
#         att_id = req.get("attendance_id")

#         att = None
#         if att_id:
#             att = attendance().find_one({"_id": att_id})
#         if not att:
#             att = attendance().find_one({
#                 "employee_id": emp_oid,
#                 "date": req["date"],
#                 "check_out": None,
#             })

#         if att and att.get("check_in"):
#             # Fallback: shift-end not found, use check_in + 8 hours
#             if auto_close_time is None:
#                 auto_close_time = att["check_in"] + timedelta(hours=8)

#             delta = auto_close_time - att["check_in"]
#             working_hours = round(delta.total_seconds() / 3600, 2)

#             attendance().update_one(
#                 {"_id": att["_id"]},
#                 {
#                     "$set": {
#                         "check_out": auto_close_time,
#                         "working_hours": working_hours,
#                         "status": "PRESENT" if working_hours >= 4 else "HALF_DAY",
#                         "auto_closed": True,
#                         "auto_closed_reason": "Forgot logout — approved by manager",
#                         "updated_at": now,
#                     }
#                 },
#             )

#         forgot_logout_requests().update_one(
#             {"_id": rid},
#             {
#                 "$set": {
#                     "status": "Approved",
#                     "reviewed_by": mgr_oid,
#                     "reviewed_by_name": mgr_name,
#                     "reviewed_at": now,
#                     "review_comment": (comment or "").strip(),
#                     "updated_at": now,
#                 }
#             },
#         )

#         notifications().insert_one({
#             "employee_id": emp_oid,
#             "title": "Forgot Logout — Approved",
#             "message": f"Your forgot-logout request for {req['date']} was approved. You can now check-in.",
#             "type": "FORGOT_LOGOUT_APPROVED",
#             "link": "/employee/dashboard",
#             "related_id": rid,
#             "from_employee_id": mgr_oid,
#             "from_name": mgr_name,
#             "is_read": False,
#             "read_at": None,
#             "created_at": now,
#         })

#     # ============================================
#     # REJECT
#     # ============================================
#     elif action == "Reject":
#         if not (comment or "").strip():
#             raise ValueError("Reason required for rejection")

#         forgot_logout_requests().update_one(
#             {"_id": rid},
#             {
#                 "$set": {
#                     "status": "Rejected",
#                     "reviewed_by": mgr_oid,
#                     "reviewed_by_name": mgr_name,
#                     "reviewed_at": now,
#                     "review_comment": comment.strip(),
#                     "updated_at": now,
#                 }
#             },
#         )

#         notifications().insert_one({
#             "employee_id": emp_oid,
#             "title": "Forgot Logout — Rejected",
#             "message": f"Your forgot-logout request was rejected: {comment}",
#             "type": "FORGOT_LOGOUT_REJECTED",
#             "link": "/employee/dashboard",
#             "related_id": rid,
#             "from_employee_id": mgr_oid,
#             "from_name": mgr_name,
#             "is_read": False,
#             "read_at": None,
#             "created_at": now,
#         })
#     else:
#         raise ValueError("Invalid action")

#     return True


# def stats():
#     return {
#         "pending": forgot_logout_requests().count_documents({"status": "Pending"}),
#         "approved": forgot_logout_requests().count_documents({"status": "Approved"}),
#         "rejected": forgot_logout_requests().count_documents({"status": "Rejected"}),
#     }

# def auto_close_previous_sessions(employee_id):
#     """
#     Auto-close ALL unclosed past sessions at shift end time.
#     Called automatically before next check-in.
#     """
#     oid = _oid(employee_id)
#     if not oid:
#         return 0

#     today_str = date.today().isoformat()
#     unclosed = list(
#         attendance().find({
#             "employee_id": oid,
#             "date": {"$lt": today_str},
#             "check_in": {"$ne": None},
#             "check_out": None,
#             "auto_closed": {"$ne": True},
#         }).sort("date", 1)
#     )

#     closed_count = 0
#     for record in unclosed:
#         auto_close_time = _get_shift_end_for(oid, record["date"])
#         if auto_close_time is None:
#             auto_close_time = record["check_in"] + timedelta(hours=8)

#         delta = auto_close_time - record["check_in"]
#         working_hours = round(delta.total_seconds() / 3600, 2)

#         attendance().update_one(
#             {"_id": record["_id"]},
#             {"$set": {
#                 "check_out": auto_close_time,
#                 "working_hours": working_hours,
#                 "status": "PRESENT" if working_hours >= 4 else "HALF_DAY",
#                 "auto_closed": True,
#                 "auto_closed_reason": "Auto-closed on next check-in (forgot logout)",
#                 "updated_at": _now(),
#             }}
#         )
#         closed_count += 1

#     return closed_count


# def get_active_session(employee_id):
#     """
#     Return the active/running session for timer display.
#     Priority: today's active > oldest past unclosed
#     """
#     oid = _oid(employee_id)
#     if not oid:
#         return None

#     today_str = date.today().isoformat()

#     # Check today's active session first
#     today_active = attendance().find_one({
#         "employee_id": oid,
#         "date": today_str,
#         "check_in": {"$ne": None},
#         "check_out": None,
#     })
#     if today_active:
#         return {
#             "date": today_active["date"],
#             "check_in": today_active["check_in"].isoformat()
#             if today_active.get("check_in") else None,
#             "is_overnight": False,
#             "days_pending": 0,
#         }

#     # Check for unclosed past sessions (oldest first)
#     past = attendance().find_one(
#         {
#             "employee_id": oid,
#             "date": {"$lt": today_str},
#             "check_in": {"$ne": None},
#             "check_out": None,
#             "auto_closed": {"$ne": True},
#         },
#         sort=[("date", 1)]
#     )
#     if past:
#         # Calculate how many days pending
#         try:
#             past_date = _parse_date(past["date"])
#             days_pending = (date.today() - past_date).days
#         except Exception:
#             days_pending = 0

#         return {
#             "date": past["date"],
#             "check_in": past["check_in"].isoformat()
#             if past.get("check_in") else None,
#             "is_overnight": True,
#             "days_pending": days_pending,
#         }

#     return None




from datetime import datetime, date, timedelta
from calendar import monthrange
from bson import ObjectId
from bson.errors import InvalidId
from app.db import (
    employees, attendance, forgot_logout_requests,
    notifications, users, company_settings, shifts,
)
from app.utils.helpers import serialize, serialize_list


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.utcnow()


def _parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


# ============================================
# CONFIG HELPERS
# ============================================

def _get_config():
    doc = company_settings().find_one({"_id": "company_config"}) or {}
    return {
        "enabled": doc.get("forgot_logout_enabled", True),
        "max_per_month": doc.get("forgot_logout_max_per_month", 3),
        "fine_amount": doc.get("forgot_logout_fine_amount", 200),
    }


def _get_shift_end_for(employee_id, target_date_str):
    """Compute the shift end datetime for the given date."""
    if isinstance(employee_id, ObjectId):
        oid = employee_id
    else:
        oid = _oid(employee_id)
    if not oid:
        return None

    emp = employees().find_one({"_id": oid}, {"shift_id": 1})
    start_h, start_m, end_h, end_m = 9, 30, 17, 30

    if emp and emp.get("shift_id"):
        sh = shifts().find_one({"_id": emp["shift_id"]})
        if sh:
            try:
                start_h, start_m = map(int, sh["start_time"].split(":"))
                end_h, end_m = map(int, sh["end_time"].split(":"))
            except Exception:
                pass
    else:
        doc = company_settings().find_one({"_id": "company_config"}) or {}
        try:
            start_h, start_m = map(int, doc.get("work_start_time", "09:30").split(":"))
            end_h, end_m = map(int, doc.get("work_end_time", "17:30").split(":"))
        except Exception:
            pass

    d = _parse_date(target_date_str)
    if not d:
        return None

    base = datetime(d.year, d.month, d.day, end_h, end_m, 0, 0)
    if (end_h, end_m) <= (start_h, start_m):
        base = base + timedelta(days=1)
    return base


# ============================================
# AUTO-CLOSE + ACTIVE SESSION (NEW)
# ============================================

def auto_close_previous_sessions(employee_id):
    """
    Auto-close ALL unclosed past sessions at shift end time.
    Called automatically before next check-in.
    Returns count of closed sessions.
    """
    if isinstance(employee_id, ObjectId):
        oid = employee_id
    else:
        oid = _oid(employee_id)
    if not oid:
        return 0

    today_str = date.today().isoformat()
    unclosed = list(
        attendance().find({
            "employee_id": oid,
            "date": {"$lt": today_str},
            "check_in": {"$ne": None},
            "check_out": None,
            "auto_closed": {"$ne": True},
        }).sort("date", 1)
    )

    closed_count = 0
    for record in unclosed:
        auto_close_time = _get_shift_end_for(oid, record["date"])
        if auto_close_time is None:
            auto_close_time = record["check_in"] + timedelta(hours=8)

        delta = auto_close_time - record["check_in"]
        working_hours = round(delta.total_seconds() / 3600, 2)

        attendance().update_one(
            {"_id": record["_id"]},
            {"$set": {
                "check_out": auto_close_time,
                "working_hours": working_hours,
                "status": "PRESENT" if working_hours >= 4 else "HALF_DAY",
                "auto_closed": True,
                "auto_closed_reason": "Auto-closed on next check-in (forgot logout)",
                "updated_at": _now(),
            }}
        )
        closed_count += 1

    return closed_count


def get_active_session(employee_id):
    """
    Return the active/running session for continuous timer display.
    Priority: today's active > oldest past unclosed
    """
    if isinstance(employee_id, ObjectId):
        oid = employee_id
    else:
        oid = _oid(employee_id)
    if not oid:
        return None

    today_str = date.today().isoformat()

    # Check today's active session first
    today_active = attendance().find_one({
        "employee_id": oid,
        "date": today_str,
        "check_in": {"$ne": None},
        "check_out": None,
    })
    if today_active:
        return {
            "date": today_active["date"],
            "check_in": today_active["check_in"].isoformat()
            if today_active.get("check_in") else None,
            "is_overnight": False,
            "days_pending": 0,
        }

    # Check for unclosed past sessions (oldest first)
    past = attendance().find_one(
        {
            "employee_id": oid,
            "date": {"$lt": today_str},
            "check_in": {"$ne": None},
            "check_out": None,
            "auto_closed": {"$ne": True},
        },
        sort=[("date", 1)]
    )
    if past:
        try:
            past_date = _parse_date(past["date"])
            days_pending = (date.today() - past_date).days
        except Exception:
            days_pending = 0

        return {
            "date": past["date"],
            "check_in": past["check_in"].isoformat()
            if past.get("check_in") else None,
            "is_overnight": True,
            "days_pending": days_pending,
        }

    return None


# ============================================
# DETECT FORGOTTEN LOGOUT (kept for compatibility)
# ============================================

def get_unclosed_sessions(employee_id):
    oid = _oid(employee_id)
    if not oid:
        return []

    today_str = date.today().isoformat()
    query = {
        "employee_id": oid,
        "date": {"$lt": today_str},
        "check_in": {"$ne": None},
        "check_out": None,
        "auto_closed": {"$ne": True},
    }
    records = list(attendance().find(query).sort("date", 1))

    result = []
    for r in records:
        approved = forgot_logout_requests().find_one({
            "employee_id": oid,
            "date": r["date"],
            "status": "Approved",
        })
        if approved:
            continue
        result.append(r)
    return result


def check_in_eligibility(employee_id):
    """Always returns allowed=True now (auto-close is used instead)."""
    return {"allowed": True}


# ============================================
# MONTHLY COUNT + FINE
# ============================================

def get_monthly_usage(employee_id, year=None, month=None):
    oid = _oid(employee_id)
    if not oid:
        return 0

    today = date.today()
    y = year or today.year
    m = month or today.month

    first = date(y, m, 1).isoformat()
    last = date(y, m, monthrange(y, m)[1]).isoformat()

    return forgot_logout_requests().count_documents({
        "employee_id": oid,
        "date": {"$gte": first, "$lte": last},
        "status": {"$in": ["Pending", "Approved"]},
    })


def calculate_fine(employee_id, year=None, month=None):
    config = _get_config()
    usage = get_monthly_usage(employee_id, year, month)
    max_allowed = config["max_per_month"]
    fine_amount = config["fine_amount"]

    excess = max(0, usage - max_allowed)
    total_fine = excess * fine_amount

    return {
        "usage": usage,
        "max_allowed": max_allowed,
        "excess": excess,
        "fine_per_occurrence": fine_amount,
        "total_fine": total_fine,
    }


def get_fine_details_for_month(employee_id, year=None, month=None):
    oid = _oid(employee_id)
    if not oid:
        return []

    today = date.today()
    y = year or today.year
    m = month or today.month

    first = date(y, m, 1).isoformat()
    last = date(y, m, monthrange(y, m)[1]).isoformat()

    config = _get_config()
    max_allowed = config["max_per_month"]
    fine_amount = config["fine_amount"]

    requests = list(
        forgot_logout_requests()
        .find({
            "employee_id": oid,
            "date": {"$gte": first, "$lte": last},
            "status": "Approved",
        })
        .sort("date", 1)
    )

    details = []
    for idx, req in enumerate(requests):
        if idx >= max_allowed:
            details.append({
                "date": req["date"],
                "amount": fine_amount,
                "reason": req.get("reason", ""),
            })
    return details


# ============================================
# EMPLOYEE: SEND REQUEST
# ============================================

def send_request(employee_id, data):
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    reason = (data.get("reason") or "").strip()
    if not reason or len(reason) < 10:
        raise ValueError("Please provide a detailed reason (min 10 characters)")

    unclosed = get_unclosed_sessions(employee_id)
    if not unclosed:
        raise ValueError("No forgotten logout found for you")

    target = unclosed[0]

    existing = forgot_logout_requests().find_one({
        "employee_id": oid,
        "date": target["date"],
        "status": "Pending",
    })
    if existing:
        raise ValueError("You already have a pending request for this date")

    now = _now()
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

    result = forgot_logout_requests().insert_one({
        "employee_id": oid,
        "employee_name": emp_name,
        "employee_code": emp.get("employee_code"),
        "date": target["date"],
        "attendance_id": target["_id"],
        "reason": reason,
        "status": "Pending",
        "reviewed_by": None,
        "reviewed_by_name": None,
        "reviewed_at": None,
        "review_comment": "",
        "is_fine_applied": False,
        "created_at": now,
        "updated_at": now,
    })

    manager_users = list(users().find({"role": "MANAGER", "is_active": True}))
    for mu in manager_users:
        mgr_emp = employees().find_one({"user_id": mu["_id"]})
        if mgr_emp:
            notifications().insert_one({
                "employee_id": mgr_emp["_id"],
                "title": "Forgot Logout Request",
                "message": f"{emp_name} ({emp.get('employee_code')}) forgot to logout on {target['date']}",
                "type": "FORGOT_LOGOUT_REQUEST",
                "link": "/manager/forgot-logout",
                "related_id": result.inserted_id,
                "from_employee_id": oid,
                "from_name": emp_name,
                "is_read": False,
                "read_at": None,
                "created_at": now,
            })

    return str(result.inserted_id)


def my_requests(employee_id, limit=20):
    oid = _oid(employee_id)
    if not oid:
        return []

    docs = list(
        forgot_logout_requests()
        .find({"employee_id": oid})
        .sort("created_at", -1)
        .limit(limit)
    )
    return serialize_list(docs)


# ============================================
# MANAGER: LIST / REVIEW
# ============================================

def list_requests(status=None, search=None):
    query = {}
    if status and status in ("Pending", "Approved", "Rejected"):
        query["status"] = status

    docs = list(forgot_logout_requests().find(query).sort("created_at", -1))

    result = []
    for d in docs:
        if search:
            s = search.lower()
            name = (d.get("employee_name") or "").lower()
            code = (d.get("employee_code") or "").lower()
            if s not in name and s not in code:
                continue
        result.append(serialize(d))
    return result


def review_request(req_id, manager_emp_id, action, comment=""):
    rid = _oid(req_id)
    mgr_oid = _oid(manager_emp_id)
    if not rid or not mgr_oid:
        raise ValueError("Invalid IDs")

    req = forgot_logout_requests().find_one({"_id": rid})
    if not req:
        raise ValueError("Request not found")

    if req.get("status") != "Pending":
        raise ValueError(f"Cannot review request in '{req.get('status')}' status")

    mgr = employees().find_one({"_id": mgr_oid})
    mgr_name = (
        f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
        if mgr
        else "Manager"
    )

    now = _now()
    emp_oid = req["employee_id"]

    if action == "Approve":
        auto_close_time = _get_shift_end_for(emp_oid, req["date"])
        att_id = req.get("attendance_id")

        att = None
        if att_id:
            att = attendance().find_one({"_id": att_id})
        if not att:
            att = attendance().find_one({
                "employee_id": emp_oid,
                "date": req["date"],
                "check_out": None,
            })

        if att and att.get("check_in"):
            if auto_close_time is None:
                auto_close_time = att["check_in"] + timedelta(hours=8)

            delta = auto_close_time - att["check_in"]
            working_hours = round(delta.total_seconds() / 3600, 2)

            attendance().update_one(
                {"_id": att["_id"]},
                {
                    "$set": {
                        "check_out": auto_close_time,
                        "working_hours": working_hours,
                        "status": "PRESENT" if working_hours >= 4 else "HALF_DAY",
                        "auto_closed": True,
                        "auto_closed_reason": "Forgot logout — approved by manager",
                        "updated_at": now,
                    }
                },
            )

        forgot_logout_requests().update_one(
            {"_id": rid},
            {
                "$set": {
                    "status": "Approved",
                    "reviewed_by": mgr_oid,
                    "reviewed_by_name": mgr_name,
                    "reviewed_at": now,
                    "review_comment": (comment or "").strip(),
                    "updated_at": now,
                }
            },
        )

        notifications().insert_one({
            "employee_id": emp_oid,
            "title": "Forgot Logout — Approved",
            "message": f"Your forgot-logout request for {req['date']} was approved. You can now check-in.",
            "type": "FORGOT_LOGOUT_APPROVED",
            "link": "/employee/dashboard",
            "related_id": rid,
            "from_employee_id": mgr_oid,
            "from_name": mgr_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    elif action == "Reject":
        if not (comment or "").strip():
            raise ValueError("Reason required for rejection")

        forgot_logout_requests().update_one(
            {"_id": rid},
            {
                "$set": {
                    "status": "Rejected",
                    "reviewed_by": mgr_oid,
                    "reviewed_by_name": mgr_name,
                    "reviewed_at": now,
                    "review_comment": comment.strip(),
                    "updated_at": now,
                }
            },
        )

        notifications().insert_one({
            "employee_id": emp_oid,
            "title": "Forgot Logout — Rejected",
            "message": f"Your forgot-logout request was rejected: {comment}",
            "type": "FORGOT_LOGOUT_REJECTED",
            "link": "/employee/dashboard",
            "related_id": rid,
            "from_employee_id": mgr_oid,
            "from_name": mgr_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })
    else:
        raise ValueError("Invalid action")

    return True


def stats():
    return {
        "pending": forgot_logout_requests().count_documents({"status": "Pending"}),
        "approved": forgot_logout_requests().count_documents({"status": "Approved"}),
        "rejected": forgot_logout_requests().count_documents({"status": "Rejected"}),
    }