from datetime import datetime, timezone, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from app.db import tasks, employees, notifications
from app.utils.helpers import serialize, serialize_list
from app.utils.time_utils import now_ist


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return now_ist()


def _now_ist():
    return now_ist() + timedelta(hours=5, minutes=30)


def _parse_datetime(s):
    if not s:
        return None
    try:
        if "T" in s:
            if "+" in s or s.endswith("Z"):
                parsed = datetime.fromisoformat(s.replace("Z", "+00:00"))
                return parsed.astimezone(timezone.utc).replace(tzinfo=None)
            naive = datetime.fromisoformat(s)
            return naive - timedelta(hours=5, minutes=30)
        return datetime.fromisoformat(s)
    except Exception:
        try:
            naive = datetime.strptime(s, "%Y-%m-%dT%H:%M")
            return naive - timedelta(hours=5, minutes=30)
        except Exception:
            return None


def _add_history(task_id, action, by_emp_id, by_name, comment=""):
    """Append to workflow history."""
    tasks().update_one(
        {"_id": task_id},
        {
            "$push": {
                "workflow_history": {
                    "action": action,
                    "by": by_emp_id,
                    "by_name": by_name,
                    "at": _now(),
                    "comment": comment or "",
                }
            }
        }
    )


def _enrich_task(t):
    if not t:
        return t

    now_ist = _now_ist()

    if t.get("due_date") and t.get("status") not in ("Completed", "Cancelled"):
        due = t["due_date"]
        if isinstance(due, str):
            due = _parse_datetime(due)

        if due and isinstance(due, datetime):
            if due.tzinfo is None:
                due_ist = due + timedelta(hours=5, minutes=30)
            else:
                due_ist = due.astimezone(timezone.utc).replace(tzinfo=None) + timedelta(hours=5, minutes=30)

            diff = due_ist - now_ist
            secs = diff.total_seconds()

            if secs < 0:
                days = abs(int(secs // 86400))
                hours = abs(int((secs % 86400) // 3600))
                t["due_warning"] = "overdue"
                t["due_warning_text"] = f"Overdue by {days}d {hours}h" if days > 0 else f"Overdue by {hours}h"
            elif secs < 86400:
                hours = int(secs // 3600)
                mins = int((secs % 3600) // 60)
                t["due_warning"] = "urgent"
                t["due_warning_text"] = f"Due in {hours}h {mins}m" if hours > 0 else f"Due in {mins}m"
            elif secs < 2 * 86400:
                t["due_warning"] = "warning"
                t["due_warning_text"] = "Due tomorrow"
            elif secs < 7 * 86400:
                days = int(secs // 86400)
                t["due_warning"] = "warning"
                t["due_warning_text"] = f"Due in {days}d"
            else:
                days = int(secs // 86400)
                t["due_warning"] = "normal"
                t["due_warning_text"] = f"Due in {days}d"

    return t


# ============================================
# MANAGER
# ============================================

def list_tasks(status=None, employee_id=None, priority=None, search=None):
    query = {"is_active": True}

    if status and status in ("Pending", "Plan Submitted", "Approved", "Changes Requested", "In Progress", "Completed", "Cancelled"):
        query["status"] = status

    if employee_id:
        emp_oid = _oid(employee_id)
        if emp_oid:
            query["assigned_to"] = emp_oid

    if priority and priority in ("LOW", "NORMAL", "HIGH", "URGENT"):
        query["priority"] = priority

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    docs = list(tasks().find(query).sort([("status", 1), ("due_date", 1)]))
    result = [_enrich_task(d) for d in docs]
    return serialize_list(result)


def get_task(task_id):
    oid = _oid(task_id)
    if not oid:
        return None
    t = tasks().find_one({"_id": oid})
    return serialize(_enrich_task(t)) if t else None


def create_task(data, manager_user_id):
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    priority = (data.get("priority") or "NORMAL").upper()
    assigned_to = _oid(data.get("assigned_to"))
    due_date_str = data.get("due_date")

    if not title:
        raise ValueError("Title is required")
    if not assigned_to:
        raise ValueError("Select an employee")
    if not due_date_str:
        raise ValueError("Due date is required")

    due_date = _parse_datetime(due_date_str)
    if not due_date:
        raise ValueError("Invalid due date format")

    if priority not in ("LOW", "NORMAL", "HIGH", "URGENT"):
        priority = "NORMAL"

    emp = employees().find_one({"_id": assigned_to})
    if not emp:
        raise ValueError("Employee not found")
    if emp.get("status") != "ACTIVE":
        raise ValueError("Cannot assign task to inactive employee")

    mgr_oid = _oid(manager_user_id)
    mgr_emp = employees().find_one({"user_id": mgr_oid}) if mgr_oid else None
    mgr_emp_id = mgr_emp["_id"] if mgr_emp else None
    mgr_name = (
        f"{mgr_emp.get('first_name', '')} {mgr_emp.get('last_name', '')}".strip()
        if mgr_emp
        else "Manager"
    )

    now = _now()

    result = tasks().insert_one({
        "title": title,
        "description": description,
        "priority": priority,
        "status": "Pending",
        "assigned_to": assigned_to,
        "assigned_to_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
        "assigned_to_code": emp.get("employee_code"),
        "assigned_by": mgr_emp_id,
        "assigned_by_name": mgr_name,
        "due_date": due_date,
        "assigned_at": now,
        "started_at": None,
        "completed_at": None,
        "workflow_plan": None,
        "plan_status": "Not Submitted",
        "plan_reviewed_at": None,
        "plan_reviewed_by": None,
        "plan_review_comment": "",
        "workflow_history": [
            {
                "action": "Task Assigned",
                "by": mgr_emp_id,
                "by_name": mgr_name,
                "at": now,
                "comment": "",
            }
        ],
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })

    notifications().insert_one({
        "employee_id": assigned_to,
        "title": "New Task Assigned",
        "message": f'You have a new task: "{title}"',
        "type": "TASK_ASSIGNED",
        "link": "/employee/tasks",
        "related_id": result.inserted_id,
        "from_employee_id": mgr_emp_id,
        "from_name": mgr_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    return str(result.inserted_id)


def update_task(task_id, data):
    oid = _oid(task_id)
    if not oid:
        return 0

    update_fields = {"updated_at": _now()}

    if "title" in data:
        update_fields["title"] = (data["title"] or "").strip()
    if "description" in data:
        update_fields["description"] = (data["description"] or "").strip()
    if "priority" in data:
        p = (data["priority"] or "NORMAL").upper()
        if p in ("LOW", "NORMAL", "HIGH", "URGENT"):
            update_fields["priority"] = p
    if "due_date" in data and data["due_date"]:
        due = _parse_datetime(data["due_date"])
        if due:
            update_fields["due_date"] = due
    if "assigned_to" in data:
        emp_oid = _oid(data["assigned_to"])
        if emp_oid:
            emp = employees().find_one({"_id": emp_oid})
            if emp:
                update_fields["assigned_to"] = emp_oid
                update_fields["assigned_to_name"] = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()
                update_fields["assigned_to_code"] = emp.get("employee_code")

    r = tasks().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


def delete_task(task_id):
    oid = _oid(task_id)
    if not oid:
        return 0
    r = tasks().update_one(
        {"_id": oid},
        {"$set": {"is_active": False, "updated_at": _now()}},
    )
    return r.modified_count


def stats():
    query = {"is_active": True}
    return {
        "total": tasks().count_documents(query),
        "pending": tasks().count_documents({**query, "status": "Pending"}),
        "plan_submitted": tasks().count_documents({**query, "status": "Plan Submitted"}),
        "approved": tasks().count_documents({**query, "status": "Approved"}),
        "changes_requested": tasks().count_documents({**query, "status": "Changes Requested"}),
        "in_progress": tasks().count_documents({**query, "status": "In Progress"}),
        "completed": tasks().count_documents({**query, "status": "Completed"}),
        "overdue": tasks().count_documents({
            **query,
            "status": {"$nin": ["Completed", "Cancelled"]},
            "due_date": {"$lt": _now()},
        }),
    }


# ============================================
# EMPLOYEE
# ============================================

def my_tasks(employee_id, status=None, search=None):
    oid = _oid(employee_id)
    if not oid:
        return []

    query = {"assigned_to": oid, "is_active": True}

    if status:
        query["status"] = status

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    docs = list(tasks().find(query).sort([("status", 1), ("due_date", 1)]))
    result = [_enrich_task(d) for d in docs]
    return serialize_list(result)


def my_stats(employee_id):
    oid = _oid(employee_id)
    if not oid:
        return {}

    query = {"assigned_to": oid, "is_active": True}
    return {
        "total": tasks().count_documents(query),
        "pending": tasks().count_documents({**query, "status": "Pending"}),
        "in_progress": tasks().count_documents({**query, "status": "In Progress"}),
        "completed": tasks().count_documents({**query, "status": "Completed"}),
    }


# ============================================
# WORKFLOW ACTIONS
# ============================================

def submit_plan(task_id, employee_id, plan_data):
    """
    Employee submits workflow plan (file + text).
    Status: Pending/Changes Requested → Plan Submitted
    """
    t_oid = _oid(task_id)
    e_oid = _oid(employee_id)
    if not t_oid or not e_oid:
        raise ValueError("Invalid IDs")

    task = tasks().find_one({"_id": t_oid, "assigned_to": e_oid})
    if not task:
        raise ValueError("Task not found")

    if task.get("status") not in ("Pending", "Changes Requested"):
        raise ValueError(f"Cannot submit plan in '{task.get('status')}' status")

    emp = employees().find_one({"_id": e_oid})
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "Employee"

    now = _now()

    workflow_plan = {
        "uploaded_at": now,
        "uploaded_by": e_oid,
        "file_id": plan_data.get("file_id"),
        "file_path": plan_data.get("file_path"),
        "file_name": plan_data.get("file_name"),
        "file_size": plan_data.get("file_size"),
        "mime_type": plan_data.get("mime_type"),
        "text_plan": (plan_data.get("text_plan") or "").strip(),
    }

    is_resubmit = task.get("status") == "Changes Requested"
    action_text = "Plan Resubmitted" if is_resubmit else "Plan Submitted"

    tasks().update_one(
        {"_id": t_oid},
        {
            "$set": {
                "status": "Plan Submitted",
                "plan_status": "Submitted",
                "workflow_plan": workflow_plan,
                "plan_review_comment": "",
                "updated_at": now,
            },
            "$push": {
                "workflow_history": {
                    "action": action_text,
                    "by": e_oid,
                    "by_name": emp_name,
                    "at": now,
                    "comment": plan_data.get("text_plan", "")[:200],
                }
            },
        },
    )

    # Notify manager
    if task.get("assigned_by"):
        mgr_emp = employees().find_one({"_id": task["assigned_by"]})
        notifications().insert_one({
            "employee_id": task["assigned_by"],
            "title": "Task Plan Submitted" if not is_resubmit else "Task Plan Resubmitted",
            "message": f'{emp_name} {"resubmitted" if is_resubmit else "submitted"} a plan for "{task.get("title")}"',
            "type": "TASK_PLAN_SUBMITTED",
            "link": "/manager/tasks",
            "related_id": t_oid,
            "from_employee_id": e_oid,
            "from_name": emp_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    return True


def review_plan(task_id, manager_id, action, comment=""):
    """
    Manager approves or requests changes.
    action: "Approve" | "Request Changes"
    """
    t_oid = _oid(task_id)
    m_oid = _oid(manager_id)
    if not t_oid or not m_oid:
        raise ValueError("Invalid IDs")

    task = tasks().find_one({"_id": t_oid})
    if not task:
        raise ValueError("Task not found")

    if task.get("status") != "Plan Submitted":
        raise ValueError("Task is not pending plan review")

    mgr_emp = employees().find_one({"_id": m_oid})
    mgr_name = f"{mgr_emp.get('first_name', '')} {mgr_emp.get('last_name', '')}".strip() if mgr_emp else "Manager"

    now = _now()

    if action == "Approve":
        new_status = "Approved"
        plan_status = "Approved"
        action_text = "Plan Approved"
    elif action == "Request Changes":
        new_status = "Changes Requested"
        plan_status = "Changes Requested"
        action_text = "Changes Requested"
    else:
        raise ValueError("Invalid action")

    tasks().update_one(
        {"_id": t_oid},
        {
            "$set": {
                "status": new_status,
                "plan_status": plan_status,
                "plan_reviewed_at": now,
                "plan_reviewed_by": m_oid,
                "plan_review_comment": (comment or "").strip(),
                "updated_at": now,
            },
            "$push": {
                "workflow_history": {
                    "action": action_text,
                    "by": m_oid,
                    "by_name": mgr_name,
                    "at": now,
                    "comment": (comment or "").strip(),
                }
            },
        },
    )

    # Notify employee
    notifications().insert_one({
        "employee_id": task["assigned_to"],
        "title": f"Plan {action}d" if action == "Approve" else "Changes Requested",
        "message": f'Your plan for "{task.get("title")}" was {action.lower()}d.'
            + (f' Comment: {comment}' if comment else ""),
        "type": "TASK_PLAN_APPROVED" if action == "Approve" else "TASK_PLAN_CHANGES",
        "link": "/employee/tasks",
        "related_id": t_oid,
        "from_employee_id": m_oid,
        "from_name": mgr_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    return True


def start_work(task_id, employee_id):
    """Employee starts work after plan approved."""
    t_oid = _oid(task_id)
    e_oid = _oid(employee_id)
    if not t_oid or not e_oid:
        raise ValueError("Invalid IDs")

    task = tasks().find_one({"_id": t_oid, "assigned_to": e_oid})
    if not task:
        raise ValueError("Task not found")

    if task.get("status") != "Approved":
        raise ValueError("Plan must be approved first")

    emp = employees().find_one({"_id": e_oid})
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "Employee"

    now = _now()

    tasks().update_one(
        {"_id": t_oid},
        {
            "$set": {
                "status": "In Progress",
                "started_at": now,
                "updated_at": now,
            },
            "$push": {
                "workflow_history": {
                    "action": "Work Started",
                    "by": e_oid,
                    "by_name": emp_name,
                    "at": now,
                    "comment": "",
                }
            },
        },
    )

    # Notify manager
    if task.get("assigned_by"):
        notifications().insert_one({
            "employee_id": task["assigned_by"],
            "title": "Work Started",
            "message": f'{emp_name} started working on "{task.get("title")}"',
            "type": "TASK_STARTED",
            "link": "/manager/tasks",
            "related_id": t_oid,
            "from_employee_id": e_oid,
            "from_name": emp_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    return True


def complete_task(task_id, employee_id, completion_notes=""):
    """Employee marks task complete."""
    t_oid = _oid(task_id)
    e_oid = _oid(employee_id)
    if not t_oid or not e_oid:
        raise ValueError("Invalid IDs")

    task = tasks().find_one({"_id": t_oid, "assigned_to": e_oid})
    if not task:
        raise ValueError("Task not found")

    if task.get("status") not in ("In Progress", "Approved"):
        raise ValueError("Task is not in progress")

    emp = employees().find_one({"_id": e_oid})
    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() if emp else "Employee"

    now = _now()

    tasks().update_one(
        {"_id": t_oid},
        {
            "$set": {
                "status": "Completed",
                "completed_at": now,
                "completion_notes": (completion_notes or "").strip(),
                "updated_at": now,
            },
            "$push": {
                "workflow_history": {
                    "action": "Task Completed",
                    "by": e_oid,
                    "by_name": emp_name,
                    "at": now,
                    "comment": (completion_notes or "").strip(),
                }
            },
        },
    )

    if task.get("assigned_by"):
        notifications().insert_one({
            "employee_id": task["assigned_by"],
            "title": "Task Completed",
            "message": f'{emp_name} completed: "{task.get("title")}"',
            "type": "TASK_COMPLETED",
            "link": "/manager/tasks",
            "related_id": t_oid,
            "from_employee_id": e_oid,
            "from_name": emp_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    return True


# ============================================
# ✅ NEW: TRANSFER TASK
# ============================================

def transfer_task(task_id, current_employee_id, new_employee_id, note=""):
    """Transfer task to another employee and log history."""
    t_oid = _oid(task_id)
    c_oid = _oid(current_employee_id)
    n_oid = _oid(new_employee_id)
    
    if not t_oid or not c_oid or not n_oid:
        raise ValueError("Invalid IDs")

    # Check if task exists and assigned to current employee
    task = tasks().find_one({"_id": t_oid, "assigned_to": c_oid, "is_active": True})
    if not task:
        raise ValueError("Task not found or not assigned to you")

    if task.get("status") in ("Completed", "Cancelled"):
        raise ValueError(f"Cannot transfer a task in '{task.get('status')}' status")

    # Get new employee details
    new_emp = employees().find_one({"_id": n_oid, "status": "ACTIVE"})
    if not new_emp:
        raise ValueError("New employee not found or inactive")
        
    if n_oid == c_oid:
        raise ValueError("Task is already assigned to this employee")

    # Get current employee details
    curr_emp = employees().find_one({"_id": c_oid})
    curr_name = f"{curr_emp.get('first_name', '')} {curr_emp.get('last_name', '')}".strip()
    new_name = f"{new_emp.get('first_name', '')} {new_emp.get('last_name', '')}".strip()

    now = _now()

    # Update task with new assignee
    tasks().update_one(
        {"_id": t_oid},
        {
            "$set": {
                "assigned_to": n_oid,
                "assigned_to_name": new_name,
                "assigned_to_code": new_emp.get("employee_code"),
                "status": "Pending", # Reset status to pending
                "plan_status": "Not Submitted", # Reset plan
                "workflow_plan": None,
                "updated_at": now,
            },
            "$push": {
                "workflow_history": {
                    "action": "Task Transferred",
                    "by": c_oid,
                    "by_name": curr_name,
                    "at": now,
                    "comment": f"Transferred from {curr_name} to {new_name}." + (f" Note: {note}" if note else ""),
                }
            },
        },
    )

    # Notify new employee
    notifications().insert_one({
        "employee_id": n_oid,
        "title": "Task Transferred to You",
        "message": f'Task "{task.get("title")}" transferred to you by {curr_name}.',
        "type": "TASK_ASSIGNED",
        "link": "/employee/tasks",
        "related_id": t_oid,
        "from_employee_id": c_oid,
        "from_name": curr_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    # Notify old employee
    notifications().insert_one({
        "employee_id": c_oid,
        "title": "Task Transferred Successfully",
        "message": f'You transferred "{task.get("title")}" to {new_name}.',
        "type": "TASK_TRANSFERRED",
        "link": "/employee/tasks",
        "related_id": t_oid,
        "from_employee_id": n_oid,
        "from_name": new_name,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })
    
    # Notify Manager (optional)
    if task.get("assigned_by"):
        notifications().insert_one({
            "employee_id": task["assigned_by"],
            "title": "Task Transferred",
            "message": f'{curr_name} transferred "{task.get("title")}" to {new_name}.',
            "type": "TASK_TRANSFERRED",
            "link": "/manager/tasks",
            "related_id": t_oid,
            "from_employee_id": c_oid,
            "from_name": curr_name,
            "is_read": False,
            "read_at": None,
            "created_at": now,
        })

    return True