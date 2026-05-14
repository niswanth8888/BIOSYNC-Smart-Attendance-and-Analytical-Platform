# watcher.py
import os, sys, time, socket, subprocess, logging
from pathlib import Path

BASE = Path(r"C:\AttendanceAutomation")
LOG_FILE = BASE / "watcher.log"
LOCK_FILE = BASE / "watcher.pid"
CONTROL_FILE = BASE / "control.txt"
SUPERVISOR = BASE / "supervisor.py"

# Path to python executable used to run supervisor (change only if your python is elsewhere)
PY_EXE = r"D:\python.exe"

# network check
NET_HOST = ("8.8.8.8", 53)
NET_TIMEOUT = 2.0
RETRY_INTERVAL = 10         # seconds between tries when offline
MAX_ATTEMPTS_BEFORE_LONG_SLEEP = 30

# Windows process creation flags (for detached process)
CREATE_DETACHED = 0x00000008
NEW_PROCESS_GROUP = 0x00000200

logging.basicConfig(filename=str(LOG_FILE), level=logging.INFO,
                    format="%(Y-%m-%d %H:%M:%S] [watcher] %(message)s")
log = logging.getLogger("watcher")

def write_lock():
    try:
        BASE.mkdir(parents=True, exist_ok=True)
        LOCK_FILE.write_text(str(os.getpid()))
    except Exception:
        log.exception("write_lock failed")

def remove_lock():
    try:
        if LOCK_FILE.exists():
            LOCK_FILE.unlink()
    except Exception:
        log.exception("remove_lock failed")

def already_running():
    try:
        if not LOCK_FILE.exists():
            return False
        txt = LOCK_FILE.read_text().strip()
        if not txt:
            return False
        pid = int(txt)
        # psutil preferred
        try:
            import psutil
            return psutil.pid_exists(pid)
        except Exception:
            # fallback: os.kill(pid, 0) on windows raises OSError if not exist
            try:
                os.kill(pid, 0)
                return True
            except Exception:
                return False
    except Exception:
        return False

def network_up():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(NET_TIMEOUT)
        s.connect(NET_HOST)
        s.close()
        return True
    except Exception:
        return False

def read_control():
    try:
        if not CONTROL_FILE.exists():
            return "START"
        val = CONTROL_FILE.read_text().strip().upper()
        return "PAUSE" if "PAUSE" in val else "START"
    except Exception:
        return "START"

def supervisor_running():
    try:
        import psutil
        for p in psutil.process_iter(["cmdline"]):
            try:
                cmd = p.info.get("cmdline") or []
                if any("supervisor.py" in str(c) for c in cmd):
                    return True
            except Exception:
                continue
    except Exception:
        # fallback: wmic check (slower) - best-effort
        try:
            out = subprocess.check_output(["wmic", "process", "get", "CommandLine"], stderr=subprocess.DEVNULL, text=True)
            if "supervisor.py" in out:
                return True
        except Exception:
            pass
    return False

def start_supervisor_detached():
    if not SUPERVISOR.exists():
        log.error("supervisor.py missing at %s", SUPERVISOR)
        return False
    if supervisor_running():
        log.info("supervisor already running (skipping start).")
        return True
    cmd = [PY_EXE, "-u", str(SUPERVISOR)]
    try:
        creationflags = CREATE_DETACHED | NEW_PROCESS_GROUP
        subprocess.Popen(cmd, creationflags=creationflags, close_fds=True)
        log.info("Launched supervisor detached: %s", cmd)
        return True
    except Exception:
        log.exception("Failed to launch supervisor")
        return False

def stop_supervisor():
    try:
        import psutil
        for p in psutil.process_iter(["pid","cmdline","name"]):
            try:
                cmd = p.info.get("cmdline") or []
                if any("supervisor.py" in str(c) for c in cmd):
                    log.info("Terminating supervisor pid=%s", p.pid)
                    p.terminate()
            except Exception:
                continue
    except Exception:
        try:
            subprocess.run(['wmic','process','where','CommandLine like "%supervisor.py%"','call','terminate'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            log.exception("Fallback termination failed")

def main():
    if already_running():
        log.info("Another watcher instance is running. Exiting.")
        return
    write_lock()
    log.info("Watcher started (pid=%s)", os.getpid())

    try:
        while True:
            ctrl = read_control()
            if ctrl == "PAUSE":
                log.info("Control=PAUSE -> ensuring supervisor stopped and sleeping.")
                stop_supervisor()
                # sleep but wake to check file each 5 seconds
                while read_control() == "PAUSE":
                    time.sleep(5)
                log.info("Control changed to START -> resuming")

            # control is START
            attempts = 0
            while not network_up():
                attempts += 1
                log.info("Network down (attempt %d). Waiting %d sec.", attempts, RETRY_INTERVAL)
                if read_control() == "PAUSE":
                    log.info("PAUSE detected while waiting for network; break to outer loop")
                    break
                time.sleep(RETRY_INTERVAL)
                if attempts >= MAX_ATTEMPTS_BEFORE_LONG_SLEEP:
                    log.info("Long sleep due to many failed network checks.")
                    time.sleep(RETRY_INTERVAL * 6)
                    attempts = 0

            if read_control() == "PAUSE":
                continue

            if not supervisor_running():
                ok = start_supervisor_detached()
                if not ok:
                    log.warning("Start failed; retrying after short sleep.")
                    time.sleep(5)
                    continue
                # allow supervisor to settle
                time.sleep(2)
            else:
                log.debug("Supervisor running; watcher sleeping.")
            time.sleep(10)
    except KeyboardInterrupt:
        log.info("Watcher interrupted by user")
    except Exception:
        log.exception("Watcher crashed")
    finally:
        remove_lock()
        log.info("Watcher stopped")

if __name__ == "__main__":
    main()
