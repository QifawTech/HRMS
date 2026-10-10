"""
Fix: Replace now_ist() with datetime.utcnow() in AUTH files only.
JWT standard uses UTC time.
"""
import os
import re

AUTH_FILES = [
    "app/middleware/auth_middleware.py",
    "app/routes/auth_routes.py",
    "app/services/auth_service.py",
]


def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"⏭️  Skip: {filepath} (not found)")
        return 0

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    count = content.count("now_ist()")
    if count == 0:
        print(f"⚪ {filepath}: no now_ist() found")
        return 0

    # Replace now_ist() → datetime.utcnow()
    content = content.replace("now_ist()", "datetime.utcnow()")

    # Remove now_ist import
    content = re.sub(
        r"from app\.utils\.time_utils import now_ist\s*\n",
        "",
        content,
    )

    # Ensure datetime import exists
    if "from datetime import datetime" not in content and "import datetime" not in content:
        content = "from datetime import datetime\n" + content

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ {filepath}: {count} replacements")
    return count


def main():
    print("🔧 Fixing AUTH files (JWT needs UTC)...\n")
    total = 0
    for fp in AUTH_FILES:
        total += fix_file(fp)
    print(f"\n🎉 Total {total} replacements done.")
    print("⚠️  Restart backend after this!")


if __name__ == "__main__":
    main()