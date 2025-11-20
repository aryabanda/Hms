# app.py
import os
import csv
import json
from io import StringIO
from datetime import datetime as DateTime, date as Date, time as Time
from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from flask_caching import Cache
from flask_mail import Mail, Message
from celery import Celery
from celery.schedules import crontab

# Import models from models.py (assumed to exist)
# models.py should define: db, User, DoctorProfile, PatientProfile, Appointment, Treatment
from models import db, User, DoctorProfile, PatientProfile, Appointment, Treatment,Department

# ---------------------------
# App & config
# ---------------------------
app = Flask(
    __name__,
    template_folder="../frontend",  # adjust if needed
    static_folder="../frontend",
    static_url_path="/static",
)

# --- Basic config (tweak for production) ---
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hospital.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "change_this_to_a_real_secret"  # set a secure key
# Celery / Redis (adjust broker/backend if needed)
app.config["broker_url"] = "redis://localhost:6379/0"
app.config["result_backend"] = "redis://localhost:6379/0"
# Cache (optional)
app.config["CACHE_TYPE"] = "SimpleCache"  # or RedisCache in prod
app.config["CACHE_DEFAULT_TIMEOUT"] = 60
# Mail (configure for your provider)
app.config["MAIL_SERVER"] = "smtp.example.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = "your_email@example.com"
app.config["MAIL_PASSWORD"] = "your_password"
app.config["MAIL_DEFAULT_SENDER"] = "your_email@example.com"

# init extensions
db.init_app(app)
jwt = JWTManager(app)
cache = Cache(app)
mail = Mail(app)
CORS(app)
def appointment_to_dict(a):
    """Return a JSON-serializable dict for an Appointment object."""
    return {
        "id": a.id,
        "patient_id": a.patient_id,
        "doctor_id": a.doctor_id,
        "doctor_name": a.doctor.username if getattr(a, "doctor", None) else None,
        "department_id": a.department_id,
        "department_name": a.department.name if getattr(a, "department", None) else None,
        # date as ISO yyyy-mm-dd (string)
        "date": a.date.isoformat() if a.date else None,
        # time as hh:mm:ss (string) — change format if you prefer e.g. "%I:%M %p"
        "time": a.time.strftime("%H:%M:%S") if a.time else None,
        "status": a.status,
        "remarks": a.remarks,
    }

