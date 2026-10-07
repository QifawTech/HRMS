"""
Backup MongoDB Atlas to local JSON files
Usage: python backup_atlas.py
"""
import os
import json
from datetime import datetime
from bson import json_util
from pymongo import MongoClient

# Atlas connection
ATLAS_URI = "mongodb+srv://aslamapr1920_db_user:9Ij0R4GzaqZkhRrj@employeeerp.yn7da0c.mongodb.net/?appName=EmployeeERP"
DB_NAME = "employee_erp"

# Backup folder (Project ku VELIYA!)
BACKUP_ROOT = r"E:\employee-erpbackup\atlas_backups"


def backup_atlas():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_folder = os.path.join(BACKUP_ROOT, f"atlas_backup_{timestamp}")
    os.makedirs(backup_folder, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"ATLAS BACKUP")
    print(f"Database: {DB_NAME}")
    print(f"Output:   {backup_folder}")
    print(f"{'='*60}\n")

    client = MongoClient(ATLAS_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[DB_NAME]

    collections = db.list_collection_names()
    print(f"Found {len(collections)} collections\n")

    total_docs = 0
    for name in sorted(collections):
        docs = list(db[name].find({}))

        file_path = os.path.join(backup_folder, f"{name}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(docs, f, default=json_util.default, indent=2, ensure_ascii=False)

        total_docs += len(docs)
        print(f"  [OK] {name}: {len(docs)} docs")

    meta = {
        "source": "MongoDB Atlas",
        "database": DB_NAME,
        "backup_time": timestamp,
        "total_collections": len(collections),
        "total_documents": total_docs,
    }
    with open(os.path.join(backup_folder, "_metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n{'='*60}")
    print(f"[SUCCESS] BACKUP COMPLETE!")
    print(f"Total:    {total_docs} documents")
    print(f"Folder:   {backup_folder}")
    print(f"{'='*60}\n")

    client.close()


if __name__ == "__main__":
    backup_atlas()