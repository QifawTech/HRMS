# from datetime import datetime
# import bcrypt
# from bson import ObjectId
# from bson.errors import InvalidId
# from app.db import users, employees, departments, designations
# from app.utils.helpers import serialize, serialize_list


# def _oid(s):
#     try:
#         return ObjectId(s)
#     except (InvalidId, TypeError):
#         return None


# def _enrich_employee(emp):
#     """Add department + designation names + email."""
#     if emp.get("department_id"):
#         dept = departments().find_one({"_id": emp["department_id"]})
#         emp["department_name"] = dept["name"] if dept else None
#     else:
#         emp["department_name"] = None

#     if emp.get("designation_id"):
#         desig = designations().find_one({"_id": emp["designation_id"]})
#         emp["designation_title"] = desig["title"] if desig else None
#     else:
#         emp["designation_title"] = None

#     user = users().find_one(
#         {"_id": emp["user_id"]}, {"email": 1, "is_active": 1}
#     )
#     emp["email"] = user["email"] if user else None
#     emp["user_active"] = user.get("is_active", True) if user else False

#     return emp


# # ============================================
# # SALARY BREAKUP HELPER
# # ============================================

# def _calc_salary_breakup(total):
#     """
#     Calculate Basic, HRA, Special Allowance from Total salary
#     using the payroll structure configured in Settings.
#     """
#     from app.services.settings_service import get_settings

#     settings = get_settings()

#     basic_pct = settings.get("basic_percent", 50)
#     hra_pct = settings.get("hra_percent_of_basic", 40)
#     pf_pct = settings.get("pf_percent", 12)
#     esi_pct = settings.get("esi_percent", 0.75)
#     pt_amt = settings.get("pt_amount", 200)
#     tds_pct = settings.get("tds_percent", 0)

#     total = float(total or 0)

#     basic = round(total * basic_pct / 100, 2)
#     hra = round(basic * hra_pct / 100, 2)
#     special = round(total - basic - hra, 2)

#     return {
#         "total": total,
#         "basic": basic,
#         "hra": hra,
#         "special_allowance": special,
#         "pf_applicable": True,
#         "esi_applicable": True,
#         "pt_applicable": True,
#         "tds_applicable": False,
#         "pf_percent": pf_pct,
#         "esi_percent": esi_pct,
#         "pt_amount": pt_amt,
#         "tds_percent": tds_pct,
#         "tds_amount": 0,
#     }


# # ============================================
# # LIST / GET
# # ============================================

# def list_employees(search=None, department_id=None, status=None):
#     """List employees with filters."""
#     query = {}

#     if status and status in ("ACTIVE", "INACTIVE", "NOTICE_PERIOD", "RESIGNED"):
#         query["status"] = status

#     if department_id:
#         oid = _oid(department_id)
#         if oid:
#             query["department_id"] = oid

#     if search:
#         query["$or"] = [
#             {"first_name": {"$regex": search, "$options": "i"}},
#             {"last_name": {"$regex": search, "$options": "i"}},
#             {"employee_code": {"$regex": search, "$options": "i"}},
#         ]
#         user_matches = list(
#             users().find(
#                 {"email": {"$regex": search, "$options": "i"}}, {"_id": 1}
#             )
#         )
#         if user_matches:
#             user_ids = [u["_id"] for u in user_matches]
#             query["$or"].append({"user_id": {"$in": user_ids}})

#     docs = list(employees().find(query).sort("created_at", -1))

#     result = []
#     for emp in docs:
#         emp = _enrich_employee(emp)
#         result.append(emp)

#     return serialize_list(result)


# def get_employee(emp_id):
#     oid = _oid(emp_id)
#     if not oid:
#         return None

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return None

#     emp = _enrich_employee(emp)
#     return serialize(emp)


# def generate_employee_code():
#     """Generate next employee code like EMP001."""
#     count = employees().count_documents({})
#     next_num = count + 1
#     return f"EMP{next_num:03d}"


# # ============================================
# # CREATE
# # ============================================

# def create_employee(data):
#     """Create user account + employee record with auto-calculated salary."""
#     email = (data.get("email") or "").strip().lower()
#     password = data.get("password") or ""
#     first_name = (data.get("first_name") or "").strip()
#     last_name = (data.get("last_name") or "").strip()
#     employee_code = (data.get("employee_code") or "").strip().upper()