# ---------------------------
# Celery factory
# ---------------------------
def make_celery(flask_app):
    celery = Celery(
        flask_app.import_name,
        backend=flask_app.config.get("result_backend"),
        broker=flask_app.config.get("broker_url"),
    )
    celery.conf.update(flask_app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with flask_app.app_context():
                return super().__call__(*args, **kwargs)

    celery.Task = ContextTask
    return celery


celery = make_celery(app)

# Ensure reports dir exists
REPORTS_DIR = os.path.join(app.root_path, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

# ---------------------------
# Create DB + default admin
# ---------------------------
first_request = True


@app.before_request
def init_db_and_admin():
    global first_request
    if first_request:
        db.create_all()
        # default admin (only created on first request if missing)
        if not User.query.filter_by(role="admin").first():
            admin = User(
                username="admin@hms.com",
                password=generate_password_hash("admin123"),
                role="admin",
                approve=True,
                blocked=False,
            )
            db.session.add(admin)
            db.session.commit()
        os.makedirs(REPORTS_DIR, exist_ok=True)
        first_request = False


# ---------------------------
# Helpers
# ---------------------------
def is_admin_claims(claims):
    return claims.get("role") == "admin"


def is_doctor_claims(claims):
    return claims.get("role") == "doctor"


def is_patient_claims(claims):
    return claims.get("role") == "patient"


# ---------------------------
# Home
# ---------------------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------
# AUTH: register / login
# - NOTE: only patients self-register. Doctors are created by admin.
# ---------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    # Only patient self-register allowed
    role = (data.get("role") or "patient").strip().lower()

    if not username or not password or role != "patient":
        return (
            jsonify(
                {
                    "category": "danger",
                    "message": "username & password required; role must be 'patient'",
                }
            ),
            400,
        )

    if User.query.filter_by(username=username).first():
        return jsonify({"category": "danger", "message": "User already exists"}), 400

    hashed = generate_password_hash(password)
    # patients auto-approved
    user = User(username=username, password=hashed, role="patient", approve=True, blocked=False)
    db.session.add(user)
    db.session.commit()
    return jsonify({"category": "success", "message": "registered"}), 200


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"category": "danger", "message": "username & password required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"category": "danger", "message": "Bad username or password"}), 401

    if user.blocked:
        return jsonify({"category": "danger", "message": "Account blocked"}), 401

    # For doctors, admin must create them and profile may be created by admin
    redirect = None
    if user.role == "patient":
        profile = PatientProfile.query.filter_by(user_id=user.id).first()
        redirect = "patient_profile" if not profile else "patient_dashboard"
    elif user.role == "doctor":
        # doctors may be added by admin. If admin hasn't added doctor profile, redirect to doctor_profile (admin will usually add profile)
        profile = DoctorProfile.query.filter_by(user_id=user.id).first()
        # doctor accounts require admin approval to be active
        if not user.approve:
            return (
                jsonify(
                    {"category": "danger", "message": "Your doctor account is not approved yet."}
                ),
                401,
            )
        if user.blocked:
            return jsonify({"category": "danger", "message": "Your account is blocked."}), 401
        redirect = "doctor_profile" if not profile else "doctor_dashboard"
    elif user.role == "admin":
        redirect = "admin_dashboard"

    token = create_access_token(
        identity=user.username, additional_claims={"user_id": user.id, "role": user.role, "redirect": redirect}
    )
    return jsonify({"access_token": token}), 200


@app.route("/get-claims", methods=["GET"])
@jwt_required()
def get_claims():
    claims = get_jwt()
    return jsonify({"claims": claims}), 200


# ---------------------------
# ADMIN endpoints
# ---------------------------
@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"category": "danger", "message": "username & password required"}), 400

    user = User.query.filter_by(username=username, role="admin").first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"category": "danger", "message": "Bad username or password"}), 401
    token = create_access_token(identity=user.username, additional_claims={"admin_user_id": user.id, "role": "admin"})
    return jsonify({"access_token": token}), 200


