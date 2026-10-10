from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import departments, employees
from app.utils.helpers import serialize, serialize_list
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def list_departments(search=None):
    query = {"is_active": True}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    docs = list(departments().find(query).sort("created_at", -1))

    for d in docs:
        d["employee_count"] = employees().count_documents(
            {"department_id": d["_id"], "status": "ACTIVE"}
        )

    return serialize_list(docs)


def get_department(dept_id):
    oid = _oid(dept_id)
    if not oid:
        return None
    d = departments().find_one({"_id": oid})
    if not d:
        return None
    d["employee_count"] = employees().count_documents(
        {"department_id": d["_id"], "status": "ACTIVE"}
    )
    return serialize(d)


def create_department(name, description):
    result = departments().insert_one({
        "name": name.strip(),
        "description": (description or "").strip(),
        "is_active": True,
        "created_at": now_ist(),
        "updated_at": now_ist(),
    })
    return str(result.inserted_id)


def update_department(dept_id, name, description):
    oid = _oid(dept_id)
    if not oid:
        return 0
    r = departments().update_one(
        {"_id": oid},
        {
            "$set": {
                "name": name.strip(),
                "description": (description or "").strip(),
                "updated_at": now_ist(),
            }
        },
    )
    return r.modified_count


def deactivate_department(dept_id):
    oid = _oid(dept_id)
    if not oid:
        return 0
    r = departments().update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": now_ist()}},
    )
    return r.modified_count