#     if not email or not password:
#         raise ValueError("Email and password required")
#     if not first_name or not last_name:
#         raise ValueError("First name and last name required")
#     if len(password) < 6:
#         raise ValueError("Password must be at least 6 characters")
#     if not employee_code:
#         employee_code = generate_employee_code()

#     if users().find_one({"email": email}):
#         raise ValueError("Email already exists")
#     if employees().find_one({"employee_code": employee_code}):
#         raise ValueError("Employee code already exists")

#     pw_hash = bcrypt.hashpw(
#         password.encode("utf-8"), bcrypt.gensalt()
#     ).decode("utf-8")

#     # Parse DOJ
#     doj = data.get("date_of_joining")
#     if doj:
#         try:
#             doj = datetime.fromisoformat(doj)
#         except Exception:
#             doj = datetime.utcnow()
#     else:
#         doj = datetime.utcnow()

#     # Auto-calculate salary breakup from total
#     total = float(data.get("total_salary") or 0)
#     salary = _calc_salary_breakup(total)

#     created_user_id = None

#     try:
#         # 1. Create user
#         created_user_id = users().insert_one({
#             "email": email,
#             "password_hash": pw_hash,
#             "role": "EMPLOYEE",
#             "is_active": True,
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow(),
#         }).inserted_id

#         # 2. Create employee record
#         emp_id = employees().insert_one({
#             "user_id": created_user_id,
#             "employee_code": employee_code,
#             "first_name": first_name,
#             "last_name": last_name,
#             "phone": (data.get("phone") or "").strip() or None,
#             "address": (data.get("address") or "").strip() or None,
#             "date_of_birth": None,
#             "date_of_joining": doj,
#             "department_id": _oid(data.get("department_id")),
#             "designation_id": _oid(data.get("designation_id")),
#             "manager_id": None,
#             "status": "ACTIVE",
#             "salary": salary,
#             "resignation_date": None,
#             "resignation_reason": None,
#             "deactivated_at": None,
#             "deactivated_by": None,
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow(),
#         }).inserted_id

#         return str(emp_id)

#     except Exception as e:
#         if created_user_id:
#             users().delete_one({"_id": created_user_id})
#         raise e


# # ============================================
# # UPDATE
# # ============================================

# def update_employee(emp_id, data):
#     """Update employee info + salary (recalc if total_salary provided)."""
#     oid = _oid(emp_id)
#     if not oid:
#         return 0

#     update_fields = {"updated_at": datetime.utcnow()}

#     for field in ["first_name", "last_name", "phone", "address"]:
#         if field in data:
#             update_fields[field] = (data[field] or "").strip() or None

#     if "department_id" in data:
#         update_fields["department_id"] = _oid(data["department_id"])

#     if "designation_id" in data:
#         update_fields["designation_id"] = _oid(data["designation_id"])

#     if "date_of_joining" in data and data["date_of_joining"]:
#         try:
#             update_fields["date_of_joining"] = datetime.fromisoformat(
#                 data["date_of_joining"]
#             )
#         except Exception:
#             pass

#     # Salary — if total_salary provided, recalculate breakup
#     if "total_salary" in data:
#         total = float(data.get("total_salary") or 0)
#         update_fields["salary"] = _calc_salary_breakup(total)

#     r = employees().update_one({"_id": oid}, {"$set": update_fields})
#     return r.modified_count


# # ============================================
# # DEACTIVATE / REACTIVATE
# # ============================================

# def deactivate_employee(emp_id, reason=None, resignation_date=None, manager_id=None):
#     """Deactivate employee + block login."""
#     oid = _oid(emp_id)
#     if not oid:
#         return 0

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return 0

#     resign_date = None
#     if resignation_date:
#         try:
#             resign_date = datetime.fromisoformat(resignation_date)
#         except Exception:
#             resign_date = datetime.utcnow()
#     else:
#         resign_date = datetime.utcnow()

#     update_data = {
#         "status": "INACTIVE",
#         "resignation_date": resign_date,
#         "resignation_reason": (reason or "").strip() or None,
#         "deactivated_at": datetime.utcnow(),
#         "updated_at": datetime.utcnow(),
#     }

#     if manager_id:
#         update_data["deactivated_by"] = _oid(manager_id)

#     employees().update_one({"_id": oid}, {"$set": update_data})

#     users().update_one(
#         {"_id": emp["user_id"]},
#         {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
#     )

#     return 1


# def reactivate_employee(emp_id):
#     """Reactivate employee + unblock login."""
#     oid = _oid(emp_id)
#     if not oid:
#         return 0

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return 0

