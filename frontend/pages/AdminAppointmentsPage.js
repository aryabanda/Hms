export default {
  template: `
  <div class="container mt-4">
    <div class="row mb-4">
      <div class="col text-center">
        <h2>Hospital Appointment Summary</h2>
      </div>
    </div>

    <div v-if="message" :class="'alert alert-' + category" role="alert">
      {{ message }}
    </div>

    <div class="row">
      <div class="col-md-4 mb-3">
        <div class="card text-center p-3">
          <h4>Total Doctors</h4>
          <h2>{{ stats.total_doctors }}</h2>
        </div>
      </div>
      <div class="col-md-4 mb-3">
        <div class="card text-center p-3">
          <h4>Total Patients</h4>
          <h2>{{ stats.total_patients }}</h2>
        </div>
      </div>
      <div class="col-md-4 mb-3">
        <div class="card text-center p-3">
          <h4>Total Appointments</h4>
          <h2>{{ stats.total_appointments }}</h2>
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-md-6">
        <h4>Upcoming Appointments</h4>
        <canvas id="appointmentsChart" width="400" height="250"></canvas>
      </div>

      <div class="col-md-6">
        <h4>Appointments by Status</h4>
        <canvas id="statusChart" width="400" height="250"></canvas>
      </div>
    </div>
  </div>
  `,

  data() {
    return {
      message: null,
      category: null,
      stats: {
        total_doctors: 0,
        total_patients: 0,
        total_appointments: 0,
        upcoming_appointments: 0
      },
      appointments: [],
      appointmentsChart: null,
      statusChart: null
    };
  },

  mounted() {
    this.fetchDashboardStats();
    this.fetchAppointments();
  },

  methods: {
    async fetchDashboardStats() {
      try {
        const res = await fetch(`${location.origin}/admin/dashboard`, {
          headers: { 
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard');
        const data = await res.json();
        this.stats = data;
      } catch (err) {
        this.message = err.message;
        this.category = 'danger';
      }
    },

    async fetchAppointments() {
      try {
        const res = await fetch(`${location.origin}/admin/appointments`, {
          headers: { 
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        });
        if (!res.ok) throw new Error('Failed to fetch appointments');
        const data = await res.json();
        this.appointments = data;

        this.renderCharts();
      } catch (err) {
        console.error(err);
        this.message = err.message;
        this.category = 'danger';
      }
    },

    renderCharts() {
      const ctx1 = document.getElementById('appointmentsChart').getContext('2d');
      const ctx2 = document.getElementById('statusChart').getContext('2d');

      // Chart 1: Appointments per day
      const grouped = {};
      this.appointments.forEach(a => {
        grouped[a.date] = (grouped[a.date] || 0) + 1;
      });
      const labels = Object.keys(grouped);
      const counts = Object.values(grouped);

      if (this.appointmentsChart) this.appointmentsChart.destroy();
      this.appointmentsChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Appointments per Day',
            data: counts,
            backgroundColor: 'rgba(54, 162, 235, 0.4)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });

      // Chart 2: Appointments by status
      const statusGrouped = {};
      this.appointments.forEach(a => {
        statusGrouped[a.status] = (statusGrouped[a.status] || 0) + 1;
      });
      const sLabels = Object.keys(statusGrouped);
      const sCounts = Object.values(statusGrouped);

      if (this.statusChart) this.statusChart.destroy();
      this.statusChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: sLabels,
          datasets: [{
            label: 'Appointment Status',
            data: sCounts,
            backgroundColor: [
              'rgba(75,192,192,0.5)',
              'rgba(255,159,64,0.5)',
              'rgba(255,99,132,0.5)',
              'rgba(153,102,255,0.5)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }
};