@app.route("/admin/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401

    total_doctors = User.query.filter_by(role="doctor").count()
    total_patients = User.query.filter_by(role="patient").count()
    total_appointments = Appointment.query.count()
    upcoming = Appointment.query.filter(Appointment.date >= DateTime.now().date()).count()
    return jsonify(
        {
            "total_doctors": total_doctors,
            "total_patients": total_patients,
            "total_appointments": total_appointments,
            "upcoming_appointments": upcoming,
        }
    ), 200


# ----------------------------
# Admin: List or Create Doctors
# ----------------------------
@app.route("/admin/doctors", methods=["GET", "POST"])
@jwt_required()
def admin_doctors():
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401

    if request.method == "GET":
        doctors = User.query.filter_by(role="doctor").all()
        data = []
        for d in doctors:
            profile = DoctorProfile.query.filter_by(user_id=d.id).first()
            data.append({
                "id": d.id,
                "username": d.username,
                "approve": d.approve,
                "blocked": d.blocked,
                "specialization_id": profile.specialization_id if profile else None,
                "specialization_name": Department.query.get(profile.specialization_id).name if profile and profile.specialization_id else None,
                "experience": profile.experience if profile else None,
                "availability": profile.availability if profile else None
            })
        return jsonify(data), 200

    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password", "changeme123")
    specialization_id = data.get("specialization_id")
    experience = data.get("experience")
    availability = data.get("availability")

    if not username:
        return jsonify({"message": "Username required"}), 400
    if not specialization_id:
        return jsonify({"message": "Specialization required"}), 400
    if not Department.query.get(specialization_id):
        return jsonify({"message": "Invalid specialization ID"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 400

    user = User(username=username, password=generate_password_hash(password), role="doctor", approve=data.get("approve", False), blocked=False)
    db.session.add(user)
    db.session.commit()

    profile = DoctorProfile(user_id=user.id, specialization_id=specialization_id, experience=experience, availability=availability)
    db.session.add(profile)
    db.session.commit()

    return jsonify({"message": "Doctor created successfully"}), 201


@app.route("/admin/doctors/<int:user_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
def admin_doctor_detail(user_id):
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401

    user = User.query.get_or_404(user_id)
    if user.role != "doctor":
        return jsonify({"message": "User is not a doctor"}), 400

    if request.method == "GET":
        profile = DoctorProfile.query.filter_by(user_id=user.id).first()
        return jsonify({"id": user.id, "username": user.username, "approve": user.approve, "blocked": user.blocked, "profile": profile.as_dict() if profile else None}), 200

    if request.method == "PUT":
        data = request.get_json() or {}
        user.approve = data.get("approve", user.approve)
        user.blocked = data.get("blocked", user.blocked)
        db.session.commit()
        return jsonify({"message": "updated"}), 200

    if request.method == "DELETE":
        prof = DoctorProfile.query.filter_by(user_id=user.id).first()
        if prof:
            db.session.delete(prof)
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "deleted"}), 200


# Admin: create or update doctor profile
@app.route("/admin/doctors/<int:user_id>/profile", methods=["POST"])
@jwt_required()
def admin_doctor_profile(user_id):
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401

    user = User.query.get_or_404(user_id)
    if user.role != "doctor":
        return jsonify({"message": "User is not a doctor"}), 400

    data = request.get_json() or {}
    specialization_id = data.get("dept_id")
    experience = data.get("experience")
    availability = data.get("availability")

    # Find or create profile
    profile = DoctorProfile.query.filter_by(user_id=user_id).first()
    if profile:
        profile.specialization_id = specialization_id or profile.specialization_id
        profile.experience = experience or profile.experience
        profile.availability = availability or profile.availability
    else:
        profile = DoctorProfile(
            user_id=user_id,
            specialization_id=specialization_id,
            experience=experience,
            availability=availability
        )
        db.session.add(profile)

    db.session.commit()
    return jsonify({"message": "Doctor profile saved successfully"}), 200


@app.route("/admin/patients", methods=["GET"])
@jwt_required()
def admin_patients():
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401
    patients = User.query.filter_by(role="patient").all()
    return jsonify([{"id": p.id, "username": p.username} for p in patients]), 200


@app.route("/admin/appointments", methods=["GET"])
@jwt_required()
def admin_appointments():
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401
    appts = Appointment.query.order_by(Appointment.date.desc(), Appointment.time.desc()).all()
    result = []
    for a in appts:
        result.append({"id": a.id, "patient_id": a.patient_id, "doctor_id": a.doctor_id, "date": str(a.date), "time": str(a.time), "status": a.status, "remarks": a.remarks})
    return jsonify(result), 200


@app.route("/admin/block_user/<int:user_id>", methods=["POST"])
@jwt_required()
def admin_block_user(user_id):
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401
    data = request.get_json() or {}
    action = data.get("action")
    user = User.query.get_or_404(user_id)
    if action == "block":
        user.blocked = True
    elif action == "unblock":
        user.blocked = False
    elif action == "approve":
        user.approve = True
    elif action == "reject":
        user.approve = False
    else:
        return jsonify({"message": "invalid action"}), 400
    db.session.commit()
    return jsonify({"message": "done"}), 200


# Admin: trigger CSV export of appointments for a doctor
@app.route("/admin/export/<int:professional_id>", methods=["GET"])
@jwt_required()
def export_service_requests(professional_id):
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401
    task = export_professional_service_requests.delay(professional_id)
    return jsonify({"message": f"Export started for professional ID {professional_id}.", "task_id": task.id}), 202


@app.route("/admin/reports/list", methods=["GET"])
@jwt_required()
def list_reports():
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401
    os.makedirs(REPORTS_DIR, exist_ok=True)
    files = [f for f in os.listdir(REPORTS_DIR) if f.endswith(".csv")]
    return jsonify({"downloads": files}), 200


@app.route("/admin/reports/download/<filename>", methods=["GET"])
@jwt_required()
def download_report(filename):
    claims = get_jwt()
    if not is_admin_claims(claims):
        return jsonify({"message": "Admin only"}), 401
    return send_from_directory(REPORTS_DIR, filename, as_attachment=True)


# ---------------------------
# DOCTOR endpoints
# ---------------------------
@app.route("/doctor/profile", methods=["GET", "POST"])
@jwt_required()
def doctor_profile():
    claims = get_jwt()
    doctor_id = claims.get("id")

    profile = DoctorProfile.query.filter_by(user_id=doctor_id).first()

    # -------- GET --------
    if request.method == "GET":
        if not profile:
            return jsonify({"message": "no profile"}), 200

        return jsonify({
            "username": profile.user.username,
            "specialization_id": profile.specialization_id,
            "experience": profile.experience,
            "availability": profile.availability  # stored as JSON string
        }), 200

    # -------- POST --------
    data = request.get_json()
    specialization_id = data.get("specialization_id")
    experience = data.get("experience")
    availability = data.get("availability")  # JSON string from frontend

    if not profile:
        profile = DoctorProfile(
            user_id=doctor_id,
            specialization_id=specialization_id,
            experience=experience,
            availability=availability
        )
        db.session.add(profile)
    else:
        profile.specialization_id = specialization_id
        profile.experience = experience
        profile.availability = availability

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"}), 200

# @app.route("/doctor/availability", methods=["GET", "POST"])
# @jwt_required()
# def doctor_availability():
#     claims = get_jwt()
#     doctor_id = claims.get("id")

#     profile = DoctorProfile.query.filter_by(user_id=doctor_id).first()
#     if not profile:
#         return jsonify({"message": "Doctor profile not found"}), 404

#     if request.method == "GET":
#         return jsonify({"availability": profile.availability}), 200

#     data = request.get_json()
#     availability = json.dumps(data.get("availability", {}))
#     profile.availability = availability
#     db.session.commit()
#     return jsonify({"message": "Availability updated successfully"}), 200


@app.route("/doctor/appointments", methods=["GET"])
@jwt_required()
def doctor_appointments():
    claims = get_jwt()
    if not is_doctor_claims(claims):
        return jsonify({"message": "Doctor only"}), 401
    doctor_id = claims["user_id"]
    appts = Appointment.query.filter_by(doctor_id=doctor_id).order_by(Appointment.date.asc(), Appointment.time.asc()).all()
    result = []
    for a in appts:
        result.append({"id": a.id, "patient_id": a.patient_id, "date": str(a.date), "time": str(a.time), "status": a.status, "remarks": a.remarks})
    return jsonify(result), 200


@app.route("/doctor/appointments/<int:appointment_id>/complete", methods=["POST"])
@jwt_required()
def doctor_complete_appointment(appointment_id):
    claims = get_jwt()
    if not is_doctor_claims(claims):
        return jsonify({"message": "Doctor only"}), 401
    doctor_id = claims["user_id"]
    appt = Appointment.query.get_or_404(appointment_id)
    if appt.doctor_id != doctor_id:
        return jsonify({"message": "Not your appointment"}), 401

    data = request.get_json() or {}
    diagnosis = data.get("diagnosis", "")
    prescription = data.get("prescription", "")
    notes = data.get("notes", "")

    appt.status = "Completed"
    db.session.commit()

    treatment = Treatment(appointment_id=appt.id, diagnosis=diagnosis, prescription=prescription, notes=notes)
    db.session.add(treatment)
    db.session.commit()

    # optional: notify patient by email if patient.username is an email
    try:
        patient_user = User.query.get(appt.patient_id)
        if patient_user and "@" in patient_user.username:
            msg = Message(subject="Your visit summary", recipients=[patient_user.username], body=f"Your appointment on {appt.date} with doctor id {appt.doctor_id} is completed.\nDiagnosis: {diagnosis}\nPrescription: {prescription}")
            mail.send(msg)
    except Exception:
        pass

    return jsonify({"message": "Appointment completed and treatment saved"}), 200

# ✅ Get availability
# @app.route("/doctor/<int:doctor_id>/availability", methods=["GET"])
# @jwt_required()
# def get_doctor_availability(doctor_id):
#     profile = DoctorProfile.query.filter_by(user_id=doctor_id).first()
#     if not profile or not profile.availability:
#         return jsonify({"availability": []}), 200

#     availability_data = json.loads(profile.availability)
#     available_days = []

#     for date, available in availability_data.items():
#         if available:
#             slots = []
#             start_hour = 11
#             end_hour = 17
#             current = datetime.strptime(f"{date} {start_hour}:00", "%Y-%m-%d %H:%M")
#             while current.hour < end_hour:
#                 slot = current.strftime("%I:%M %p")
#                 existing = Appointment.query.filter_by(
#                     doctor_id=doctor_id,
#                     date=date,
#                     time=slot
#                 ).first()
#                 if existing and existing.status=="Booked":
#                     current += timedelta(minutes=30)
#                     continue
#                 slots.append(slot)
#                 current += timedelta(minutes=30)
#             available_days.append({"date": date, "slots": slots})

#     return jsonify({"availability": available_days}), 200

@app.route("/doctor/<int:doctor_id>/availability", methods=["GET"])
@jwt_required()
def get_doctor_availability(doctor_id):
    profile = DoctorProfile.query.filter_by(user_id=doctor_id).first()
    
    if not profile or not profile.availability:
        return jsonify({"availability": []}), 200

    availability_data = json.loads(profile.availability)
    available_days = []

    for date_str, available in availability_data.items():
        if not available:
            continue

        slots = []
        start_hour = 11
        end_hour = 17

        # Convert date string → date object
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()

        current = datetime.strptime(f"{date_str} {start_hour}:00", "%Y-%m-%d %H:%M")

        while current.hour < end_hour:
            slot_time = current.time()                 # proper time object
            slot_str = current.strftime("%I:%M %p")    # for display

            # Check if slot is booked
            existing = Appointment.query.filter_by(
                doctor_id=doctor_id,
                date=date_obj,
                time=slot_time
            ).first()

            # skip booked slots
            if existing and existing.status == "Booked":
                current += timedelta(minutes=30)
                continue

            # Add slot only if NOT booked
            slots.append(slot_str)
            current += timedelta(minutes=30)

        available_days.append({
            "date": date_str,
            "slots": slots
        })

    return jsonify({"availability": available_days}), 200


# ✅ Get already booked appointments
@app.route("/doctor/<int:doctor_id>/appointments", methods=["GET"])
@jwt_required()
def get_doctor_booked_appointments(doctor_id):
    # get appointments and include doctor / department via relationships if available
    appts = Appointment.query.filter_by(doctor_id=doctor_id).order_by(Appointment.date.asc(), Appointment.time.asc()).all()
    booked = [appointment_to_dict(a) for a in appts]
    return jsonify({"appointments": booked}), 200

@app.route("/appointments/book", methods=["POST"])
@jwt_required()
def book_appointment():
    claims = get_jwt()
    patient_id = claims.get("user_id")
    data = request.get_json()
    doctor_id = data.get("doctor_id")
    date_str = data.get("date")
    time_str = data.get("time")

    if not (doctor_id and date_str and time_str):
        return jsonify({"message": "Missing data"}), 400

    # ✅ Convert date string to date object
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format"}), 400

    # ✅ Convert time string ("04:00 PM") to time object
    try:
        time_obj = datetime.strptime(time_str, "%I:%M %p").time()
    except ValueError:
        return jsonify({"message": "Invalid time format"}), 400

    # Check for existing appointment
    existing = Appointment.query.filter_by(
        doctor_id=doctor_id,
        date=date_obj,
        time=time_obj
    ).first()

    if existing!= None and existing.status=="Booked":
        return jsonify({"message": "Slot already booked"}), 400

    new_appt = Appointment(
        doctor_id=doctor_id,
        patient_id=patient_id,
        date=date_obj,
        time=time_obj,
        status="Booked"
    )
    db.session.add(new_appt)
    db.session.commit()

    return jsonify({"message": "Appointment booked successfully!"}), 201


# # Doctor: Get current availability
# @app.route("/doctor/availability", methods=["GET"])
# @jwt_required()
# def get_my_availability():
#     claims = get_jwt()
#     if claims["role"] != "doctor":
#         return jsonify({"message": "Unauthorized"}), 403

#     doctor = User.query.filter_by(id=claims["id"]).first()
#     profile = DoctorProfile.query.filter_by(user_id=doctor.id).first()

#     if not profile:
#         return jsonify({"message": "No profile found"}), 404

#     return jsonify({"availability": profile.availability or "{}"}), 200


# # Doctor: Update availability
# @app.route("/doctor/availability", methods=["POST"])
# @jwt_required()
# def update_my_availability():
#     claims = get_jwt()
#     if claims["role"] != "doctor":
#         return jsonify({"message": "Unauthorized"}), 403

#     data = request.get_json() or {}
#     availability = data.get("availability")

#     profile = DoctorProfile.query.filter_by(user_id=claims["id"]).first()
#     if not profile:
#         return jsonify({"message": "Profile not found"}), 404

#     profile.availability = availability
#     db.session.commit()

#     return jsonify({"message": "Availability updated successfully"}), 200

@app.route("/doctor/availability", methods=["GET", "POST"])
@jwt_required()
def doctor_availability():
    claims = get_jwt()
    # Use correct claim key for ID
    doctor_id = claims.get("user_id")  

    profile = DoctorProfile.query.filter_by(user_id=doctor_id).first()
    if not profile:
        return jsonify({"message": "Doctor profile not found"}), 404

    # ✅ GET: return current availability
    if request.method == "GET":
        availability = json.loads(profile.availability) if profile.availability else {}
        return jsonify({"availability": availability}), 200

    # ✅ POST: update availability
    data = request.get_json() or {}
    availability = data.get("availability")
    if not availability:
        return jsonify({"message": "No availability data received"}), 400

    profile.availability = json.dumps(availability)
    db.session.commit()

    return jsonify({"message": "Availability updated successfully"}), 200


# ---------------------------
# PATIENT endpoints
# ---------------------------
@app.route("/patient/profile", methods=["GET", "POST"])
@jwt_required()
def patient_profile():
    claims = get_jwt()
    if not is_patient_claims(claims):
        return jsonify({"message": "Patient only"}), 401
    user_id = claims["user_id"]
    profile = PatientProfile.query.filter_by(user_id=user_id).first()
    if request.method == "GET":
        if not profile:
            return jsonify({"message": "no profile"}), 200
        return jsonify(profile.as_dict()), 200

    data = request.get_json() or {}
    full_name = data.get("full_name")
    age = data.get("age")
    contact = data.get("contact")
    address = data.get("address")

    if profile:
        profile.full_name = full_name or profile.full_name
        profile.age = age or profile.age
        profile.contact = contact or profile.contact
        profile.address = address or profile.address
    else:
        profile = PatientProfile(user_id=user_id, full_name=full_name, age=age, contact=contact, address=address)
        db.session.add(profile)
    db.session.commit()
    return jsonify({"message": "saved"}), 200


@app.route("/patient/dashboard", methods=["GET"])
@jwt_required()
def patient_dashboard():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Unauthorized", "category": "danger"}), 403

    user_id = claims.get("user_id")
    patient = db.session.get(User, user_id)
    if not patient:
        return jsonify({"message": "Patient not found", "category": "danger"}), 404

    # Get all departments
    departments = Department.query.all()
    dept_list = [{"id": d.id, "name": d.name, "description": d.description} for d in departments]

    return jsonify({
        "message": "Dashboard loaded successfully",
        "category": "success",
        "patient": patient.username,
        "departments": dept_list
    }), 200

@app.route("/departments/<int:dept_id>", methods=["GET"])
@jwt_required()
def get_department_details(dept_id):
    # Get department info
    dept = db.session.get(Department, dept_id)
    if not dept:
        return jsonify({"message": "Department not found"}), 404

    # Get doctors who specialize in this department
    doctors = (
        db.session.query(User, DoctorProfile)
        .join(DoctorProfile, DoctorProfile.user_id == User.id)
        .filter(
            User.role == "doctor",
            User.approve == True,
            DoctorProfile.specialization_id == dept_id
        )
        .all()
    )

    doctor_list = []
    for user, profile in doctors:
        doctor_list.append({
            "id": user.id,
            "name": user.username,
            "experience": profile.experience,
        })

    return jsonify({
        "department": {
            "id": dept.id,
            "name": dept.name,
            "description": dept.description
        },
        "doctors": doctor_list
    }), 200




@app.route("/patient/appointments", methods=["GET"])
@jwt_required()
def patient_appointments():
    claims = get_jwt()
    if claims.get("role") != "patient":
        return jsonify({"message": "Access restricted to patients only"}), 403

    user_id = claims.get("user_id")

    appts = Appointment.query.filter_by(patient_id=user_id)\
        .order_by(Appointment.date.desc(), Appointment.time.desc()).all()

    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "date": str(a.date),
            "time": str(a.time),
            "status": a.status,
            "remarks": a.remarks,

            "doctor_username": a.doctor.username if a.doctor else "Unknown",
            "department": a.department.name if a.department else "Unknown",

            "can_cancel": a.status.lower() == "booked"
        })

    return jsonify(result), 200


