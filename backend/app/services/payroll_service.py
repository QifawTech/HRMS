from datetime import datetime, date
from bson import ObjectId
from bson.errors import InvalidId
from app.db import (
    payroll, employees, company_settings, notifications,
    departments, designations,
)
from app.utils.helpers import serialize, serialize_list


def _oid(s):
    try:
        return ObjectId(s)
    except (InvalidId, TypeError):
        return None


def _now():
    return datetime.utcnow()


# ============================================
# PT DEDUCTION MONTHS
# ============================================
PT_DEDUCTION_MONTHS = [4, 10]


def _should_apply_pt(month_str):
    try:
        _, month = month_str.split("-")
        month_num = int(month)
    except (ValueError, AttributeError):
        return False
    return month_num in PT_DEDUCTION_MONTHS


# ============================================
# NUMBER TO WORDS
# ============================================
ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"
]
TENS = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
]


def _two_digits(n):
    if n < 20:
        return ONES[n]
    return TENS[n // 10] + (" " + ONES[n % 10] if n % 10 else "")


def number_to_words(num):
    if num == 0:
        return "Zero"
    num = int(num)
    parts = []

    crore = num // 10000000
    num %= 10000000
    lakh = num // 100000
    num %= 100000
    thousand = num // 1000
    num %= 1000
    hundred = num // 100
    num %= 100

    if crore:
        parts.append(f"{_two_digits(crore)} Crore")
    if lakh:
        parts.append(f"{_two_digits(lakh)} Lakh")
    if thousand:
        parts.append(f"{_two_digits(thousand)} Thousand")
    if hundred:
        parts.append(f"{ONES[hundred]} Hundred")
    if num:
        parts.append(_two_digits(num))

    return " ".join(parts)


def _month_name(month_num):
    months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    return months[month_num - 1] if 1 <= month_num <= 12 else ""


# ============================================
# CALCULATION
# ============================================

def calculate_payslip(employee, month, paid_days, lop_days, overrides=None):
    overrides = overrides or {}
    salary = employee.get("salary") or {}

    basic = overrides.get("basic", salary.get("basic", 0)) or 0
    hra = overrides.get("hra", salary.get("hra", 0)) or 0
    special_allowance = overrides.get(
        "special_allowance", salary.get("special_allowance", 0)
    ) or 0

    gross_earnings = basic + hra + special_allowance

    pf_applicable = overrides.get("pf_applicable", salary.get("pf_applicable", False))
    esi_applicable = overrides.get("esi_applicable", salary.get("esi_applicable", False))
    pt_applicable = overrides.get("pt_applicable", salary.get("pt_applicable", False))
    tds_applicable = overrides.get("tds_applicable", salary.get("tds_applicable", False))

    pf_percent = overrides.get("pf_percent", salary.get("pf_percent", 12))
    esi_percent = overrides.get("esi_percent", salary.get("esi_percent", 0.75))
    tds_amount = overrides.get("tds_amount", salary.get("tds_amount", 0))

    # PF
    pf = round(basic * pf_percent / 100, 2) if pf_applicable else 0

    # ESI
    esi = round(gross_earnings * esi_percent / 100, 2) if esi_applicable else 0

    # PT (slab-based, once per 6-month period)
    pt_amount = salary.get("professional_tax", 0) or 0
    if pt_applicable and _should_apply_pt(month):
        pt = pt_amount
    else:
        pt = 0

    # TDS
    tds = tds_amount if tds_applicable else 0

    # LOP
    per_day = gross_earnings / 30 if gross_earnings > 0 else 0
    lop_amount = round(per_day * lop_days, 2)

    # Other
    other = overrides.get("other_deduction", 0)

    # ============================================
        # ============================================
    # NEW: Forgot Logout Fine (monthly) with details
    # ============================================
    forgot_logout_fine = 0
    forgot_logout_fine_details = []
    try:
        from app.services.forgot_logout_service import (
            calculate_fine,
            get_fine_details_for_month,
        )
        year_str, mon_str = month.split("-")
        year_i, mon_i = int(year_str), int(mon_str)
        fine_data = calculate_fine(employee.get("_id"), year_i, mon_i)
        forgot_logout_fine = fine_data.get("total_fine", 0) or 0
        # Get date-wise breakdown
        if forgot_logout_fine > 0:
            forgot_logout_fine_details = get_fine_details_for_month(
                employee.get("_id"), year_i, mon_i
            )
    except Exception:
        forgot_logout_fine = 0
        forgot_logout_fine_details = []

    total_deductions = round(
        pf + esi + pt + tds + lop_amount + other + forgot_logout_fine, 2
    )
    net_salary = round(gross_earnings - total_deductions, 2)

    return {
        "earnings": {
            "basic": basic,
            "hra": hra,
            "special_allowance": special_allowance,
        },
        "gross_earnings": gross_earnings,
        "deductions": {
            "pf": pf,
            "esi": esi,
            "pt": pt,
            "tds": tds,
            "lop": lop_amount,
            "other": other,
            "forgot_logout_fine": forgot_logout_fine,
            "forgot_logout_fine_details": forgot_logout_fine_details,
        },
        "total_deductions": total_deductions,
        "net_salary": net_salary,
        "net_salary_words": f"Rupees {number_to_words(int(net_salary))} Only",
        "applicable": {
            "pf": pf_applicable,
            "esi": esi_applicable,
            "pt": pt_applicable,
            "tds": tds_applicable,
        },
    }


# ============================================
# GENERATE
# ============================================

def generate_payroll(employee_id, month, overrides, manager_user_id):
    oid = _oid(employee_id)
    if not oid:
        raise ValueError("Invalid employee")

    emp = employees().find_one({"_id": oid})
    if not emp:
        raise ValueError("Employee not found")

    if payroll().find_one({"employee_id": oid, "month": month}):
        raise ValueError(f"Payroll already exists for {month}")

    paid_days = int(overrides.get("paid_days", 30))
    lop_days = int(overrides.get("lop_days", 0))

    calc = calculate_payslip(emp, month, paid_days, lop_days, overrides)

    mgr_oid = _oid(manager_user_id)
    mgr = employees().find_one({"user_id": mgr_oid}) if mgr_oid else None

    dept_name = None
    if emp.get("department_id"):
        d = departments().find_one({"_id": emp["department_id"]})
        dept_name = d["name"] if d else None

    desig_title = None
    if emp.get("designation_id"):
        ds = designations().find_one({"_id": emp["designation_id"]})
        desig_title = ds["title"] if ds else None

    year, mon = month.split("-")

    now = _now()
    doc = {
        "employee_id": oid,
        "employee_name": f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
        "employee_code": emp.get("employee_code"),
        "designation_id": emp.get("designation_id"),
        "department_id": emp.get("department_id"),
        "designation_title": desig_title,
        "department_name": dept_name,
        "month": month,
        "year": int(year),
        "pay_period": f"{_month_name(int(mon))} {year}",
        "paid_days": paid_days,
        "lop_days": lop_days,
        "date_of_joining": emp.get("date_of_joining"),
        "earnings": calc["earnings"],
        "gross_earnings": calc["gross_earnings"],
        "deductions": calc["deductions"],
        "total_deductions": calc["total_deductions"],
        "net_salary": calc["net_salary"],
        "net_salary_words": calc["net_salary_words"],
        "applicable": calc["applicable"],
        "payment_date": now,
        "payment_mode": "Bank Transfer",
        "status": "Generated",
        "remarks": overrides.get(
            "remarks",
            "This payslip is generated based on the payroll records of the company for the stated salary period.",
        ),
        "generated_by": mgr["_id"] if mgr else None,
        "generated_by_name": f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
        if mgr
        else None,
        "created_at": now,
        "updated_at": now,
    }

    result = payroll().insert_one(doc)

    notifications().insert_one({
        "employee_id": oid,
        "title": "Payslip Generated",
        "message": f"Your payslip for {doc['pay_period']} is ready. Net Salary: ₹{calc['net_salary']}",
        "type": "PAYROLL_GENERATED",
        "link": "/employee/payslips",
        "related_id": result.inserted_id,
        "is_read": False,
        "read_at": None,
        "created_at": now,
    })

    return str(result.inserted_id)


# ============================================
# LIST / GET
# ============================================

def list_payrolls(month=None, employee_id=None, search=None, status=None):
    query = {}
    if month:
        query["month"] = month
    if employee_id:
        oid = _oid(employee_id)
        if oid:
            query["employee_id"] = oid
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"employee_name": {"$regex": search, "$options": "i"}},
            {"employee_code": {"$regex": search, "$options": "i"}},
        ]

    docs = list(payroll().find(query).sort("created_at", -1))
    return serialize_list(docs)


