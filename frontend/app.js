import Navbar from "./components/Navbar.js";
import router from "./utils/router.js";

const app = new Vue({
  el: "#app",
  template: `
    <div> 
      <Navbar v-if="isAuthenticated" :userRole="userRole" @logout="logout"></Navbar>
      <router-view></router-view>
    </div>
  `,
  components: { Navbar },
  router,
  data() {
    return {
      isAuthenticated: false,
      userRole: null,
    };
  },
  methods: {
    // ✅ Called after successful login
    login(role, token, redirect = null) {
      this.isAuthenticated = true;
      this.userRole = role;

      // Save session data
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userRole", role);
      localStorage.setItem("token", token);

      // Navigate based on role or redirect claim
      if (redirect) {
        this.$router.push("/" + redirect.replace("_", "/"));
      } else if (role === "admin") {
        this.$router.push("/admin/dashboard");
      } else if (role === "doctor") {
        this.$router.push("/doctor/dashboard");
      } else if (role === "patient") {
        this.$router.push("/patient/dashboard");
      } else {
        this.$router.push("/");
      }
    },

    // ✅ Manual logout
    logout() {
      this.isAuthenticated = false;
      this.userRole = null;
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userRole");
      localStorage.removeItem("token");
      this.$router.push("/");
    },

    // ✅ Validate stored token with backend
    async checkAuthentication() {
      const token = localStorage.getItem("token");
      if (!token) {
        this.isAuthenticated = false;
        this.userRole = null;
        return;
      }

      try {
        const res = await fetch(`${location.origin}/get-claims`, {
          headers: { "Authorization": "Bearer " + token },
        });

        if (res.ok) {
          const data = await res.json();
          this.isAuthenticated = true;
          this.userRole = data.claims.role;
          localStorage.setItem("userRole", data.claims.role);
        } else {
          // Token invalid or expired
          this.logout();
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        this.logout();
      }
    },
  },

  async mounted() {
    await this.checkAuthentication();

    // If not authenticated, redirect to login (except open routes)
    const openRoutes = ["/", "/login", "/register", "/admin/login"];
    if (!this.isAuthenticated && !openRoutes.includes(this.$route.path)) {
      this.$router.replace("/login");
    }
  },
});

// ✅ Make Vue app globally accessible (important!)
window.app = app;
