# resume_bot.py
import os, time, subprocess, logging
from pathlib import Path

BASE = Path(r"C:\AttendanceAutomation")
CONTROL = BASE / "control.txt"
LOG = BASE / "pause_resume.log"
PY_EXE = r"D:\python.exe"
WATCHER = BASE / "watcher.py"

logging.basicConfig(filename=str(LOG), level=logging.INFO, format="%(asctime)s [resume] %(message)s")
log = logging.getLogger("resume")

def write_start():
    BASE.mkdir(parents=True, exist_ok=True)
    CONTROL.write_text("START")

def start_watcher_if_needed():
    try:
        import psutil
        running = False
        for p in psutil.process_iter(["cmdline"]):
            try:
                cmd = p.info.get("cmdline") or []
                if any("watcher.py" in str(c) for c in cmd):
                    running = True; break
            except Exception:
                pass
        if not running:
            # launch detached
            subprocess.Popen([PY_EXE, "-u", str(WATCHER)], creationflags=0x00000008|0x00000200, close_fds=True)
            log.info("Launched watcher to ensure supervisor will start.")
        else:
            log.info("Watcher already running, no explicit start needed.")
    except Exception:
        log.exception("start_watcher_if_needed failed")

if __name__ == "__main__":
    write_start()
    time.sleep(0.5)
    start_watcher_if_needed()
    log.info("Resume requested. Watcher will start supervisor when it sees control=START.")