@app.route("/patient/appointments/<int:appointment_id>/cancel", methods=["POST"])
@jwt_required()
def patient_cancel_appointment(appointment_id):
    claims = get_jwt()
    if not is_patient_claims(claims):
        return jsonify({"message": "Patient only"}), 401
    user_id = claims["user_id"]
    appt = Appointment.query.get_or_404(appointment_id)
    if appt.patient_id != user_id:
        return jsonify({"message": "Not your appointment"}), 401
    if appt.status != "Booked":
        return jsonify({"message": "Only booked appointments can be cancelled"}), 400
    appt.status = "Cancelled"
    db.session.commit()
    return jsonify({"message": "cancelled"}), 200


@app.route("/patient/treatments", methods=["GET"])
@jwt_required()
def patient_treatments():
    claims = get_jwt()
    if not is_patient_claims(claims):
        return jsonify({"message": "Patient only"}), 401
    user_id = claims["user_id"]
    treatments = Treatment.query.join(Appointment, Treatment.appointment_id == Appointment.id).filter(Appointment.patient_id == user_id).all()
    out = []
    for t in treatments:
        appt = Appointment.query.get(t.appointment_id)
        out.append({"treatment_id": t.id, "appointment_id": t.appointment_id, "appointment_date": str(appt.date) if appt else None, "diagnosis": t.diagnosis, "prescription": t.prescription, "notes": t.notes})
    return jsonify(out), 200


