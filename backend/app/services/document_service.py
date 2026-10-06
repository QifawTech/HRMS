from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import documents, employees
from app.utils.helpers import serialize, serialize_list
from app.utils.file_handler import delete_file


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


# Manager categories
MANAGER_CATEGORIES = [
    "Resume",
    "ID Proof",
    "Offer Letter",
    "Certificate",
    "Joining Document",
    "Personal Document",
    "Other",
]

# Employee can upload these
EMPLOYEE_CATEGORIES = [
    "Personal Document",
    "Certificate",
    "ID Proof",
    "Other",
]


def list_documents(employee_id=None, category=None, search=None, uploaded_by_role=None):
    """Manager: list documents with upload-role filter."""
    query = {"is_active": True}

    if employee_id:
        emp_oid = _oid(employee_id)
        if emp_oid:
            query["employee_id"] = emp_oid

    if category:
        query["doc_category"] = category

    if uploaded_by_role and uploaded_by_role in ("MANAGER", "EMPLOYEE"):
        query["uploaded_by_role"] = uploaded_by_role

    if search:
        query["$or"] = [
            {"doc_name": {"$regex": search, "$options": "i"}},
            {"file_name": {"$regex": search, "$options": "i"}},
            {"employee_name": {"$regex": search, "$options": "i"}},
            {"employee_code": {"$regex": search, "$options": "i"}},
        ]

    docs = list(documents().find(query).sort("created_at", -1))
    return serialize_list(docs)


def my_documents(employee_id, category=None, search=None, uploaded_by_role=None):
    """Employee: own documents with upload-role filter."""
    oid = _oid(employee_id)
    if not oid:
        return []

    query = {"employee_id": oid, "is_active": True}

    if category:
        query["doc_category"] = category

    if uploaded_by_role and uploaded_by_role in ("MANAGER", "EMPLOYEE"):
        query["uploaded_by_role"] = uploaded_by_role

    if search:
        query["$or"] = [
            {"doc_name": {"$regex": search, "$options": "i"}},
            {"file_name": {"$regex": search, "$options": "i"}},
        ]

    docs = list(documents().find(query).sort("created_at", -1))
    return serialize_list(docs)


def create_document(data, uploader_user_id, uploader_role):
    """Create document record."""
    employee_id = _oid(data.get("employee_id"))
    if not employee_id:
        raise ValueError("Employee is required")

    doc_category = (data.get("doc_category") or "").strip()
    if not doc_category:
        raise ValueError("Category is required")

    doc_name = (data.get("doc_name") or "").strip()
    if not doc_name:
        raise ValueError("Document name is required")

    file_id = data.get("file_id")
    file_name = data.get("file_name")
    file_path = data.get("file_path")
    file_size = data.get("file_size", 0)
    mime_type = data.get("mime_type", "application/octet-stream")

    if not file_id or not file_path:
        raise ValueError("File is required")

    # Get employee info
    emp = employees().find_one({"_id": employee_id})
    if not emp:
        raise ValueError("Employee not found")

    # Get uploader info
    up_oid = _oid(uploader_user_id)
    uploader_emp = employees().find_one({"user_id": up_oid}) if up_oid else None
    uploader_emp_id = uploader_emp["_id"] if uploader_emp else None
    uploader_name = (
        f"{uploader_emp.get('first_name', '')} {uploader_emp.get('last_name', '')}".strip()
        if uploader_emp
        else "User"
    )

    now = datetime.utcnow()

    result = documents().insert_one({
        "employee_id": employee_id,
        "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
        "employee_code": emp.get("employee_code"),
        "doc_category": doc_category,
        "doc_name": doc_name,
        "file_id": file_id,
        "file_name": file_name,
        "file_path": file_path,
        "file_size": file_size,
        "mime_type": mime_type,
        "description": (data.get("description") or "").strip(),
        "uploaded_by": uploader_emp_id,
        "uploaded_by_name": uploader_name,
        "uploaded_by_role": uploader_role,
        "is_active": True,
        "created_at": now,
    })

    return str(result.inserted_id)


def delete_document(doc_id):
    """Soft delete document + remove file."""
    oid = _oid(doc_id)
    if not oid:
        return 0

    doc = documents().find_one({"_id": oid})
    if not doc:
        return 0

    # Delete physical file
    if doc.get("file_path"):
        delete_file(doc["file_path"])

    r = documents().update_one(
        {"_id": oid},
        {"$set": {"is_active": False}},
    )
    return r.modified_count


def stats():
    """Manager: dashboard stats."""
    query = {"is_active": True}
    return {
        "total": documents().count_documents(query),
        "manager_uploaded": documents().count_documents({**query, "uploaded_by_role": "MANAGER"}),
        "employee_uploaded": documents().count_documents({**query, "uploaded_by_role": "EMPLOYEE"}),
    }


def my_stats(employee_id):
    """Employee: own stats."""
    oid = _oid(employee_id)
    if not oid:
        return {}

    query = {"employee_id": oid, "is_active": True}
    return {
        "total": documents().count_documents(query),
    }