#     employees().update_one(
#         {"_id": oid},
#         {
#             "$set": {
#                 "status": "ACTIVE",
#                 "resignation_date": None,
#                 "resignation_reason": None,
#                 "deactivated_at": None,
#                 "deactivated_by": None,
#                 "updated_at": datetime.utcnow(),
#             }
#         },
#     )

#     users().update_one(
#         {"_id": emp["user_id"]},
#         {"$set": {"is_active": True, "updated_at": datetime.utcnow()}},
#     )

#     return 1


# # ============================================
# # SELF-SERVICE (Employee)
# # ============================================

# def get_my_profile(employee_id):
#     """Employee: get own full profile."""
#     oid = _oid(employee_id)
#     if not oid:
#         return None

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return None

#     emp = _enrich_employee(emp)
#     emp.pop("password_hash", None)
#     return serialize(emp)


# def update_profile_picture(employee_id, picture_data):
#     """Update employee profile picture path."""
#     oid = _oid(employee_id)
#     if not oid:
#         raise ValueError("Invalid employee ID")

#     from app.utils.file_handler import delete_file

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         raise ValueError("Employee not found")

#     old = emp.get("profile_picture_path")
#     if old:
#         try:
#             delete_file(old)
#         except Exception:
#             pass

#     employees().update_one(
#         {"_id": oid},
#         {
#             "$set": {
#                 "profile_picture_path": picture_data.get("picture_path"),
#                 "profile_picture_url": picture_data.get("picture_url"),
#                 "updated_at": datetime.utcnow(),
#             }
#         },
#     )

#     return picture_data.get("picture_url")


# from datetime import datetime
# import bcrypt
# from bson import ObjectId
# from bson.errors import InvalidId
# from app.db import users, employees, departments, designations
# from app.utils.helpers import serialize, serialize_list
# from app.services.professional_tax_service import calculate_professional_tax  # <--- NEW IMPORT


# def _oid(s):
#     try:
#         return ObjectId(s)
#     except (InvalidId, TypeError):
#         return None


# def _enrich_employee(emp):
#     """Add department + designation names + email."""
#     if emp.get("department_id"):
#         dept = departments().find_one({"_id": emp["department_id"]})
#         emp["department_name"] = dept["name"] if dept else None
#     else:
#         emp["department_name"] = None

#     if emp.get("designation_id"):
#         desig = designations().find_one({"_id": emp["designation_id"]})
#         emp["designation_title"] = desig["title"] if desig else None
#     else:
#         emp["designation_title"] = None

#     user = users().find_one(
#         {"_id": emp["user_id"]}, {"email": 1, "is_active": 1}
#     )
#     emp["email"] = user["email"] if user else None
#     emp["user_active"] = user.get("is_active", True) if user else False

#     return emp


# # ============================================
# # SALARY BREAKUP HELPER
# # ============================================

# def _calc_salary_breakup(total):
#     """
#     Calculate Basic, HRA, Special Allowance from Total salary
#     using the payroll structure configured in Settings.
#     Also calculates Professional Tax based on 6-month slabs.
#     """
#     from app.services.settings_service import get_settings

#     settings = get_settings()

#     basic_pct = settings.get("basic_percent", 50)
#     hra_pct = settings.get("hra_percent_of_basic", 40)
#     pf_pct = settings.get("pf_percent", 12)
#     esi_pct = settings.get("esi_percent", 0.75)
#     tds_pct = settings.get("tds_percent", 0)

#     total = float(total or 0)

#     basic = round(total * basic_pct / 100, 2)
#     hra = round(basic * hra_pct / 100, 2)
#     special = round(total - basic - hra, 2)

#     # NEW: Slab-based Professional Tax calculation
#     pt_result = calculate_professional_tax(total)

#     return {
#         "total": total,
#         "basic": basic,
#         "hra": hra,
#         "special_allowance": special,
#         "pf_applicable": True,
#         "esi_applicable": True,
#         "pt_applicable": True,
#         "tds_applicable": False,
#         "pf_percent": pf_pct,
#         "esi_percent": esi_pct,
#         "six_month_gross": pt_result["six_month_gross"],       # NEW
#         "professional_tax": pt_result["professional_tax"],     # NEW
#         "tds_percent": tds_pct,
#         "tds_amount": 0,
#     }


# # ============================================
# # LIST / GET
# # ============================================

# def list_employees(search=None, department_id=None, status=None):
#     """List employees with filters."""
#     query = {}

