from datetime import datetime, date
import bcrypt
import logging
from bson import ObjectId
from bson.errors import InvalidId
from app.db import (
    users, employees, departments, designations, shifts, insurances,
    confirmations,
)
from app.utils.helpers import serialize, serialize_list
from app.utils.time_utils import now_ist
from app.services.professional_tax_service import calculate_professional_tax

logger = logging.getLogger(__name__)


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


# ============================================
# BULK CONTEXT — N+1 FIX
# ============================================

def _build_context(docs):
    """
    Bulk-fetch related data for many employees.
    5 queries total — instead of N×5.
    """
    dept_ids = [d["department_id"] for d in docs if d.get("department_id")]
    desig_ids = [d["designation_id"] for d in docs if d.get("designation_id")]
    shift_ids = [d["shift_id"] for d in docs if d.get("shift_id")]
    ins_ids = [d["insurance_id"] for d in docs if d.get("insurance_id")]
    user_ids = [d["user_id"] for d in docs if d.get("user_id")]

    depts = {}
    if dept_ids:
        depts = {d["_id"]: d["name"] for d in departments().find({"_id": {"$in": dept_ids}})}

    desigs = {}
    if desig_ids:
        desigs = {d["_id"]: d["title"] for d in designations().find({"_id": {"$in": desig_ids}})}

    shifts_map = {}
    if shift_ids:
        shifts_map = {s["_id"]: s for s in shifts().find({"_id": {"$in": shift_ids}})}

    ins_map = {}
    if ins_ids:
        ins_map = {i["_id"]: i for i in insurances().find({"_id": {"$in": ins_ids}})}

    users_map = {}
    if user_ids:
        users_map = {
            u["_id"]: u
            for u in users().find(
                {"_id": {"$in": user_ids}},
                {"email": 1, "is_active": 1, "role": 1},
            )
        }

    return {
        "depts": depts,
        "desigs": desigs,
        "shifts": shifts_map,
        "insurances": ins_map,
        "users": users_map,
    }


def _enrich_employee(emp, context=None):
    """
    Enrich employee with related data.
    If context provided → uses bulk data (FAST).
    Otherwise → falls back to per-item queries (slow).
    """
    # FAST PATH — bulk context
    if context:
        emp["department_name"] = context["depts"].get(emp.get("department_id"))
        emp["designation_title"] = context["desigs"].get(emp.get("designation_id"))

        sh = context["shifts"].get(emp.get("shift_id"))
        if sh:
            emp["shift_name"] = sh.get("name")
            emp["shift_start"] = sh.get("start_time")
            emp["shift_end"] = sh.get("end_time")
            emp["shift_grace"] = sh.get("grace_period_minutes")
        else:
            emp["shift_name"] = None
            emp["shift_start"] = None
            emp["shift_end"] = None
            emp["shift_grace"] = None

        ins = context["insurances"].get(emp.get("insurance_id"))
        if ins:
            emp["insurance_name"] = ins.get("name")
            emp["insurance_annual"] = ins.get("annual_amount")
            emp["insurance_monthly"] = round((ins.get("annual_amount") or 0) / 12, 2)
        else:
            emp["insurance_name"] = None
            emp["insurance_annual"] = None
            emp["insurance_monthly"] = None

        u = context["users"].get(emp.get("user_id"))
        emp["email"] = u.get("email") if u else None
        emp["user_active"] = u.get("is_active", True) if u else False
        emp["user_role"] = u.get("role", "EMPLOYEE") if u else "EMPLOYEE"

        # ✅ Always build picture URL — endpoint will 404 if no picture
        emp["profile_picture_url"] = f"/api/employees/{str(emp['_id'])}/picture"

        emp.setdefault("employment_type", "PERMANENT")
        return emp

    # SLOW PATH — single employee (fallback)
    if emp.get("department_id"):
        dept = departments().find_one({"_id": emp["department_id"]})
        emp["department_name"] = dept["name"] if dept else None
    else:
        emp["department_name"] = None

    if emp.get("designation_id"):
        desig = designations().find_one({"_id": emp["designation_id"]})
        emp["designation_title"] = desig["title"] if desig else None
    else:
        emp["designation_title"] = None

    if emp.get("shift_id"):
        sh = shifts().find_one({"_id": emp["shift_id"]})
        if sh:
            emp["shift_name"] = sh.get("name")
            emp["shift_start"] = sh.get("start_time")
            emp["shift_end"] = sh.get("end_time")
            emp["shift_grace"] = sh.get("grace_period_minutes")
        else:
            emp["shift_name"] = None
            emp["shift_start"] = None
            emp["shift_end"] = None
            emp["shift_grace"] = None
    else:
        emp["shift_name"] = None
        emp["shift_start"] = None
        emp["shift_end"] = None
        emp["shift_grace"] = None

    if emp.get("insurance_id"):
        ins = insurances().find_one({"_id": emp["insurance_id"]})
        if ins:
            emp["insurance_name"] = ins.get("name")
            emp["insurance_annual"] = ins.get("annual_amount")
            emp["insurance_monthly"] = round((ins.get("annual_amount") or 0) / 12, 2)
        else:
            emp["insurance_name"] = None
            emp["insurance_annual"] = None
            emp["insurance_monthly"] = None
    else:
        emp["insurance_name"] = None
        emp["insurance_annual"] = None
        emp["insurance_monthly"] = None

    user = users().find_one(
        {"_id": emp["user_id"]}, {"email": 1, "is_active": 1, "role": 1}
    )
    emp["email"] = user["email"] if user else None
    emp["user_active"] = user.get("is_active", True) if user else False
    emp["user_role"] = user.get("role", "EMPLOYEE") if user else "EMPLOYEE"

    # ✅ Always build picture URL
    emp["profile_picture_url"] = f"/api/employees/{str(emp['_id'])}/picture"

    emp.setdefault("employment_type", "PERMANENT")
    return emp


