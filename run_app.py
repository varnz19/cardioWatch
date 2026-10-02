"""
CardioWatch: Complete Fullstack Application Launcher
Starts the FastAPI backend and serves the interactive surveillance web dashboard.
"""

import os
import sys
import subprocess
import webbrowser
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def main():
    print("\n" + "=" * 75)
    print("        CARDIOWATCH: LAUNCHING INTERACTIVE WEB APPLICATION")
    print("=" * 75)
    print(" > Backend Engine: FastAPI + Scikit-Learn + SciPy (Port 8000)")
    print(" > Web Interface:  React + Vite Clinical Surveillance Dashboard")
    print(" > Serving URL:    http://127.0.0.1:8000")
    print("=" * 75 + "\n")

    # Check if frontend is built
    dist_index = os.path.join(FRONTEND_DIR, "dist", "index.html")
    if not os.path.exists(dist_index):
        print("[Launcher] Building React frontend production bundle...")
        subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, check=True)
        print("[Launcher] Frontend build complete.")

    dev_mode = "--dev" in sys.argv

    if dev_mode:
        print("[Launcher] Starting in Development Mode (Vite HMR + FastAPI)...")
        # Start backend
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            cwd=BACKEND_DIR
        )
        # Start frontend dev
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
        # Standard Single-Port Mode: FastAPI serves both API and static React frontend
        print("[Launcher] Starting CardioWatch on http://127.0.0.1:8000 ...")
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"]
        try:
            subprocess.run(cmd, cwd=BACKEND_DIR)
        except KeyboardInterrupt:
            print("\n[Launcher] CardioWatch server stopped.")

if __name__ == "__main__":
    main()
