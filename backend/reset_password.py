import bcrypt
from app.db import users

email = "qifaw@gmail.com"
new_password = "qifaw123"

pw_hash = bcrypt.hashpw(
    new_password.encode("utf-8"),
    bcrypt.gensalt()
).decode("utf-8")

result = users().update_one(
    {"email": email},
    {"$set": {"password_hash": pw_hash, "is_active": True}}
)

if result.modified_count > 0:
    print("SUCCESS: Password reset done")
    print("Email: " + email)
    print("Password: " + new_password)
else:
    print("FAILED: User not found")