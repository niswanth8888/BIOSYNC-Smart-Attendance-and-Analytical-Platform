# whatsapp_bot.py
"""
BIOSYNC WhatsApp bot (stable under display-off / power-button + weekly/monthly text reports)

This build:
 - preserves your stable parsing + worker logic
 - network watcher: closes Chrome on confirmed network loss and restarts when network returns
 - 2-hour scheduled restart of the Chrome session
 - pause.flag support (manual pause/resume)
 - pause_resume.log with human-readable event entries
 - improved driver lifecycle handling to avoid profile lock issues
 - Reports <= 64,000 chars are sent as a single text message.
 - Reports > 64,000 chars are split into exactly TWO text messages (Part 1/2 and Part 2/2).
 - NO file attachments for oversized reports (text-only).
"""

import os
import re
import time
import uuid
import queue
import socket
import calendar
import logging
import threading
from datetime import datetime, timedelta, date
from dateutil import parser as dateparser

# optional imports
try:
    import pyperclip
except Exception:
    pyperclip = None

try:
    import psutil
except Exception:
    psutil = None

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    WebDriverException,
    InvalidSessionIdException,
    NoSuchElementException,
    TimeoutException,
    StaleElementReferenceException
)

# ---------------- CONFIG ----------------
CHROME_DRIVER_PATH = r"C:\Program Files\Python311\Scripts\chromedriver.exe"
USER_DATA_DIR      = r"C:/Users/CSE/botvsb"            # dedicated profile
BACKUP_BASE        = r"C:\AttendanceAutomation\Backup"
BOT_CHAT_NAME      = "BIOSYNC BOT"

POLL_INTERVAL        = 0.5
MAX_WAIT_WHATSAPP    = 35
LOG_FILE             = r"C:\AttendanceAutomation\whatsapp_bot.log"
PAUSE_RESUME_LOG     = r"C:\AttendanceAutomation\pause_resume.log"
PAUSE_FLAG_PATH      = r"C:\AttendanceAutomation\pause.flag"

TRIGGER_KEYWORDS     = ("attendance report", "report for", "report", "show attendance", "weekly report", "monthly report")
WORKER_COUNT         = 8
REQUEST_QUEUE_MAX    = 200
FILE_CACHE_TTL_SECONDS = 300
FILE_CACHE_MAX_ITEMS   = 50

# Use 64k as message limit threshold (per your request)
MAX_MESSAGE_CHUNK      = 64000  # characters

# temp report dir (inside backup)
TEMP_REPORT_DIR = os.path.join(BACKUP_BASE, "temp_reports")

# Departments
DEPARTMENTS = {"AIDS","AIML","BIOTECH","BME","CCE","CHEMICAL","CIVIL","CSBS","CSE","ECE","EEE","INFOTECH","MECH"}
ALIASES     = {"IT": "INFOTECH"}

# Keep-awake ping seconds (must be < 1 minute)
KEEP_AWAKE_PING_SEC = 30
# How often to run WA reconnect check
RECONNECT_CHECK_SEC = 15

# network watcher settings
NETWORK_CHECK_INTERVAL = 5.0           # seconds between connectivity checks
NETWORK_LOST_THRESHOLD_SEC = 15.0      # if consecutive failures exceed this -> treat as lost
NETWORK_TEST_HOST = ("8.8.8.8", 53)    # DNS test

# scheduled restart interval (exactly every 2 hours)
SCHEDULED_RESTART_SEC = 2 * 3600

# ---------------- logging ----------------
logging.basicConfig(filename=LOG_FILE, level=logging.INFO,
                    format="%(asctime)s | %(levelname)s | %(message)s")
console = logging.StreamHandler(); console.setLevel(logging.INFO)
logging.getLogger().addHandler(console)
logger = logging.getLogger("biosync.bot")

# helper to write pause/resume events
def append_pause_resume_log(entry: str):
    try:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"{ts} | {entry}\n"
        with open(PAUSE_RESUME_LOG, "a", encoding="utf-8") as fh:
            fh.write(line)
        logger.info(line.strip())
    except Exception:
        logger.exception("Failed to write pause_resume_log")

# ---------------- Windows keep-awake ----------------
def start_keep_awake_thread(stop_event: threading.Event):
    try:
        import ctypes
        ES_CONTINUOUS       = 0x80000000
        ES_SYSTEM_REQUIRED  = 0x00000001
        SetThreadExecutionState = ctypes.windll.kernel32.SetThreadExecutionState

        def _loop():
            append_pause_resume_log("KEEP_AWAKE_THREAD_STARTED")
            # prime once immediately
            try:
                SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
            except Exception:
                logger.exception("SetThreadExecutionState initial call failed")

            while not stop_event.is_set():
                try:
                    SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
                except Exception:
                    logger.exception("SetThreadExecutionState periodic call failed")
                # wait in short segments so we can exit promptly
                for _ in range(KEEP_AWAKE_PING_SEC):
                    if stop_event.is_set():
                        break
                    time.sleep(1)
            try:
                SetThreadExecutionState(ES_CONTINUOUS)
            except Exception:
                pass
            append_pause_resume_log("KEEP_AWAKE_THREAD_EXITING")

        t = threading.Thread(target=_loop, daemon=True)
        t.start()
        return t
    except Exception:
        logger.exception("Unable to start keep-awake thread (non-Windows or ctypes issue).")
        return None

