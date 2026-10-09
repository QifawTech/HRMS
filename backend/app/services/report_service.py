from datetime import datetime, timedelta, date
from calendar import monthrange
from bson import ObjectId
from app.db import (
    employees, departments, attendance,
    leave_requests, leave_types, tasks,
    holidays as holidays_col,      # ✅ NEW
)


def _oid(s):
    try:
        return ObjectId(s)
    except Exception:
        return None


def _parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return None


def _default_range():
    today = datetime.utcnow()
    start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start, today


# ============================================
# Summary — overall stats
# ============================================

def summary_stats():
    total_emp = employees().count_documents({"status": "ACTIVE"})
    total_depts = departments().count_documents({"is_active": True})

    today = date.today().isoformat()
    present_today = attendance().count_documents({"date": today})

    pending_leaves = leave_requests().count_documents({"status": "Pending"})
    total_tasks = tasks().count_documents({"is_active": True})
    open_tasks = tasks().count_documents({
        "is_active": True,
        "status": {"$nin": ["Completed", "Cancelled"]},
    })

    return {
        "total_employees": total_emp,
        "total_departments": total_depts,
        "present_today": present_today,
        "pending_leaves": pending_leaves,
        "total_tasks": total_tasks,
        "open_tasks": open_tasks,
    }


# ============================================
# EMPLOYEE REPORT
# ============================================

def employee_report(filters):
    department_id = filters.get("department_id")
    status = filters.get("status") or "ACTIVE"
    search = (filters.get("search") or "").strip().lower()

    query = {}
    if status:
        query["status"] = status
    if department_id:
        oid = _oid(department_id)
        if oid:
            query["department_id"] = oid

    docs = list(employees().find(query).sort("created_at", -1))

    records = []
    for e in docs:
        if search:
            name = f"{e.get('first_name', '')} {e.get('last_name', '')}".lower()
            code = (e.get("employee_code") or "").lower()
            if search not in name and search not in code:
                continue

        dept = None
        if e.get("department_id"):
            d = departments().find_one({"_id": e["department_id"]})
            dept = d["name"] if d else None

        present = attendance().count_documents({
            "employee_id": e["_id"],
            "status": "PRESENT",
        })
        late = attendance().count_documents({
            "employee_id": e["_id"],
            "is_late": True,
        })

        records.append({
            "employee_id": str(e["_id"]),
            "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
            "code": e.get("employee_code"),
            "email": e.get("email") or "—",
            "phone": e.get("phone") or "—",
            "department": dept or "—",
            "status": e.get("status", "ACTIVE"),
            "joined": e["date_of_joining"].isoformat()
            if e.get("date_of_joining")
            else None,
            "present_days": present,
            "late_days": late,
        })

    return {
        "records": records,
        "summary": {
            "total": len(records),
            "active": sum(1 for r in records if r["status"] == "ACTIVE"),
            "inactive": sum(1 for r in records if r["status"] != "ACTIVE"),
        },
    }


# ============================================
# ATTENDANCE REPORT
# ============================================

def attendance_report(filters):
    start, end = _date_range(filters)
    department_id = filters.get("department_id")
    employee_id = filters.get("employee_id")
    status = filters.get("status")

    emp_query = {}
    if department_id:
        oid = _oid(department_id)
        if oid:
            emp_query["department_id"] = oid

    emp_docs = list(employees().find(emp_query))
    emp_map = {str(e["_id"]): e for e in emp_docs}

    if employee_id:
        emp_oid = _oid(employee_id)
        if emp_oid:
            emp_map = {k: v for k, v in emp_map.items() if k == str(emp_oid)}

    query = {
        "date": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "employee_id": {"$in": [ObjectId(k) for k in emp_map.keys()]},
    }

    docs = list(attendance().find(query).sort("date", -1))

    records = []
    for a in docs:
        emp = emp_map.get(str(a["employee_id"]))
        if not emp:
            continue

        dept_name = None
        if emp.get("department_id"):
            d = departments().find_one({"_id": emp["department_id"]})
            dept_name = d["name"] if d else None

        rec_status = "PRESENT"
        if a.get("is_late") and a.get("is_early_logout"):
            rec_status = "Late + Early"
        elif a.get("is_late"):
            rec_status = "Late"
        elif a.get("is_early_logout"):
            rec_status = "Early"
        elif a.get("status") == "HALF_DAY":
            rec_status = "Half Day"

        if status and status != rec_status:
            continue

        records.append({
            "date": a["date"],
            "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
            "employee_code": emp.get("employee_code"),
            "department": dept_name or "—",
            "check_in": a["check_in"].isoformat() if a.get("check_in") else None,
            "check_out": a["check_out"].isoformat() if a.get("check_out") else None,
            "working_hours": a.get("working_hours", 0),
            "late_minutes": a.get("late_minutes", 0),
            "early_minutes": a.get("early_minutes", 0),
            "status": rec_status,
        })

    total_hours = sum(r["working_hours"] or 0 for r in records)

    return {
        "records": records,
        "summary": {
            "total": len(records),
            "present": sum(1 for r in records if r["status"] == "PRESENT"),
            "late": sum(1 for r in records if "Late" in r["status"]),
            "early": sum(1 for r in records if "Early" in r["status"]),
            "total_hours": round(total_hours, 2),
        },
    }


