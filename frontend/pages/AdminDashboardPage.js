export default {
  template: `
  <div class="container mt-4">
    <h2 class="text-center mb-4">Admin Dashboard</h2>

    <!-- DOCTORS SECTION -->
    <div class="mb-5">
      <h4>Manage Doctors</h4>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Approved</th>
            <th>Blocked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in doctors" :key="doc.id">
            <td>{{ doc.id }}</td>
            <td>{{ doc.username }}</td>
            <td>{{ doc.approve ? "Yes" : "No" }}</td>
            <td>{{ doc.blocked ? "Yes" : "No" }}</td>
            <td>
              <button class="btn btn-sm btn-success me-2" v-if="!doc.approve" @click="updateDoctor(doc.id, 'approve')">Approve</button>
              <button class="btn btn-sm btn-secondary me-2" v-if="doc.approve" @click="updateDoctor(doc.id, 'reject')">Reject</button>
              <button class="btn btn-sm btn-danger me-2" v-if="!doc.blocked" @click="updateDoctor(doc.id, 'block')">Block</button>
              <button class="btn btn-sm btn-warning" v-if="doc.blocked" @click="updateDoctor(doc.id, 'unblock')">Unblock</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PATIENTS SECTION -->
    <div class="mb-5">
      <h4>Patients</h4>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in patients" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.username }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- APPOINTMENTS SECTION -->
    <div>
      <h4>Appointments</h4>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient ID</th>
            <th>Doctor ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in appointments" :key="a.id">
            <td>{{ a.id }}</td>
            <td>{{ a.patient_id }}</td>
            <td>{{ a.doctor_id }}</td>
            <td>{{ a.date }}</td>
            <td>{{ a.time }}</td>
            <td>{{ a.status }}</td>
            <td>{{ a.remarks || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `,

  data() {
    return {
      doctors: [],
      patients: [],
      appointments: [],
      message: null,
      category: null
    };
  },

  mounted() {
    this.fetchDoctors();
    this.fetchPatients();
    this.fetchAppointments();
  },

  methods: {
    async fetchDoctors() {
      try {
        const res = await fetch(`${location.origin}/admin/doctors`, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (!res.ok) throw new Error('Failed to fetch doctors');
        const data = await res.json();
        this.doctors = data;
      } catch (err) {
        console.error(err);
      }
    },

    async fetchPatients() {
      try {
        const res = await fetch(`${location.origin}/admin/patients`, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (!res.ok) throw new Error('Failed to fetch patients');
        const data = await res.json();
        this.patients = data;
      } catch (err) {
        console.error(err);
      }
    },

    async fetchAppointments() {
      try {
        const res = await fetch(`${location.origin}/admin/appointments`, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (!res.ok) throw new Error('Failed to fetch appointments');
        const data = await res.json();
        this.appointments = data;
      } catch (err) {
        console.error(err);
      }
    },

    async updateDoctor(userId, action) {
      try {
        const res = await fetch(`${location.origin}/admin/block_user/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          },
          body: JSON.stringify({ action })
        });

        if (!res.ok) throw new Error('Failed to update doctor');
        const data = await res.json();
        console.log(data);
        this.fetchDoctors();
      } catch (err) {
        console.error(err);
        alert('Error updating doctor status');
      }
    }
  }
};