# ---------------- targeted chromedriver cleanup ----------------
def kill_chromedriver_and_children(timeout=3):
    append_pause_resume_log("KILL_CHROMEDRIVER_AND_CHILDREN")
    logger.info("Looking for chromedriver processes to clean up...")
    try:
        if psutil is None:
            import subprocess
            try:
                subprocess.run(["taskkill", "/F", "/IM", "chromedriver.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                logger.info("Invoked taskkill for chromedriver.exe (psutil not installed).")
            except Exception:
                logger.exception("taskkill fallback failed.")
            return

        chromedrivers = []
        for p in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                name = (p.info.get('name') or "").lower()
                if 'chromedriver' in name:
                    chromedrivers.append(p)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        if not chromedrivers:
            logger.info("No chromedriver processes found.")
            return

        for cd in chromedrivers:
            try:
                pid = cd.pid
                cmd = cd.info.get('cmdline') or []
                logger.info(f"Found chromedriver PID={pid} cmdline={cmd}")
                try:
                    children = cd.children(recursive=True)
                except Exception:
                    children = []
                for c in children:
                    try:
                        cname = (c.name() or "").lower()
                        if any(k in cname for k in ('chrome', 'chromium', 'msedge', 'brave')):
                            logger.info(f" -> terminating child PID={c.pid} name={cname}")
                            try:
                                c.terminate()
                            except Exception:
                                pass
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                try:
                    logger.info(f"Terminating chromedriver PID={pid}")
                    cd.terminate()
                except Exception:
                    logger.exception(f"Failed to terminate chromedriver PID={pid}")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        gone, alive = psutil.wait_procs(chromedrivers, timeout=timeout)
        if alive:
            logger.warning(f"Forcing kill on remaining chromedriver processes: {[p.pid for p in alive]}")
            for p in alive:
                try:
                    p.kill()
                except Exception:
                    pass
        logger.info("Chromedriver cleanup finished.")
    except Exception as e:
        logger.exception("Unexpected error during chromedriver cleanup: %s", e)

def remove_profile_lock_files(profile_dir):
    if not profile_dir:
        return
    logger.info(f"Attempting to remove stale lock files inside profile: {profile_dir}")
    candidates = [profile_dir, os.path.join(profile_dir, "Default")]
    lock_files = ("SingletonLock", "SingletonCookie", "LOCK", "lockfile")
    for base in candidates:
        try:
            if not os.path.isdir(base):
                continue
            for root, dirs, files in os.walk(base):
                for lf in lock_files:
                    if lf in files:
                        path = os.path.join(root, lf)
                        try:
                            os.remove(path)
                            logger.info(f"Removed lock file: {path}")
                        except Exception:
                            logger.debug(f"Could not remove lock file: {path}")
        except Exception as e:
            logger.debug(f"remove_profile_lock_files iteration error for {base}: {e}")

# ---------------- basic helpers ----------------
ROMAN_MAP = {1: "I", 2: "II", 3: "III", 4: "IV"}
ROMAN_TO_NUM = {"I": 1, "II": 2, "III": 3, "IV": 4}
ORDINAL_WORDS = {"first": 1, "second": 2, "third": 3, "fourth": 4,
                 "1st": 1, "2nd": 2, "3rd": 3, "4th": 4}
def normalize_whitespace(s): return re.sub(r"\s+", " ", (s or "")).strip()
def to_roman_small(n): return ROMAN_MAP.get(n, str(n))
def _year_token_to_num(tok):
    if not tok: return None
    t = tok.strip().upper()
    if t in ROMAN_TO_NUM: return t if False else ROMAN_TO_NUM[t]
    if t.lower() in ORDINAL_WORDS: return ORDINAL_WORDS[t.lower()]
    m = re.match(r"^(\d{1,2})", t)
    if m:
        v = int(m.group(1))
        if 1 <= v <= 4: return v
    m2 = re.match(r"^(I{1,4})$", t)
    if m2:
        return ROMAN_TO_NUM.get(m2.group(1), None)
    return None
def build_class_string(year_num, dept_tok, section_tok):
    if not year_num: return None
    roman = to_roman_small(year_num)
    dept = normalize_whitespace(dept_tok).upper() if dept_tok else ""
    sec = (section_tok or "").strip().upper()
    parts = [roman]
    if dept: parts.append(dept)
    if sec: parts.append(sec)
    return " ".join(parts)

# ---------------- parsing helpers (period detection) ----------------
MONTH_NAME_RE = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"

def _remove_date_and_relative_words(txt):
    if not txt: return txt, None
    m_date = re.search(r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})", txt)
    if m_date:
        start, end = m_date.start(1), m_date.end(1)
        left = txt[:start]; right = txt[end:]
        left = re.sub(r"\s*\b(on|dated|date)\b\s*$", " ", left, flags=re.IGNORECASE)
        newtxt = (left + " " + right).strip()
        return newtxt, (start, end)
    new = re.sub(r"\b(today|yesterday)\b", " ", txt, flags=re.IGNORECASE).strip()
    if new != txt:
        return new, (-1, -1)
    return txt, None

def fuzzy_parse_query(text):
    """
    RETURNS: (class_q, date_obj, had_date, invalid_date, period_type, start_date, end_date)
    period_type ∈ {"DAY","WEEK","MONTH"}
    """
    if not text:
        return None, None, False, False, "DAY", None, None
    txt = text.strip(); low = txt.lower()
    if not (any(k in low for k in TRIGGER_KEYWORDS) or low.strip() == "help"):
        return None, None, False, False, "DAY", None, None
    if low.strip() == "help":
        return "HELP_COMMAND", None, False, False, "DAY", None, None

    period_type = "DAY"
    if re.search(r"\bweekly\b|\bweek\b|\blast week\b|\bthis week\b", low):
        period_type = "WEEK"
    elif re.search(r"\bmonthly\b|\bmonth\b|\blast month\b|\bthis month\b", low):
        period_type = "MONTH"

    date_obj = None; had_date = False; invalid_date = False
    m_date = re.search(r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})", txt)
    if m_date:
        raw = m_date.group(1); norm = raw.replace("/", "-")
        try:
            d = dateparser.parse(norm, dayfirst=True, fuzzy=False)
            if d.year < 100: d = d.replace(year=d.year + 2000)
            date_obj = d.date(); had_date = True
        except Exception:
            invalid_date = True; date_obj = None; had_date = False
    elif re.search(r"\btoday\b", low):
        date_obj = datetime.now().date(); had_date = True
    elif re.search(r"\byesterday\b", low):
        date_obj = (datetime.now() - timedelta(days=1)).date(); had_date = True

    txt_no_date, _ = _remove_date_and_relative_words(txt)

    start_date = None; end_date = None
    if period_type == "WEEK":
        end_date = date_obj or datetime.now().date()
        start_date = end_date - timedelta(days=6)
    elif period_type == "MONTH":
        m_month = re.search(MONTH_NAME_RE + r"(?:\s+(\d{4}))?", txt_no_date, flags=re.IGNORECASE)
        if m_month:
            mon_name = m_month.group(1)
            year_match = m_month.group(2)
            try:
                mon_num = datetime.strptime(mon_name[:3], "%b").month
            except Exception:
                mon_num = datetime.now().month
            try:
                year_val = int(year_match) if year_match else datetime.now().year
            except Exception:
                year_val = datetime.now().year
            start_date = date(year_val, mon_num, 1)
            last_day = calendar.monthrange(year_val, mon_num)[1]
            end_date = date(year_val, mon_num, last_day)
        else:
            if date_obj:
                ref = date_obj
                start_date = date(ref.year, ref.month, 1)
                last_day = calendar.monthrange(ref.year, ref.month)[1]
                end_date = date(ref.year, ref.month, last_day)
            else:
                now = datetime.now().date()
                start_date = date(now.year, now.month, 1)
                last_day = calendar.monthrange(now.year, now.month)[1]
                end_date = date(now.year, now.month, last_day)

    # handle "all departments"
    if re.search(r"\ball\s+departments\b", low) or re.search(r"\ball\s+depts?\b", low):
        return "? ALL", date_obj, had_date, invalid_date, period_type, start_date, end_date
    m_all = re.search(r"\ball\s+([a-z]{2,12})\b", low)
    if m_all and not re.search(r"\ball\s+departments\b", low):
        dept_tok = m_all.group(1).strip().upper()
        return ("? " + dept_tok), date_obj, had_date, invalid_date, period_type, start_date, end_date

    up = txt_no_date.upper()
    m1 = re.search(r"report\s+for\s+([IVXLCDM]+|\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth)\s+([A-Z][A-Z0-9&\-\s]{1,40}\b)\s*([A-Z])?", up, flags=re.IGNORECASE)
    if m1:
        year_tok = m1.group(1); dept_tok = m1.group(2).strip(); section_tok = m1.group(3)
        year_num = _year_token_to_num(year_tok)
        if year_num: return build_class_string(year_num, dept_tok, section_tok), date_obj, had_date, invalid_date, period_type, start_date, end_date

    m2 = re.search(r"(\b(?:I{1,4}|\d{1,2})(?:st|nd|rd|th)?|first|second|third|fourth)\s+([A-Z][A-Z0-9&\-\s]{1,40})\s*([A-Z])?", up, flags=re.IGNORECASE)
    if m2:
        rep_idx = up.find("REPORT"); match_idx = m2.start()
        if rep_idx == -1 or abs(match_idx - rep_idx) < 100:
            year_tok = m2.group(1); dept_tok = m2.group(2).strip(); section_tok = m2.group(3)
            year_num = _year_token_to_num(year_tok)
            if year_num: return build_class_string(year_num, dept_tok, section_tok), date_obj, had_date, invalid_date, period_type, start_date, end_date

    m4 = re.search(r"for\s+(.+?)(?:\s+on\b|\s+in\b|\s+dated\b|\s+date\b|$)", txt_no_date, flags=re.IGNORECASE)
    if m4:
        cand = m4.group(1).strip()
        tokens = re.split(r"[\s,]+", cand)
        for i, t in enumerate(tokens):
            maybe = _year_token_to_num(t)
            if maybe:
                dept_tokens = tokens[i+1:]
                if dept_tokens:
                    sec_tok = None
                    if re.match(r"^[A-Za-z]$", dept_tokens[-1]):
                        sec_tok = dept_tokens[-1].upper(); dept_tokens = dept_tokens[:-1]
                    dept_tok = " ".join(dt.upper() for dt in dept_tokens)
                    return build_class_string(maybe, dept_tok, sec_tok), date_obj, had_date, invalid_date, period_type, start_date, end_date
        upcand = cand.upper()
        dept_match = re.search(r"([A-Z][A-Z0-9\-\s&]{1,20})(?:\s+([A-Z]))?", upcand)
        if dept_match:
            dept_tok = dept_match.group(1).strip(); section_tok = dept_match.group(2)
            return ("? " + dept_tok + ((" " + section_tok) if section_tok else "")).strip(), date_obj, had_date, invalid_date, period_type, start_date, end_date

    dept_like = re.search(r"\b([A-Z]{2,8})\b", up)
    if dept_like:
        dept_tok = dept_like.group(1).strip()
        return ("? " + dept_tok).strip(), date_obj, had_date, invalid_date, period_type, start_date, end_date

    return None, date_obj, had_date, invalid_date, period_type, start_date, end_date

# ---------------- file reading + extraction ----------------
SUMMARY_MARKERS = [
    r"OVERALL ATTENDANCE SUMMARY", r"TOTAL PRESENT", r"TOTAL NOT PRESENT",
    r"AUTO-GENERATED FROM BIOMETRIC", r"AUTO-GENERATED", r"OFFLINE DEPARTMENTS",
]
def contains_summary_marker(line):
    up = (line or "").upper()
    for m in SUMMARY_MARKERS:
        if m in up: return True
    return False

def split_blocks_by_department(file_text):
    if not file_text: return [], None
    lines = file_text.splitlines()
    summary_idx = None
    for i, ln in enumerate(lines):
        if contains_summary_marker(ln):
            summary_idx = i
            break
    end_limit = summary_idx if summary_idx is not None else len(lines)
    header_indices = []
    for i in range(0, end_limit):
        if re.search(r"\bdepartment\b", lines[i], flags=re.IGNORECASE):
            header_indices.append(i)
    blocks = []
    if not header_indices:
        body = "\n".join(lines[:end_limit]).strip()
        summary_blob = "\n".join(lines[summary_idx:]).strip() if summary_idx is not None else None
        if body: blocks.append(body)
        return blocks, summary_blob
    for idx, start in enumerate(header_indices):
        end = header_indices[idx+1] if idx+1 < len(header_indices) else end_limit
        blk = "\n".join(lines[start:end]).strip()
        blocks.append(blk)
    summary_blob = "\n".join(lines[summary_idx:]).strip() if summary_idx is not None else None
    return blocks, summary_blob

