from datetime import datetime, date, time, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from app.db import attendance, employees, departments, shifts
from app.services.notification_service import notify_all_managers, create_notification
from app.utils.helpers import serialize, serialize_list


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.now()


def _fmt_dt(dt):
    if not dt:
        return None
    return dt.isoformat()


# ============================================
# Work hours resolver — Shift-aware
# ============================================

def _get_work_hours(employee_id=None):
    if employee_id:
        try:
            oid = _oid(employee_id)
            if oid:
                emp = employees().find_one({"_id": oid}, {"shift_id": 1})
                if emp and emp.get("shift_id"):
                    shift = shifts().find_one({"_id": emp["shift_id"], "is_active": True})
                    if shift:
                        sh, sm = map(int, shift["start_time"].split(":"))
                        eh, em = map(int, shift["end_time"].split(":"))
                        grace = shift.get("grace_period_minutes", 0)
                        return sh, sm, eh, em, grace
        except Exception:
            pass

    try:
        from app.services.settings_service import get_settings
        s = get_settings()
        sh, sm = map(int, s["work_start_time"].split(":"))
        eh, em = map(int, s["work_end_time"].split(":"))
        grace = s.get("grace_period_minutes", 0)
        return sh, sm, eh, em, grace
    except Exception:
        return 9, 30, 17, 30, 15


WORK_START_HOUR = 9
WORK_START_MINUTE = 30
WORK_END_HOUR = 17
WORK_END_MINUTE = 30
STANDARD_WORK_HOURS = 8.0