@app.route("/patient/export_treatments", methods=["GET"])
@jwt_required()
def patient_export_treatments():
    claims = get_jwt()
    if not is_patient_claims(claims):
        return jsonify({"message": "Patient only"}), 401
    patient_id = claims["user_id"]
    task = export_treatments_csv.delay(patient_id)
    return jsonify({"task_id": task.id}), 202


@app.route("/reports/download/<path:filename>", methods=["GET"])
@jwt_required()
def reports_download(filename):
    # allow admins or owner check in prod; for now keep minimal checks
    return send_from_directory(REPORTS_DIR, filename, as_attachment=True)

@app.route('/departments', methods=['GET'])
@jwt_required(optional=True)
def get_departments():
    departments = Department.query.all()
    return jsonify([{
        "id": d.id,
        "name": d.name, "description": d.description
    } for d in departments]), 200



# ---------------------------
# CELERY tasks
# ---------------------------

@celery.task(name="tasks.daily_reminder")
def daily_reminder():
    today = DateTime.now().date()
    appts = Appointment.query.filter_by(date=today, status="Booked").all()
    for a in appts:
        patient = User.query.get(a.patient_id)
        doctor = User.query.get(a.doctor_id)
        if patient and "@" in patient.username:
            try:
                msg = Message(subject="Appointment Reminder", recipients=[patient.username], body=f"Reminder: Appointment with Dr {doctor.username if doctor else 'N/A'} at {a.time} on {a.date}")
                mail.send(msg)
            except Exception:
                pass
    return "done"