def canonicalize_for_matching(s):
    if not s: return ""
    t = re.sub(r"[^\w\s]", " ", s)
    t = t.upper()
    for a, canon in ALIASES.items():
        t = re.sub(rf"\b{re.escape(a.upper())}\b", canon.upper(), t)
    t = re.sub(r"\bDEPARTMENT\b", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"\bDEPT\b", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"\bDEPTS\b", " ", t, flags=re.IGNORECASE)
    t = re.sub(r"\s+", " ", t).strip()
    return t.upper()

def extract_overall_summary(file_text): return (file_text or "").strip()

def _trim_trailing_summary_lines(block_text):
    lines = block_text.splitlines()
    for i, ln in enumerate(lines):
        if contains_summary_marker(ln):
            return "\n".join(lines[:i]).strip()
    while lines and re.search(r"auto-?generated", lines[-1], flags=re.IGNORECASE):
        lines.pop()
    return "\n".join(lines).strip()

def extract_class_block(file_text, class_query):
    if not file_text or not class_query: return None
    if isinstance(class_query, str) and class_query.startswith("?"):
        token = class_query[1:].strip().upper()
        token_norm = ALIASES.get(token, token)
        if token_norm == "ALL":
            return extract_overall_summary(file_text)
        blocks, _ = split_blocks_by_department(file_text)
        if not blocks:
            upf = file_text.upper()
            if token_norm in upf:
                idx = upf.find(token_norm)
                start = max(0, idx - 300); end = min(len(file_text), idx + 400)
                return file_text[start:end].strip()
            return None
        qcanon = canonicalize_for_matching(token_norm)
        matched = []
        for b in blocks:
            head = b.splitlines()[0] if b.splitlines() else ""
            head_c = canonicalize_for_matching(head); body_c = canonicalize_for_matching(b)
            if qcanon and (qcanon in head_c or qcanon in body_c):
                b_trim = re.split(r"(AUTO-GENERATED|AUTO GENERATED|AUTO-GENERATED FROM BIOMETRIC)", b, flags=re.IGNORECASE)[0].strip()
                matched.append(b_trim)
        if matched: return "\n\n".join(matched)
        return None
    blocks, _ = split_blocks_by_department(file_text)
    qcanon = canonicalize_for_matching(class_query)
    for b in blocks:
        header = b.splitlines()[0] if b.splitlines() else ""
        head_c = canonicalize_for_matching(header)
        if qcanon and qcanon in head_c:
            return _trim_trailing_summary_lines(b)
    for b in blocks:
        body_c = canonicalize_for_matching(b)
        if qcanon and qcanon in body_c:
            return _trim_trailing_summary_lines(b)
    whole_canon = canonicalize_for_matching(file_text)
    if qcanon and qcanon in whole_canon:
        pos = whole_canon.find(qcanon)
        if pos != -1:
            orig_upper = file_text.upper()
            pos2 = orig_upper.find(qcanon)
            if pos2 != -1:
                start = max(0, pos2 - 300); end = min(len(file_text), pos2 + 500)
                snippet = file_text[start:end].strip()
                return _trim_trailing_summary_lines(snippet)
    return None

# ---------------- cache ----------------
_file_cache = {}
_file_cache_lock = threading.Lock()
def _cache_get(date_key):
    with _file_cache_lock:
        ent = _file_cache.get(date_key)
        if not ent: return None
        content, ts = ent
        if (time.time() - ts) > FILE_CACHE_TTL_SECONDS:
            del _file_cache[date_key]; return None
        return content
def _cache_put(date_key, content):
    with _file_cache_lock:
        if len(_file_cache) >= FILE_CACHE_MAX_ITEMS:
            oldest = min(_file_cache.items(), key=lambda kv: kv[1][1])[0]
            del _file_cache[oldest]
        _file_cache[date_key] = (content, time.time())

# ---------------- request / response queues + worker pool ----------------
request_queue = queue.Queue(maxsize=REQUEST_QUEUE_MAX)
response_queue = queue.Queue()

def chunk_message(msg, max_len=MAX_MESSAGE_CHUNK):
    """
    Generic chunker (breaks into many chunks if needed). Kept for fallback usage.
    """
    if not msg:
        return [msg]
    if len(msg) <= max_len:
        return [msg]
    parts = [p.strip() for p in re.split(r'\n\s*\n', msg) if p.strip()]
    chunks = []
    cur = ""
    sep = "\n\n"
    for p in parts:
        piece = (p if not cur else sep + p)
        if len(cur) + len(piece) <= max_len:
            cur = (cur + piece).strip()
        else:
            if cur:
                chunks.append(cur)
            if len(p) > max_len:
                lines = p.splitlines(True)
                sub = ""
                for ln in lines:
                    if len(sub) + len(ln) > max_len:
                        if sub:
                            chunks.append(sub.rstrip())
                            sub = ""
                    sub += ln
                if sub:
                    if len(sub) <= max_len:
                        chunks.append(sub.rstrip())
                    else:
                        for i in range(0, len(sub), max_len):
                            chunks.append(sub[i:i+max_len])
                cur = ""
            else:
                cur = p
    if cur:
        chunks.append(cur)
    final = []
    for c in chunks:
        if len(c) <= max_len:
            final.append(c)
        else:
            for i in range(0, len(c), max_len):
                final.append(c[i:i+max_len])
    return final

def split_into_two_messages(text, label="Report", max_len=MAX_MESSAGE_CHUNK):
    """
    Split text into exactly two text messages near the half boundary (clean newline preferred).
    Use when text > max_len. Returns list of 1 or 2 strings.
    """
    if not text:
        return [text]
    if len(text) <= max_len:
        return [text]

    mid = len(text) // 2

    # try to find a newline near midpoint (preferably before)
    before = text.rfind("\n\n", 0, mid)
    if before == -1:
        before = text.rfind("\n", 0, mid)
    after = text.find("\n\n", mid)
    if after == -1:
        after = text.find("\n", mid)

    split_idx = None
    candidates = [idx for idx in (before, after) if idx and idx > 0]
    # prefer a split that results in both parts <= max_len
    for idx in candidates:
        a = text[:idx].strip()
        b = text[idx:].strip()
        if len(a) <= max_len and len(b) <= max_len:
            split_idx = idx
            break
    if split_idx is None:
        # fallback: choose the candidate that makes the larger part as small as possible
        best = None
        best_maxlen = None
        for idx in candidates:
            a = text[:idx].strip()
            b = text[idx:].strip()
            cur_max = max(len(a), len(b))
            if best is None or cur_max < best_maxlen:
                best = idx; best_maxlen = cur_max
        if best:
            split_idx = best
        else:
            # very long contiguous text with no newlines: split at midpoint but ensure parts <= max_len if possible
            # if midpoint yields too-large halves, use chunk_message fallback
            if mid <= max_len:
                split_idx = mid
            else:
                chs = chunk_message(text, max_len=max_len)
                if len(chs) == 1:
                    return chs
                mid_ch = len(chs) // 2
                merged1 = "\n\n".join(chs[:mid_ch]).strip()
                merged2 = "\n\n".join(chs[mid_ch:]).strip()
                return [
                    f"📋 {label} (Part 1/2)\n\n{merged1}",
                    f"📋 {label} (Part 2/2)\n\n{merged2}",
                ]

    part1 = text[:split_idx].strip()
    part2 = text[split_idx:].strip()

    # If still either part > max_len, use chunk_message fallback and merge into two parts
    if len(part1) > max_len or len(part2) > max_len:
        chs = chunk_message(text, max_len=max_len)
        if len(chs) == 1:
            return chs
        mid_ch = len(chs) // 2
        merged1 = "\n\n".join(chs[:mid_ch]).strip()
        merged2 = "\n\n".join(chs[mid_ch:]).strip()
        return [
            f"📋 {label} (Part 1/2)\n\n{merged1}",
            f"📋 {label} (Part 2/2)\n\n{merged2}",
        ]

    return [
        f"📋 {label} (Part 1/2)\n\n{part1}",
        f"📋 {label} (Part 2/2)\n\n{part2}",
    ]

# ---------------- filename sanitization helper ----------------
def sanitize_filename(name: str) -> str:
    if not name: return "file"
    return re.sub(r'[<>:"/\\|?*\n\r\t]+', '_', name)

def ensure_temp_dir():
    try:
        os.makedirs(TEMP_REPORT_DIR, exist_ok=True)
    except Exception:
        pass

