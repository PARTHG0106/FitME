# Hosting Your Gym Tracker App with Ngrok

## Prerequisites
- Make sure your Flask app is working locally
- Sign up for a free ngrok account at https://dashboard.ngrok.com/signup

## Steps

### 1. Get Your Ngrok Authtoken
1. Sign up or log in to your ngrok account
2. Navigate to https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your authtoken (it looks like: `2Uxxx...`)

### 2. Start Your App with Ngrok

#### Option A: Using the Command Line
Run the following command, replacing `YOUR_AUTH_TOKEN` with your actual token:

```bash
python run_with_ngrok.py YOUR_AUTH_TOKEN
```

#### Option B: Using Environment Variable
Set the environment variable and run:

**Windows Command Prompt:**
```cmd
set NGROK_AUTH_TOKEN=YOUR_AUTH_TOKEN
python run_with_ngrok.py
```

**Windows PowerShell:**
```powershell
$env:NGROK_AUTH_TOKEN="YOUR_AUTH_TOKEN"
python run_with_ngrok.py
```

### 3. Access Your App
- The terminal will display a public URL (like `https://abc123.ngrok.io`)
- Share this URL with anyone to access your app from anywhere in the world
- Note: The URL will change each time you restart the tunnel unless you have a paid ngrok plan

### Important Notes
- The free ngrok plan has limitations:
  - URLs change on each restart
  - Limited to 2 simultaneous tunnels
  - Limited to 40 connections per minute
- Your local computer must stay running for the ngrok tunnel to work
- For a persistent setup, consider deploying to a cloud service like Heroku, AWS, or Azure

### Troubleshooting
- If your app depends on cookies or sessions, some browsers might have issues with ngrok URLs
- Make sure your Flask app has CORS properly configured to accept requests from ngrok domains 