# ============================================
# LEAVE REPORT
# ============================================

def leave_report(filters):
    start, end = _date_range(filters)
    department_id = filters.get("department_id")
    employee_id = filters.get("employee_id")
    status = filters.get("status")
    leave_type_id = filters.get("leave_type_id")

    emp_query = {}
    if department_id:
        oid = _oid(department_id)
        if oid:
            emp_query["department_id"] = oid
    emp_docs = list(employees().find(emp_query))
    emp_map = {str(e["_id"]): e for e in emp_docs}

    query = {
        "created_at": {"$gte": start, "$lte": end},
    }
    if status:
        query["status"] = status
    if leave_type_id:
        ltoid = _oid(leave_type_id)
        if ltoid:
            query["leave_type_id"] = ltoid
    if employee_id:
        eo = _oid(employee_id)
        if eo:
            query["employee_id"] = eo

    docs = list(leave_requests().find(query).sort("created_at", -1))

    records = []
    for lv in docs:
        emp = emp_map.get(str(lv["employee_id"]))
        if not emp:
            continue

        lt = leave_types().find_one({"_id": lv["leave_type_id"]})
        dept_name = None
        if emp.get("department_id"):
            d = departments().find_one({"_id": emp["department_id"]})
            dept_name = d["name"] if d else None

        records.append({
            "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
            "employee_code": emp.get("employee_code"),
            "department": dept_name or "—",
            "leave_type": lt["name"] if lt else "—",
            "start_date": lv.get("start_date"),
            "end_date": lv.get("end_date"),
            "total_days": lv.get("total_days", 0),
            "status": lv.get("status"),
            "reason": lv.get("reason", ""),
        })

    type_counts = {}
    for r in records:
        t = r["leave_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "records": records,
        "summary": {
            "total": len(records),
            "approved": sum(1 for r in records if r["status"] == "Approved"),
            "pending": sum(1 for r in records if r["status"] == "Pending"),
            "rejected": sum(1 for r in records if r["status"] == "Rejected"),
            "total_days": sum(r["total_days"] for r in records),
        },
        "distribution": [
            {"name": k, "value": v} for k, v in type_counts.items()
        ],
    }


# ============================================
# DEPARTMENT REPORT
# ============================================

def department_report():
    depts = list(departments().find({"is_active": True}).sort("name", 1))

    records = []
    for d in depts:
        emp_count = employees().count_documents({
            "department_id": d["_id"],
            "status": "ACTIVE",
        })

        emp_ids = [e["_id"] for e in employees().find({"department_id": d["_id"]})]
        avg_hours = 0
        if emp_ids:
            cutoff = (datetime.utcnow() - timedelta(days=30)).date().isoformat()
            att_docs = list(attendance().find({
                "employee_id": {"$in": emp_ids},
                "date": {"$gte": cutoff},
                "working_hours": {"$gt": 0},
            }))
            if att_docs:
                avg_hours = round(
                    sum(a.get("working_hours", 0) for a in att_docs) / len(att_docs),
                    2,
                )

        records.append({
            "department_id": str(d["_id"]),
            "name": d["name"],
            "description": d.get("description", ""),
            "employee_count": emp_count,
            "avg_hours": avg_hours,
        })

    return {
        "records": records,
        "summary": {
            "total_departments": len(records),
            "total_employees": sum(r["employee_count"] for r in records),
        },
        "distribution": [
            {"name": r["name"], "value": r["employee_count"]}
            for r in records
        ],
    }


# ============================================
# ✅ NEW: MONTHLY WORKING SUMMARY
# ============================================

def _count_sundays(year, month):
    days = monthrange(year, month)[1]
    count = 0
    for d in range(1, days + 1):
        if date(year, month, d).weekday() == 6:
            count += 1
    return count


