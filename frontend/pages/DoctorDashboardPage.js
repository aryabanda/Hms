export default {
  template: `
  <div class="container mt-4">
    <h3 class="mb-3 text-center">Doctor Dashboard</h3>

    <!-- Flash Message -->
    <div v-if="message" :class="'alert alert-' + category" role="alert">
      {{ message }}
    </div>

    <!-- No appointments -->
    <div v-if="appointments.length === 0" class="alert alert-info text-center">
      No appointments scheduled.
    </div>

    <!-- Appointments Table -->
    <table v-else class="table table-striped table-hover align-middle">
      <thead class="table-light">
        <tr>
          <th>Patient</th>
          <th>Date</th>
          <th>Time</th>
          <th>Status</th>
          <th>Remarks</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="appt in appointments" :key="appt.id">
          <td>{{ getPatientName(appt.patient_id) }}</td>
          <td>{{ appt.date }}</td>
          <td>{{ appt.time }}</td>
          <td>
            <span :class="statusClass(appt.status)">
              {{ appt.status }}
            </span>
          </td>
          <td>{{ appt.remarks || '-' }}</td>
          <td>
            <button 
              v-if="appt.status === 'Booked'" 
              @click="markCompleted(appt.id)" 
              class="btn btn-success btn-sm">
              Mark Completed
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  `,

  data() {
    return {
      message: null,
      category: null,
      appointments: [],
      patients: {},
    };
  },

  mounted() {
    this.fetchAppointments();
  },

  methods: {
    async fetchAppointments() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.message = "You are not logged in.";
          this.category = "danger";
          return;
        }

        const res = await fetch(`${location.origin}/doctor/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch appointments");
        const data = await res.json();
        this.appointments = data;

        // Fetch patient names for mapping
        await this.fetchPatients();
      } catch (err) {
        console.error(err);
        this.message = "Error loading appointments.";
        this.category = "danger";
      }
    },

    async fetchPatients() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${location.origin}/admin/patients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          this.patients = Object.fromEntries(data.map(p => [p.id, p.username]));
        }
      } catch (e) {
        console.log("Error fetching patients:", e);
      }
    },

    getPatientName(id) {
      return this.patients[id] || "Unknown";
    },

    statusClass(status) {
      return {
        'text-success fw-bold': status === 'Completed',
        'text-warning fw-bold': status === 'Booked',
        'text-danger fw-bold': status === 'Cancelled',
      };
    },

    async markCompleted(appointmentId) {
      const diagnosis = prompt("Enter diagnosis:");
      const prescription = prompt("Enter prescription:");
      const notes = prompt("Enter any additional notes:");

      if (!diagnosis && !prescription) {
        alert("Please enter at least diagnosis or prescription to mark as completed.");
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${location.origin}/doctor/appointments/${appointmentId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ diagnosis, prescription, notes }),
        });

        const data = await res.json();
        if (res.ok) {
          this.message = data.message || "Appointment marked as completed.";
          this.category = "success";
          this.fetchAppointments();
        } else {
          this.message = data.message || "Failed to mark appointment.";
          this.category = "danger";
        }
      } catch (error) {
        console.error(error);
        this.message = "Network error.";
        this.category = "danger";
      }
    },
  },
};