# ============================================
# SALARY BREAKUP HELPER
# ============================================

def _calc_salary_breakup(total, insurance_id=None, annual_insurance=0):
    from app.services.settings_service import get_settings

    settings = get_settings()

    basic_pct = settings.get("basic_percent", 50)
    hra_pct = settings.get("hra_percent_of_basic", 40)
    pf_pct = settings.get("pf_percent", 12)
    esi_pct = settings.get("esi_percent", 0.75)
    tds_pct = settings.get("tds_percent", 0)

    total = float(total or 0)

    basic = round(total * basic_pct / 100, 2)
    hra = round(basic * hra_pct / 100, 2)
    special = round(total - basic - hra, 2)

    pt_result = calculate_professional_tax(total)

    annual_insurance = float(annual_insurance or 0)
    monthly_insurance = round(annual_insurance / 12, 2)

    return {
        "total": total,
        "basic": basic,
        "hra": hra,
        "special_allowance": special,
        "pf_applicable": True,
        "esi_applicable": True,
        "pt_applicable": True,
        "tds_applicable": False,
        "pf_percent": pf_pct,
        "esi_percent": esi_pct,
        "six_month_gross": pt_result["six_month_gross"],
        "professional_tax": pt_result["professional_tax"],
        "tds_percent": tds_pct,
        "tds_amount": 0,
        "insurance_id": insurance_id,
        "annual_insurance": annual_insurance,
        "monthly_insurance": monthly_insurance,
    }


# ============================================
# LIST — N+1 FIX + PAGINATION
# ============================================