@celery.task(name="tasks.monthly_doctor_activity")
def monthly_doctor_activity():
    doctors = User.query.filter_by(role="doctor", approve=True).all()
    now = DateTime.now()
    month = now.month
    for d in doctors:
        appts = Appointment.query.filter(Appointment.doctor_id == d.id, func.strftime("%m", Appointment.date) == f"{month:02d}").all()
        html = f"<h2>Activity for {d.username} - {now.strftime('%B %Y')}</h2><ul>"
        for a in appts:
            html += f"<li>{a.date} {a.time} - {a.status}</li>"
        html += "</ul>"
        if "@" in d.username:
            try:
                msg = Message(subject=f"Monthly Activity - {now.strftime('%B %Y')}", recipients=[d.username], html=html)
                mail.send(msg)
            except Exception:
                pass
    return "done"


@celery.task(name="tasks.export_treatments_csv")
def export_treatments_csv(patient_id):
    treatments = Treatment.query.join(Appointment).filter(Appointment.patient_id == patient_id).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["appointment_date", "doctor_username", "diagnosis", "prescription", "notes"])
    for t in treatments:
        appt = Appointment.query.get(t.appointment_id)
        doctor = User.query.get(appt.doctor_id) if appt else None
        writer.writerow([str(appt.date) if appt else "", doctor.username if doctor else "", t.diagnosis, t.prescription, t.notes])
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"patient_{patient_id}_treatments.csv")
    with open(path, "w", newline="") as f:
        f.write(output.getvalue())
    return path


@celery.task(name="tasks.export_professional_service_requests")
def export_professional_service_requests(professional_id):
    appts = Appointment.query.filter_by(doctor_id=professional_id).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["appointment_id", "patient_id", "date", "time", "status", "remarks"])
    for a in appts:
        writer.writerow([a.id, a.patient_id, str(a.date), str(a.time), a.status, a.remarks])
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"doctor_{professional_id}_appointments.csv")
    with open(path, "w", newline="") as f:
        f.write(output.getvalue())
    return path


# Celery beat schedule (if you run celery beat)
celery.conf.beat_schedule = {
    "daily-reminder": {"task": "tasks.daily_reminder", "schedule": crontab(hour=8, minute=0)},
    "monthly-doctor-activity": {"task": "tasks.monthly_doctor_activity", "schedule": crontab(hour=7, minute=0, day_of_month=1)},
}

# ---------------------------
# Run
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)