#     if status and status in ("ACTIVE", "INACTIVE", "NOTICE_PERIOD", "RESIGNED"):
#         query["status"] = status

#     if department_id:
#         oid = _oid(department_id)
#         if oid:
#             query["department_id"] = oid

#     if search:
#         query["$or"] = [
#             {"first_name": {"$regex": search, "$options": "i"}},
#             {"last_name": {"$regex": search, "$options": "i"}},
#             {"employee_code": {"$regex": search, "$options": "i"}},
#         ]
#         user_matches = list(
#             users().find(
#                 {"email": {"$regex": search, "$options": "i"}}, {"_id": 1}
#             )
#         )
#         if user_matches:
#             user_ids = [u["_id"] for u in user_matches]
#             query["$or"].append({"user_id": {"$in": user_ids}})

#     docs = list(employees().find(query).sort("created_at", -1))

#     result = []
#     for emp in docs:
#         emp = _enrich_employee(emp)
#         result.append(emp)

#     return serialize_list(result)


# def get_employee(emp_id):
#     oid = _oid(emp_id)
#     if not oid:
#         return None

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return None

#     emp = _enrich_employee(emp)
#     return serialize(emp)


# def generate_employee_code():
#     """Generate next employee code like EMP001."""
#     count = employees().count_documents({})
#     next_num = count + 1
#     return f"EMP{next_num:03d}"


# # ============================================
# # CREATE
# # ============================================

# def create_employee(data):
#     """Create user account + employee record with auto-calculated salary."""
#     email = (data.get("email") or "").strip().lower()
#     password = data.get("password") or ""
#     first_name = (data.get("first_name") or "").strip()
#     last_name = (data.get("last_name") or "").strip()
#     employee_code = (data.get("employee_code") or "").strip().upper()

#     if not email or not password:
#         raise ValueError("Email and password required")
#     if not first_name or not last_name:
#         raise ValueError("First name and last name required")
#     if len(password) < 6:
#         raise ValueError("Password must be at least 6 characters")
#     if not employee_code:
#         employee_code = generate_employee_code()

#     if users().find_one({"email": email}):
#         raise ValueError("Email already exists")
#     if employees().find_one({"employee_code": employee_code}):
#         raise ValueError("Employee code already exists")

#     pw_hash = bcrypt.hashpw(
#         password.encode("utf-8"), bcrypt.gensalt()
#     ).decode("utf-8")

#     # Parse DOJ
#     doj = data.get("date_of_joining")
#     if doj:
#         try:
#             doj = datetime.fromisoformat(doj)
#         except Exception:
#             doj = datetime.utcnow()
#     else:
#         doj = datetime.utcnow()

#     # Auto-calculate salary breakup from total
#     total = float(data.get("total_salary") or 0)
#     salary = _calc_salary_breakup(total)

#     created_user_id = None

#     try:
#         # 1. Create user
#         created_user_id = users().insert_one({
#             "email": email,
#             "password_hash": pw_hash,
#             "role": "EMPLOYEE",
#             "is_active": True,
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow(),
#         }).inserted_id

#         # 2. Create employee record
#         emp_id = employees().insert_one({
#             "user_id": created_user_id,
#             "employee_code": employee_code,
#             "first_name": first_name,
#             "last_name": last_name,
#             "phone": (data.get("phone") or "").strip() or None,
#             "address": (data.get("address") or "").strip() or None,
#             "date_of_birth": None,
#             "date_of_joining": doj,
#             "department_id": _oid(data.get("department_id")),
#             "designation_id": _oid(data.get("designation_id")),
#             "manager_id": None,
#             "status": "ACTIVE",
#             "salary": salary,
#             "resignation_date": None,
#             "resignation_reason": None,
#             "deactivated_at": None,
#             "deactivated_by": None,
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow(),
#         }).inserted_id

#         return str(emp_id)

#     except Exception as e:
#         if created_user_id:
#             users().delete_one({"_id": created_user_id})
#         raise e


# # ============================================
# # UPDATE
# # ============================================

# def update_employee(emp_id, data):
#     """Update employee info + salary (recalc if total_salary provided)."""
#     oid = _oid(emp_id)
#     if not oid:
#         return 0

#     update_fields = {"updated_at": datetime.utcnow()}

#     for field in ["first_name", "last_name", "phone", "address"]:
#         if field in data:
#             update_fields[field] = (data[field] or "").strip() or None

#     if "department_id" in data:
#         update_fields["department_id"] = _oid(data["department_id"])

#     if "designation_id" in data:
#         update_fields["designation_id"] = _oid(data["designation_id"])

