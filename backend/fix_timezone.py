"""
Automated script to replace datetime.utcnow() with now_ist()
in all service files.
"""
import os
import re
from pathlib import Path

# Files to process
SERVICE_DIR = "app/services"
ROUTES_DIR = "app/routes"

# Files to skip
SKIP_FILES = {"forgot_logout_service.py", "forgot_logout_routes.py"}

# Import line to add
IMPORT_LINE = "from app.utils.time_utils import now_ist"


def add_import_if_missing(content):
    """Add import line if not present."""
    if IMPORT_LINE in content:
        return content

    # Find first 'from app.' or 'import' line to insert after
    lines = content.split("\n")
    insert_idx = 0

    for i, line in enumerate(lines):
        if line.startswith("from app.") or line.startswith("from datetime"):
            insert_idx = i + 1
        elif line.startswith("import ") or line.startswith("from "):
            insert_idx = max(insert_idx, i + 1)

    # Insert import at top (after initial docstring/comments)
    # Find first non-comment, non-docstring line
    in_docstring = False
    insert_pos = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('"""') or stripped.startswith("'''"):
            in_docstring = not in_docstring
            continue
        if in_docstring:
            continue
        if stripped and not stripped.startswith("#"):
            insert_pos = i
            break

    # Find last import line
    last_import = insert_pos
    for i in range(insert_pos, len(lines)):
        stripped = lines[i].strip()
        if stripped.startswith("from ") or stripped.startswith("import "):
            last_import = i
        elif stripped and not stripped.startswith("#"):
            break

    # Insert after last import
    lines.insert(last_import + 1, IMPORT_LINE)
    return "\n".join(lines)


def fix_file(filepath):
    """Fix single file — replace utcnow() with now_ist()."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        original = content

        # Count occurrences
        count = content.count("datetime.utcnow()")
        if count == 0:
            return 0, 0

        # Replace all datetime.utcnow() → now_ist()
        content = content.replace("datetime.utcnow()", "now_ist()")

        # Add import if missing
        content = add_import_if_missing(content)

        # Only write if changed
        if content != original:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return count, 1

        return count, 0

    except Exception as e:
        print(f"❌ Error in {filepath}: {e}")
        return 0, 0


def main():
    total_replacements = 0
    total_files = 0

    # Process services
    for dir_path in [SERVICE_DIR, ROUTES_DIR]:
        if not os.path.isdir(dir_path):
            print(f"⚠️ Skipping {dir_path} (not found)")
            continue

        print(f"\n📁 Processing {dir_path}/...")
        for filename in sorted(os.listdir(dir_path)):
            if not filename.endswith(".py"):
                continue
            if filename in SKIP_FILES:
                print(f"⏭️  Skipped: {filename}")
                continue

            filepath = os.path.join(dir_path, filename)
            count, changed = fix_file(filepath)

            if count > 0:
                total_replacements += count
                total_files += changed
                print(f"✅ {filename}: {count} replacements")
            else:
                print(f"⚪ {filename}: no changes")

    print(f"\n{'='*50}")
    print(f"🎉 DONE!")
    print(f"   Files changed: {total_files}")
    print(f"   Total replacements: {total_replacements}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()