def get_monthly_working_summary(year, month):
    """
    Month-end summary — working days + leave analysis per employee.
    """
    if month < 1 or month > 12:
        raise ValueError("Invalid month")

    total_days = monthrange(year, month)[1]
    sundays = _count_sundays(year, month)

    # Fetch holidays for that month
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{total_days:02d}"

    holiday_docs = list(holidays_col().find({
        "date": {"$gte": start_date, "$lte": end_date},
    }))

    # Exclude Sundays from holiday list
    real_holidays = []
    for h in holiday_docs:
        try:
            d = datetime.strptime(h["date"], "%Y-%m-%d").date()
            if d.weekday() != 6:
                real_holidays.append(h)
        except Exception:
            pass

    holiday_count = len(real_holidays)
    working_days = total_days - sundays - holiday_count
    if working_days < 0:
        working_days = 0

    active_employees = list(employees().find({"status": "ACTIVE"}))

    result_employees = []
    for emp in active_employees:
        emp_id = emp["_id"]

        # Present days — unique dates with check_in
        present_pipeline = [
            {"$match": {
                "employee_id": emp_id,
                "date": {"$gte": start_date, "$lte": end_date},
                "check_in": {"$ne": None},
            }},
            {"$group": {"_id": "$date"}},
            {"$count": "total"},
        ]
        present_agg = list(attendance().aggregate(present_pipeline))
        present_days = present_agg[0]["total"] if present_agg else 0

        # Approved leaves in this month
        leaves = list(leave_requests().find({
            "employee_id": emp_id,
            "status": "Approved",
            "start_date": {"$lte": end_date},
            "end_date": {"$gte": start_date},
        }))

        cl_days = 0
        sl_days = 0
        other_days = 0

        for lv in leaves:
            days = float(lv.get("total_days") or 0)
            ltype_id = lv.get("leave_type_id")
            lt = leave_types().find_one({"_id": ltype_id}) if ltype_id else None
            lt_name = (lt.get("name") or "").lower() if lt else ""

            if "casual" in lt_name or lt_name == "cl":
                cl_days += days
            elif "sick" in lt_name or lt_name == "sl":
                sl_days += days
            else:
                other_days += days

        leave_days = cl_days + sl_days + other_days
        absent_days = max(0, int(working_days - present_days - leave_days))
        payable_days = present_days + leave_days

        attendance_pct = (
            round((present_days / working_days) * 100, 1)
            if working_days > 0 else 0
        )

        dept_name = "—"
        if emp.get("department_id"):
            dept = departments().find_one({"_id": emp["department_id"]})
            if dept:
                dept_name = dept.get("name", "—")

        result_employees.append({
            "employee_id": str(emp_id),
            "name": f"{emp.get('first_name','')} {emp.get('last_name','')}".strip(),
            "code": emp.get("employee_code", ""),
            "department": dept_name,
            "present_days": present_days,
            "cl_days": round(cl_days, 1),
            "sl_days": round(sl_days, 1),
            "other_leave_days": round(other_days, 1),
            "leave_days": round(leave_days, 1),
            "absent_days": absent_days,
            "payable_days": round(payable_days, 1),
            "attendance_pct": attendance_pct,
        })

    # Sort by name
    result_employees.sort(key=lambda x: x["name"].lower())

    emp_count = len(result_employees)
    total_present = sum(e["present_days"] for e in result_employees)
    total_absent = sum(e["absent_days"] for e in result_employees)
    total_leave = sum(e["leave_days"] for e in result_employees)

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]

    return {
        "month": f"{year}-{month:02d}",
        "month_label": f"{month_names[month - 1]} {year}",
        "total_days": total_days,
        "sundays": sundays,
        "holidays": holiday_count,
        "holiday_list": [
            {"name": h.get("name"), "date": h.get("date")}
            for h in real_holidays
        ],
        "working_days": working_days,
        "employees": result_employees,
        "summary": {
            "total_employees": emp_count,
            "total_present": total_present,
            "total_absent": total_absent,
            "total_leave": round(total_leave, 1),
            "avg_present": round(total_present / emp_count, 1) if emp_count else 0,
            "avg_absent": round(total_absent / emp_count, 1) if emp_count else 0,
        },
    }


# ============================================
# Helpers
# ============================================

def _date_range(filters):
    start = filters.get("start_date")
    end = filters.get("end_date")

    if start and end:
        s = _parse_date(start)
        e = _parse_date(end)
        if s and e:
            e = e.replace(hour=23, minute=59, second=59)
            return s, e

    return _default_range()


# ============================================
# EMPLOYEE FULL REPORT
# ============================================

