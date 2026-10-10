from datetime import datetime
from bson import ObjectId
from app.db import projects, employees
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except Exception:
        return None


def _serialize(doc):
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    if doc.get("manager_id"):
        doc["manager_id"] = str(doc["manager_id"])
    if doc.get("assigned_employees"):
        doc["assigned_employees"] = [str(x) for x in doc["assigned_employees"]]
    return doc


def _enrich_employees(doc):
    """Add employee names to assigned list."""
    if not doc.get("assigned_employees"):
        doc["assigned_employees_detail"] = []
        return doc

    ids = [_oid(x) for x in doc["assigned_employees"]]
    emps = list(employees().find({"_id": {"$in": ids}}))
    doc["assigned_employees_detail"] = [
        {
            "id": str(e["_id"]),
            "name": f"{e.get('first_name','')} {e.get('last_name','')}".strip(),
            "code": e.get("employee_code"),
        }
        for e in emps
    ]
    return doc


# ============================================
# CRUD
# ============================================

def create_project(data):
    name = (data.get("name") or "").strip()
    if not name:
        raise ValueError("Project name required")

    code = (data.get("code") or "").strip().upper()
    if not code:
        count = projects().count_documents({})
        code = f"PRJ{count + 1:03d}"

    # Duplicate check
    if projects().find_one({"code": code}):
        raise ValueError(f"Project code '{code}' already exists")

    doc = {
        "name": name,
        "code": code,
        "description": (data.get("description") or "").strip(),
        "client": (data.get("client") or "").strip(),
        "status": data.get("status", "ACTIVE"),
        "priority": data.get("priority", "NORMAL"),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "manager_id": _oid(data.get("manager_id")),
        "assigned_employees": [
            _oid(x) for x in (data.get("assigned_employees") or []) if _oid(x)
        ],
        "progress": int(data.get("progress") or 0),
        "created_at": now_ist(),
        "updated_at": now_ist(),
    }

    res = projects().insert_one(doc)
    doc["_id"] = res.inserted_id
    return _enrich_employees(_serialize(doc))


def list_projects(search=None, status=None):
    q = {}
    if status:
        q["status"] = status
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"client": {"$regex": search, "$options": "i"}},
        ]

    docs = list(projects().find(q).sort("created_at", -1))
    return [_enrich_employees(_serialize(d)) for d in docs]


def get_project(project_id):
    oid = _oid(project_id)
    if not oid:
        return None
    doc = projects().find_one({"_id": oid})
    if not doc:
        return None
    return _enrich_employees(_serialize(doc))


def update_project(project_id, data):
    oid = _oid(project_id)
    if not oid:
        raise ValueError("Invalid project id")

    update = {"updated_at": now_ist()}

    for k in [
        "name", "code", "description", "client",
        "status", "priority", "start_date", "end_date",
    ]:
        if k in data:
            v = data[k]
            update[k] = (v or "").strip() if isinstance(v, str) else v

    if "progress" in data:
        update["progress"] = int(data["progress"] or 0)

    if "assigned_employees" in data:
        update["assigned_employees"] = [
            _oid(x) for x in data["assigned_employees"] if _oid(x)
        ]

    res = projects().update_one({"_id": oid}, {"$set": update})
    if res.matched_count == 0:
        raise ValueError("Project not found")

    return _enrich_employees(_serialize(projects().find_one({"_id": oid})))


def delete_project(project_id):
    oid = _oid(project_id)
    if not oid:
        raise ValueError("Invalid project id")
    res = projects().delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise ValueError("Project not found")
    return {"deleted": True}


# ============================================
# Employee side
# ============================================

def get_my_projects(employee_id):
    oid = _oid(employee_id)
    if not oid:
        return []
    docs = list(
        projects()
        .find({"assigned_employees": oid})
        .sort("start_date", -1)
    )
    return [_enrich_employees(_serialize(d)) for d in docs]


def get_project_stats():
    return {
        "total": projects().count_documents({}),
        "active": projects().count_documents({"status": "ACTIVE"}),
        "completed": projects().count_documents({"status": "COMPLETED"}),
        "on_hold": projects().count_documents({"status": "ON_HOLD"}),
    }