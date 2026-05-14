import os
import time
import subprocess
import logging
import hashlib

# ===== CONFIG =====
INPUT_FOLDER = r"C:\AttendanceAutomation\Input"
AUTOMATE_SCRIPT = r"C:\AttendanceAutomation\automate.py"
WHATSAPP_SCRIPT = r"C:\AttendanceAutomation\whatsapp_sender.py"

DELAY_FILE_COPY = 5
DELAY_DELETE_INPUT = 10
DELAY_BEFORE_WHATSAPP = 20

# ===== LOGGING =====
LOG_FILE = r"C:\AttendanceAutomation\automation.log"
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

def log(msg, level="info"):
    if level == "info":
        logging.info(msg)
    elif level == "error":
        logging.error(msg)
    else:
        logging.warning(msg)

def file_hash(filepath):
    """Generate MD5 hash of file content."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def is_file_stable(filepath, wait_seconds=2):
    if not os.path.exists(filepath):
        return False
    size1 = os.path.getsize(filepath)
    time.sleep(wait_seconds)
    size2 = os.path.getsize(filepath)
    return size1 == size2

def run_script(script_path):
    try:
        subprocess.run(["python", script_path], check=True)
        return True
    except subprocess.CalledProcessError as e:
        log(f"❌ Script failed: {script_path} | {e}", "error")
        return False

def watch_folder():
    log("📂 Watching for Excel/CSV files...")
    processed_hashes = set()

    while True:
        try:
            files = [f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith((".xlsx", ".xls", ".csv"))]
            
            # Reset processed list if folder is empty
            if not files and processed_hashes:
                processed_hashes.clear()
                log("♻️ Reset processed file list (folder empty)")

            for file in files:
                full_path = os.path.join(INPUT_FOLDER, file)
                if is_file_stable(full_path):
                    file_md5 = file_hash(full_path)

                    if file_md5 not in processed_hashes:
                        processed_hashes.add(file_md5)
                        log(f"📄 Detected file: {file}")

                        time.sleep(DELAY_FILE_COPY)
                        if run_script(AUTOMATE_SCRIPT):
                            log("✅ Message generated.")

                            time.sleep(DELAY_DELETE_INPUT)
                            try:
                                os.remove(full_path)
                                log(f"🗑️ Deleted input file: {file}")
                            except Exception as e:
                                log(f"⚠️ Could not delete input file: {e}", "error")

                            time.sleep(DELAY_BEFORE_WHATSAPP)

                            if run_script(WHATSAPP_SCRIPT):
                                log("✅ WhatsApp message sent.")
                            else:
                                log("⚠️ WhatsApp send failed.", "error")
                        else:
                            log("⚠️ automate.py failed — skipping WhatsApp send.", "error")

        except Exception as e:
            log(f"❌ Watcher crashed: {e}", "error")

        time.sleep(2)

if __name__ == "__main__":
    watch_folder()
