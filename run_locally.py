from app import app
import socket

def get_local_ip():
    """Get the local IP address of the machine"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    local_ip = get_local_ip()
    port = 5000
    print(f"* Running on http://{local_ip}:{port}")
    print(f"* This address can be accessed by other devices on your network")
    print(f"* Press CTRL+C to quit")
    app.run(host='0.0.0.0', port=port, debug=True) 