def write_temp_report(job_id, start_date, end_date, content_text):
    # kept for backward compat if needed elsewhere; but we won't send files by default
    ensure_temp_dir()
    try:
        start_s = start_date.strftime('%d%m%Y') if isinstance(start_date, (date, datetime)) else "start"
        end_s   = end_date.strftime('%d%m%Y') if isinstance(end_date, (date, datetime)) else "end"
    except Exception:
        start_s = "start"; end_s = "end"
    raw_fname  = f"report_{job_id}_{start_s}_{end_s}_{uuid.uuid4().hex[:8]}.txt"
    safe_fname = sanitize_filename(raw_fname)
    path = os.path.join(TEMP_REPORT_DIR, safe_fname)
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content_text)
        logger.info(f"Wrote temp report: {path}")
        return path
    except Exception:
        logger.exception(f"Failed to write temp report file {path}")
        return None

# ---------------- worker loop ----------------
def worker_loop(worker_id):
    logger.info(f"Worker {worker_id} started")
    while True:
        try:
            job = request_queue.get()
            if job is None:
                logger.info(f"Worker {worker_id} exiting")
                break
            if len(job) == 5:
                job_id, requester, class_q, date_obj, orig_text = job
                period_type, start_date, end_date = "DAY", None, None
            else:
                job_id, requester, class_q, date_obj, orig_text, period_type, start_date, end_date = job

            logger.info(f"Worker {worker_id} processing job {job_id} (period={period_type} range={start_date}..{end_date})")
            date_key = date_obj.strftime("%d-%m-%Y") if date_obj else None

            if period_type == "DAY":
                content = None
                if date_key:
                    content = _cache_get(date_key)
                    if content is None:
                        fname = date_key + ".txt"
                        found = None
                        for root, dirs, files in os.walk(BACKUP_BASE):
                            if fname in files:
                                found = os.path.join(root, fname); break
                        if found:
                            try:
                                with open(found, "r", encoding="utf-8", errors="ignore") as fh:
                                    content = fh.read()
                                    _cache_put(date_key, content)
                            except Exception as e:
                                content = None
                                logger.exception(f"Worker {worker_id} failed read file {found}: {e}")
                        else:
                            content = None
                if not content:
                    resp = f"🚫 No backup found for {date_key}."
                    # split into 1 or 2 messages as needed
                    chunks = split_into_two_messages(resp, label=f"No backup {date_key}", max_len=MAX_MESSAGE_CHUNK)
                    for ch in chunks:
                        response_queue.put((job_id, requester, ch))
                    request_queue.task_done()
                    continue
                else:
                    try:
                        block = extract_class_block(content, class_q)
                        if block:
                            # If block fits in one message -> send single, else split into two
                            if len(block) <= MAX_MESSAGE_CHUNK:
                                response_queue.put((job_id, requester, block))
                            else:
                                parts = split_into_two_messages(block, label=f"Attendance {date_key}", max_len=MAX_MESSAGE_CHUNK)
                                for p in parts:
                                    response_queue.put((job_id, requester, p))
                            request_queue.task_done()
                            continue
                        else:
                            if isinstance(class_q, str) and class_q.startswith("?"):
                                token = class_q[1:].strip()
                                normalized_token = ALIASES.get(token.upper(), token.upper())
                                if normalized_token.upper() == "ALL":
                                    resp = "🚫 Backup file exists but no extractable content for 'all departments' was found."
                                else:
                                    resp = f"🚫 No classes found for department '{normalized_token}' on {date_key}."
                            else:
                                resp = f"🚫 No attendance record found for '{class_q}' on {date_key}."
                            chunks = split_into_two_messages(resp, label=f"No record {date_key}", max_len=MAX_MESSAGE_CHUNK)
                            for ch in chunks:
                                response_queue.put((job_id, requester, ch))
                            request_queue.task_done()
                            continue
                    except Exception as e:
                        logger.exception(f"Worker {worker_id} extraction failed: {e}")
                        resp = "⚠️ Failed to extract data from backup. Contact admin."
                        chunks = split_into_two_messages(resp, label="Error", max_len=MAX_MESSAGE_CHUNK)
                        for ch in chunks:
                            response_queue.put((job_id, requester, ch))
                        request_queue.task_done()
                        continue

            # WEEK/MONTH range processing -> SEND AS TEXT ONLY (split into exactly two if oversized)
            if not start_date or not end_date:
                response_queue.put((job_id, requester, "⚠️ Invalid date range for weekly/monthly report."))
                request_queue.task_done()
                continue

            parts = []
            cur = start_date
            any_found = False
            while cur <= end_date:
                fname = cur.strftime("%d-%m-%Y") + ".txt"
                found_path = None
                for root, dirs, files in os.walk(BACKUP_BASE):
                    if fname in files:
                        found_path = os.path.join(root, fname)
                        break
                if not found_path:
                    parts.append(f"--- {cur.strftime('%d-%m-%Y')} ---\nNo backup for {cur.strftime('%d-%m-%Y')}\n")
                else:
                    any_found = True
                    try:
                        with open(found_path, "r", encoding="utf-8", errors="ignore") as fh:
                            content = fh.read()
                            block = extract_class_block(content, class_q)
                            if block:
                                parts.append(f"--- {cur.strftime('%d-%m-%Y')} ---\n{block}\n")
                            else:
                                parts.append(f"--- {cur.strftime('%d-%m-%Y')} ---\nNo attendance record found for requested class/department on this date.\n")
                    except Exception as e:
                        logger.exception(f"Worker {worker_id} failed reading {found_path}: {e}")
                        parts.append(f"--- {cur.strftime('%d-%m-%Y')} ---\nFailed to read backup for this date.\n")
                cur = cur + timedelta(days=1)

            hdr = f"📋 {period_type} report for request: {orig_text}\nRange: {start_date.strftime('%d-%m-%Y')} to {end_date.strftime('%d-%m-%Y')}\n\n"
            final_report = hdr + "\n".join(parts)

            if not any_found:
                response_queue.put((job_id, requester, f"🚫 No backup files found for the given {period_type.lower()} range."))
                request_queue.task_done()
                continue

            # If final_report fits in a single WhatsApp message -> send text.
            # Otherwise split into exactly TWO text messages and enqueue.
            if len(final_report) <= MAX_MESSAGE_CHUNK:
                response_queue.put((job_id, requester, final_report))
            else:
                two_msgs = split_into_two_messages(final_report, label=f"{period_type} report", max_len=MAX_MESSAGE_CHUNK)
                for m in two_msgs:
                    response_queue.put((job_id, requester, m))

            request_queue.task_done()

        except Exception as e:
            logger.exception(f"Worker loop error: {e}")

# ---------------- Selenium helpers ----------------
def ensure_profile_dir(profile_dir):
    try:
        if not profile_dir: return
        os.makedirs(profile_dir, exist_ok=True)
        default_dir = os.path.join(profile_dir, "Default")
        os.makedirs(default_dir, exist_ok=True)
    except Exception as e:
        logger.debug(f"ensure_profile_dir error: {e}")

def setup_driver(retry_on_lock=True):
    # cleanup leftover drivers first
    kill_chromedriver_and_children()
    ensure_profile_dir(USER_DATA_DIR)

    options = webdriver.ChromeOptions()
    options.add_argument(f"--user-data-dir={USER_DATA_DIR}")
    # Flags to minimize background throttling when display is off / window occluded
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-backgrounding-occluded-windows")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-features=CalculateNativeWinOcclusion")
    options.add_experimental_option("detach", True)

    service = Service(CHROME_DRIVER_PATH)

    try:
        append_pause_resume_log(f"DRIVER_STARTING user-data-dir={USER_DATA_DIR}")
        logger.info(f"Launching ChromeDriver (user-data-dir={USER_DATA_DIR})")
        drv = webdriver.Chrome(service=service, options=options)
        try: drv.maximize_window()
        except Exception: pass
        append_pause_resume_log("DRIVER_STARTED")
        logger.info("ChromeDriver launched successfully.")
        return drv
    except Exception as e:
        msg = str(e).lower()
        logger.exception(f"Primary webdriver launch failed: {e}")
        if retry_on_lock and ("processsingleton" in msg or "lock file" in msg or "lock" in msg):
            logger.info("Detected possible lock error. Removing lock files and retrying.")
            remove_profile_lock_files(USER_DATA_DIR)
            time.sleep(1.0)
            # second attempt
            drv = webdriver.Chrome(service=service, options=options)
            try: drv.maximize_window()
            except Exception: pass
            append_pause_resume_log("DRIVER_STARTED_AFTER_LOCKCLEAN")
            logger.info("ChromeDriver launch succeeded after removing locks.")
            return drv
        raise

def is_driver_alive(driver):
    try:
        if driver is None: return False
        if not getattr(driver, "session_id", None): return False
        _ = driver.current_url
        return True
    except (InvalidSessionIdException, WebDriverException):
        return False
    except Exception:
        return False

def _wa_wait_sidebar(driver, timeout):
    WebDriverWait(driver, timeout).until(
        lambda d: len(d.find_elements(By.TAG_NAME, "body")) > 0 and (
            len(d.find_elements(By.CSS_SELECTOR, "div[title], span[title], div[contenteditable='true']")) > 0
        )
    )