def get_payroll(payroll_id):
    oid = _oid(payroll_id)
    if not oid:
        return None
    doc = payroll().find_one({"_id": oid})
    return serialize(doc) if doc else None


def my_payslips(employee_id):
    oid = _oid(employee_id)
    if not oid:
        return []
    docs = list(payroll().find({"employee_id": oid}).sort("created_at", -1))
    return serialize_list(docs)


def get_company_info():
    doc = company_settings().find_one({"_id": "company_config"}) or {}
    return {
        "company_name": doc.get("company_name", "Company Name"),
        "company_address": doc.get("company_address", ""),
        "company_tagline": doc.get("company_tagline", ""),
        "company_footer": doc.get("company_footer", ""),
        "company_logo_url": doc.get("company_logo_url", ""),
        "signatory_name": doc.get("signatory_name", ""),
        "signatory_title": doc.get("signatory_title", "Authorized Signatory"),
    }


# ============================================
# UPDATE / DELETE
# ============================================

def mark_paid(payroll_id):
    oid = _oid(payroll_id)
    if not oid:
        return 0
    r = payroll().update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "Paid",
                "payment_date": _now(),
                "updated_at": _now(),
            }
        },
    )
    return r.modified_count


def delete_payroll(payroll_id):
    oid = _oid(payroll_id)
    if not oid:
        return 0
    r = payroll().delete_one({"_id": oid})
    return r.deleted_count


def stats(month=None):
    query = {}
    if month:
        query["month"] = month

    total = payroll().count_documents(query)
    paid = payroll().count_documents({**query, "status": "Paid"})
    generated = payroll().count_documents({**query, "status": "Generated"})

    pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$net_salary"}}},
    ]
    result = list(payroll().aggregate(pipeline))
    total_amount = result[0]["total"] if result else 0

    return {
        "total": total,
        "paid": paid,
        "generated": generated,
        "total_amount": round(total_amount, 2),
    }