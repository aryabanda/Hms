import sqlite3

# ✅ Correct path to your existing DB file
dbfile = r"C:\Users\DELL\OneDrive\Desktop\Mad_2 project\backend\instance\hospital.db"

departments = ["Cardiology", "Neurology", "Orthopedics", "Dermatology"]

conn = sqlite3.connect(dbfile)
cur = conn.cursor()

# ✅ Correct table name: 'departments'
for i, name in enumerate(departments, start=1):
    cur.execute(
        "INSERT OR IGNORE INTO departments (id, name, description) VALUES (?, ?, ?)",
        (i, name, f"{name} Department")
    )

conn.commit()
conn.close()

print("✅ Departments added successfully.")