def _wa_is_chat_open(driver, chat_name=None):
    try:
        composer_ok = False
        composers = driver.find_elements(By.CSS_SELECTOR, "footer div[contenteditable='true'], div[contenteditable='true'][role='textbox']")
        for c in composers:
            try:
                if c.is_displayed() and c.is_enabled() and c.rect.get("x", 0) > 250:
                    composer_ok = True
                    break
            except Exception:
                continue
        if not composer_ok:
            return False

        if not chat_name:
            return True

        title_candidates = driver.find_elements(By.CSS_SELECTOR, "header span[title], header div[title]")
        for el in title_candidates:
            try:
                t = (el.get_attribute("title") or el.text or "").strip()
                if t and t.lower() == chat_name.lower():
                    return True
            except Exception:
                continue

        # Composer present is already a good signal
        return True
    except Exception:
        return False

def _wa_click_element(driver, el):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'nearest'});", el)
    except Exception:
        pass
    try:
        el.click()
        return True
    except Exception:
        try:
            driver.execute_script("arguments[0].click();", el)
            return True
        except Exception:
            return False

def _wa_find_direct_chat_row(driver, chat_name):
    """
    First try direct click from chat list.
    This avoids search completely when the chat is already visible in the sidebar.
    """
    lower_name = (chat_name or "").strip().lower()
    if not lower_name:
        return None

    # title-based lookup
    candidates = driver.find_elements(By.CSS_SELECTOR, "span[title], div[title]")
    for el in candidates:
        try:
            t = (el.get_attribute("title") or "").strip()
            if t and t.lower() == lower_name and el.is_displayed():
                return el
        except Exception:
            continue

    # visible text fallback
    xpath = f"//*[normalize-space()='{chat_name}']"
    try:
        elems = driver.find_elements(By.XPATH, xpath)
        for el in elems:
            try:
                if el.is_displayed() and el.rect.get("x", 9999) < 800:
                    return el
            except Exception:
                continue
    except Exception:
        pass

    return None

def _wa_find_search_trigger(driver):
    """
    Find the left-side search container or actual editable search box.
    """
    # 1) Any visible left-side textbox/editable
    for el in driver.find_elements(By.CSS_SELECTOR, "div[contenteditable='true'], div[role='textbox'], input"):
        try:
            if el.is_displayed() and el.is_enabled() and el.rect.get("x", 9999) < 700:
                return el
        except Exception:
            continue

    # 2) Placeholder text container
    xpaths = [
        "//*[contains(normalize-space(), 'Search or start a new chat')]",
        "//*[contains(normalize-space(), 'Search chats')]",
        "//*[contains(normalize-space(), 'Search')]",
    ]
    for xp in xpaths:
        try:
            elems = driver.find_elements(By.XPATH, xp)
            for el in elems:
                try:
                    if el.is_displayed() and el.rect.get("x", 9999) < 700:
                        return el
                except Exception:
                    continue
        except Exception:
            continue

    # 3) aria-label/title
    for el in driver.find_elements(By.CSS_SELECTOR, "[aria-label], [title]"):
        try:
            blob = " ".join([
                el.get_attribute("aria-label") or "",
                el.get_attribute("title") or "",
                el.text or "",
            ]).lower()
            if "search" in blob and el.is_displayed() and el.rect.get("x", 9999) < 700:
                return el
        except Exception:
            continue

    return None

def _wa_find_left_active_editable(driver):
    for el in driver.find_elements(By.CSS_SELECTOR, "div[contenteditable='true'], input, div[role='textbox']"):
        try:
            if el.is_displayed() and el.is_enabled() and el.rect.get("x", 9999) < 700:
                return el
        except Exception:
            continue
    return None

def _wa_clear_search_box(el):
    try:
        el.send_keys(Keys.CONTROL, "a")
        time.sleep(0.1)
        el.send_keys(Keys.DELETE)
        time.sleep(0.1)
        el.send_keys(Keys.CONTROL, "a")
        time.sleep(0.05)
        el.send_keys(Keys.BACKSPACE)
        time.sleep(0.1)
    except Exception:
        pass

def open_whatsapp_and_select_chat(driver, chat_name):
    """
    Stable navigation engine.

    Key fixes:
    - DOES NOT reload WhatsApp if already open
    - First tries direct click on visible chat row
    - Uses search only if needed
    - Verifies that chat actually opened
    - Avoids fragile absolute XPaths
    """
    if not is_driver_alive(driver):
        raise RuntimeError("Driver is not alive")

    # Only open WhatsApp if not already there.
    try:
        cur = (driver.current_url or "").lower()
    except Exception:
        cur = ""
    if "web.whatsapp.com" not in cur:
        logger.info("Opening WhatsApp Web")
        driver.get("https://web.whatsapp.com")
        _wa_wait_sidebar(driver, MAX_WAIT_WHATSAPP)
        time.sleep(2.0)
    else:
        logger.info("WhatsApp already open - not reloading")
        _wa_wait_sidebar(driver, min(12, MAX_WAIT_WHATSAPP))
        time.sleep(0.8)

    # If already in target chat, return immediately
    if _wa_is_chat_open(driver, chat_name):
        logger.info("Target chat already open")
        return True

    for attempt in range(1, 7):
        try:
            logger.info(f"Selecting chat '{chat_name}' attempt {attempt}/6")

            # STEP 1: direct click if chat is already visible in sidebar
            direct = _wa_find_direct_chat_row(driver, chat_name)
            if direct is not None:
                logger.info("Found target chat directly in sidebar")
                if _wa_click_element(driver, direct):
                    time.sleep(1.0)
                    if _wa_is_chat_open(driver, chat_name):
                        logger.info("Chat opened by direct sidebar click")
                        return True

            # STEP 2: open/focus search trigger
            search_trigger = _wa_find_search_trigger(driver)
            if search_trigger is None:
                raise RuntimeError("Search trigger not found")

            if not _wa_click_element(driver, search_trigger):
                try:
                    ActionChains(driver).move_to_element(search_trigger).click().perform()
                except Exception:
                    raise RuntimeError("Failed to click search trigger")

            time.sleep(0.5)

            # STEP 3: get actual editable box on left
            search_box = _wa_find_left_active_editable(driver)
            if search_box is None:
                # one more click on the trigger often activates it
                _wa_click_element(driver, search_trigger)
                time.sleep(0.4)
                search_box = _wa_find_left_active_editable(driver)

            if search_box is None:
                raise RuntimeError("Search input not activated")

            # STEP 4: clear + type
            _wa_clear_search_box(search_box)
            try:
                search_box.send_keys(chat_name)
            except Exception:
                driver.execute_script("""
                    const el = arguments[0], val = arguments[1];
                    if (el && el.isContentEditable) {
                        el.textContent = '';
                        el.focus();
                        document.execCommand('insertText', false, val);
                        el.dispatchEvent(new Event('input', {bubbles:true}));
                    } else if (el) {
                        el.value = '';
                        el.focus();
                        el.value = val;
                        el.dispatchEvent(new Event('input', {bubbles:true}));
                    }
                """, search_box, chat_name)
            time.sleep(1.8)

            # STEP 5: try clicking exact matched row from results
            result = _wa_find_direct_chat_row(driver, chat_name)
            if result is not None:
                logger.info("Found target chat in search results")
                if _wa_click_element(driver, result):
                    time.sleep(1.0)
                    if _wa_is_chat_open(driver, chat_name):
                        logger.info("Chat opened by clicking search result")
                        return True

            # STEP 6: fallback enter on search input
            try:
                search_box.send_keys(Keys.ENTER)
            except Exception:
                active = driver.switch_to.active_element
                active.send_keys(Keys.ENTER)
            time.sleep(1.5)

            if _wa_is_chat_open(driver, chat_name):
                logger.info("Chat opened by ENTER fallback")
                return True

            raise RuntimeError("Chat did not open after search")

        except (StaleElementReferenceException, TimeoutException, RuntimeError) as e:
            logger.warning(f"open_whatsapp_and_select_chat retry {attempt} failed: {e}")
            try:
                ActionChains(driver).send_keys(Keys.ESCAPE).perform()
            except Exception:
                pass
            time.sleep(1.0)

    raise RuntimeError(f"Failed to open chat '{chat_name}' after retries")

def get_last_msg_tuple(driver):
    try:
        if not is_driver_alive(driver):
            raise InvalidSessionIdException("Driver session not alive.")
        elems = driver.find_elements(By.XPATH, "//div[@id='main']//div[@data-pre-plain-text]")
        if not elems: return None, None, ""
        last = elems[-1]
        pre = last.get_attribute("data-pre-plain-text") or ""
        text = last.text or ""
        unique = (pre + "||" + text).strip()
        sender = ""
        if "]" in pre:
            sender = pre.split("]")[-1].strip().strip(":").strip()
        return unique, sender, text.strip()
    except (InvalidSessionIdException, WebDriverException) as e:
        logger.exception(f"Error getting last message: {e}")
        raise