def list_employees(search=None, department_id=None, status=None,
                   employment_type=None, page=None, limit=None):
    """
    List employees with optional pagination.
    Bulk-fetch related data (5 queries).
    Excludes MANAGER/ADMIN/SUPER_ADMIN.
    Excludes base64 image data from list.
    """
    try:
        query = {}

        if status and status in (
            "ACTIVE", "INACTIVE", "NOTICE_PERIOD", "RESIGNED", "TERMINATED"
        ):
            query["status"] = status

        if employment_type:
            query["employment_type"] = employment_type

        if department_id:
            oid = _oid(department_id)
            if oid:
                query["department_id"] = oid

        if search:
            query["$or"] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"employee_code": {"$regex": search, "$options": "i"}},
            ]
            user_matches = list(
                users().find(
                    {"email": {"$regex": search, "$options": "i"}}, {"_id": 1}
                )
            )
            if user_matches:
                user_ids = [u["_id"] for u in user_matches]
                query["$or"].append({"user_id": {"$in": user_ids}})

        # Exclude MANAGER / ADMIN / SUPER_ADMIN
        admin_users = list(users().find(
            {"role": {"$in": ["MANAGER", "ADMIN", "SUPER_ADMIN"]}},
            {"_id": 1},
        ))
        if admin_users:
            admin_user_ids = [u["_id"] for u in admin_users]
            query["user_id"] = {"$nin": admin_user_ids}

        # Total count before pagination
        total = employees().count_documents(query)

        # ✅ Cursor with projection — exclude base64 data (huge field)
        cursor = employees().find(
            query,
            {"profile_picture_data": 0}   # Exclude base64 from list
        ).sort("created_at", -1)

        # Pagination
        paginated = bool(page and limit)
        if paginated:
            page = max(1, int(page))
            limit = max(1, int(limit))
            skip = (page - 1) * limit
            cursor = cursor.skip(skip).limit(limit)

        docs = list(cursor)

        # Bulk-fetch related data
        context = _build_context(docs) if docs else None

        # Enrich
        result = [_enrich_employee(emp, context) for emp in docs]

        # Paginated response
        if paginated:
            return {
                "data": serialize_list(result),
                "total": total,
                "page": page,
                "limit": limit,
                "has_more": (page * limit) < total,
            }

        return serialize_list(result)

    except Exception as e:
        logger.error(f"list_employees failed: {e}", exc_info=True)
        raise


def get_employee(emp_id):
    try:
        oid = _oid(emp_id)
        if not oid:
            return None

        emp = employees().find_one({"_id": oid})
        if not emp:
            return None

        emp = _enrich_employee(emp)
        return serialize(emp)
    except Exception as e:
        logger.error(f"get_employee failed: {e}", exc_info=True)
        return None


def generate_employee_code():
    count = employees().count_documents({})
    return f"EMP{count + 1:03d}"


# ============================================
# CREATE
# ============================================

def create_employee(data):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    employee_code = (data.get("employee_code") or "").strip().upper()

    if not email or not password:
        raise ValueError("Email and password required")
    if not first_name or not last_name:
        raise ValueError("First name and last name required")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")
    if not employee_code:
        employee_code = generate_employee_code()

    if users().find_one({"email": email}):
        raise ValueError("Email already exists")
    if employees().find_one({"employee_code": employee_code}):
        raise ValueError("Employee code already exists")

    pw_hash = bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    doj = data.get("date_of_joining")
    if doj:
        try:
            doj = datetime.fromisoformat(doj)
        except Exception:
            doj = now_ist()
    else:
        doj = now_ist()

    end_dt = None
    end_date_str = data.get("end_date")
    if end_date_str:
        try:
            end_dt = datetime.fromisoformat(end_date_str)
        except Exception:
            end_dt = None

    initial_status = "ACTIVE"
    if end_dt and end_dt.date() <= date.today():
        initial_status = "INACTIVE"

    employment_type = (data.get("employment_type") or "PERMANENT").upper()
    intern_end_date = None
    if employment_type == "INTERN":
        ied = data.get("intern_end_date")
        if ied:
            try:
                intern_end_date = datetime.fromisoformat(ied)
            except Exception:
                intern_end_date = None

    total = float(data.get("total_salary") or 0)
    insurance_id = _oid(data.get("insurance_id"))
    annual_insurance = float(data.get("annual_insurance") or 0)
    salary = _calc_salary_breakup(total, insurance_id, annual_insurance)

    created_user_id = None
    try:
        created_user_id = users().insert_one({
            "email": email,
            "password_hash": pw_hash,
            "role": "EMPLOYEE",
            "is_active": (initial_status == "ACTIVE"),
            "created_at": now_ist(),
            "updated_at": now_ist(),
        }).inserted_id

        emp_id = employees().insert_one({
            "user_id": created_user_id,
            "employee_code": employee_code,
            "first_name": first_name,
            "last_name": last_name,
            "phone": (data.get("phone") or "").strip() or None,
            "address": (data.get("address") or "").strip() or None,
            "date_of_birth": None,
            "date_of_joining": doj,
            "end_date": end_dt,
            "department_id": _oid(data.get("department_id")),
            "designation_id": _oid(data.get("designation_id")),
            "shift_id": _oid(data.get("shift_id")),
            "insurance_id": insurance_id,
            "manager_id": None,
            "status": initial_status,
            "salary": salary,
            "employment_type": employment_type,
            "intern_end_date": intern_end_date,
            "confirmation_status": (
                "PENDING" if employment_type in ("INTERN", "PROBATION") else "N/A"
            ),
            "confirmation_date": None,
            "previous_employment_type": None,
            "resignation_date": None,
            "resignation_reason": None,
            "deactivated_at": None,
            "deactivated_by": None,
            "created_at": now_ist(),
            "updated_at": now_ist(),
        }).inserted_id

        logger.info(f"Employee created: {employee_code} ({email})")
        return str(emp_id)

    except Exception as e:
        logger.error(f"create_employee failed: {e}", exc_info=True)
        if created_user_id:
            users().delete_one({"_id": created_user_id})
        raise e


