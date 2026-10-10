from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import complaints, employees, users
from app.utils.time_utils import now_ist
from app.utils.helpers import serialize as serialize_dt

def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _serialize(doc):
    if not doc:
        return None
    # ✅ Use helpers serialize() — converts datetime to ISO string
    return serialize_dt(doc)


def _enrich(doc):
    """Add employee name + code."""
    if not doc:
        return doc
    emp = employees().find_one({"_id": _oid(doc["employee_id"])})
    if emp:
        doc["employee_name"] = f"{emp.get('first_name','')} {emp.get('last_name','')}".strip()
        doc["employee_code"] = emp.get("employee_code")
        doc["department_name"] = None
        if emp.get("department_id"):
            from app.db import departments
            d = departments().find_one({"_id": emp["department_id"]})
            doc["department_name"] = d.get("name") if d else None
    else:
        doc["employee_name"] = "Unknown"
        doc["employee_code"] = "—"
    return doc


# ============================================
# CREATE
# ============================================

def create_complaint(employee_id, data):
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee id")

    subject = (data.get("subject") or "").strip()
    description = (data.get("description") or "").strip()

    if not subject:
        raise ValueError("Subject is required")
    if len(subject) < 3:
        raise ValueError("Subject must be at least 3 characters")
    if not description:
        raise ValueError("Description is required")
    if len(description) < 10:
        raise ValueError("Description must be at least 10 characters")

    doc = {
        "employee_id": oid,
        "subject": subject,
        "description": description,
        "category": data.get("category", "General"),
        "priority": data.get("priority", "NORMAL"),
        "status": "PENDING",
        "manager_notes": "",
        "resolved_by": None,
        "resolved_at": None,
        "created_at": now_ist(),
        "updated_at": now_ist(),
    }

    res = complaints().insert_one(doc)
    doc["_id"] = res.inserted_id
    return _enrich(_serialize(doc))


# ============================================
# LIST
# ============================================

def list_my_complaints(employee_id, status=None):
    oid = _oid(employee_id)
    if not oid:
        return []

    q = {"employee_id": oid}
    if status:
        q["status"] = status

    docs = list(complaints().find(q).sort("created_at", -1))
    return [_enrich(_serialize(d)) for d in docs]


def list_all_complaints(search=None, status=None, category=None):
    q = {}
    if status:
        q["status"] = status
    if category:
        q["category"] = category

    docs = list(complaints().find(q).sort("created_at", -1))
    result = [_enrich(_serialize(d)) for d in docs]

    # Filter by search (employee name/code)
    if search:
        s = search.lower()
        result = [
            r for r in result
            if s in (r.get("employee_name") or "").lower()
            or s in (r.get("employee_code") or "").lower()
            or s in (r.get("subject") or "").lower()
        ]

    return result


def get_complaint(complaint_id):
    oid = _oid(complaint_id)
    if not oid:
        return None
    doc = complaints().find_one({"_id": oid})
    if not doc:
        return None
    return _enrich(_serialize(doc))


# ============================================
# UPDATE STATUS (Manager)
# ============================================

def update_status(complaint_id, data):
    oid = _oid(complaint_id)
    if not oid:
        raise ValueError("Invalid complaint id")

    new_status = (data.get("status") or "").upper()
    if new_status not in ("PENDING", "SOLVED", "IN_PROGRESS"):
        raise ValueError("Invalid status. Use PENDING / IN_PROGRESS / SOLVED")

    notes = (data.get("manager_notes") or "").strip()
    manager_id = _oid(data.get("manager_id"))

    update = {
        "status": new_status,
        "updated_at": now_ist(),
    }
    if notes:
        update["manager_notes"] = notes
    if new_status == "SOLVED":
        update["resolved_at"] = now_ist()
        update["resolved_by"] = manager_id
    else:
        update["resolved_at"] = None
        update["resolved_by"] = None

    res = complaints().update_one({"_id": oid}, {"$set": update})
    if res.matched_count == 0:
        raise ValueError("Complaint not found")

    return _enrich(_serialize(complaints().find_one({"_id": oid})))


# ============================================
# DELETE
# ============================================

def delete_complaint(complaint_id):
    oid = _oid(complaint_id)
    if not oid:
        raise ValueError("Invalid id")
    res = complaints().delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise ValueError("Complaint not found")
    return {"deleted": True}


# ============================================
# STATS
# ============================================

def stats():
    return {
        "total": complaints().count_documents({}),
        "pending": complaints().count_documents({"status": "PENDING"}),
        "in_progress": complaints().count_documents({"status": "IN_PROGRESS"}),
        "solved": complaints().count_documents({"status": "SOLVED"}),
    }