def send_text_in_chat(driver, message):
    try:
        if not is_driver_alive(driver):
            raise InvalidSessionIdException("Driver session not alive before sending text.")
        # use clipboard paste if available to avoid Selenium typing slowness for very long text
        box = driver.find_element(By.XPATH, "//footer//div[@contenteditable='true']")
        box.click(); time.sleep(0.12)
        if pyperclip:
            pyperclip.copy(message)
            box.send_keys(Keys.CONTROL, "v"); time.sleep(0.12)
        else:
            # fallback: direct send (may be slower)
            box.send_keys(message)
            time.sleep(0.12)
        box.send_keys(Keys.ENTER)
        logger.info(f"Sent message len={len(message)} (text).")
    except (InvalidSessionIdException, WebDriverException):
        logger.exception("Failed to send message.")
        raise

# ---------------- robust file-sender (kept but not used for weekly/monthly) ----------------
def send_file_in_chat(driver, filepath, caption=None):
    """
    This function remains to support any legacy places that might call it,
    but we WILL NOT use it for oversized reports. If used, we'll attempt attach,
    but higher-level logic no longer enqueues files for weekly/monthly/day.
    """
    try:
        if not filepath or not os.path.isfile(filepath):
            logger.error(f"send_file_in_chat: file not found: {filepath}"); return False
        try:
            sz = os.path.getsize(filepath)
            if sz == 0:
                logger.error(f"send_file_in_chat: file is empty: {filepath}")
                return False
        except Exception:
            sz = None

        if not is_driver_alive(driver):
            logger.error("send_file_in_chat: driver not alive before attach")
            raise InvalidSessionIdException("driver not alive")

        logger.info(f"send_file_in_chat: attempting to attach {filepath} (size={sz if sz is not None else 'unknown'} bytes)")

        clip_xpaths = [
            "//span[@data-icon='clip']",
            "//div[@title='Attach']",
            "//button[@title='Attach']",
            "//div[@data-icon='clip']",
            "//div[contains(@aria-label,'Attach')]",
        ]
        for xp in clip_xpaths:
            try:
                el = WebDriverWait(driver, 2).until(EC.element_to_be_clickable((By.XPATH, xp)))
                driver.execute_script("arguments[0].scrollIntoView(true);", el)
                el.click(); time.sleep(0.2)
                break
            except Exception:
                continue

        file_input = None
        input_candidates = [
            "//div[@role='dialog']//input[@type='file']",
            "//input[@type='file' and @accept]",
            "//input[@type='file']",
            "//div[contains(@class,'_2zCfw')]//input[@type='file']"
        ]
        for sel in input_candidates:
            try:
                file_input = WebDriverWait(driver, 6).until(EC.presence_of_element_located((By.XPATH, sel)))
                if file_input: break
            except Exception:
                file_input = None
        if file_input is None:
            try:
                file_input = WebDriverWait(driver, 4).until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']")))
            except Exception:
                logger.error("send_file_in_chat: file input element not found."); return False

        file_input.send_keys(filepath)
        logger.info("send_file_in_chat: file path sent to input element.")

        try:
            WebDriverWait(driver, 8).until(
                lambda d: d.find_elements(By.XPATH, "//div[contains(@class,'preview')]") or
                          d.find_elements(By.XPATH, "//span[@data-icon='send']") or
                          d.find_elements(By.XPATH, "//button[@data-testid='compose-btn-send']")
            )
        except TimeoutException:
            logger.debug("send_file_in_chat: preview/send control NOT detected within wait.")

        sent = False
        for sx in [
            "//span[@data-icon='send']",
            "//button[@data-testid='compose-btn-send']",
            "//div[@role='button' and @data-testid='send']",
            "//button[contains(@aria-label,'Send')]",
            "//div[contains(@data-testid,'send') and @role='button']",
            "//button[contains(@class,'_3M-N-')]"
        ]:
            try:
                btn = WebDriverWait(driver, 4).until(EC.element_to_be_clickable((By.XPATH, sx)))
                driver.execute_script("arguments[0].scrollIntoView(true);", btn)
                btn.click(); sent = True; break
            except Exception:
                continue

        if not sent:
            try:
                caption_selectors = [
                    "//div[@contenteditable='true' and @data-tab='10']",
                    "//div[@contenteditable='true' and @data-testid='entry']",
                    "//div[@contenteditable='true']"
                ]
                for cs in caption_selectors:
                    try:
                        cap = driver.find_element(By.XPATH, cs)
                        if cap:
                            cap.click(); time.sleep(0.08)
                            if caption:
                                if pyperclip: pyperclip.copy(caption); cap.send_keys(Keys.CONTROL, "v")
                                else: cap.send_keys(caption)
                            cap.send_keys(Keys.ENTER); sent = True; break
                    except Exception:
                        pass
                if not sent:
                    try:
                        active = driver.switch_to.active_element
                        active.send_keys(Keys.ENTER); time.sleep(0.2); sent = True
                    except Exception:
                        pass
            except Exception:
                logger.exception("send_file_in_chat: caption/ENTER fallback failed.")

        if not sent:
            try:
                buttons = driver.find_elements(By.XPATH, "//button")
                for btn in reversed(buttons[-12:]):
                    try:
                        if btn.is_displayed() and btn.is_enabled():
                            btn.click(); sent = True; break
                    except Exception:
                        continue
            except Exception:
                pass

        time.sleep(1.2)
        if sent:
            logger.info("send_file_in_chat: send attempt reported True.")
            return True
        logger.error("send_file_in_chat: all attempts exhausted.")
        return False

    except InvalidSessionIdException:
        logger.exception("send_file_in_chat: InvalidSessionIdException (driver dead).")
        return False
    except Exception as e:
        logger.exception(f"send_file_in_chat: unexpected exception: {e}")
        return False

def send_and_mark(driver, message, processed_outgoing, wait_after=0.2):
    send_text_in_chat(driver, message)
    time.sleep(wait_after)
    try:
        uid_after, _, _ = get_last_msg_tuple(driver)
        if uid_after:
            processed_outgoing.add(uid_after)
            logger.info(f"Marked outgoing UID as processed: {uid_after}")
    except Exception:
        logger.exception("Failed to mark outgoing UID after send.")

# ---------------- WhatsApp reconnect watchdog ----------------
def whatsapp_is_connected(driver) -> bool:
    """Try to detect common offline banners or blank main pane."""
    try:
        # Look for reconnect/offline banners
        bad_texts = [
            "Trying to reach phone", "Phone is not connected", "Computer not connected",
            "Connecting to", "Reconnecting", "Retrying", "No internet"
        ]
        banners = driver.find_elements(By.XPATH, "//div[contains(@data-asset-intro, '')]//span|//div[contains(@class,'_al6n')]//span|//div[@role='dialog']//span")
        for b in banners:
            t = (b.text or "").strip()
            if any(x.lower() in t.lower() for x in bad_texts):
                return False
        # Also check if the main message pane exists
        main = driver.find_elements(By.XPATH, "//div[@id='main']")
        if not main:
            return False
        return True
    except Exception:
        return True  # be permissive

def ensure_connected_and_chat_selected(driver):
    """If WA is offline or main pane missing, reload and reselect chat."""
    try:
        if not is_driver_alive(driver):
            return False
        if whatsapp_is_connected(driver):
            return True
        append_pause_resume_log("WA_OFFLINE_RELOAD")
        logger.warning("WA appears offline. Reloading page...")
        driver.get("https://web.whatsapp.com")
        WebDriverWait(driver, MAX_WAIT_WHATSAPP).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        open_whatsapp_and_select_chat(driver, BOT_CHAT_NAME)
        append_pause_resume_log("WA_RELOADED_AND_CHAT_RESELECTED")
        logger.info("WA page reloaded and chat reselected.")
        return True
    except TimeoutException:
        logger.error("Timeout while reloading WA Web.")
        return False
    except Exception as e:
        logger.exception(f"ensure_connected_and_chat_selected error: {e}")
        return False

# ---------------- Help text ----------------
HELP_MESSAGE = (
    "📌 BIOSYNC BOT - Allowed Query Formats\n\n"
    "1) Class report (specific date):\n"
    "   Report for II CSE A on 29/9/25\n\n"
    "2) Class report (today/yesterday):\n"
    "   Report for II CSE A today\n\n"
    "3) Department (all sections):\n    Report for all CSE on 29-09-2025\n\n"
    "4) All departments (entire file):\n    Report for all departments on 29-09-2025\n\n"
    "5) Weekly report (sent as text):\n"
    "   Weekly report for II CSE A\n"
    "   Weekly report for CSE \n\n"
    "6) Monthly report (sent as text):\n"
    "   Monthly report for CSE\n"
    "   Monthly report for CSE on September\n\n"
    f"⚠️ Reports <= {MAX_MESSAGE_CHUNK} chars are sent as a single message. If a report exceeds {MAX_MESSAGE_CHUNK} characters it will be split into 2 text messages automatically.\n"
    "Use slashes or dashes for dates. If invalid-date error occurs, use DD-MM-YYYY.\n\n"
    "🏫 Departments: " + ", ".join(sorted(DEPARTMENTS)) + "\n\n"
    "📝 Examples recognized: 'Monthly report for CSE on September', 'Weekly report for II CSE A', etc."
)