# ============================================
# UPDATE
# ============================================

def update_employee(emp_id, data):
    oid = _oid(emp_id)
    if not oid:
        return 0

    emp = employees().find_one({"_id": oid})
    if not emp:
        return 0

    update_fields = {"updated_at": now_ist()}

    if "email" in data and data["email"]:
        new_email = (data["email"] or "").strip().lower()
        if not new_email:
            raise ValueError("Email cannot be empty")
        existing = users().find_one({
            "email": new_email,
            "_id": {"$ne": emp["user_id"]},
        })
        if existing:
            raise ValueError("Email already exists")
        users().update_one(
            {"_id": emp["user_id"]},
            {"$set": {"email": new_email, "updated_at": now_ist()}},
        )

    if "password" in data and data["password"]:
        new_pw = data["password"]
        if len(new_pw) < 6:
            raise ValueError("Password must be at least 6 characters")
        pw_hash = bcrypt.hashpw(
            new_pw.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        users().update_one(
            {"_id": emp["user_id"]},
            {"$set": {"password_hash": pw_hash, "updated_at": now_ist()}},
        )

    for field in ["first_name", "last_name", "phone", "address"]:
        if field in data:
            update_fields[field] = (data[field] or "").strip() or None

    if "department_id" in data:
        update_fields["department_id"] = _oid(data["department_id"])

    if "designation_id" in data:
        update_fields["designation_id"] = _oid(data["designation_id"])

    if "shift_id" in data:
        update_fields["shift_id"] = (
            _oid(data["shift_id"]) if data["shift_id"] else None
        )

    if "date_of_joining" in data and data["date_of_joining"]:
        try:
            update_fields["date_of_joining"] = datetime.fromisoformat(
                data["date_of_joining"]
            )
        except Exception:
            pass

    if "end_date" in data:
        if data["end_date"]:
            try:
                end_dt = datetime.fromisoformat(data["end_date"])
                update_fields["end_date"] = end_dt
                if end_dt.date() <= date.today():
                    update_fields["status"] = "INACTIVE"
            except Exception:
                pass
        else:
            update_fields["end_date"] = None

    if "employment_type" in data and data["employment_type"]:
        update_fields["employment_type"] = data["employment_type"].upper()
        if update_fields["employment_type"] == "INTERN":
            update_fields["confirmation_status"] = "PENDING"

    if "intern_end_date" in data:
        if data["intern_end_date"]:
            try:
                update_fields["intern_end_date"] = datetime.fromisoformat(
                    data["intern_end_date"]
                )
            except Exception:
                pass
        else:
            update_fields["intern_end_date"] = None

    if "insurance_id" in data:
        update_fields["insurance_id"] = (
            _oid(data["insurance_id"]) if data["insurance_id"] else None
        )

    if (
        "total_salary" in data
        or "annual_insurance" in data
        or "insurance_id" in data
    ):
        existing_salary = (emp or {}).get("salary", {})

        def _safe_float(v, fallback=0):
            if v is None or v == "":
                return fallback
            try:
                return float(v)
            except (ValueError, TypeError):
                return fallback

        total = _safe_float(
            data.get("total_salary")
            if "total_salary" in data
            else existing_salary.get("total", 0),
            fallback=existing_salary.get("total", 0) or 0,
        )
        annual_insurance = _safe_float(
            data.get("annual_insurance")
            if "annual_insurance" in data
            else existing_salary.get("annual_insurance", 0),
            fallback=existing_salary.get("annual_insurance", 0) or 0,
        )
        insurance_id = (
            _oid(data.get("insurance_id"))
            if "insurance_id" in data
            else existing_salary.get("insurance_id")
        )
        update_fields["salary"] = _calc_salary_breakup(
            total, insurance_id, annual_insurance
        )

    r = employees().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


# ============================================
# CONFIRM INTERN → PERMANENT
# ============================================

def confirm_employee(employee_id, data):
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee id")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    new_type = (data.get("employment_type") or "PERMANENT").upper()
    confirmation_date = (
        data.get("confirmation_date")
        or now_ist().strftime("%Y-%m-%d")
    )
    notes = (data.get("notes") or "").strip()
    new_salary = data.get("new_salary")
    new_designation_id = data.get("new_designation_id")

    update = {
        "employment_type": new_type,
        "confirmation_status": "CONFIRMED",
        "confirmation_date": confirmation_date,
        "previous_employment_type": emp.get("employment_type", "INTERN"),
        "updated_at": now_ist(),
    }

    if new_salary is not None and str(new_salary).strip() != "":
        total = float(new_salary)
        existing_salary = emp.get("salary", {}) or {}
        insurance_id = existing_salary.get("insurance_id")
        annual_insurance = existing_salary.get("annual_insurance", 0) or 0
        update["salary"] = _calc_salary_breakup(
            total, insurance_id, annual_insurance
        )

    if new_designation_id:
        update["designation_id"] = _oid(new_designation_id)

    employees().update_one({"_id": oid}, {"$set": update})

    confirmations().insert_one({
        "employee_id": oid,
        "from_type": emp.get("employment_type", "INTERN"),
        "to_type": new_type,
        "confirmation_date": confirmation_date,
        "notes": notes,
        "new_salary": new_salary,
        "new_designation_id": _oid(new_designation_id),
        "created_at": now_ist(),
    })

    logger.info(f"Employee confirmed: {emp.get('employee_code')}")

    return {
        "message": "Employee confirmed",
        "employee_id": employee_id,
        "status": new_type,
    }


# ============================================
# DEACTIVATE / REACTIVATE / TERMINATE
# ============================================

def deactivate_employee(emp_id, reason=None, resignation_date=None, manager_id=None):
    oid = _oid(emp_id)
    if not oid:
        return 0

    emp = employees().find_one({"_id": oid})
    if not emp:
        return 0

    if resignation_date:
        try:
            resign_date = datetime.fromisoformat(resignation_date)
        except Exception:
            resign_date = now_ist()
    else:
        resign_date = now_ist()

    update_data = {
        "status": "INACTIVE",
        "resignation_date": resign_date,
        "resignation_reason": (reason or "").strip() or None,
        "deactivated_at": now_ist(),
        "updated_at": now_ist(),
    }

    if manager_id:
        update_data["deactivated_by"] = _oid(manager_id)

    employees().update_one({"_id": oid}, {"$set": update_data})
    users().update_one(
        {"_id": emp["user_id"]},
        {"$set": {"is_active": False, "updated_at": now_ist()}},
    )
    return 1


def reactivate_employee(emp_id):
    oid = _oid(emp_id)
    if not oid:
        return 0

    emp = employees().find_one({"_id": oid})
    if not emp:
        return 0

    employees().update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "ACTIVE",
                "resignation_date": None,
                "resignation_reason": None,
                "deactivated_at": None,
                "deactivated_by": None,
                "termination_date": None,
                "termination_reason": None,
                "terminated_at": None,
                "terminated_by": None,
                "end_date": None,
                "updated_at": now_ist(),
            }
        },
    )

    users().update_one(
        {"_id": emp["user_id"]},
        {"$set": {"is_active": True, "updated_at": now_ist()}},
    )
    return 1


