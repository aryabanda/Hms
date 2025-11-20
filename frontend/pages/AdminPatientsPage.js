export default {
  template: `
  <div class="container mt-4">
    <h3 class="text-center mb-4">Patient Management</h3>

    <div v-if="message" :class="'alert alert-' + category" role="alert">
      {{ message }}
    </div>

    <div class="text-end mb-3">
      <button @click="fetchPatients" class="btn btn-outline-primary">Refresh</button>
    </div>

    <table class="table table-striped">
      <thead>
        <tr>
          <th>ID</th>
          <th>Username (Email)</th>
          <th>Full Name</th>
          <th>Age</th>
          <th>Contact</th>
          <th>Address</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="patient in patients" :key="patient.id">
          <td>{{ patient.id }}</td>
          <td>{{ patient.username }}</td>
          <td>{{ patient.profile?.full_name || 'N/A' }}</td>
          <td>{{ patient.profile?.age || '-' }}</td>
          <td>{{ patient.profile?.contact || '-' }}</td>
          <td>{{ patient.profile?.address || '-' }}</td>
          <td>
            <button
              @click="toggleBlock(patient)"
              :class="patient.blocked ? 'btn btn-success btn-sm' : 'btn btn-danger btn-sm'">
              {{ patient.blocked ? 'Unblock' : 'Block' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  `,

  data() {
    return {
      patients: [],
      message: null,
      category: null,
    };
  },

  mounted() {
    this.fetchPatients();
  },

  methods: {
    async fetchPatients() {
      try {
        const res = await fetch(`${location.origin}/admin/patients`, {
          headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
          },
        });

        if (res.ok) {
          const data = await res.json();

          // backend gives only users; fetch profiles separately if needed
          const patientsWithProfiles = await Promise.all(
            data.map(async (u) => {
              const profileRes = await fetch(`${location.origin}/patient/profile/${u.id}`, {
                headers: {
                  "Authorization": "Bearer " + localStorage.getItem("token"),
                },
              });
              let profile = null;
              if (profileRes.ok) profile = await profileRes.json();
              return { ...u, profile };
            })
          );

          this.patients = patientsWithProfiles;
          this.message = "Patients loaded successfully";
          this.category = "success";
        } else {
          const err = await res.json();
          this.message = err.message || "Failed to fetch patients";
          this.category = err.category || "danger";
        }
      } catch (e) {
        console.error(e);
        this.message = "An unexpected error occurred while loading patients.";
        this.category = "danger";
      }
    },

    async toggleBlock(patient) {
      const action = patient.blocked ? "unblock" : "block";
      try {
        const res = await fetch(`${location.origin}/admin/block_user/${patient.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({ action }),
        });

        if (res.ok) {
          patient.blocked = !patient.blocked;
          this.message = `Patient ${action}ed successfully`;
          this.category = "success";
        } else {
          const err = await res.json();
          this.message = err.message || "Failed to update block status.";
          this.category = "danger";
        }
      } catch (e) {
        console.error(e);
        this.message = "Error updating block status.";
        this.category = "danger";
      }
    },
  },
};
