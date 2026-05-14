# BIOSYNC - Automated Biometric Attendance Synchronization System

BIOSYNC is a fully automated biometric attendance management system designed to synchronize biometric data, process institutional attendance records, generate structured reports, and deliver real-time attendance updates through WhatsApp, dashboards, and cloud backup.

The system is built to reduce manual attendance work by automating the complete attendance pipeline — from extracting raw biometric logs to generating department-wise attendance summaries and sending instant attendance reports.

---

## Overview

BIOSYNC is designed for educational institutions that require fast, accurate, and reliable attendance management. It connects biometric attendance devices with automated data processing, real-time reporting, cloud backup, and dashboard-based monitoring.

The main goal of BIOSYNC is to remove repetitive manual attendance tasks and provide a smart, automated, and reliable attendance workflow for administrators, staff, students, and parents.

---

## Core Features

### 1. Automated Biometric Attendance Synchronization

BIOSYNC can process raw attendance logs collected from biometric devices and convert them into structured attendance records.

**Features included:**

- Biometric attendance data extraction
- Raw log processing
- Attendance data cleaning
- Duplicate entry handling
- Missing record detection
- Biometric integrity validation
- Student-wise attendance mapping
- Department-wise attendance organization

---

### 2. Attendance Processing Engine

The attendance processing engine converts raw biometric data into meaningful institutional attendance reports.

**Features included:**

- Automated attendance calculation
- Present and absent status identification
- Student-wise attendance tracking
- Class-wise attendance summary
- Department-wise attendance summary
- Daily attendance report generation
- Structured Excel-based report formatting
- Clean and readable attendance output

---

### 3. WhatsApp Attendance Reporting

BIOSYNC includes WhatsApp-based reporting automation to send attendance updates instantly.

**Features included:**

- WhatsApp Web automation
- WhatsApp-style attendance message generation
- Daily attendance summary delivery
- Department-wise message formatting
- Automated message dispatch
- Group/chat selection support
- Resume-after-idle support
- Message delivery continuation after interruptions

---

### 4. Production-Grade WhatsApp Bot Reliability

The WhatsApp automation module is designed for long-running unattended operation.

**Features included:**

- Auto-pause and resume control
- Self-reconnection after network drop
- Chat re-selection after reload
- Browser session recovery
- Profile lock handling
- Long idle recovery
- Message sending retry logic
- Threaded watchdog monitoring
- Automation health tracking

---

### 5. Error Handling and Watchdog Mechanism

BIOSYNC is designed for autonomous execution, so it includes error handling and monitoring mechanisms to keep the system stable.

**Features included:**

- Watchdog-based monitoring
- Crash detection
- Failed task retry mechanism
- Automation restart support
- Network failure handling
- Browser failure recovery
- Resume-after-downtime logic
- Exception handling during processing
- Recovery after system restart
- Continuous automation supervision

---

### 6. Google Drive Backup and Cloud Synchronization

BIOSYNC supports local-to-cloud synchronization for safe storage and report availability.

**Features included:**

- Google Drive API integration
- Scheduled cloud upload
- Daily backup support
- Attendance report backup
- Processed file storage
- Cloud synchronization status tracking
- Local backup management
- Automatic cleanup of processed files

---

### 7. Keep-Awake System Layer

BIOSYNC includes a keep-awake mechanism to prevent unattended automation from stopping due to system sleep.

**Features included:**

- Prevents Windows sleep during automation
- Supports long-duration attendance operations
- Improves unattended execution reliability
- Helps maintain continuous WhatsApp report delivery
- Reduces automation interruption risk

---

### 8. Dashboard-Based Attendance Monitoring

BIOSYNC includes dashboard modules for different users such as administrators, staff, and parents.

**Features included:**

- Admin dashboard
- Staff dashboard
- Parent dashboard
- Student attendance tracking
- Real-time attendance overview
- Report viewing
- Attendance summary display
- System monitoring interface

---

### 9. Parent Attendance Tracking

BIOSYNC includes a parent dashboard where parents can track the attendance details of their respective child.

**Features included:**

- Child attendance status
- Daily attendance view
- Present/absent tracking
- Attendance percentage display
- Parent-level access
- Improved parent-institution communication

---

### 10. Mobile App Support

BIOSYNC also supports mobile app integration for easier attendance access and monitoring.

**Features included:**

- Mobile-friendly attendance access
- Student attendance view
- Parent attendance tracking
- Real-time attendance updates
- Dashboard access through mobile interface
- Simplified monitoring for parents and staff

---

## UI Pages and Modules

### 1. Login Page

The login page provides secure access to the BIOSYNC system.

**Main functions:**

- User login
- Role-based authentication
- Secure access control
- Admin, staff, and parent login support
- Dashboard redirection based on user role

---

### 2. Admin Dashboard

The admin dashboard is the main control center of BIOSYNC.

**Main functions:**

- View overall attendance summary
- Monitor department-wise attendance
- Track student and staff attendance
- View biometric synchronization status
- Access daily attendance reports
- Monitor WhatsApp report delivery
- Track Google Drive backup status
- View automation health
- Manage institutional attendance data

---

### 3. Staff Dashboard

