from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time
import os
import pyperclip  # For copy-paste

# === Configuration ===
chrome_driver_path = r"C:\Program Files\Python311\Scripts\chromedriver.exe"
user_data_dir = r"C:/Users/CSE/whatsappvsb"
file_path = r"C:\AttendanceAutomation\Output\final_message.txt"
contacts = ["TRIALBOT"]

# === Read and clean the attendance message ===
def remove_non_bmp_characters(text):
    """Remove unsupported non-BMP characters (above U+FFFF)."""
    return ''.join(c for c in text if ord(c) <= 0xFFFF)

full_message = ""

if os.path.exists(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
            full_message = remove_non_bmp_characters(content)

            if full_message.strip():
                pyperclip.copy(full_message)  # Copy message to clipboard
                print("✅ Message loaded and copied to clipboard.")
            else:
                print("⚠ Message file is empty. Aborting send.")
                exit()
    except Exception as e:
        print(f"❌ Error reading message file: {e}")
        exit()
else:
    print("⚠ No message file found. Aborting send.")
    exit()

# === Setup Chrome WebDriver ===
options = webdriver.ChromeOptions()
options.add_argument(f"--user-data-dir={user_data_dir}")  # Keeps session active

service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service, options=options)

# === Open WhatsApp Web ===
driver.get("https://web.whatsapp.com")
time.sleep(30)  # Wait for QR or page load

# === Select contact ===
def select_contact(name):
    try:
        search_box = driver.find_element(By.XPATH, "//div[@contenteditable='true']")
        search_box.clear()
        time.sleep(1)
        search_box.send_keys(name)
        time.sleep(3)
        search_box.send_keys(Keys.ENTER)
        time.sleep(3)
        print(f"✅ Selected contact: {name}")
        return True
    except Exception as e:
        print(f"❌ Error selecting contact '{name}': {e}")
        return False

# === Send message ===
def send_messages(contact):
    if select_contact(contact):
        try:
            message_box = driver.find_element(By.XPATH, "//footer//div[@contenteditable='true']")
            message_box.click()
            time.sleep(1)
            message_box.send_keys(Keys.CONTROL, 'v')  # Paste
            time.sleep(1)
            message_box.send_keys(Keys.ENTER)  # Send
            print(f"✅ Message sent to {contact}")
        except Exception as e:
            print(f"❌ Error sending message to '{contact}': {e}")

# Send to all contacts
for contact in contacts:
    send_messages(contact)
    time.sleep(5)

# === Cleanup message file ===
try:
    if os.path.exists(file_path):
        os.remove(file_path)
        print("🗑 Deleted final_message.txt")
        pyperclip.copy("")  # Clear clipboard
except Exception as e:
    print(f"⚠ Could not delete final_message.txt: {e}")

driver.quit()
print("✅ WhatsApp sending process completed.")