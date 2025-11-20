export default {
  props: ['userRole'],
  computed: {
    isAdmin() {
      return this.userRole === 'admin';
    },
    isDoctor() {
      return this.userRole === 'doctor';
    },
    isPatient() {
      return this.userRole === 'patient';
    },
  },
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
      <div class="container-fluid">
        <router-link to="/" class="navbar-brand fw-bold text-primary">
          🏥 HMS Portal
        </router-link>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            
            <!-- Admin Links -->
            <template v-if="isAdmin">
              <li class="nav-item">
                <router-link to="/admin/dashboard" class="nav-link">Dashboard</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/admin/doctors" class="nav-link">Manage Doctors</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/admin/patients" class="nav-link">Manage Patients</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/admin/summary" class="nav-link">Reports</router-link>
              </li>
            </template>

            <!-- Doctor Links -->
            <template v-if="isDoctor">
              <li class="nav-item">
                <router-link to="/doctor/dashboard" class="nav-link">Dashboard</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/doctor/appointments" class="nav-link">Appointments</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/doctor/profile" class="nav-link">Profile</router-link>
              </li>
              <li class="nav-item">
             <router-link class="nav-link" to="/doctor/availability">Availability</router-link>
              </li>
            </template>

            <!-- Patient Links -->
            <template v-if="isPatient">
              <li class="nav-item">
                <router-link to="/patient/dashboard" class="nav-link">Dashboard</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/patient/appointments" class="nav-link">My Appointments</router-link>
              </li>
              <li class="nav-item">
                <router-link to="/patient/profile" class="nav-link">Profile</router-link>
              </li>
            </template>

            <!-- Common Logout -->
            <li class="nav-item">
              <router-link to="/logout" class="nav-link text-danger fw-semibold">Logout</router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `
};
