# from app import create_app
# from app.config import Config

# app = create_app()

# if __name__ == "__main__":
#     print(f"🚀 Server starting on http://localhost:{Config.FLASK_PORT}")
#     app.run(host="0.0.0.0", port=Config.FLASK_PORT, debug=True)

from app import create_app
from app.config import Config

app = create_app()

if __name__ == "__main__":
    import os
    if os.getenv("FLASK_ENV") == "development":
        print(f"🚀 Dev server: http://localhost:{Config.FLASK_PORT}")
        app.run(host="0.0.0.0", port=Config.FLASK_PORT, debug=True)
    else:
        from waitress import serve
        print(f"🚀 Production server: http://localhost:{Config.FLASK_PORT}")
        serve(app, host="0.0.0.0", port=Config.FLASK_PORT)