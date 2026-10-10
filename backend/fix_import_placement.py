"""
Fix: Move `from app.utils.time_utils import now_ist` OUT of multi-line
import blocks. Insert after the closing `)`.
"""
import os

TARGET = "from app.utils.time_utils import now_ist"


def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.read().split("\n")

    # Find wrong line (inside parens)
    wrong_idx = None
    for i, line in enumerate(lines):
        if line.strip() == TARGET:
            # Look backwards for unclosed "("
            depth = 0
            for j in range(i - 1, -1, -1):
                s = lines[j].strip()
                if s.endswith("("):
                    wrong_idx = i
                    break
                if s.startswith(")") or s == ")":
                    break  # Already closed, so OK
            break

    if wrong_idx is None:
        return False

    # Remove wrong line
    lines.pop(wrong_idx)

    # Find closing `)`
    close_idx = None
    for i in range(wrong_idx, len(lines)):
        if lines[i].strip() == ")":
            close_idx = i
            break

    if close_idx is None:
        return False

    # Insert AFTER closing `)`
    lines.insert(close_idx + 1, TARGET)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return True


def main():
    print("🔧 Fixing import placement...\n")
    fixed = 0
    for base in ["app/services", "app/routes"]:
        if not os.path.isdir(base):
            continue
        for fn in sorted(os.listdir(base)):
            if not fn.endswith(".py"):
                continue
            fp = os.path.join(base, fn)
            if fix_file(fp):
                print(f"✅ Fixed: {fp}")
                fixed += 1

    if fixed == 0:
        print("ℹ️  No files needed fixing.")
    else:
        print(f"\n🎉 Fixed {fixed} file(s).")


if __name__ == "__main__":
    main()