def _extract_dept_from_class_string(class_str):
    if not class_str: return None
    parts = class_str.strip().upper().split()
    if len(parts) >= 2:
        dept = parts[1]
        return ALIASES.get(dept, dept)
    return None

# ---------------- NETWORK CHECKER ----------------
def test_network_once(timeout=3.0):
    """Try a simple socket connection to DNS (TCP connect)."""
    try:
        host, port = NETWORK_TEST_HOST
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        return True
    except Exception:
        return False

# ---------------- DRIVER LIFECYCLE MANAGERS ----------------
_driver_lock = threading.Lock()
def start_driver_safe():
    """Start driver if not already running. Returns driver instance or raises."""
    with _driver_lock:
        drv = None
        try:
            drv = setup_driver()
            append_pause_resume_log("DRIVER_STARTED")
            # open WA and select chat immediately
            try:
                open_whatsapp_and_select_chat(drv, BOT_CHAT_NAME)
            except Exception as e:
                logger.exception(f"Failed to open/select chat after driver start: {e}")
                # If WA selection failed, still return driver so supervisor/reconnect can try
            return drv
        except Exception as e:
            append_pause_resume_log(f"DRIVER_START_FAILED: {e}")
            logger.exception(f"start_driver_safe failed: {e}")
            # ensure cleanup
            try:
                if drv:
                    drv.quit()
            except Exception:
                pass
            raise

def stop_driver_safe(driver):
    """Quit driver and do cleanup, ensuring chromedriver processes are killed."""
    with _driver_lock:
        try:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass
            # kill leftover chromedriver/chrome children (best effort)
            kill_chromedriver_and_children()
            remove_profile_lock_files(USER_DATA_DIR)
            append_pause_resume_log("DRIVER_STOPPED")
        except Exception:
            logger.exception("stop_driver_safe encountered an error")

# ---------------- SCHEDULED RESTART THREAD ----------------
def start_restart_scheduler(stop_event: threading.Event, restart_event: threading.Event):
    """Thread that signals when a scheduled restart is due (every 2 hours)."""
    def _sched():
        append_pause_resume_log("SCHEDULED_RESTART_THREAD_STARTED")
        next_restart = time.time() + SCHEDULED_RESTART_SEC
        while not stop_event.is_set():
            now = time.time()
            if now >= next_restart:
                # signal restart
                append_pause_resume_log("SCHEDULED_RESTART_DUE")
                restart_event.set()
                # schedule next
                next_restart = now + SCHEDULED_RESTART_SEC
            # check every second for responsiveness
            for _ in range(1):
                if stop_event.is_set(): break
                time.sleep(1.0)
        append_pause_resume_log("SCHEDULED_RESTART_THREAD_EXITING")
    t = threading.Thread(target=_sched, daemon=True)
    t.start()
    return t

# ---------------- NETWORK WATCHER THREAD ----------------
def start_network_watcher(stop_event: threading.Event, driver_ref: dict, restart_event: threading.Event):
    """
    Watches network connectivity. If network lost for >= NETWORK_LOST_THRESHOLD_SEC, 
    cleanly stops the driver and waits for network to return. On restore it sets restart_event.
    driver_ref is a dict wrapper { 'driver': <webdriver> } for shared reference.
    """
    def _watch():
        append_pause_resume_log("NETWORK_WATCHER_STARTED")
        lost_since = None
        while not stop_event.is_set():
            try:
                # if paused, do not auto-restart or auto-stop; just wait until pause removed
                if os.path.exists(PAUSE_FLAG_PATH):
                    # If pause.flag exists and driver running, ensure driver stopped
                    if driver_ref.get('driver'):
                        append_pause_resume_log("PAUSE_FLAG_PRESENT -> STOPPING_DRIVER")
                        try:
                            stop_driver_safe(driver_ref.get('driver'))
                        except Exception:
                            pass
                        driver_ref['driver'] = None
                    time.sleep(2.0)
                    continue

                ok = test_network_once(timeout=3.0)
                if ok:
                    # network is available
                    if lost_since:
                        duration = time.time() - lost_since
                        append_pause_resume_log(f"NETWORK_RESTORED_after_{int(duration)}s")
                        # request a restart to ensure clean session
                        restart_event.set()
                        lost_since = None
                    # nothing else to do
                else:
                    # network test failed
                    if lost_since is None:
                        lost_since = time.time()
                    elapsed = time.time() - lost_since
                    if elapsed >= NETWORK_LOST_THRESHOLD_SEC:
                        append_pause_resume_log(f"NETWORK_LOST_WHILE_RUNNING_for_{int(elapsed)}s")
                        # ensure driver stopped
                        if driver_ref.get('driver'):
                            try:
                                stop_driver_safe(driver_ref.get('driver'))
                            except Exception:
                                pass
                            driver_ref['driver'] = None
                        # now wait here until network returns
                        # we will loop and wait for ok to become True
                # sleep small interval
            except Exception:
                logger.exception("Network watcher error")
            time.sleep(NETWORK_CHECK_INTERVAL)
        append_pause_resume_log("NETWORK_WATCHER_EXITING")
    t = threading.Thread(target=_watch, daemon=True)
    t.start()
    return t

