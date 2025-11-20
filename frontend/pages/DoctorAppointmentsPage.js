export default {
  template: `
    <div class="container mt-5">
      <h3 class="mb-4 text-center">My Appointments</h3>

      <!-- Flash Message -->
      <div v-if="message" :class="'alert alert-' + category" role="alert">
        {{ message }}
      </div>

      <!-- Search Bar -->
      <div class="input-group mb-3">
        <input
          type="text"
          v-model="searchQuery"
          class="form-control"
          placeholder="Search by date, time, or status"
        />
        <button class="btn btn-primary" @click="fetchAppointments">
          Refresh
        </button>
      </div>

      <!-- Appointments Table -->
      <table v-if="filteredAppointments.length" class="table table-striped table-bordered">
        <thead class="table-light">
          <tr>
            <th>ID</th>
            <th>Patient ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(appt, index) in filteredAppointments" :key="index">
            <td>{{ appt.id }}</td>
            <td>{{ appt.patient_id }}</td>
            <td>{{ appt.date }}</td>
            <td>{{ appt.time }}</td>
            <td>{{ appt.status }}</td>
            <td>{{ appt.remarks }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="text-muted text-center mt-4">
        No appointments found.
      </div>
    </div>
  `,

  data() {
    return {
      appointments: [],
      message: null,
      category: null,
      searchQuery: "",
    };
  },

  computed: {
    filteredAppointments() {
      const q = this.searchQuery.toLowerCase().trim();
      if (!q) return this.appointments;
      return this.appointments.filter(
        (a) =>
          (a.date && a.date.toLowerCase().includes(q)) ||
          (a.time && a.time.toLowerCase().includes(q)) ||
          (a.status && a.status.toLowerCase().includes(q)) ||
          (a.remarks && a.remarks.toLowerCase().includes(q))
      );
    },
  },

  methods: {
    async fetchAppointments() {
      this.message = null;
      try {
        const res = await fetch(`${location.origin}/doctor/appointments`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });

        if (res.ok) {
          this.appointments = await res.json();
          if (!this.appointments.length) {
            this.message = "No appointments available.";
            this.category = "info";
          }
        } else {
          const errorData = await res.json();
          this.message = errorData.message || "Failed to fetch appointments.";
          this.category = "danger";
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
        this.message = "An unexpected error occurred.";
        this.category = "danger";
      }
    },
  },

  mounted() {
    this.fetchAppointments();
  },
};
