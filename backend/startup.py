import os
from app import app

if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.environ.get("PORT", 5001))
    # Run the app with gunicorn-compatible settings
    app.run(host="0.0.0.0", port=port)