#     if "date_of_joining" in data and data["date_of_joining"]:
#         try:
#             update_fields["date_of_joining"] = datetime.fromisoformat(
#                 data["date_of_joining"]
#             )
#         except Exception:
#             pass

#     # Salary — if total_salary provided, recalculate breakup
#     if "total_salary" in data:
#         total = float(data.get("total_salary") or 0)
#         update_fields["salary"] = _calc_salary_breakup(total)

#     r = employees().update_one({"_id": oid}, {"$set": update_fields})
#     return r.modified_count


# # ============================================
# # DEACTIVATE / REACTIVATE
# # ============================================

# def deactivate_employee(emp_id, reason=None, resignation_date=None, manager_id=None):
#     """Deactivate employee + block login."""
#     oid = _oid(emp_id)
#     if not oid:
#         return 0

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return 0

#     resign_date = None
#     if resignation_date:
#         try:
#             resign_date = datetime.fromisoformat(resignation_date)
#         except Exception:
#             resign_date = datetime.utcnow()
#     else:
#         resign_date = datetime.utcnow()

#     update_data = {
#         "status": "INACTIVE",
#         "resignation_date": resign_date,
#         "resignation_reason": (reason or "").strip() or None,
#         "deactivated_at": datetime.utcnow(),
#         "updated_at": datetime.utcnow(),
#     }

#     if manager_id:
#         update_data["deactivated_by"] = _oid(manager_id)

#     employees().update_one({"_id": oid}, {"$set": update_data})

#     users().update_one(
#         {"_id": emp["user_id"]},
#         {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
#     )

#     return 1


# def reactivate_employee(emp_id):
#     """Reactivate employee + unblock login."""
#     oid = _oid(emp_id)
#     if not oid:
#         return 0

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return 0

#     employees().update_one(
#         {"_id": oid},
#         {
#             "$set": {
#                 "status": "ACTIVE",
#                 "resignation_date": None,
#                 "resignation_reason": None,
#                 "deactivated_at": None,
#                 "deactivated_by": None,
#                 "updated_at": datetime.utcnow(),
#             }
#         },
#     )

#     users().update_one(
#         {"_id": emp["user_id"]},
#         {"$set": {"is_active": True, "updated_at": datetime.utcnow()}},
#     )

#     return 1


# # ============================================
# # SELF-SERVICE (Employee)
# # ============================================

# def get_my_profile(employee_id):
#     """Employee: get own full profile."""
#     oid = _oid(employee_id)
#     if not oid:
#         return None

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         return None

#     emp = _enrich_employee(emp)
#     emp.pop("password_hash", None)
#     return serialize(emp)


# def update_profile_picture(employee_id, picture_data):
#     """Update employee profile picture path."""
#     oid = _oid(employee_id)
#     if not oid:
#         raise ValueError("Invalid employee ID")

#     from app.utils.file_handler import delete_file

#     emp = employees().find_one({"_id": oid})
#     if not emp:
#         raise ValueError("Employee not found")

#     old = emp.get("profile_picture_path")
#     if old:
#         try:
#             delete_file(old)
#         except Exception:
#             pass

#     employees().update_one(
#         {"_id": oid},
#         {
#             "$set": {
#                 "profile_picture_path": picture_data.get("picture_path"),
#                 "profile_picture_url": picture_data.get("picture_url"),
#                 "updated_at": datetime.utcnow(),
#             }
#         },
#     )

#     return picture_data.get("picture_url")



from datetime import datetime
import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from app.db import users, employees, departments, designations, shifts
from app.utils.helpers import serialize, serialize_list
from app.services.professional_tax_service import calculate_professional_tax


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _enrich_employee(emp):
    """Add department + designation names + email + shift info."""
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

    # NEW: Shift info
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

    user = users().find_one(
        {"_id": emp["user_id"]}, {"email": 1, "is_active": 1}
    )
    emp["email"] = user["email"] if user else None
    emp["user_active"] = user.get("is_active", True) if user else False

    return emp


# ============================================
# SALARY BREAKUP HELPER
# ============================================

def _calc_salary_breakup(total):
    """
    Calculate Basic, HRA, Special Allowance from Total salary
    using the payroll structure configured in Settings.
    Also calculates Professional Tax based on 6-month slabs.
    """
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
    }


# ============================================
# LIST / GET
# ============================================