def _compute_late(check_in_time, employee_id=None):
    sh, sm, eh, em, grace = _get_work_hours(employee_id)
    work_start = check_in_time.replace(hour=sh, minute=sm, second=0, microsecond=0)
    work_start_with_grace = work_start + timedelta(minutes=grace)

    if check_in_time > work_start_with_grace:
        delta = check_in_time - work_start
        return True, int(delta.total_seconds() // 60)
    return False, 0


def _compute_early(check_out_time, employee_id=None, check_in_date=None):
    """
    Compute early logout. Only applies if checkout is on the SAME DAY
    as check-in. If forgotten session (checkout on later day), returns (False, 0).
    """
    if check_in_date:
        checkout_date = check_out_time.date().isoformat()
        if checkout_date != check_in_date:
            # Forgotten session — no early calculation
            return False, 0

    sh, sm, eh, em, grace = _get_work_hours(employee_id)

    if eh < sh or (eh == sh and em < sm):
        if check_out_time.hour < 12:
            work_end = check_out_time.replace(hour=eh, minute=em, second=0, microsecond=0)
        else:
            work_end = (check_out_time + timedelta(days=1)).replace(
                hour=eh, minute=em, second=0, microsecond=0
            )
    else:
        work_end = check_out_time.replace(hour=eh, minute=em, second=0, microsecond=0)

    if check_out_time < work_end:
        delta = work_end - check_out_time
        return True, int(delta.total_seconds() // 60)
    return False, 0


# ============================================
# HELPERS
# ============================================

def _find_open_session(employee_id):
    """Find the oldest open (checked-in but not checked-out) session."""
    oid = _oid(employee_id)
    if not oid:
        return None

    return attendance().find_one(
        {
            "employee_id": oid,
            "check_in": {"$ne": None},
            "check_out": None,
            "auto_closed": {"$ne": True},
        },
        sort=[("date", 1)]
    )


# ============================================
# EMPLOYEE
# ============================================

def get_today_status(employee_id):
    oid = _oid(employee_id)
    if not oid:
        return None

    today = date.today().isoformat()
    today_record = attendance().find_one({"employee_id": oid, "date": today})
    open_session = _find_open_session(employee_id)

    # Build open_session info for frontend
    open_session_info = None
    if open_session:
        open_session_info = {
            "date": open_session["date"],
            "check_in": _fmt_dt(open_session.get("check_in")),
            "is_overnight": open_session["date"] != today,
            "days_pending": (
                (date.today() - date.fromisoformat(open_session["date"])).days
                if open_session["date"] != today else 0
            ),
        }

    if not today_record:
        return {
            "date": today,
            "checked_in": False,
            "checked_out": False,
            "check_in": None,
            "check_out": None,
            "working_hours": 0,
            "status": "NOT_MARKED",
            "is_late": False,
            "late_minutes": 0,
            "is_early_logout": False,
            "early_minutes": 0,
            "early_logout_reason": None,
            "open_session": open_session_info,
            "has_open_session": bool(open_session_info),
        }

    return {
        "date": today,
        "checked_in": bool(today_record.get("check_in")),
        "checked_out": bool(today_record.get("check_out")),
        "check_in": _fmt_dt(today_record.get("check_in")),
        "check_out": _fmt_dt(today_record.get("check_out")),
        "working_hours": today_record.get("working_hours", 0),
        "status": today_record.get("status", "PRESENT"),
        "record_id": str(today_record["_id"]),
        "is_late": today_record.get("is_late", False),
        "late_minutes": today_record.get("late_minutes", 0),
        "is_early_logout": today_record.get("is_early_logout", False),
        "early_minutes": today_record.get("early_minutes", 0),
        "early_logout_reason": today_record.get("early_logout_reason"),
        "open_session": open_session_info,
        "has_open_session": bool(open_session_info),
    }


def check_in(employee_id):
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    # Block if any open session exists (today or past)
    open_session = _find_open_session(employee_id)
    if open_session:
        if open_session["date"] == date.today().isoformat():
            raise ValueError("Already checked in today")
        else:
            raise ValueError(
                f"OPEN_SESSION|{open_session['date']}"
            )

    today = date.today().isoformat()
    now = _now()

    is_late, late_minutes = _compute_late(now, employee_id)

    result = attendance().insert_one({
        "employee_id": oid,
        "date": today,
        "check_in": now,
        "check_out": None,
        "working_hours": 0,
        "status": "PRESENT",
        "is_late": is_late,
        "late_minutes": late_minutes,
        "is_early_logout": False,
        "early_minutes": 0,
        "early_logout_reason": None,
        "early_logout_submitted_at": None,
        "notes": "",
        "created_at": now,
        "updated_at": now,
    })

    if is_late:
        emp = employees().find_one({"_id": oid})
        emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "Employee"
        emp_code = emp.get("employee_code") if emp else None

        hrs = late_minutes // 60
        mins = late_minutes % 60
        if hrs > 0 and mins > 0:
            late_str = f"{hrs}h {mins}m"
        elif hrs > 0:
            late_str = f"{hrs}h"
        else:
            late_str = f"{mins} min"

        notify_all_managers(
            title="Late Check-In",
            message=f"{emp_name} checked in late by {late_str}",
            notif_type="LATE_CHECK_IN",
            link="/manager/attendance",
            related_id=result.inserted_id,
        )

    return {
        "record_id": str(result.inserted_id),
        "is_late": is_late,
        "late_minutes": late_minutes,
    }


def check_out(employee_id, early_reason=None):
    """
    Check out the oldest open session.
    If session is from a past date → forgotten logout (no early reason required).
    If session is from today → normal checkout (early reason required if before shift end).
    """
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    # Find oldest open session (any date)
    record = _find_open_session(employee_id)
    if not record:
        raise ValueError("Please check-in first")

    today = date.today().isoformat()
    is_forgotten = record["date"] != today

    now = _now()
    check_in_time = record["check_in"]
    delta = now - check_in_time
    working_hours = round(delta.total_seconds() / 3600, 2)

    # Early logout only applies for same-day checkout
    if is_forgotten:
        is_early, early_minutes = False, 0
    else:
        is_early, early_minutes = _compute_early(now, employee_id, record["date"])

    # Require reason only for genuine early logout (same-day)
    if is_early and not (early_reason or "").strip():
        raise ValueError(
            f"Early logout ({early_minutes} mins). Reason required."
        )

    status = "PRESENT"
    if working_hours < 4:
        status = "HALF_DAY"

    update_data = {
        "check_out": now,
        "working_hours": working_hours,
        "status": status,
        "is_early_logout": is_early,
        "early_minutes": early_minutes,
        "updated_at": now,
    }

    if is_early:
        update_data["early_logout_reason"] = early_reason.strip()
        update_data["early_logout_submitted_at"] = now

    if is_forgotten:
        update_data["forgotten_logout"] = True
        update_data["forgotten_logout_resolved_at"] = now

    attendance().update_one({"_id": record["_id"]}, {"$set": update_data})

    # Notifications
    emp = employees().find_one({"_id": oid})
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "Employee"

    if is_early:
        hrs = early_minutes // 60
        mins = early_minutes % 60
        if hrs > 0 and mins > 0:
            early_str = f"{hrs}h {mins}m"
        elif hrs > 0:
            early_str = f"{hrs}h"
        else:
            early_str = f"{mins} min"

        reason_text = f" Reason: {early_reason}" if early_reason else ""

        notify_all_managers(
            title="Early Logout",
            message=f"{emp_name} logged out early by {early_str}.{reason_text}",
            notif_type="EARLY_LOGOUT",
            link="/manager/attendance",
            related_id=record["_id"],
        )

    if is_forgotten:
        notify_all_managers(
            title="Forgotten Logout Resolved",
            message=f"{emp_name} forgot to logout on {record['date']}. "
                    f"Total working time: {working_hours}h.",
            notif_type="FORGOTTEN_LOGOUT_RESOLVED",
            link="/manager/attendance",
            related_id=record["_id"],
        )

    return {
        "working_hours": working_hours,
        "status": status,
        "is_early": is_early,
        "early_minutes": early_minutes,
        "is_forgotten": is_forgotten,
        "session_date": record["date"],
    }


def get_employee_attendance(employee_id, days=30):
    oid = _oid(employee_id)
    if not oid:
        return []

    cutoff = (date.today() - timedelta(days=days)).isoformat()
    records = list(
        attendance()
        .find({"employee_id": oid, "date": {"$gte": cutoff}})
        .sort("date", -1)
    )
    return serialize_list(records)


# ============================================
# MANAGER
# ============================================

def get_attendance_by_date(target_date=None, department_id=None, search=None):
    if not target_date:
        target_date = date.today().isoformat()

    emp_query = {"status": "ACTIVE"}
    if department_id:
        dept_oid = _oid(department_id)
        if dept_oid:
            emp_query["department_id"] = dept_oid

    if search:
        emp_query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"employee_code": {"$regex": search, "$options": "i"}},
        ]

    employees_list = list(employees().find(emp_query))

    att_records = list(attendance().find({"date": target_date}))
    att_map = {str(a["employee_id"]): a for a in att_records}

    result = []
    for emp in employees_list:
        emp_id = str(emp["_id"])
        att = att_map.get(emp_id)

        dept_name = None
        if emp.get("department_id"):
            d = departments().find_one({"_id": emp["department_id"]})
            dept_name = d["name"] if d else None

        shift_name = None
        if emp.get("shift_id"):
            sh = shifts().find_one({"_id": emp["shift_id"]})
            shift_name = sh["name"] if sh else None

        row = {
            "employee_id": emp_id,
            "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}",
            "employee_code": emp.get("employee_code"),
            "department_name": dept_name,
            "shift_name": shift_name,
            "date": target_date,
            "check_in": _fmt_dt(att["check_in"]) if att and att.get("check_in") else None,
            "check_out": _fmt_dt(att["check_out"]) if att and att.get("check_out") else None,
            "working_hours": att.get("working_hours", 0) if att else 0,
            "is_late": att.get("is_late", False) if att else False,
            "late_minutes": att.get("late_minutes", 0) if att else 0,
            "is_early_logout": att.get("is_early_logout", False) if att else False,
            "early_minutes": att.get("early_minutes", 0) if att else 0,
            "early_logout_reason": att.get("early_logout_reason") if att else None,
            "forgotten_logout": att.get("forgotten_logout", False) if att else False,
            "status": (
                "WORKING" if att and att.get("check_in") and not att.get("check_out")
                else "PRESENT" if att and att.get("check_out")
                else "ABSENT"
            ),
        }
        result.append(row)

    order = {"WORKING": 0, "PRESENT": 1, "ABSENT": 2}
    result.sort(key=lambda r: (order.get(r["status"], 3), r["employee_name"]))

    summary = {
        "date": target_date,
        "total": len(result),
        "present": sum(1 for r in result if r["status"] == "PRESENT"),
        "working": sum(1 for r in result if r["status"] == "WORKING"),
        "absent": sum(1 for r in result if r["status"] == "ABSENT"),
        "late": sum(1 for r in result if r["is_late"]),
        "early_logout": sum(1 for r in result if r["is_early_logout"]),
        "total_hours": round(sum(r["working_hours"] for r in result), 2),
    }

    return {"records": result, "summary": summary}


