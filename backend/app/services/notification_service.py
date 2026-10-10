from datetime import datetime
from bson import ObjectId
from app.db import notifications, employees, users
from app.utils.helpers import serialize_list
from app.utils.time_utils import now_ist


def create_notification(employee_id, title, message, notif_type="INFO", link=None, related_id=None, from_employee_id=None):
    """Create a notification."""
    if not employee_id:
        return None

    from_name = None
    if from_employee_id:
        emp = employees().find_one({"_id": from_employee_id})
        if emp:
            from_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()

    now = now_ist()
    result = notifications().insert_one({
        "employee_id": employee_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "link": link,
        "related_id": related_id,
        "from_employee_id": from_employee_id,
        "from_name": from_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })
    return str(result.inserted_id)


def notify_all_managers(title, message, notif_type="INFO", link=None, related_id=None):
    """Notify all active managers."""
    manager_users = list(users().find({"role": "MANAGER", "is_active": True}))
    for mu in manager_users:
        mgr_emp = employees().find_one({"user_id": mu["_id"]})
        if mgr_emp:
            create_notification(
                mgr_emp["_id"],
                title, message, notif_type, link, related_id,
            )


def list_my_notifications(employee_id, unread_only=False, limit=50):
    oid = _safe_oid(employee_id)
    if not oid:
        return []

    query = {"employee_id": oid}
    if unread_only:
        query["is_read"] = False

    docs = list(notifications().find(query).sort("created_at", -1).limit(limit))
    return serialize_list(docs)


def unread_count(employee_id):
    oid = _safe_oid(employee_id)
    if not oid:
        return 0
    return notifications().count_documents({"employee_id": oid, "is_read": False})


def mark_read(notification_id, employee_id):
    nid = _safe_oid(notification_id)
    eid = _safe_oid(employee_id)
    if not nid or not eid:
        return 0
    r = notifications().update_one(
        {"_id": nid, "employee_id": eid},
        {"$set": {"is_read": True, "read_at": now_ist()}},
    )
    return r.modified_count


def mark_all_read(employee_id):
    eid = _safe_oid(employee_id)
    if not eid:
        return 0
    r = notifications().update_many(
        {"employee_id": eid, "is_read": False},
        {"$set": {"is_read": True, "read_at": now_ist()}},
    )
    return r.modified_count


def delete_notification(notification_id, employee_id):
    nid = _safe_oid(notification_id)
    eid = _safe_oid(employee_id)
    if not nid or not eid:
        return 0
    r = notifications().delete_one({"_id": nid, "employee_id": eid})
    return r.deleted_count


def _safe_oid(s):
    try:
        return ObjectId(s)
    except Exception:
        return None