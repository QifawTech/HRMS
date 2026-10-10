from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from app.db import announcements, employees, users, notifications
from app.utils.helpers import serialize, serialize_list
from app.utils.file_handler import delete_file
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _get_manager_emp_id(user_id):
    """Get employee_id from user_id."""
    uid = _oid(user_id)
    if not uid:
        return None
    emp = employees().find_one({"user_id": uid})
    return emp["_id"] if emp else None


def list_announcements(target_type=None, priority=None, search=None):
    """Manager: list all announcements."""
    query = {"is_active": True}

    if target_type and target_type in ("ALL", "SPECIFIC"):
        query["target_type"] = target_type

    if priority and priority in ("LOW", "NORMAL", "HIGH", "URGENT"):
        query["priority"] = priority

    if search:
        search_or = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
        ]
        query["$or"] = search_or

    try:
        docs = list(announcements().find(query).sort("created_at", -1))
        return serialize_list(docs)
    except Exception as e:
        import traceback
        print(f"❌ list_announcements error: {e}")
        print(traceback.format_exc())
        return []


def get_announcement(ann_id):
    oid = _oid(ann_id)
    if not oid:
        return None
    doc = announcements().find_one({"_id": oid})
    return serialize(doc) if doc else None


def create_announcement(data, manager_user_id):
    """Create announcement + notify recipients."""
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    priority = (data.get("priority") or "NORMAL").strip().upper()
    target_type = (data.get("target_type") or "ALL").strip().upper()
    attachments = data.get("attachments") or []

    if not title:
        raise ValueError("Title is required")
    if not content:
        raise ValueError("Content is required")
    if priority not in ("LOW", "NORMAL", "HIGH", "URGENT"):
        priority = "NORMAL"
    if target_type not in ("ALL", "SPECIFIC"):
        target_type = "ALL"

    # Get manager info
    mgr_emp_id = _get_manager_emp_id(manager_user_id)
    if not mgr_emp_id:
        raise ValueError("Manager not found")

    mgr_emp = employees().find_one({"_id": mgr_emp_id})
    mgr_name = f"{mgr_emp.get('first_name', '')} {mgr_emp.get('last_name', '')}".strip()

    # Determine recipients
    if target_type == "ALL":
        recipients = list(employees().find({"status": "ACTIVE"}))
        target_ids = []
    else:
        target_ids = [_oid(eid) for eid in (data.get("target_employee_ids") or [])]
        target_ids = [t for t in target_ids if t]
        if not target_ids:
            raise ValueError("Select at least one employee")
        recipients = list(employees().find({"_id": {"$in": target_ids}}))

    now = now_ist()

    # Create announcement
    ann_doc = {
        "title": title,
        "content": content,
        "priority": priority,
        "target_type": target_type,
        "target_employee_ids": target_ids,
        "attachments": attachments,
        "created_by": mgr_emp_id,
        "created_by_name": mgr_name,
        "is_active": True,
        "expires_at": None,
        "seen_by": [],
        "total_recipients": len(recipients),
        "seen_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = announcements().insert_one(ann_doc)
    ann_id = result.inserted_id

    # Create notification for each recipient
    for emp in recipients:
        notifications().insert_one({
            "employee_id": emp["_id"],
            "title": title,
            "message": content[:150] + ("..." if len(content) > 150 else ""),
            "type": "PRIVATE_MSG" if target_type == "SPECIFIC" else "ANNOUNCEMENT",
            "announcement_id": ann_id,
            "from_employee_id": mgr_emp_id,
            "from_name": mgr_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    return str(ann_id)


def update_announcement(ann_id, data):
    oid = _oid(ann_id)
    if not oid:
        return 0

    update_fields = {"updated_at": now_ist()}

    if "title" in data:
        update_fields["title"] = (data["title"] or "").strip()
    if "content" in data:
        update_fields["content"] = (data["content"] or "").strip()
    if "priority" in data:
        p = (data["priority"] or "NORMAL").upper()
        if p in ("LOW", "NORMAL", "HIGH", "URGENT"):
            update_fields["priority"] = p

    r = announcements().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


def delete_announcement(ann_id):
    """Soft delete + delete attachment files."""
    oid = _oid(ann_id)
    if not oid:
        return 0

    ann = announcements().find_one({"_id": oid})
    if not ann:
        return 0

    # Delete files
    for att in ann.get("attachments", []):
        delete_file(att.get("file_path"))

    # Soft delete
    r = announcements().update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": now_ist()}},
    )

    # Delete related notifications
    notifications().delete_many({"announcement_id": oid})

    return r.modified_count


def get_seen_list(ann_id):
    """Manager: who saw this announcement."""
    oid = _oid(ann_id)
    if not oid:
        return None

    ann = announcements().find_one({"_id": oid})
    if not ann:
        return None

    seen_emp_ids = [s["employee_id"] for s in ann.get("seen_by", [])]

    # Get all recipients
    if ann["target_type"] == "ALL":
        all_recipients = list(employees().find({"status": "ACTIVE"}))
    else:
        all_recipients = list(employees().find({"_id": {"$in": ann.get("target_employee_ids", [])}}))

    seen = []
    pending = []

    seen_map = {str(s["employee_id"]): s["seen_at"] for s in ann.get("seen_by", [])}

    for emp in all_recipients:
        emp_id_str = str(emp["_id"])
        item = {
            "employee_id": emp_id_str,
            "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
            "employee_code": emp.get("employee_code"),
        }
        if emp_id_str in seen_map:
            item["seen_at"] = seen_map[emp_id_str].isoformat() if seen_map[emp_id_str] else None
            seen.append(item)
        else:
            pending.append(item)

    return {
        "seen": seen,
        "pending": pending,
        "seen_count": len(seen),
        "pending_count": len(pending),
        "total": len(all_recipients),
    }


def stats():
    """Manager dashboard stats."""
    total = announcements().count_documents({"is_active": True})
    common = announcements().count_documents({"is_active": True, "target_type": "ALL"})
    private = announcements().count_documents({"is_active": True, "target_type": "SPECIFIC"})
    urgent = announcements().count_documents({"is_active": True, "priority": "URGENT"})
    return {
        "total": total,
        "common": common,
        "private": private,
        "urgent": urgent,
    }


# ============================================
# EMPLOYEE
# ============================================

def my_announcements(employee_id, target_type=None, search=None):
    """Employee: get own announcements with proper filtering."""
    oid = _oid(employee_id)
    if not oid:
        return []

    # Base query — active only
    query = {"is_active": True}

    # Tab-specific filter (BEFORE access filter)
    if target_type == "ALL":
        query["target_type"] = "ALL"
    elif target_type == "SPECIFIC":
        query["target_type"] = "SPECIFIC"
        query["target_employee_ids"] = oid
    else:
        # No tab — show all that apply to this employee
        query["$or"] = [
            {"target_type": "ALL"},
            {"target_type": "SPECIFIC", "target_employee_ids": oid},
        ]

    # Search filter (merge into query)
    if search:
        search_or = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
        ]
        # If we already have $or, use $and
        if "$or" in query:
            existing_or = query.pop("$or")
            query["$and"] = [{"$or": existing_or}, {"$or": search_or}]
        else:
            query["$or"] = search_or

    docs = list(announcements().find(query).sort("created_at", -1))

    result = []
    for d in docs:
        d_ser = serialize(d)
        seen = any(
            str(s["employee_id"]) == str(oid)
            for s in d.get("seen_by", [])
        )
        d_ser["is_seen_by_me"] = seen
        d_ser.pop("seen_by", None)
        d_ser.pop("seen_count", None)
        result.append(d_ser)

    return result


def mark_seen(ann_id, employee_id):
    """Employee marks announcement as seen."""
    ann_oid = _oid(ann_id)
    emp_oid = _oid(employee_id)
    if not ann_oid or not emp_oid:
        return 0

    ann = announcements().find_one({"_id": ann_oid})
    if not ann:
        return 0

    # Check if already seen
    already = any(str(s["employee_id"]) == str(emp_oid) for s in ann.get("seen_by", []))
    if already:
        return 0

    r = announcements().update_one(
        {"_id": ann_oid},
        {
            "$push": {
                "seen_by": {
                    "employee_id": emp_oid,
                    "seen_at": now_ist(),
                }
            },
            "$inc": {"seen_count": 1},
        },
    )

    # Also mark related notification as read
    notifications().update_many(
        {"announcement_id": ann_oid, "employee_id": emp_oid},
        {"$set": {"is_read": True, "read_at": now_ist()}},
    )

    return r.modified_count


def my_stats(employee_id):
    """Employee announcement stats."""
    oid = _oid(employee_id)
    if not oid:
        return {"total": 0, "unread": 0}

    query = {
        "is_active": True,
        "$or": [
            {"target_type": "ALL"},
            {"target_type": "SPECIFIC", "target_employee_ids": oid},
        ],
    }
    total = announcements().count_documents(query)

    # Unread = notifications unread
    unread = notifications().count_documents({
        "employee_id": oid,
        "is_read": False,
        "type": {"$in": ["ANNOUNCEMENT", "PRIVATE_MSG"]},
    })

    return {"total": total, "unread": unread}