def terminate_employee(emp_id, terminate_date=None, reason=None, manager_id=None):
    oid = _oid(emp_id)
    if not oid:
        return 0

    emp = employees().find_one({"_id": oid})
    if not emp:
        return 0

    if not (reason or "").strip():
        raise ValueError("Termination reason is required")

    if terminate_date:
        try:
            term_date = datetime.fromisoformat(terminate_date)
        except Exception:
            term_date = now_ist()
    else:
        term_date = now_ist()

    update_data = {
        "status": "TERMINATED",
        "termination_date": term_date,
        "termination_reason": reason.strip(),
        "terminated_at": now_ist(),
        "updated_at": now_ist(),
    }

    if manager_id:
        update_data["terminated_by"] = _oid(manager_id)

    employees().update_one({"_id": oid}, {"$set": update_data})
    users().update_one(
        {"_id": emp["user_id"]},
        {"$set": {"is_active": False, "updated_at": now_ist()}},
    )
    return 1


# ============================================
# SELF-SERVICE
# ============================================

def get_my_profile(employee_id):
    oid = _oid(employee_id)
    if not oid:
        return None

    emp = employees().find_one({"_id": oid})
    if not emp:
        return None

    emp = _enrich_employee(emp)
    emp.pop("password_hash", None)
    return serialize(emp)


