from app import create_app
from app.config import Config
import os


app = create_app()


if __name__ == "__main__":
    port = Config.FLASK_PORT
    env = os.getenv("FLASK_ENV", "development")

    # ✅ Warmup MongoDB — first request ku munnadi connections ready
    try:
        from app.db import warmup
        warmup()
    except Exception as e:
        print(f"⚠️  Warmup failed: {e}")

    if env == "development":
        print(f"🚀 Dev server: http://localhost:{port}")
        app.run(
            host="0.0.0.0",
            port=port,
            debug=True,
            use_reloader=False,   # Windows socket error fix
        )
    else:
        from waitress import serve
        print(f"🚀 Production server started on port: {port} (Ready for ECS/Docker)")
        serve(
            app,
            host="0.0.0.0",
            port=port,
            threads=8,              # ✅ Concurrent requests
            connection_limit=100,   # ✅ Max connections
            channel_timeout=120,    # ✅ 2 min timeout
        )