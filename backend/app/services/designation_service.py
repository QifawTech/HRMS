from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import designations, employees
from app.utils.helpers import serialize, serialize_list


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.utcnow()


# ============================================
# LIST / GET
# ============================================

def list_designations(search=None):
    """List all active designations."""
    query = {"is_active": {"$ne": False}}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    docs = list(designations().find(query).sort("title", 1))

    result = []
    for d in docs:
        # Count employees with this designation (active only)
        emp_count = employees().count_documents({
            "designation_id": d["_id"],
            "status": "ACTIVE",
        })
        d["employee_count"] = emp_count
        result.append(d)

    return serialize_list(result)


def get_designation(designation_id):
    oid = _oid(designation_id)
    if not oid:
        return None

    doc = designations().find_one({"_id": oid})
    if not doc:
        return None

    emp_count = employees().count_documents({
        "designation_id": oid,
        "status": "ACTIVE",
    })
    doc["employee_count"] = emp_count

    return serialize(doc)


# ============================================
# CREATE
# ============================================

def create_designation(data):
    """Create new designation."""
    title = (data.get("title") or "").strip()
    code = (data.get("code") or "").strip().upper()
    description = (data.get("description") or "").strip()

    if not title:
        raise ValueError("Designation title is required")

    # Check duplicate title
    if designations().find_one({"title": title, "is_active": {"$ne": False}}):
        raise ValueError("Designation with this title already exists")

    # Check duplicate code (if provided)
    if code and designations().find_one({"code": code, "is_active": {"$ne": False}}):
        raise ValueError("Designation with this code already exists")

    now = _now()
    doc = {
        "title": title,
        "code": code or None,
        "description": description or None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = designations().insert_one(doc)
    return str(result.inserted_id)


# ============================================
# UPDATE
# ============================================

def update_designation(designation_id, data):
    """Update designation."""
    oid = _oid(designation_id)
    if not oid:
        return 0

    existing = designations().find_one({"_id": oid})
    if not existing:
        return 0

    update_fields = {"updated_at": _now()}

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            raise ValueError("Designation title is required")

        # Check duplicate (excluding self)
        dup = designations().find_one({
            "title": title,
            "_id": {"$ne": oid},
            "is_active": {"$ne": False},
        })
        if dup:
            raise ValueError("Designation with this title already exists")

        update_fields["title"] = title

    if "code" in data:
        code = (data.get("code") or "").strip().upper()
        if code:
            dup = designations().find_one({
                "code": code,
                "_id": {"$ne": oid},
                "is_active": {"$ne": False},
            })
            if dup:
                raise ValueError("Designation with this code already exists")
        update_fields["code"] = code or None

    if "description" in data:
        update_fields["description"] = (data.get("description") or "").strip() or None

    r = designations().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


# ============================================
# DEACTIVATE
# ============================================

def deactivate_designation(designation_id):
    """Soft-delete designation."""
    oid = _oid(designation_id)
    if not oid:
        return 0

    # Check if employees are assigned
    emp_count = employees().count_documents({
        "designation_id": oid,
        "status": "ACTIVE",
    })
    if emp_count > 0:
        raise ValueError(
            f"Cannot deactivate — {emp_count} active employee(s) assigned to this designation"
        )

    r = designations().update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": _now()}},
    )
    return r.modified_count