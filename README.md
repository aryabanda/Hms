🏥 Hospital Management System (HMS) — Full Stack Application

A modern, full-stack Hospital Management System built using Flask (Python) for backend and Vue.js (JS) for frontend.
It manages hospital operations such as doctor management, patient profiles, appointment scheduling, treatment records, and automated reports.

This system is designed for three roles — Admin, Doctor, and Patient, each having their own set of features and dashboards.

🌟 Features
👨‍⚕️ Admin Panel

Manage Doctors (Create, Approve, Block/Unblock, Delete)

Manage Patients

Create/Update Doctor Profiles

Manage Departments and Specializations

View all Appointments

Generate CSV Reports (Doctor appointments, Patient treatments)

Automated Email Notifications (Daily reminders, Monthly doctor activity)

🧑‍⚕️ Doctor Dashboard

View assigned appointments

Mark appointments as Completed

Add treatment notes (diagnosis, prescription, notes)

Manage Own Availability (dates + time slots)

Profile management

Patients receive email summaries after each completed appointment

👤 Patient Dashboard

Register/Login

Manage profile

View departments and doctors

View doctor availability

Book appointments

Cancel appointments

View treatment history

Export treatments as CSV

Dashboard charts for appointments summary

🗂️ Backend (Flask + SQLAlchemy)
Key Technologies:

Flask — REST API backend

Flask-JWT-Extended — Authentication

SQLAlchemy ORM — Database Models

Celery + Redis — Background scheduled tasks

Flask-Mail — Sending email reminders

Flask-CORS — Cross-origin communication

SQLite — Default database (can be upgraded)

Core Models:

User (Admin / Doctor / Patient)

DoctorProfile

PatientProfile

Appointment

Treatment

Department

💻 Frontend (Vue.js + Bootstrap)
Built With:

Vue.js (CDN-based component architecture)

Bootstrap 5 UI

Chart.js (appointment summary charts)

Token-based authentication via localStorage

SPA-style navigation using a simple router

Pages:

Admin Login / Dashboard / Doctors / Patients / Reports

Doctor Dashboard / Profile / Availability / Appointments

Patient Dashboard / Profile / Book Appointment / Appointments / Treatments

🔄 Appointment Scheduling Logic
Doctor Availability:

Doctors define availability using date → [timeslots]

Time slots are dynamically generated (11:00 AM – 5:00 PM, 30 min intervals)

Patients can only see and book available slots

When an appointment is booked → slot becomes unavailable

When a patient cancels → slot automatically becomes available again

📧 Automated Emails (Celery)

Daily appointment reminders

Monthly doctor activity summary

Appointment completion email to patients

📊 Reports

Admins can export:

Doctor appointment records (CSV)

Patient treatment history (CSV)

CSV files are stored under /reports/ and can be downloaded from the UI.

🚀 Why This Project?

This HMS system demonstrates:

Full-stack web app development

REST API + SPA integration

User authentication (JWT)

Role-based access control

Real-time booking & scheduling logic

Background tasks and reports

Clean database modeling

Frontend/Backend communication

Ideal for:

University projects

Portfolio enhancement

Real-world hospital workflow simulation