def update_profile_picture(employee_id, picture_data):
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    employees().update_one(
        {"_id": oid},
        {
            "$set": {
                "profile_picture_data": picture_data.get("picture_data"),
                "profile_picture_mime": picture_data.get("picture_mime"),
                "profile_picture_size": picture_data.get("picture_size"),
                "profile_picture_url": f"/api/employees/{employee_id}/picture",
                "updated_at": now_ist(),
            }
        },
    )

    return f"/api/employees/{employee_id}/picture"


# ============================================
# PERMANENT DELETE
# ============================================

def permanent_delete_employee(emp_id):
    from app.db import (
        employees as _emp_coll, users as _users_coll,
        attendance as _att_coll, leave_requests as _leave_coll,
        payroll as _pay_coll, documents as _docs_coll,
        notifications as _notif_coll, complaints as _compl_coll,
        employee_confirmations as _confirm_coll, tasks as _tasks_coll,
        resignations as _resign_coll,
    )

    oid = _oid(emp_id)
    if not oid:
        raise ValueError("Invalid employee ID")

    emp = _emp_coll().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    user_id = emp.get("user_id")
    if user_id:
        user = _users_coll().find_one({"_id": user_id})
        if user and user.get("role") in ("MANAGER", "ADMIN", "SUPER_ADMIN"):
            raise ValueError(
                "Cannot delete admin/manager account. "
                "Admin and Manager accounts are protected."
            )

    emp_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()
    emp_code = emp.get("employee_code", "")

    counts = {}

    if user_id:
        r = _users_coll().delete_one({"_id": user_id})
        counts["users"] = r.deleted_count

    r = _att_coll().delete_many({"employee_id": oid})
    counts["attendance"] = r.deleted_count

    r = _leave_coll().delete_many({"employee_id": oid})
    counts["leave_requests"] = r.deleted_count

    r = _pay_coll().delete_many({"employee_id": oid})
    counts["payroll"] = r.deleted_count

    r = _docs_coll().delete_many({"employee_id": oid})
    counts["documents"] = r.deleted_count

    r = _notif_coll().delete_many({"employee_id": oid})
    counts["notifications"] = r.deleted_count

    r = _compl_coll().delete_many({"employee_id": oid})
    counts["complaints"] = r.deleted_count

    r = _confirm_coll().delete_many({"employee_id": oid})
    counts["employee_confirmations"] = r.deleted_count

    try:
        r = _tasks_coll().delete_many({"assigned_to": oid})
        counts["tasks"] = r.deleted_count
    except Exception:
        counts["tasks"] = 0

    try:
        r = _resign_coll().delete_many({"employee_id": oid})
        counts["resignations"] = r.deleted_count
    except Exception:
        counts["resignations"] = 0

    _emp_coll().delete_one({"_id": oid})
    counts["employee"] = 1

    logger.warning(f"PERMANENT DELETE: {emp_code} ({emp_name})")

    return {
        "employee_name": emp_name,
        "employee_code": emp_code,
        "deleted_counts": counts,
    }