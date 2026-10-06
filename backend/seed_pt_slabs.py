from app import create_app
from app.db import get_db

app = create_app()

def seed_pt_slabs():
    with app.app_context():
        db = get_db()
        if db.professional_tax_slabs.count_documents({}) == 0:
            default_slabs = [
                {"min_salary": 0, "max_salary": 21000, "tax_amount": 0},
                {"min_salary": 21001, "max_salary": 30000, "tax_amount": 135},
                {"min_salary": 30001, "max_salary": 45000, "tax_amount": 315},
                {"min_salary": 45001, "max_salary": 60000, "tax_amount": 690},
                {"min_salary": 60001, "max_salary": 75000, "tax_amount": 1025},
                {"min_salary": 75001, "max_salary": None, "tax_amount": 1250}
            ]
            db.professional_tax_slabs.insert_many(default_slabs)
            print("PT Slabs seeded successfully!")
        else:
            print("PT Slabs already exist.")

if __name__ == "__main__":
    seed_pt_slabs()