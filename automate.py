# attendance_processor.py

import os
import pandas as pd
import glob
import re
from collections import defaultdict
from datetime import datetime

# === Paths ===
base_dir = os.getcwd()
input_folder = os.path.join(base_dir, "Input")
output_folder = os.path.join(base_dir, "Output")
backup_folder = os.path.join(base_dir, "Backup")

os.makedirs(output_folder, exist_ok=True)
os.makedirs(backup_folder, exist_ok=True)

# === Date for Report ===
report_date = datetime.now().strftime('%d-%m-%Y')
backup_date = datetime.now().strftime('%d-%m-%Y')  # for backup file naming

# === Get Files ===
all_files = glob.glob(os.path.join(input_folder, "*.csv")) + \
            glob.glob(os.path.join(input_folder, "*.xls")) + \
            glob.glob(os.path.join(input_folder, "*.xlsx"))

if not all_files:
    print("❌ No attendance files found in 'Input' folder!")
    exit()

print(f"📂 Found {len(all_files)} attendance file(s).\n")

# === Keep Only Latest Versions ===
latest_versions = defaultdict(lambda: ("", -1))
pattern = re.compile(r"^(.*?)(?: \((\d+)\))?\.(csv|xls|xlsx)$", re.IGNORECASE)

for file_path in all_files:
    file_name = os.path.basename(file_path)
    match = pattern.match(file_name)
    if match:
        base, version, ext = match.groups()
        version = int(version) if version else 0
        key = f"{base}.{ext}"
        if version > latest_versions[key][1]:
            latest_versions[key] = (file_path, version)

final_files = [f for f, _ in latest_versions.values()]
print(f"📦 Processing {len(final_files)} latest version file(s).\n")

# === Final Result Building ===
total_present = 0
total_absent = 0
offline_departments = []
final_messages = []

def extract_department_blocks(df):
    blocks = []
    current_block = []
    current_dept = None

    for _, row in df.iterrows():
        row_str = row.astype(str).str.lower().str.strip().tolist()
        joined = " ".join([str(x).strip() for x in row_str if str(x) != "nan"])

        if any(key in joined for key in ["department", "class", "section"]):
            if current_block and current_dept:
                blocks.append((current_dept, pd.DataFrame(current_block)))
                current_block = []
            current_dept = " ".join(row.dropna().astype(str).tolist()).strip()
        elif any(key in joined for key in ["present", "not present"]):
            current_block.append(row)

    if current_block and current_dept:
        blocks.append((current_dept, pd.DataFrame(current_block)))

    return blocks

# === Process Files ===
for file_path in final_files:
    file_name = os.path.basename(file_path)
    print(f"🔍 Processing: {file_name}")

    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path, header=None, encoding="utf-8", errors="ignore")
        else:
            df = pd.read_excel(file_path, header=None)
    except Exception as e:
        print(f"❌ Failed to read {file_name}: {e}")
        continue

    dept_blocks = extract_department_blocks(df)
    file_message = f"📢 Attendance Report - {report_date}\n📁 ({file_name})\n\n"
    file_present = 0
    file_absent = 0

    for dept_name, block_df in dept_blocks:
        try:
            block_df = block_df.rename(columns={1: "Code", 3: "Name", 9: "Status"})
        except:
            continue

        block_df = block_df.dropna(subset=["Name", "Status"])
        block_df["Status"] = block_df["Status"].astype(str).str.strip()

        present_count = block_df[block_df["Status"].str.lower() == "present"].shape[0]
        absent_count = block_df[block_df["Status"].str.lower() == "not present"].shape[0]
        total_students = len(block_df)

        is_offline = (present_count == 0 and absent_count == total_students and total_students > 0)

        if is_offline:
            file_message += f"🚫 Biometric Offline: {dept_name}\n\n"
            offline_departments.append(dept_name)
            continue

        absentees = block_df[block_df["Status"].str.lower() == "not present"]["Name"].tolist()
        absentees_str = ", ".join(absentees) if absentees else "None"

        file_message += (
            f"📚 Department: {dept_name}\n"
            f"✅ Present: {present_count}\n"
            f"❌ Not Present ({absent_count}): {absentees_str}\n\n"
        )

        file_present += present_count
        file_absent += absent_count

    file_message += "📌 Auto-generated from biometric system.\n"
    final_messages.append(file_message)

    total_present += file_present
    total_absent += file_absent

# === Summary Message ===
summary = f"""
📊 Overall Attendance Summary - {report_date}
✅ Total Present: {total_present}
❌ Total Not Present: {total_absent}
🚫 Offline Departments: {", ".join(offline_departments) if offline_departments else "None"}

📌 Auto-generated from biometric system.
"""
final_messages.append(summary.strip())

# === Save Final Message (Output + Backup) ===
final_text = ("\n" + "=" * 60 + "\n\n").join(final_messages)

# Save to Output
output_file = os.path.join(output_folder, "final_message.txt")
with open(output_file, "w", encoding="utf-8") as f:
    f.write(final_text)

# Save to Backup (month-wise folder, 1 file per day, overwrite if exists)
current_month = datetime.now().strftime("%B-%Y")   # e.g., "August-2025"
month_backup_folder = os.path.join(backup_folder, current_month)
os.makedirs(month_backup_folder, exist_ok=True)

backup_file = os.path.join(month_backup_folder, f"{backup_date}.txt")
with open(backup_file, "w", encoding="utf-8") as f:
    f.write(final_text)

print(f"\n✅ Final message saved to: {output_file}")
print(f"📦 Backup updated: {backup_file}")

# === Delete Processed Input Files ===
for f in final_files:
    try:
        os.remove(f)
        print(f"🗑 Deleted processed file: {os.path.basename(f)}")
    except Exception as e:
        print(f"⚠ Could not delete file {f}: {e}")