def list_employees(search=None, department_id=None, status=None):
    """List employees with filters."""
    query = {}

    if status and status in ("ACTIVE", "INACTIVE", "NOTICE_PERIOD", "RESIGNED"):
        query["status"] = status

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

    docs = list(employees().find(query).sort("created_at", -1))

    result = []
    for emp in docs:
        emp = _enrich_employee(emp)
        result.append(emp)

    return serialize_list(result)


def get_employee(emp_id):
    oid = _oid(emp_id)
    if not oid:
        return None

    emp = employees().find_one({"_id": oid})
    if not emp:
        return None

    emp = _enrich_employee(emp)
    return serialize(emp)


def generate_employee_code():
    """Generate next employee code like EMP001."""
    count = employees().count_documents({})
    next_num = count + 1
    return f"EMP{next_num:03d}"


# ============================================
# CREATE
# ============================================

def create_employee(data):
    """Create user account + employee record with auto-calculated salary."""
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
            doj = datetime.utcnow()
    else:
        doj = datetime.utcnow()

    total = float(data.get("total_salary") or 0)
    salary = _calc_salary_breakup(total)

    created_user_id = None

    try:
        created_user_id = users().insert_one({
            "email": email,
            "password_hash": pw_hash,
            "role": "EMPLOYEE",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
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
            "department_id": _oid(data.get("department_id")),
            "designation_id": _oid(data.get("designation_id")),
            "shift_id": _oid(data.get("shift_id")),  # NEW
            "manager_id": None,
            "status": "ACTIVE",
            "salary": salary,
            "resignation_date": None,
            "resignation_reason": None,
            "deactivated_at": None,
            "deactivated_by": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }).inserted_id

        return str(emp_id)

    except Exception as e:
        if created_user_id:
            users().delete_one({"_id": created_user_id})
        raise e


# ============================================
# UPDATE
# ============================================

def update_employee(emp_id, data):
    """Update employee info + salary (recalc if total_salary provided)."""
    oid = _oid(emp_id)
    if not oid:
        return 0

    update_fields = {"updated_at": datetime.utcnow()}

    for field in ["first_name", "last_name", "phone", "address"]:
        if field in data:
            update_fields[field] = (data[field] or "").strip() or None

    if "department_id" in data:
        update_fields["department_id"] = _oid(data["department_id"])

    if "designation_id" in data:
        update_fields["designation_id"] = _oid(data["designation_id"])

    # NEW: Shift update
    if "shift_id" in data:
        update_fields["shift_id"] = _oid(data["shift_id"]) if data["shift_id"] else None

    if "date_of_joining" in data and data["date_of_joining"]:
        try:
            update_fields["date_of_joining"] = datetime.fromisoformat(
                data["date_of_joining"]
            )
        except Exception:
            pass

    if "total_salary" in data:
        total = float(data.get("total_salary") or 0)
        update_fields["salary"] = _calc_salary_breakup(total)

    r = employees().update_one({"_id": oid}, {"$set": update_fields})
    return r.modified_count


# ============================================
# DEACTIVATE / REACTIVATE
# ============================================

def deactivate_employee(emp_id, reason=None, resignation_date=None, manager_id=None):
    oid = _oid(emp_id)
    if not oid:
        return 0

    emp = employees().find_one({"_id": oid})
    if not emp:
        return 0

    resign_date = None
    if resignation_date:
        try:
            resign_date = datetime.fromisoformat(resignation_date)
        except Exception:
            resign_date = datetime.utcnow()
    else:
        resign_date = datetime.utcnow()

    update_data = {
        "status": "INACTIVE",
        "resignation_date": resign_date,
        "resignation_reason": (reason or "").strip() or None,
        "deactivated_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    if manager_id:
        update_data["deactivated_by"] = _oid(manager_id)

    employees().update_one({"_id": oid}, {"$set": update_data})

    users().update_one(
        {"_id": emp["user_id"]},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
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
                "updated_at": datetime.utcnow(),
            }
        },
    )

    users().update_one(
        {"_id": emp["user_id"]},
        {"$set": {"is_active": True, "updated_at": datetime.utcnow()}},
    )

    return 1


# ============================================
# SELF-SERVICE (Employee)
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

    from app.utils.file_handler import delete_file

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    old = emp.get("profile_picture_path")
    if old:
        try:
            delete_file(old)
        except Exception:
            pass

    employees().update_one(
        {"_id": oid},
        {
            "$set": {
                "profile_picture_path": picture_data.get("picture_path"),
                "profile_picture_url": picture_data.get("picture_url"),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return picture_data.get("picture_url")