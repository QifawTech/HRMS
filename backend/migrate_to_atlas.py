"""
Migrate local MongoDB to Atlas
"""
from pymongo import MongoClient

# Local (source)
LOCAL_URI = "mongodb://localhost:27017"
DB_NAME = "employee_erp"

# Atlas (destination)
ATLAS_URI = "mongodb+srv://aslamapr1920_db_user:9Ij0R4GzaqZkhRrj@employeeerp.yn7da0c.mongodb.net/?appName=EmployeeERP"


def migrate():
    print(f"\n{'='*60}")
    print(f"Migrating Local → Atlas")
    print(f"Database: {DB_NAME}")
    print(f"{'='*60}\n")

    local_client = MongoClient(LOCAL_URI)
    atlas_client = MongoClient(ATLAS_URI)

    local_db = local_client[DB_NAME]
    atlas_db = atlas_client[DB_NAME]

    collections = local_db.list_collection_names()
    print(f"Found {len(collections)} collections\n")

    total = 0
    for name in sorted(collections):
        docs = list(local_db[name].find({}))
        if not docs:
            print(f"  [SKIP] {name}: 0 docs")
            continue

        atlas_db[name].delete_many({})
        atlas_db[name].insert_many(docs)
        total += len(docs)
        print(f"  [OK] {name}: {len(docs)} docs")

    print(f"\n{'='*60}")
    print(f"[SUCCESS] Migrated {total} documents!")
    print(f"{'='*60}\n")

    local_client.close()
    atlas_client.close()


if __name__ == "__main__":
    migrate()