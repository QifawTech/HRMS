from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import insurances, employees
from app.utils.helpers import serialize, serialize_list


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.utcnow()


# ============================================
# DEFAULT INSURANCE TYPES (seeded on first load)
# ============================================
DEFAULT_INSURANCES = [
    {
        "name": "Health Insurance",
        "annual_amount": 12000,
        "description": "Company group health insurance",
    },
    {
        "name": "Life Insurance",
        "annual_amount": 6000,
        "description": "Annual life insurance premium",
    },
]


def ensure_default_insurances():
    """Seed default insurance types if collection is empty."""
    try:
        if insurances().count_documents({}) == 0:
            now = _now()
            docs = []
            for ins in DEFAULT_INSURANCES:
                docs.append({
                    **ins,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                })
            insurances().insert_many(docs)
            print("[Insurance] Default insurances seeded.")
    except Exception as e:
        print(f"[Insurance] Seed failed: {e}")


# ============================================
# LIST / GET
# ============================================

def list_insurances(active_only=True):
    """List all insurance types."""
    ensure_default_insurances()
    query = {"is_active": True} if active_only else {}
    docs = list(insurances().find(query).sort("name", 1))

    result = []
    for d in docs:
        # Count active employees using this insurance
        emp_count = employees().count_documents({
            "insurance_id": d["_id"],
            "status": "ACTIVE",
        })
        d["employee_count"] = emp_count
        result.append(d)

    return serialize_list(result)


def get_insurance(insurance_id):
    oid = _oid(insurance_id)
    if not oid:
        return None
    doc = insurances().find_one({"_id": oid})
    return serialize(doc) if doc else None


# ============================================
# CREATE
# ============================================

def create_insurance(data):
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()

    if not name:
        raise ValueError("Insurance name is required")

    try:
        annual_amount = float(data.get("annual_amount") or 0)
    except (ValueError, TypeError):
        raise ValueError("Invalid annual amount")

    if annual_amount < 0:
        raise ValueError("Annual amount cannot be negative")

    if insurances().find_one({"name": name, "is_active": True}):
        raise ValueError("Insurance with this name already exists")

    now = _now()
    doc = {
        "name": name,
        "annual_amount": annual_amount,
        "description": description or None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = insurances().insert_one(doc)
    return str(result.inserted_id)


# ============================================
# UPDATE
# ============================================

def update_insurance(insurance_id, data):
    oid = _oid(insurance_id)
    if not oid:
        raise ValueError("Invalid insurance ID")

    existing = insurances().find_one({"_id": oid})
    if not existing:
        raise ValueError("Insurance not found")

    update_fields = {"updated_at": _now()}

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise ValueError("Insurance name is required")
        dup = insurances().find_one({
            "name": name,
            "is_active": True,
            "_id": {"$ne": oid},
        })
        if dup:
            raise ValueError("Insurance with this name already exists")
        update_fields["name"] = name

    if "annual_amount" in data:
        try:
            amount = float(data["annual_amount"] or 0)
            if amount < 0:
                raise ValueError("Annual amount cannot be negative")
            update_fields["annual_amount"] = amount
        except (ValueError, TypeError):
            raise ValueError("Invalid annual amount")

    if "description" in data:
        update_fields["description"] = (data["description"] or "").strip() or None

    r = insurances().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


# ============================================
# DEACTIVATE (Soft delete)
# ============================================

def delete_insurance(insurance_id):
    oid = _oid(insurance_id)
    if not oid:
        raise ValueError("Invalid insurance ID")

    existing = insurances().find_one({"_id": oid})
    if not existing:
        raise ValueError("Insurance not found")

    # Check if any active employee is using this
    in_use = employees().count_documents({
        "insurance_id": oid,
        "status": "ACTIVE",
    })
    if in_use > 0:
        raise ValueError(
            f"Cannot delete — {in_use} active employee(s) using this insurance"
        )

    r = insurances().update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": _now()}},
    )
    return r.modified_count