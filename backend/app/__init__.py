from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from app.config import Config
import os


def create_app():
    """Flask application factory."""
    app = Flask(__name__)
    
    # CORS API calls-a veliya irunthu allow panna puthu code
    CORS(app, resources={r"/*": {"origins": "*"}})

    app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

    # ============================================
    # Serve uploaded files
    # ============================================
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

    @app.route("/uploads/<path:filepath>")
    def serve_upload(filepath):
        # Security
        if ".." in filepath or filepath.startswith("/"):
            return jsonify({"error": "Invalid path"}), 400

        try:
            return send_from_directory(UPLOAD_DIR, filepath)
        except Exception as e:
            return jsonify({"error": f"File not found: {filepath}"}), 404

    # ============================================
    # Import blueprints
    # ============================================
    from app.routes.auth_routes import auth_bp
    from app.routes.department_routes import department_bp
    from app.routes.employee_routes import employee_bp
    from app.routes.attendance_routes import attendance_bp
    from app.routes.leave_routes import leave_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.announcement_routes import announcement_bp
    from app.routes.notification_routes import notification_bp
    from app.routes.task_routes import task_bp
    from app.routes.document_routes import document_bp
    from app.routes.resignation_routes import resignation_bp
    from app.routes.forgot_logout_routes import forgot_logout_bp
    from app.routes.report_routes import report_bp
    from app.routes.settings_routes import settings_bp
    from app.routes.payroll_routes import payroll_bp
    from app.routes.shift_routes import shift_bp

    # ============================================
    # Register blueprints
    # ============================================
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(department_bp, url_prefix="/api/departments")
    app.register_blueprint(employee_bp, url_prefix="/api/employees")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(leave_bp, url_prefix="/api/leaves")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(announcement_bp, url_prefix="/api/announcements")
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")
    app.register_blueprint(task_bp, url_prefix="/api/tasks")
    app.register_blueprint(document_bp, url_prefix="/api/documents")
    app.register_blueprint(resignation_bp, url_prefix="/api/resignations")
    app.register_blueprint(forgot_logout_bp, url_prefix="/api/forgot-logout")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(payroll_bp, url_prefix="/api/payroll")
    app.register_blueprint(shift_bp, url_prefix="/api/shifts")
    

    # ============================================
    # Health check
    # ============================================
    @app.route("/")
    def index():
        return jsonify({
            "message": "Employee ERP API is running",
            "status": "ok",
        }), 200

    # ============================================
    # Error handlers
    # ============================================
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app