export default {
  template: `
  <div class="container mt-4">
    <h3 class="text-center mb-4">My Appointments</h3>

    <!-- Alerts -->
    <div v-if="message" :class="'alert alert-' + category" role="alert">
      {{ message }}
    </div>

    <!-- Appointment Table -->
    <div class="table-responsive mb-4" v-if="appointments.length > 0">
      <table class="table table-bordered text-center">
        <thead class="table-dark">
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Doctor</th>
            <th>Status</th>
            <th>Remarks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="appt in appointments" :key="appt.id">
            <td>{{ appt.date }}</td>
            <td>{{ appt.time }}</td>
            <td>{{ appt.doctor_username }}</td>
            <td><span :class="badgeClass(appt.status)">{{ appt.status }}</span></td>
            <td>{{ appt.remarks || '-' }}</td>
            <td>
              <button 
                class="btn btn-sm btn-danger"
                @click="cancelAppointment(appt.id)"
                v-if="appt.status.toLowerCase() === 'booked'">
                Cancel
              </button>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Chart -->
    <h4 class="text-center">Appointments Summary</h4>
    <canvas id="appointmentsChart" height="200"></canvas>
  </div>
  `,

  data() {
    return {
      appointmentsChart: null,
      appointments: [],
      message: null,
      category: null,
    };
  },

  methods: {
    badgeClass(status) {
      return {
        "badge bg-primary": status === "Booked",
        "badge bg-warning text-dark": status === "Pending",
        "badge bg-success": status === "Completed",
        "badge bg-danger": status === "Cancelled",
      };
    },

    async fetchAppointments() {
      try {
        const response = await fetch(`${location.origin}/patient/appointments`, {
          headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });

        if (!response.ok) throw new Error("Failed to fetch appointments");

        const data = await response.json();
        this.appointments = data;

        if (data.length === 0) {
          this.message = "No appointments found.";
          this.category = "info";
          this.updateAppointmentsChart([], []);
          return;
        }

        const grouped = {};
        data.forEach(a => {
          grouped[a.date] = (grouped[a.date] || 0) + 1;
        });

        this.updateAppointmentsChart(Object.keys(grouped), Object.values(grouped));

      } catch (error) {
        this.message = "Unable to load appointments.";
        this.category = "danger";
      }
    },

    async cancelAppointment(id) {
      if (!confirm("Are you sure you want to cancel this appointment?")) return;

      try {
        const response = await fetch(`${location.origin}/patient/appointments/${id}/cancel`, {
          method: "POST",
          headers: { 
            "Authorization": "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json"
          }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        this.message = "Appointment cancelled successfully!";
        this.category = "success";
        await this.fetchAppointments(); // Refresh
        
      } catch (error) {
        this.message = error.message;
        this.category = "danger";
      }
    },

    updateAppointmentsChart(labels, data) {
      const ctx = document.getElementById("appointmentsChart").getContext("2d");
      if (this.appointmentsChart) this.appointmentsChart.destroy();

      this.appointmentsChart = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Appointments Per Day", data }] },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
    }
  },

  mounted() {
    this.fetchAppointments();
  }
};
