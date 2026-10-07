from datetime import datetime, timedelta, date
from bson import ObjectId
from app.db import (
    employees, departments, attendance,
    leave_requests, leave_types, tasks,
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
    """Default: current month start to today."""
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

        # Count attendance summary for this employee
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

    # Get employee list
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

    # Distribution by leave type
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

        # Attendance avg for this dept (last 30 days)
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
# Helpers
# ============================================

def _date_range(filters):
    """Parse filter dates."""
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
# EMPLOYEE FULL REPORT (drill-down)
# ============================================

def employee_full_report(emp_id):
    """Complete single-employee report."""
    oid = _oid(emp_id)
    if not oid:
        return None

    emp = employees().find_one({"_id": oid})
    if not emp:
        return None

    # Department + Designation
    dept = None
    if emp.get("department_id"):
        d = departments().find_one({"_id": emp["department_id"]})
        dept = d["name"] if d else None

    from app.db import designations as desig_col
    desig = None
    if emp.get("designation_id"):
        ds = desig_col().find_one({"_id": emp["designation_id"]})
        desig = ds["title"] if ds else None

    # ============================================
    # Attendance stats
    # ============================================
    all_att = list(attendance().find({"employee_id": oid}).sort("date", -1))

    total_present = 0
    total_late = 0
    total_early = 0
    total_hours = 0
    total_absent = 0

    for a in all_att:
        if a.get("check_in") and a.get("check_out"):
            total_present += 1
            total_hours += a.get("working_hours", 0) or 0
        if a.get("is_late"):
            total_late += 1
        if a.get("is_early_logout"):
            total_early += 1

    # This month attendance
    today = datetime.utcnow()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_att = [a for a in all_att if _parse_date(a["date"]) and _parse_date(a["date"]) >= month_start]

    month_present = sum(1 for a in month_att if a.get("check_in") and a.get("check_out"))
    month_late = sum(1 for a in month_att if a.get("is_late"))
    month_early = sum(1 for a in month_att if a.get("is_early_logout"))
    month_hours = round(
        sum(a.get("working_hours", 0) or 0 for a in month_att), 2
    )

    # Recent 30 records for table
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

    # ============================================
    # Leave stats
    # ============================================
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

    # ============================================
    # Task stats
    # ============================================
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

    # ============================================
    # Documents count
    # ============================================
    from app.db import documents as docs_col

    doc_count = docs_col().count_documents(
        {"employee_id": oid, "is_active": True}
    )

    # ============================================
    # Compose result
    # ============================================
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