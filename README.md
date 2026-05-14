# BIOSYNC - Automated Biometric Attendance Management System

BIOSYNC is a fully automated biometric attendance management system designed to synchronize biometric attendance data, process institutional attendance records, generate structured reports, and deliver real-time attendance updates through WhatsApp and dashboard-based monitoring.

The system is built to reduce manual attendance work by automating data extraction, validation, report generation, backup, and communication between the institution, staff, students, and parents.

---

## About BIOSYNC

BIOSYNC is developed as an intelligent attendance automation platform for educational institutions. It connects biometric attendance data with automated processing tools and real-time reporting systems.

The project focuses on accuracy, automation, reliability, and easy monitoring. It helps institutions manage attendance data more efficiently by converting raw biometric logs into meaningful attendance summaries and reports.

---

## Key Highlights

- Automated biometric attendance synchronization
- Real-time attendance processing
- WhatsApp-based attendance report delivery
- Admin, staff, and parent dashboard modules
- Student-wise and department-wise attendance tracking
- Google Drive backup and cloud synchronization
- Automated report generation
- Watchdog-based crash recovery
- Network failure handling
- Resume-after-downtime support
- Error handling and retry mechanism
- Secure handling of sensitive attendance data

---

## Features

### Biometric Attendance Synchronization

BIOSYNC processes attendance data collected from biometric devices and converts it into structured attendance records.

### Automated Attendance Processing

The system cleans, validates, and organizes raw biometric data into institution-ready attendance formats.

### WhatsApp Report Automation

BIOSYNC automatically generates WhatsApp-style attendance reports and sends them to the required groups or users.

### Dashboard-Based Monitoring

The system includes dashboard modules for administrators, staff, and parents to track attendance information easily.

### Parent Attendance Tracking

Parents can monitor the attendance details of their respective child through the parent dashboard.

### Google Drive Backup

Processed attendance files and reports can be backed up to Google Drive for secure cloud storage.

### Error Recovery

BIOSYNC includes error handling, retry logic, watchdog monitoring, and recovery mechanisms to improve reliability during automation.

### Resume After Downtime

The system can continue operations after interruptions such as network failures, browser crashes, or system restarts.

---

## UI Pages / Dashboard Modules

### 1. Login Page

The login page provides secure access to the BIOSYNC system.

**Functions:**

- User authentication
- Role-based login
- Admin, staff, and parent access
- Secure dashboard redirection

---

### 2. Admin Dashboard

The admin dashboard acts as the main control center of BIOSYNC.

**Functions:**

- View overall attendance summary
- Monitor department-wise attendance
- Track student and staff attendance records
- View biometric synchronization status
- Manage reports
- Monitor system health
- Check cloud backup status
- Access automation logs

---

### 3. Staff Dashboard

The staff dashboard allows faculty members and department staff to monitor student attendance.

**Functions:**

- View class-wise attendance
- Track present and absent students
- Access daily attendance summaries
- View student-wise attendance records
- Generate department-level reports
- Monitor attendance percentage

---

### 4. Parent Dashboard

The parent dashboard allows parents to track the attendance details of their respective child.

**Functions:**

- View child attendance status
- Track daily attendance
- Monitor present and absent records
- View attendance percentage
- Improve parent-institution communication

---

### 5. Student Attendance Page

This page displays individual student attendance information in a structured format.

**Functions:**

- Student profile details
- Daily attendance records
- Attendance percentage
- Present and absent status
- Attendance history
- Report-ready attendance data

---

### 6. Biometric Sync Page

The biometric sync page monitors the synchronization of biometric attendance data.

**Functions:**

- Track biometric data extraction
- Monitor synchronization progress
- Validate raw biometric logs
- Detect missing records
- Identify failed entries
- Confirm successful data sync

---

### 7. Reports Page

The reports page provides structured attendance reports for institutional use.

**Functions:**

- Daily attendance reports
- Department-wise reports
- Student-wise reports
- Absentee reports
- Export-ready summaries
- WhatsApp-ready report formatting

---

### 8. Backup and Cloud Sync Page

This page manages local backup and Google Drive synchronization.

**Functions:**

- Google Drive upload tracking
- Daily backup monitoring
- Processed file storage
- Cloud sync status
- Backup history

---

### 9. System Monitoring Page

The system monitoring page displays automation health and recovery status.

**Functions:**

- Watchdog status
- Automation uptime
- Error detection
- Retry status
- Network recovery monitoring
- Crash recovery tracking
- Session monitoring

---

## System Workflow

```txt
Biometric Device
      ↓
Raw Attendance Data Extraction
      ↓
Data Cleaning and Validation
      ↓
Attendance Processing
      ↓
Department-wise Report Generation
      ↓
Dashboard Update
      ↓
WhatsApp Report Delivery
      ↓
Google Drive Backup

BIOSYNC-Attendance-Automation/
│
├── README.md
├── LICENSE
├── NOTICE
├── requirements.txt
├── .gitignore
│
├── src/
│   ├── main.py
│   ├── attendance_processor.py
│   ├── whatsapp_bot.py
│   ├── drive_sync.py
│   ├── watchdog.py
│   └── config.py
│
├── ui/
│   ├── login/
│   ├── admin-dashboard/
│   ├── staff-dashboard/
│   ├── parent-dashboard/
│   ├── student-attendance/
│   ├── biometric-sync/
│   ├── reports/
│   ├── backup-cloud-sync/
│   └── system-monitoring/
│
├── docs/
│   └── project_report.pdf
│
├── samples/
│   └── sample_attendance_format.xlsx
│
└── assets/
    └── biosync_logo.png
