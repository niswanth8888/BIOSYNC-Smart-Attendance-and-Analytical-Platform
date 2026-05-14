# supervisor.py
import os, sys, time, subprocess, logging
from pathlib import Path

BASE = Path(r"C:\AttendanceAutomation")
LOG_FILE = BASE / "supervisor.log"
PID_FILE = BASE / "supervisor.pid"
BOT_SCRIPT = BASE / "whatsapp_bot.py"

PY_EXE = r"D:\python.exe"
RESTART_DELAY = 10

logging.basicConfig(filename=str(LOG_FILE), level=logging.INFO,
                    format="%(Y-%m-%d %H:%M:%S] [supervisor] %(message)s")
log = logging.getLogger("supervisor")

def write_pid():
    try:
        BASE.mkdir(parents=True, exist_ok=True)
        PID_FILE.write_text(str(os.getpid()))
    except Exception:
        log.exception("write_pid failed")

def remove_pid():
    try:
        if PID_FILE.exists():
            PID_FILE.unlink()
    except Exception:
        log.exception("remove_pid failed")

def already_running():
    try:
        if not PID_FILE.exists():
            return False
        pid = int(PID_FILE.read_text().strip())
        import psutil
        return psutil.pid_exists(pid)
    except Exception:
        return False

def start_bot_process():
    if not BOT_SCRIPT.exists():
        log.error("Bot script missing: %s", BOT_SCRIPT)
        return None
    cmd = [PY_EXE, "-u", str(BOT_SCRIPT)]
    try:
        p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log.info("Launched bot child (pid=%s)", p.pid)
        return p
    except Exception:
        log.exception("Failed to start bot process")
        return None

def terminate_process_tree(proc):
    try:
        import psutil
        try:
            p = psutil.Process(proc.pid)
            children = p.children(recursive=True)
            for c in children:
                try:
                    c.terminate()
                except Exception:
                    pass
            gone, alive = psutil.wait_procs(children, timeout=3)
            for c in alive:
                try:
                    c.kill()
                except Exception:
                    pass
            try:
                p.terminate()
                p.wait(3)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        except Exception:
            # fallback
            proc.terminate()
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass

def main_loop():
    if already_running():
        log.info("Another supervisor appears to be running. Exiting.")
        return
    write_pid()
    log.info("Supervisor started (pid=%s)", os.getpid())

    try:
        while True:
            # read control file - if PAUSE, exit and let watcher not restart because it will detect PAUSE
            ctrl = "START"
            try:
                cf = BASE / "control.txt"
                if cf.exists() and "PAUSE" in cf.read_text().upper():
                    ctrl = "PAUSE"
            except Exception:
                pass
            if ctrl == "PAUSE":
                log.info("Control=PAUSE. Supervisor exiting (watcher will stop supervisor too).")
                break

            p = start_bot_process()
            if p is None:
                log.warning("Could not start bot; retrying after %d seconds", RESTART_DELAY)
                time.sleep(RESTART_DELAY)
                continue

            # wait for bot process to exit (or be killed)
            try:
                ret = p.wait()
                log.warning("Child exited with code %s. Will cleanup and restart after %d seconds.", ret, RESTART_DELAY)
            except Exception:
                log.exception("Exception waiting for child process")
            # cleanup children and restart after delay
            try:
                terminate_process_tree(p)
            except Exception:
                log.exception("cleanup error")
            time.sleep(RESTART_DELAY)
    except KeyboardInterrupt:
        log.info("Supervisor interrupted")
    except Exception:
        log.exception("Supervisor crashed")
    finally:
        remove_pid()
        log.info("Supervisor stopped")

if __name__ == "__main__":
    main_loop()
