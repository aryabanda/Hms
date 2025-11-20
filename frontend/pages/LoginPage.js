export default {
  template: `
    <div class="login-container mt-5">
      <h2 class="text-center mb-3">Login</h2>

      <div v-if="message" :class="'alert alert-' + category">{{ message }}</div>

      <form @submit.prevent="login">
        <div class="form-group mb-3">
          <label>Username (email)</label>
          <input v-model="form.username" class="form-control" required />
        </div>

        <div class="form-group mb-3">
          <label>Password</label>
          <input v-model="form.password" type="password" class="form-control" required />
        </div>

        <button class="btn btn-primary w-100" type="submit">Login</button>

        <div class="mt-3 text-center">
          <router-link to="/register">Register Patient</router-link>
        </div>
      </form>
    </div>
  `,

  data() {
    return {
      form: { username: '', password: '' },
      message: null,
      category: null,
    };
  },

  async mounted() {
    // ✅ If already logged in, auto-redirect
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await fetch(`${location.origin}/get-claims`, {
          headers: { "Authorization": "Bearer " + token },
        });

        if (res.ok) {
          const data = await res.json();
          const redirect = data.claims.redirect;
          this.navigateUser(redirect);
        }
      } catch (err) {
        console.error("Auto-login failed", err);
      }
    }
  },

  methods: {
    async login() {
      this.message = null;
      this.category = null;

      try {
        const res = await fetch(`${location.origin}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });

        const data = await res.json();

        if (res.ok) {
          // ✅ Save token
          localStorage.setItem("token", data.access_token);

          // ✅ Get claims from backend
          const claimsRes = await fetch(`${location.origin}/get-claims`, {
            headers: { "Authorization": "Bearer " + data.access_token },
          });

          if (claimsRes.ok) {
  const claims = await claimsRes.json();
  const redirect = claims.claims.redirect;
  const role = claims.claims.role;

  // ✅ Save role for persistence
  localStorage.setItem("role", role);

  // ✅ Update global Vue app state (this makes Navbar appear instantly)
  if (window.app) {
    window.app.login(role, data.access_token, redirect);
  } else {
    // fallback if app isn't globally accessible
    this.navigateUser(redirect);
  }
}
else {
            this.message = "Login successful, but failed to fetch claims.";
            this.category = "warning";
          }
        } else {
          this.message = data.message || "Invalid credentials.";
          this.category = data.category || "danger";
        }
      } catch (err) {
        console.error("Login error:", err);
        this.message = "An unexpected error occurred.";
        this.category = "danger";
      }
    },

    navigateUser(redirect) {
      if (redirect === "doctor_profile") {
        this.$router.push("/doctor/profile");
      } else if (redirect === "doctor_dashboard") {
        this.$router.push("/doctor/dashboard");
      } else if (redirect === "patient_profile") {
        this.$router.push("/patient/profile");
      } else if (redirect === "patient_dashboard") {
        this.$router.push("/patient/dashboard");
      } else if (redirect === "admin_dashboard") {
        this.$router.push("/admin/dashboard");
      } else {
        this.message = "Unknown redirect target.";
        this.category = "warning";
      }
    },
  },
};
