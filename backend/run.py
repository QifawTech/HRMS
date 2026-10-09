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
    
    # Unga AWS Lightsail IP
    AWS_IP = "13.127.26.179"
    port = Config.FLASK_PORT
    
    if os.getenv("FLASK_ENV") == "development":
        print(f"🚀 Dev server running on: http://{AWS_IP}:{port} (Bound to 0.0.0.0)")
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        from waitress import serve
        print(f"🚀 Production server running on: http://{AWS_IP}:{port} (Bound to 0.0.0.0)")
        serve(app, host="0.0.0.0", port=port)