def get_recent_days(days=3, department_id=None):
    result = []
    today = date.today()
    for i in range(days):
        d = (today - timedelta(days=i)).isoformat()
        data = get_attendance_by_date(d, department_id)
        result.append(data["summary"])
    return result


# ============================================
# Monthly summary + Employee report
# ============================================

def get_monthly_summary(employee_id, year=None, month=None):
    from calendar import monthrange

    oid = _oid(employee_id)
    if not oid:
        return None

    today = date.today()
    if year is None:
        year = today.year
    if month is None:
        month = today.month

    first_day = date(year, month, 1)
    last_day_num = monthrange(year, month)[1]
    last_day = date(year, month, last_day_num)

    start_str = first_day.isoformat()
    end_str = last_day.isoformat()

    records = list(attendance().find({
        "employee_id": oid,
        "date": {"$gte": start_str, "$lte": end_str},
    }).sort("date", 1))

    total_present = 0
    total_late = 0
    total_early = 0
    total_hours = 0.0
    total_working_days = 0
    present_dates = set()

    for r in records:
        has_checkin = bool(r.get("check_in"))
        if has_checkin:
            present_dates.add(r["date"])
            total_hours += r.get("working_hours", 0) or 0
        if has_checkin and r.get("is_late"):
            total_late += 1
        if has_checkin and r.get("check_out") and r.get("is_early_logout"):
            total_early += 1

    total_present = len(present_dates)
    total_working_days = total_present

    weekday_count = 0
    d = first_day
    end_count = min(last_day, today) if (year == today.year and month == today.month) else last_day

    while d <= end_count:
        if d.weekday() < 5:
            weekday_count += 1
        d += timedelta(days=1)

    absent = max(0, weekday_count - total_present)

    return {
        "year": year,
        "month": month,
        "month_name": first_day.strftime("%B"),
        "present_days": total_present,
        "late_days": total_late,
        "early_logout_days": total_early,
        "absent_days": absent,
        "total_hours": round(total_hours, 2),
        "working_days": total_working_days,
        "total_days_in_month": last_day_num,
        "weekdays_in_month": weekday_count,
        "days_elapsed": end_count.day if hasattr(end_count, "day") else last_day_num,
    }


