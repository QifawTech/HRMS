from app import create_app
from app.config import Config

app = create_app()

if __name__ == "__main__":
    import os
    
    # Unga AWS Lightsail IP
    AWS_IP = "13.127.26.179"
    port = Config.FLASK_PORT
    
    if os.getenv("FLASK_ENV") == "development":
<<<<<<< HEAD
        print(f"🚀 Dev server: http://localhost:{Config.FLASK_PORT}")
        app.run(
            host="0.0.0.0",
            port=Config.FLASK_PORT,
            debug=True,
            use_reloader=False,     # ✅ Windows socket error fix
        )
=======
        print(f"🚀 Dev server running on: http://{AWS_IP}:{port} (Bound to 0.0.0.0)")
        app.run(host="0.0.0.0", port=port, debug=True)
>>>>>>> b7852cbfcf247cdbe8e106939c74a6d311ae458f
    else:
        from waitress import serve
        print(f"🚀 Production server running on: http://{AWS_IP}:{port} (Bound to 0.0.0.0)")
        serve(app, host="0.0.0.0", port=port)