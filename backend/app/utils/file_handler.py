import os
import uuid
from werkzeug.utils import secure_filename
from flask import request

UPLOAD_BASE = "uploads"
ANNOUNCEMENT_FOLDER = os.path.join(UPLOAD_BASE, "announcements")
TASK_FOLDER = os.path.join(UPLOAD_BASE, "tasks")
DOCUMENTS_FOLDER = os.path.join(UPLOAD_BASE, "documents")
PROFILE_FOLDER = os.path.join(UPLOAD_BASE, "profiles")
LOGO_FOLDER = os.path.join(UPLOAD_BASE, "logos")

ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx",
    "jpg", "jpeg", "png", "gif", "webp",
    "txt", "csv", "zip",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FILES = 5


def _get_base_url():
    """Get backend base URL from current request."""
    try:
        # request.host_url = "http://65.0.221.12:5000/"
        return request.host_url.rstrip("/")
    except RuntimeError:
        # Outside request context (fallback)
        return "http://65.0.221.12:5000"


def ensure_upload_dirs():
    os.makedirs(ANNOUNCEMENT_FOLDER, exist_ok=True)
    os.makedirs(TASK_FOLDER, exist_ok=True)
    os.makedirs(DOCUMENTS_FOLDER, exist_ok=True)
    os.makedirs(PROFILE_FOLDER, exist_ok=True)
    os.makedirs(LOGO_FOLDER, exist_ok=True)


def allowed_file(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def save_announcement_file(file):
    """Save uploaded file. Returns metadata dict."""
    ensure_upload_dirs()

    if not file or file.filename == "":
        raise ValueError("No file selected")

    if not allowed_file(file.filename):
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
        raise ValueError(
            f"File type '.{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Check size
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large ({round(size / 1024 / 1024, 2)}MB). Max 5MB."
        )

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(ANNOUNCEMENT_FOLDER, unique_name)

    file.save(file_path)

    return {
        "file_id": str(uuid.uuid4()),
        "file_name": original_name,
        "stored_name": unique_name,
        "file_path": file_path.replace("\\", "/"),
        "file_size": size,
        "mime_type": file.content_type or "application/octet-stream",
    }


def delete_file(file_path):
    """Delete file safely."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception:
        pass
    return False


def get_file_full_path(relative_path):
    """Convert relative path to full path."""
    base = os.getcwd()
    return os.path.join(base, relative_path.replace("/", os.sep))


def save_task_file(file):
    """Save task-related file."""
    ensure_upload_dirs()

    if not file or file.filename == "":
        raise ValueError("No file selected")

    if not allowed_file(file.filename):
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
        raise ValueError(f"File type '.{ext}' not allowed")

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        raise ValueError(f"File too large (max 5MB)")

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(TASK_FOLDER, unique_name)

    file.save(file_path)

    return {
        "file_id": str(uuid.uuid4()),
        "file_name": original_name,
        "stored_name": unique_name,
        "file_path": file_path.replace("\\", "/"),
        "file_size": size,
        "mime_type": file.content_type or "application/octet-stream",
    }


def save_document_file(file):
    """Save employee document."""
    ensure_upload_dirs()

    if not file or file.filename == "":
        raise ValueError("No file selected")

    if not allowed_file(file.filename):
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
        raise ValueError(f"File type '.{ext}' not allowed")

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        raise ValueError(f"File too large ({round(size/1024/1024, 2)}MB). Max 5MB.")

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(DOCUMENTS_FOLDER, unique_name)

    file.save(file_path)

    return {
        "file_id": str(uuid.uuid4()),
        "file_name": original_name,
        "stored_name": unique_name,
        "file_path": file_path.replace("\\", "/"),
        "file_size": size,
        "mime_type": file.content_type or "application/octet-stream",
    }


def save_profile_picture(file):
    """Save profile picture. Only images allowed.
    Returns FULL URL for the picture."""
    ensure_upload_dirs()

    if not file or file.filename == "":
        raise ValueError("No file selected")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    allowed = {"jpg", "jpeg", "png", "gif", "webp"}
    if ext not in allowed:
        raise ValueError("Only JPG, PNG, GIF, or WEBP allowed")

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > 5 * 1024 * 1024:
        raise ValueError("Image too large (max 5MB)")

    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(PROFILE_FOLDER, unique_name)
    file.save(file_path)

    # ✅ Build FULL URL: http://65.0.221.12:5000/uploads/profiles/xxx.jpg
    base_url = _get_base_url()
    full_url = f"{base_url}/uploads/profiles/{unique_name}"

    return {
        "picture_path": file_path.replace("\\", "/"),
        "picture_url": full_url,
    }


def save_company_logo(file):
    """Save company logo (image only).
    Returns FULL URL for the logo."""
    ensure_upload_dirs()

    if not file or file.filename == "":
        raise ValueError("No file selected")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    allowed = {"jpg", "jpeg", "png", "gif", "webp", "svg"}
    if ext not in allowed:
        raise ValueError("Only JPG, PNG, GIF, WEBP, or SVG allowed")

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > 2 * 1024 * 1024:
        raise ValueError("Logo too large (max 2MB)")

    unique_name = f"logo_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(LOGO_FOLDER, unique_name)
    file.save(file_path)

    # ✅ Build FULL URL: http://65.0.221.12:5000/uploads/logos/xxx.jpg
    base_url = _get_base_url()
    full_url = f"{base_url}/uploads/logos/{unique_name}"

    return {
        "logo_path": file_path.replace("\\", "/"),
        "logo_url": full_url,
    }