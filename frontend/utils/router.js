import HomePage from "../pages/HomePage.js";
import LoginPage from "../pages/LoginPage.js";
import RegisterPage from "../pages/RegisterPage.js";

// Admin pages
import AdminLoginPage from "../pages/AdminLoginPage.js";
import AdminDashboardPage from "../pages/AdminDashboardPage.js";
import AdminDoctorsPage from "../pages/AdminDoctorsPage.js";
import AdminPatientsPage from "../pages/AdminPatientsPage.js";
import AdminAppointmentsPage from "../pages/AdminAppointmentsPage.js";
import AdminReportsPage from "../pages/AdminReportsPage.js";



// Doctor pages
import DoctorDashboardPage from "../pages/DoctorDashboardPage.js";
import DoctorProfilePage from "../pages/DoctorProfilePage.js";
import DoctorAppointmentsPage from "../pages/DoctorAppointmentsPage.js";
import DoctorAvailabilityPage from "../pages/DoctorAvailabilityPage.js";


// Patient pages
import PatientDashboardPage from "../pages/PatientDashboardPage.js";
import PatientProfilePage from "../pages/PatientProfilePage.js";
import PatientDoctorsPage from "../pages/PatientDoctorsPage.js";
import PatientAppointmentsPage from "../pages/PatientAppointmentsPage.js";
import PatientTreatmentsPage from "../pages/PatientTreatmentsPage.js";
import DepartmentDetailsPage from "../pages/DepartmentDetailsPage.js";
import PatientBookAppointmentPage from "../pages/PatientBookAppointmentPage.js";

const routes = [
  // --- Public ---
  { path: "/", component: HomePage },
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },

  // --- Admin ---
  { path: "/admin/login", component: AdminLoginPage },
  { path: "/admin/dashboard", component: AdminDashboardPage },
  { path: "/admin/doctors", component: AdminDoctorsPage },
  { path: "/admin/patients", component: AdminPatientsPage },
  { path: "/admin/appointments", component: AdminAppointmentsPage },
  { path: "/admin/reports", component: AdminReportsPage },
  { path: "/admin/doctors", component: AdminDoctorsPage },


  // --- Doctor ---
  { path: "/doctor/dashboard", component: DoctorDashboardPage },
  { path: "/doctor/profile", component: DoctorProfilePage },
  { path: "/doctor/appointments", component: DoctorAppointmentsPage },
  { path: '/doctor/availability', component: DoctorAvailabilityPage },


  // --- Patient ---
  { path: "/patient/dashboard", component: PatientDashboardPage },
  { path: "/patient/profile", component: PatientProfilePage },
  { path: "/patient/doctors", component: PatientDoctorsPage },
  { path: "/patient/appointments", component: PatientAppointmentsPage },
  { path: "/patient/treatments", component: PatientTreatmentsPage },
  { path: "/department/:id", component: DepartmentDetailsPage },
  { path: "/book/:id", component: PatientBookAppointmentPage },

  // --- Logout ---
  {
    path: "/logout",
    component: {
      template: `
        <div class="text-center mt-5">
          <h3>Logging out...</h3>
        </div>
      `,
      mounted() {
        this.$root.logout();
      }
    }
  },

  // --- Fallback ---
  { path: "*", redirect: "/" }
];

const router = new VueRouter({
  mode: "hash",
  routes
});

export default router;