def get_employee_monthly_report(employee_id, year=None, month=None):
    oid = _oid(employee_id)
    if not oid:
        return None

    today = date.today()
    if year is None:
        year = today.year
    if month is None:
        month = today.month

    from calendar import monthrange
    first_day = date(year, month, 1)
    last_day_num = monthrange(year, month)[1]

    start_str = first_day.isoformat()
    end_str = date(year, month, last_day_num).isoformat()

    records = list(
        attendance()
        .find({
            "employee_id": oid,
            "date": {"$gte": start_str, "$lte": end_str},
        })
        .sort("date", -1)
    )

    result_records = []
    for r in records:
        result_records.append({
            "_id": str(r["_id"]),
            "date": r["date"],
            "check_in": _fmt_dt(r.get("check_in")),
            "check_out": _fmt_dt(r.get("check_out")),
            "working_hours": r.get("working_hours", 0),
            "status": r.get("status", "PRESENT"),
            "is_late": r.get("is_late", False),
            "late_minutes": r.get("late_minutes", 0),
            "is_early_logout": r.get("is_early_logout", False),
            "early_minutes": r.get("early_minutes", 0),
            "early_logout_reason": r.get("early_logout_reason"),
            "forgotten_logout": r.get("forgotten_logout", False),
        })

    summary = get_monthly_summary(employee_id, year, month)

    return {
        "records": result_records,
        "summary": summary,
    }