The staff dashboard allows faculty and department staff to monitor attendance records.

**Main functions:**

- View class-wise attendance
- Track present and absent students
- Access department attendance summaries
- View student-wise attendance records
- Generate attendance reports
- Monitor daily attendance status
- Support staff-level attendance management

---

### 4. Parent Dashboard

The parent dashboard allows parents to track their child’s attendance details.

**Main functions:**

- View child attendance details
- Track daily attendance
- Monitor present and absent records
- View attendance percentage
- Improve communication between parents and institution
- Provide transparent attendance visibility

---

### 5. Student Attendance Page

The student attendance page displays individual student attendance records.

**Main functions:**

- Student profile details
- Daily attendance history
- Present and absent records
- Attendance percentage
- Report-ready student attendance data
- Attendance status tracking

---

### 6. Biometric Sync Page

The biometric sync page monitors the biometric attendance synchronization process.

**Main functions:**

- Track biometric data import
- Monitor synchronization status
- Validate raw biometric logs
- Detect missing records
- Identify failed entries
- Confirm successful data processing

---

### 7. Reports Page

The reports page provides structured attendance reports.

**Main functions:**

- Daily attendance reports
- Department-wise reports
- Student-wise reports
- Absentee reports
- Attendance summary reports
- Export-ready report format
- WhatsApp-ready attendance message format

---

### 8. Backup and Cloud Sync Page

This page monitors backup and cloud synchronization activities.

**Main functions:**

- Google Drive upload tracking
- Daily backup status
- Cloud sync monitoring
- Processed file storage
- Backup history
- Report upload verification

---

### 9. System Monitoring Page

The system monitoring page displays the health and reliability status of BIOSYNC automation.

**Main functions:**

- Watchdog status
- Automation uptime
- Network recovery status
- Error detection
- Retry status
- Crash recovery tracking
- Browser session monitoring
- WhatsApp automation status

---

### 10. Mobile App Pages

The mobile app interface allows users to access attendance data from mobile devices.

**Main functions:**

- Mobile login
- Student attendance view
- Parent attendance tracking
- Real-time attendance updates
- Attendance summary display
- User-friendly mobile access

---

## System Workflow

```txt
Biometric Device
      ↓
Raw Attendance Log Extraction
      ↓
Data Cleaning and Validation
      ↓
Attendance Processing Engine
      ↓
Student-wise and Department-wise Attendance Mapping
      ↓
Report Generation
      ↓
Dashboard Update
      ↓
WhatsApp Attendance Message Delivery
      ↓
Google Drive Backup
      ↓
System Monitoring and Recovery
```

---

## Technology Stack

BIOSYNC is built using automation, data processing, cloud integration, and dashboard technologies.

**Backend and Automation:**

- Python
- Pandas
- Selenium
- File handling automation
- Excel automation

**Cloud and Backup:**

- Google Drive API
- Local-to-cloud synchronization
- Scheduled backup handling

**Communication Automation:**

- WhatsApp Web Automation
- Automated message formatting
- Automated report delivery

**Frontend / UI:**

- HTML
- CSS
- JavaScript
- Dashboard-based UI modules
- Mobile-friendly interface

**System Reliability:**

- Watchdog mechanism
- Retry logic
- Error handling
- Resume-after-downtime support
- Keep-awake automation layer

---

## Project Structure

```txt
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
│   ├── biometric_sync.py
│   ├── whatsapp_bot.py
│   ├── drive_sync.py
│   ├── watchdog.py
│   ├── keep_awake.py
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
│   ├── system-monitoring/
│   └── mobile-app/
│
├── docs/
│   └── project_report.pdf
│
├── samples/
│   └── sample_attendance_format.xlsx
│
├── assets/
│   ├── biosync_logo.png
│   ├── login-page.png
│   ├── admin-dashboard.png
│   ├── staff-dashboard.png
│   ├── parent-dashboard.png
│   └── mobile-app.png
│
└── tests/
    └── test_attendance_processing.py
```

## Project Status

BIOSYNC is developed as an institutional attendance automation system focused on reliability, automation, real-time reporting, and secure attendance management.

Current project modules include:

- Biometric attendance synchronization
- Attendance processing
- WhatsApp reporting
- Google Drive backup
- Admin dashboard
- Staff dashboard
- Parent dashboard
- Mobile app support
- Watchdog monitoring
- Error recovery

---

## Future Enhancements

Planned improvements include:

- Advanced analytics dashboard
- Attendance trend visualization
- SMS and email notification support
- API-based biometric device integration
- Multi-institution support
- Role-based access improvements
- Mobile app enhancements
- Automated monthly attendance reports
- Parent notification improvements
- AI-based attendance insights

---

## License

This project is licensed under the Apache License 2.0.

Copyright 2026 Niswanth

See the `LICENSE` file for more details.

---

## Author

Developed by **Niswanth & Nithishsarwin**

Project Name: **BIOSYNC**  
Repository Name: **BIOSYNC-Attendance-Automation**

---

## Disclaimer

BIOSYNC is designed for educational and institutional attendance automation. Sensitive student, parent, staff, and institutional data must be handled securely according to the privacy policies and rules of the respective institution.
