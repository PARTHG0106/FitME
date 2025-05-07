from pyngrok import ngrok, conf
import os
import sys
import time

# Set port to 5173 for React app
port = 5173

# Set your authtoken directly
ngrok.set_auth_token("2r77nf19BCm7fjOFWUryyJ8J8W3_7kypjgfvWs7eHL7gPQ7DB")

# Configure ngrok for better stability
config = conf.PyngrokConfig(
    auth_token="2r77nf19BCm7fjOFWUryyJ8J8W3_7kypjgfvWs7eHL7gPQ7DB",
    region="us"  # You can change this to a region closer to you: "us", "eu", "ap", "au", "sa", "jp", "in"
)

# Open a ngrok tunnel to the React app with specific configuration
public_url = ngrok.connect(port, "http", pyngrok_config=config)
print(f" * ngrok tunnel \"{public_url}\" -> \"http://localhost:{port}\"")
print(f" * Share this URL to let others access your React app: {public_url}")
print(f" * Make sure to open this exact URL in your browser: {public_url}")

# Keep the script running
try:
    print("Press CTRL+C to quit")
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Shutting down tunnel...")
finally:
    # Clean up the ngrok tunnel at the end
    ngrok.kill() 