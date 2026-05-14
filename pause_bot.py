# pause_bot.py
import os, time, logging
from pathlib import Path
BASE = Path(r"C:\AttendanceAutomation")
CONTROL = BASE / "control.txt"
SUP_PID = BASE / "supervisor.pid"
LOG = BASE / "pause_resume.log"

logging.basicConfig(filename=str(LOG), level=logging.INFO, format="%(asctime)s [pause] %(message)s")
log = logging.getLogger("pause")

def write_pause():
    BASE.mkdir(parents=True, exist_ok=True)
    CONTROL.write_text("PAUSE")

def stop_supervisor():
    try:
        import psutil
        if SUP_PID.exists():
            pid = int(SUP_PID.read_text().strip())
            if psutil.pid_exists(pid):
                p = psutil.Process(pid)
                log.info("Terminating supervisor pid=%s", pid)
                p.terminate()
                try:
                    p.wait(5)
                except Exception:
                    p.kill()
        # also attempt to kill any supervisor/python instances by name
        for p in psutil.process_iter(["pid","cmdline"]):
            try:
                cmd = p.info.get("cmdline") or []
                if any("supervisor.py" in str(c) for c in cmd):
                    log.info("Terminating leftover supervisor pid=%s", p.pid)
                    p.terminate()
            except Exception:
                pass
    except Exception:
        log.exception("stop_supervisor failed")

if __name__ == "__main__":
    write_pause()
    time.sleep(0.5)
    stop_supervisor()
    log.info("Pause requested and stop attempted. Bot should remain paused until resume is run.")
