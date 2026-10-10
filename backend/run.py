from app import create_app
from app.config import Config

app = create_app()

if __name__ == "__main__":
    import os

    # Unga AWS Lightsail IP
    AWS_IP = "13.127.26.179"
    port = Config.FLASK_PORT

    if os.getenv("FLASK_ENV") == "development":
        print(f"🚀 Dev server: http://localhost:{port}")
        app.run(
            host="0.0.0.0",
            port=port,
            debug=True,
            use_reloader=False,  # ✅ Windows socket error fix
        )
    else:
        from waitress import serve
        print(f"🚀 Production server: http://{AWS_IP}:{port}")
        serve(app, host="0.0.0.0", port=port)