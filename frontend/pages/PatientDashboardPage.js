export default {
  template: `
    <div class="container mt-4">
      <div class="row">
        <div class="col-md-8 offset-md-2">
          <h3 class="mb-4 text-center">Welcome, {{ patient }}</h3>

          <!-- Flash Message -->
          <div v-if="message" :class="'alert alert-' + category" role="alert">
            {{ message }}
          </div>

          <!-- Available Departments -->
          <h4 class="mt-3">Available Departments</h4>
          <table class="table table-striped align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Department Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="departments.length === 0">
                <td colspan="3" class="text-center text-muted">No departments available</td>
              </tr>
              <tr v-for="dept in departments" :key="dept.id">
                <td>{{ dept.id }}</td>
                <td>{{ dept.name }}</td>
                <td>{{ dept.description || '-' }}</td>
                <td>
                  <button @click="deptDetails(dept.id)" class="btn btn-primary btn-sm">      
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      message: null,
      category: null,
      patient: "",
      departments: []
    };
  },

  mounted() {
    this.fetchDashboard();
  },

  methods: {
    async fetchDashboard() {
      try {
        const res = await fetch(`${location.origin}/patient/dashboard`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") }
        });
        const data = await res.json();

        if (res.ok) {
          this.patient = data.patient;
          this.message = data.message;
          this.category = data.category;
          this.departments = data.departments;
        } else {
          this.message = data.message || "Failed to load dashboard.";
          this.category = "danger";
        }
      } catch (error) {
        console.error(error);
        this.message = "An unexpected error occurred.";
        this.category = "danger";
      }
    },
    async deptDetails(deptID){
      this.$router.push(`/department/${deptID}`);
    }
  }
};
