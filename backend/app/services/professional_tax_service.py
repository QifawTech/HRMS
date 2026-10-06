from app.db import get_db

# ============================================
# DEFAULT PT SLABS (only used for seeding)
# Idhu calculation logic illa — only first-time seed ku.
# Manager Settings page la edit panna, DB la irundhu dhaan edupe.
# ============================================
DEFAULT_PT_SLABS = [
    {"min_salary": 0, "max_salary": 21000, "tax_amount": 0},
    {"min_salary": 21001, "max_salary": 30000, "tax_amount": 135},
    {"min_salary": 30001, "max_salary": 45000, "tax_amount": 315},
    {"min_salary": 45001, "max_salary": 60000, "tax_amount": 690},
    {"min_salary": 60001, "max_salary": 75000, "tax_amount": 1025},
    {"min_salary": 75001, "max_salary": None, "tax_amount": 1250},
]


def ensure_pt_slabs_seeded():
    """
    Idhu oru thadava mattum run aagum.
    PT slabs collection empty ah irundha, default slabs ah insert pannum.
    Manager delete pannina kooda, next call la re-seed aagum.
    """
    db = get_db()
    try:
        count = db.professional_tax_slabs.count_documents({})
        if count == 0:
            db.professional_tax_slabs.insert_many([dict(s) for s in DEFAULT_PT_SLABS])
            print("[PT] Default slabs seeded.")
    except Exception as e:
        print(f"[PT] Seed failed: {e}")


def calculate_professional_tax(monthly_salary):
    # Idhu mukkiyam — first call la slabs illama irundha auto-seed pannum
    ensure_pt_slabs_seeded()

    db = get_db()
    six_month_gross = monthly_salary * 6
    slabs = list(db.professional_tax_slabs.find().sort("min_salary", 1))

    pt_amount = 0
    for slab in slabs:
        max_sal = slab.get("max_salary")
        if max_sal is None:
            if six_month_gross >= slab["min_salary"]:
                pt_amount = slab["tax_amount"]
                break
        elif slab["min_salary"] <= six_month_gross <= max_sal:
            pt_amount = slab["tax_amount"]
            break

    return {
        "six_month_gross": six_month_gross,
        "professional_tax": pt_amount,
    }