def employee_full_report(emp_id):
    oid = _oid(emp_id)
    if not oid:
        return None

    emp = employees().find_one({"_id": oid})
    if not emp:
        return None

    dept = None
    if emp.get("department_id"):
        d = departments().find_one({"_id": emp["department_id"]})
        dept = d["name"] if d else None

    from app.db import designations as desig_col
    desig = None
    if emp.get("designation_id"):
        ds = desig_col().find_one({"_id": emp["designation_id"]})
        desig = ds["title"] if ds else None

    all_att = list(attendance().find({"employee_id": oid}).sort("date", -1))

    total_present = 0
    total_late = 0
    total_early = 0
    total_hours = 0

    for a in all_att:
        if a.get("check_in") and a.get("check_out"):
            total_present += 1
            total_hours += a.get("working_hours", 0) or 0
        if a.get("is_late"):
            total_late += 1
        if a.get("is_early_logout"):
            total_early += 1

    today = datetime.utcnow()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_att = [a for a in all_att if _parse_date(a["date"]) and _parse_date(a["date"]) >= month_start]

    month_present = sum(1 for a in month_att if a.get("check_in") and a.get("check_out"))
    month_late = sum(1 for a in month_att if a.get("is_late"))
    month_early = sum(1 for a in month_att if a.get("is_early_logout"))
    month_hours = round(
        sum(a.get("working_hours", 0) or 0 for a in month_att), 2
    )

    recent_records = []
    for a in all_att[:30]:
        recent_records.append({
            "date": a["date"],
            "check_in": a["check_in"].isoformat() if a.get("check_in") else None,
            "check_out": a["check_out"].isoformat() if a.get("check_out") else None,
            "working_hours": a.get("working_hours", 0),
            "is_late": a.get("is_late", False),
            "late_minutes": a.get("late_minutes", 0),
            "is_early_logout": a.get("is_early_logout", False),
            "early_minutes": a.get("early_minutes", 0),
            "early_logout_reason": a.get("early_logout_reason"),
            "status": a.get("status", "PRESENT"),
        })

    all_leaves = list(leave_requests().find({"employee_id": oid}).sort("created_at", -1))

    leave_approved = 0
    leave_pending = 0
    leave_rejected = 0
    leave_days_used = 0

    for lv in all_leaves:
        if lv.get("status") == "Approved":
            leave_approved += 1
            leave_days_used += lv.get("total_days", 0) or 0
        elif lv.get("status") == "Pending":
            leave_pending += 1
        elif lv.get("status") == "Rejected":
            leave_rejected += 1

    recent_leaves = []
    for lv in all_leaves[:10]:
        lt = leave_types().find_one({"_id": lv["leave_type_id"]})
        recent_leaves.append({
            "leave_type": lt["name"] if lt else "—",
            "start_date": lv.get("start_date"),
            "end_date": lv.get("end_date"),
            "total_days": lv.get("total_days", 0),
            "status": lv.get("status"),
            "reason": lv.get("reason", ""),
        })

    emp_tasks = list(tasks().find({"assigned_to": oid, "is_active": True}))

    task_pending = sum(1 for t in emp_tasks if t.get("status") == "Pending")
    task_progress = sum(1 for t in emp_tasks if t.get("status") == "In Progress")
    task_completed = sum(1 for t in emp_tasks if t.get("status") == "Completed")
    task_overdue = sum(
        1
        for t in emp_tasks
        if t.get("status") not in ("Completed", "Cancelled")
        and t.get("due_date")
        and t["due_date"] < datetime.utcnow()
    )

    recent_tasks = []
    for t in emp_tasks[:10]:
        recent_tasks.append({
            "title": t.get("title"),
            "priority": t.get("priority", "NORMAL"),
            "status": t.get("status"),
            "due_date": t["due_date"].isoformat() if t.get("due_date") else None,
            "completed_at": t["completed_at"].isoformat()
            if t.get("completed_at")
            else None,
        })

    from app.db import documents as docs_col

    doc_count = docs_col().count_documents(
        {"employee_id": oid, "is_active": True}
    )

    return {
        "profile": {
            "id": str(emp["_id"]),
            "name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
            "code": emp.get("employee_code"),
            "email": emp.get("email", ""),
            "phone": emp.get("phone") or "—",
            "department": dept or "—",
            "designation": desig or "—",
            "status": emp.get("status", "ACTIVE"),
            "joined": emp["date_of_joining"].isoformat()
            if emp.get("date_of_joining")
            else None,
            "profile_picture_url": emp.get("profile_picture_url"),
        },
        "attendance": {
            "all_time": {
                "present_days": total_present,
                "late_days": total_late,
                "early_logout_days": total_early,
                "total_hours": round(total_hours, 2),
            },
            "this_month": {
                "present_days": month_present,
                "late_days": month_late,
                "early_logout_days": month_early,
                "total_hours": month_hours,
            },
            "recent_records": recent_records,
        },
        "leaves": {
            "approved": leave_approved,
            "pending": leave_pending,
            "rejected": leave_rejected,
            "days_used": leave_days_used,
            "total": len(all_leaves),
            "recent": recent_leaves,
        },
        "tasks": {
            "total": len(emp_tasks),
            "pending": task_pending,
            "in_progress": task_progress,
            "completed": task_completed,
            "overdue": task_overdue,
            "recent": recent_tasks,
        },
        "documents": {
            "count": doc_count,
        },
    }