# ---------------- main loop (with browser-monitor + keep-awake + network/restart) ----------------
def run_bot():
    append_pause_resume_log("BOT_START")
    logger.info("Starting BIOSYNC WhatsApp bot (keep-awake + network/reconnect + scheduled restart)...")

    stop_event = threading.Event()
    restart_event = threading.Event()
    keep_awake_thread = start_keep_awake_thread(stop_event)

    driver_ref = {'driver': None}

    # start worker threads
    for i in range(WORKER_COUNT):
        t = threading.Thread(target=worker_loop, args=(i+1,), daemon=True)
        t.start()

    # start network watcher
    net_thread = start_network_watcher(stop_event, driver_ref, restart_event)
    # start scheduled restart thread
    sched_thread = start_restart_scheduler(stop_event, restart_event)

    # start browser-monitor (checks for browser presence for profile)
    def browser_monitor():
        append_pause_resume_log("BROWSER_MONITOR_STARTED")
        try:
            while not stop_event.is_set():
                try:
                    found = False
                    if psutil:
                        for p in psutil.process_iter(['pid', 'name', 'cmdline']):
                            try:
                                nm = (p.info.get('name') or "").lower()
                                if not any(k in nm for k in ('chrome', 'chromium', 'msedge', 'brave')):
                                    continue
                                cmd = " ".join(p.info.get('cmdline') or []).lower()
                                if USER_DATA_DIR.replace("\\", "/").lower() in cmd.replace("\\", "/").lower():
                                    found = True
                                    break
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                continue
                    else:
                        found = True
                    if not found:
                        # if no browser instances for our profile and driver_ref has driver -> that indicates browser closed unexpectedly
                        append_pause_resume_log("BROWSER_NOT_FOUND")
                        # stop driver state
                        if driver_ref.get('driver'):
                            try:
                                stop_driver_safe(driver_ref.get('driver'))
                            except Exception:
                                pass
                            driver_ref['driver'] = None
                        # trigger a restart attempt (network watcher / scheduler will handle)
                        restart_event.set()
                        # break out of monitor loop — let watcher drive restarts
                        break
                except Exception:
                    logger.exception("Browser-monitor encountered exception")
                time.sleep(2.0)
        finally:
            append_pause_resume_log("BROWSER_MONITOR_EXITING")

    monitor_thread = threading.Thread(target=browser_monitor, daemon=True)
    monitor_thread.start()

    processed_outgoing = set()
    last_processed_time = {}

    # driver bootstrap: start if not paused and network available
    try:
        if not os.path.exists(PAUSE_FLAG_PATH) and test_network_once(timeout=3.0):
            try:
                drv = start_driver_safe()
                driver_ref['driver'] = drv
            except Exception as e:
                append_pause_resume_log(f"DRIVER_BOOTSTRAP_FAILED: {e}")
                driver_ref['driver'] = None
        else:
            append_pause_resume_log("BOOTSTRAP_SKIPPED_PAUSED_OR_NO_NETWORK")
    except Exception:
        logger.exception("Bootstrap check failed")

    # mark startup last message as processed (if driver present)
    try:
        if driver_ref.get('driver'):
            uid_init, _, _ = get_last_msg_tuple(driver_ref.get('driver'))
            if uid_init:
                processed_outgoing.add(uid_init)
                append_pause_resume_log(f"STARTUP_MARKED_LAST_UID:{uid_init}")
    except Exception:
        pass

    # MAIN LOOP
    while not stop_event.is_set():
        try:
            # If pause.flag created: stop driver and idle
            if os.path.exists(PAUSE_FLAG_PATH):
                append_pause_resume_log("PAUSE_FLAG_DETECTED_MAINLOOP")
                if driver_ref.get('driver'):
                    try:
                        stop_driver_safe(driver_ref.get('driver'))
                    except Exception:
                        pass
                    driver_ref['driver'] = None
                # sleep while paused; don't consume CPU
                time.sleep(2.0)
                continue

            # Handle restart_event (either scheduled or network restored)
            if restart_event.is_set():
                # clear event first
                restart_event.clear()
                append_pause_resume_log("RESTART_EVENT_TRIGGERED")
                # perform clean restart of driver
                try:
                    if driver_ref.get('driver'):
                        stop_driver_safe(driver_ref.get('driver'))
                        driver_ref['driver'] = None
                    # Only start driver if network is available
                    if test_network_once(timeout=3.0):
                        try:
                            drv = start_driver_safe()
                            driver_ref['driver'] = drv
                        except Exception as e:
                            append_pause_resume_log(f"RESTART_DRIVER_START_FAILED: {e}")
                    else:
                        append_pause_resume_log("RESTART_SKIPPED_NO_NETWORK")
                except Exception:
                    logger.exception("Error during scheduled/network-triggered restart")

            drv = driver_ref.get('driver')

            # If no driver but network available, try to start
            if (drv is None) and (not os.path.exists(PAUSE_FLAG_PATH)) and test_network_once(timeout=3.0):
                append_pause_resume_log("AUTO_START_DRIVER_ON_NETWORK_AVAILABLE")
                try:
                    drv = start_driver_safe()
                    driver_ref['driver'] = drv
                except Exception as e:
                    append_pause_resume_log(f"AUTO_START_FAILED: {e}")
                    driver_ref['driver'] = None

            # If driver exists, continue normal operation: send responses, read messages
            if drv and is_driver_alive(drv):
                # Periodically ensure WA is connected (handles monitor off/network hiccups)
                now = time.time()
                if now % RECONNECT_CHECK_SEC < POLL_INTERVAL:
                    ensure_connected_and_chat_selected(drv)

                # send responses
                while not response_queue.empty():
                    try:
                        job_id, requester, chunk = response_queue.get_nowait()
                        # Ensure we never send file attachments. If a tuple is present, read file contents and send as text.
                        if isinstance(chunk, tuple) and chunk and chunk[0] == "__FILE__":
                            _, filepath, caption = chunk
                            try:
                                with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                                    txt = fh.read()
                                    # split into 1 or 2 messages as needed
                                    msgs = split_into_two_messages(txt, label="Report part", max_len=MAX_MESSAGE_CHUNK)
                                    for m in msgs:
                                        send_and_mark(drv, m, processed_outgoing)
                                try: os.remove(filepath)
                                except Exception: pass
                            except Exception:
                                logger.exception(f"Failed to read fallback file {filepath}; skipping.")
                        else:
                            # chunk is text (expected)
                            send_and_mark(drv, chunk, processed_outgoing)
                        response_queue.task_done()
                    except queue.Empty:
                        break

                # read last message
                try:
                    unique_id, sender_label, text = get_last_msg_tuple(drv)
                except Exception as e:
                    # if reading last message failed, mark driver dead and set for restart
                    logger.exception("Failed to read last message; marking driver for restart")
                    try:
                        stop_driver_safe(drv)
                    except Exception:
                        pass
                    driver_ref['driver'] = None
                    restart_event.set()
                    time.sleep(POLL_INTERVAL)
                    continue

                if not unique_id or not text:
                    time.sleep(POLL_INTERVAL); continue

                if unique_id in processed_outgoing:
                    time.sleep(POLL_INTERVAL); continue

                nowt = time.time()
                if unique_id in last_processed_time and (nowt - last_processed_time[unique_id] < 1.5):
                    time.sleep(POLL_INTERVAL); continue

                last_processed_time[unique_id] = nowt

                if sender_label and ("You" in sender_label or "you" in sender_label):
                    processed_outgoing.add(unique_id)
                    continue

                # parse
                class_q, date_obj, had_date, invalid_date, period_type, start_date, end_date = fuzzy_parse_query(text)
                logger.info(f"Incoming({unique_id}) parsed -> class:{class_q} date:{date_obj} had_date:{had_date} invalid_date:{invalid_date} period={period_type} range={start_date}..{end_date}")
                append_pause_resume_log(f"INCOMING_MSG_PARSED:{unique_id}")

                if class_q == "HELP_COMMAND":
                    send_and_mark(drv, HELP_MESSAGE, processed_outgoing); continue
                if class_q is None and date_obj is None and not invalid_date:  # not for us
                    continue
                if invalid_date:
                    send_and_mark(drv, "❗ Invalid date format. Use DD-MM-YYYY or 'today'/'yesterday'.", processed_outgoing); continue
                if period_type == "DAY" and not had_date:
                    send_and_mark(drv, "Please provide a date (DD-MM-YYYY) or 'today'/'yesterday'.", processed_outgoing); continue
                if not class_q:
                    send_and_mark(drv, "Couldn't detect class/department. Example: 'Monthly report for CSE on September'", processed_outgoing); continue

                # validate dept tokens
                if isinstance(class_q, str) and class_q.startswith("?"):
                    token = class_q[1:].strip().upper()
                    token_first = token.split()[0] if token else token
                    token_first_mapped = ALIASES.get(token_first, token_first)
                    if token_first_mapped != "ALL":
                        first_tok = token_first_mapped.split()[0]
                        if first_tok not in DEPARTMENTS:
                            send_and_mark(drv, f"❗ Unknown department '{first_tok}'. Allowed: {', '.join(sorted(DEPARTMENTS))}", processed_outgoing)
                            continue
                else:
                    dept_from_class = _extract_dept_from_class_string(class_q)
                    if dept_from_class and dept_from_class not in DEPARTMENTS:
                        send_and_mark(drv, f"❗ Department '{dept_from_class}' not recognized. Allowed: {', '.join(sorted(DEPARTMENTS))}", processed_outgoing)
                        continue

                # fast path for DAY if cached
                if period_type == "DAY":
                    date_key = date_obj.strftime("%d-%m-%Y") if date_obj else None
                    content_cached = _cache_get(date_key) if date_key else None
                    if content_cached is not None:
                        try:
                            block = extract_class_block(content_cached, class_q)
                            if block:
                                if len(block) <= MAX_MESSAGE_CHUNK:
                                    send_and_mark(drv, block, processed_outgoing); continue
                                # split into two parts and send immediately
                                parts = split_into_two_messages(block, label=f"Attendance {date_key}", max_len=MAX_MESSAGE_CHUNK)
                                for p in parts:
                                    send_and_mark(drv, p, processed_outgoing)
                                continue
                        except Exception as e:
                            logger.exception(f"Fast-path extraction failed: {e}")

                # enqueue for workers
                job = (unique_id, sender_label or "unknown", class_q, date_obj, text, period_type, start_date, end_date)
                try:
                    request_queue.put_nowait(job)
                    logger.info(f"Enqueued job {unique_id} for background processing (period={period_type})")
                except queue.Full:
                    send_and_mark(drv, "⚠️ System busy. Please try again in a few seconds.", processed_outgoing)
            else:
                # no active driver: wait a bit for network watcher / restart to start it
                time.sleep(1.0)
        except (InvalidSessionIdException, WebDriverException):
            logger.exception("Selenium session error; scheduling restart.")
            try:
                if driver_ref.get('driver'):
                    stop_driver_safe(driver_ref.get('driver'))
                driver_ref['driver'] = None
            except Exception:
                pass
            restart_event.set(); time.sleep(1.0); continue
        except Exception as e:
            logger.exception(f"Unexpected error in main loop: {e}")
            # don't die immediately; allow restart watcher to attempt auto-recovery
            try:
                if driver_ref.get('driver'):
                    stop_driver_safe(driver_ref.get('driver'))
            except Exception:
                pass
            driver_ref['driver'] = None
            restart_event.set()
            time.sleep(2.0)
            continue

        time.sleep(POLL_INTERVAL)

    # cleanup on exit
    append_pause_resume_log("BOT_EXIT")
    logger.info("run_bot exiting; cleaning up worker queue and driver.")
    stop_event.set()
    try:
        for _ in range(WORKER_COUNT):
            try: request_queue.put_nowait(None)
            except Exception: pass
        while not response_queue.empty():
            response_queue.get_nowait(); response_queue.task_done()
    except Exception:
        pass
    try:
        if driver_ref.get('driver'):
            stop_driver_safe(driver_ref.get('driver'))
    except Exception:
        pass

    append_pause_resume_log("BOT_TERMINATED_CLEAN")
    logger.info("Bot process terminated (run_bot).")

if __name__ == "__main__":
    try:
        run_bot()
    except Exception as exc:
        import traceback
        print("Top-level exception:", exc)
        traceback.print_exc()
        logger.exception(f"Top-level exception: {exc}")
    print("Bot process terminated. Press Enter to close.")
    try:
        input()
    except Exception:
        pass


