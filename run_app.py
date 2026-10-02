"""
CardioWatch: Complete Fullstack Application Launcher
Starts the FastAPI backend and serves the interactive surveillance web dashboard.
Automatically detects if the default port is busy and selects an open port.
"""

import os
import sys
import socket
import argparse
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def is_port_available(port: int, host: str = "127.0.0.1") -> bool:
    """Checks if a local TCP port is free to bind."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind((host, port))
            return True
        except OSError:
            return False

def find_available_port(preferred_port: int = 8000, host: str = "127.0.0.1", max_attempts: int = 50) -> int:
    """Finds an available TCP port starting from preferred_port."""
    for port in range(preferred_port, preferred_port + max_attempts):
        if is_port_available(port, host):
            return port
    return preferred_port

def main():
    parser = argparse.ArgumentParser(description="CardioWatch Application Launcher")
    parser.add_argument("--port", type=int, default=8000, help="Preferred port (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--dev", action="store_true", help="Launch in development mode (Vite HMR + FastAPI)")
    args = parser.parse_args()

    # Determine free port
    preferred_port = args.port
    actual_port = find_available_port(preferred_port, args.host)

    if actual_port != preferred_port:
        print(f"\n[Launcher] Notice: Port {preferred_port} is busy. Automatically switched to available port {actual_port}.")

    serving_url = f"http://{args.host}:{actual_port}"

    print("\n" + "=" * 75)
    print("        CARDIOWATCH: LAUNCHING INTERACTIVE WEB APPLICATION")
    print("=" * 75)
    print(f" > Backend Engine: FastAPI + Scikit-Learn + SciPy (Port {actual_port})")
    print(f" > Web Interface:  React + Vite Clinical Surveillance Dashboard")
    print(f" > Serving URL:    {serving_url}")
    print("=" * 75 + "\n")

    # Check if frontend is built
    dist_index = os.path.join(FRONTEND_DIR, "dist", "index.html")
    if not os.path.exists(dist_index):
        print("[Launcher] Building React frontend bundle...")
        subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, check=True)
        print("[Launcher] Frontend build complete.")

    if args.dev:
        print(f"[Launcher] Starting in Development Mode on {serving_url} (FastAPI) & :5173 (Vite)...")
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", args.host, "--port", str(actual_port), "--reload"],
            cwd=BACKEND_DIR
        )
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=FRONTEND_DIR
        )
        try:
            backend_proc.wait()
            frontend_proc.wait()
        except KeyboardInterrupt:
            print("\n[Launcher] Shutting down development servers...")
            backend_proc.terminate()
            frontend_proc.terminate()
    else:
        print(f"[Launcher] Starting CardioWatch on {serving_url} ...")
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", args.host, "--port", str(actual_port)]
        try:
            subprocess.run(cmd, cwd=BACKEND_DIR)
        except KeyboardInterrupt:
            print("\n[Launcher] CardioWatch server stopped.")

if __name__ == "__main__":
    main()
