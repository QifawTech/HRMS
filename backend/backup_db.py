import os
import sys
import json
from datetime import datetime
from bson import json_util
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "employee_erp")
BACKUP_ROOT = r"E:\employee-erpbackup"

def backup_database():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_folder = os.path.join(BACKUP_ROOT, f"backup_{timestamp}")
    os.makedirs(backup_folder, exist_ok=True)

    print(f"\nBackup: {DB_NAME} → {backup_folder}\n")

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[DB_NAME]

    total = 0
    for name in sorted(db.list_collection_names()):
        docs = list(db[name].find({}))
        with open(os.path.join(backup_folder, f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(docs, f, default=json_util.default, indent=2, ensure_ascii=False)
        total += len(docs)
        print(f"  [OK] {name}: {len(docs)} docs")

    print(f"\n✅ DONE! Total: {total} docs")
    print(f"📁 {backup_folder}\n")
    client.close()

if __name__ == "__main__":
    backup_database()