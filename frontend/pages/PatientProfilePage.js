export default {
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <h3 class="mb-4 text-center">Customer Profile</h3>

          <!-- Flash Messages -->
          <div v-if="message" :class="'alert alert-' + category" role="alert">
            {{ message }}
          </div>

          <!-- Profile Form -->
          <form @submit.prevent="handleSubmit">
            <div class="form-group mb-3">
              <label for="user_name">User Name</label>
              <input
                type="text"
                id="user_name"
                v-model="form.user_name"
                class="form-control"
                readonly
              />
            </div>

            <div class="form-group mb-3">
              <label for="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                v-model="form.full_name"
                class="form-control"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div class="form-group mb-3">
              <label for="address">Address</label>
              <input
                type="text"
                id="address"
                v-model="form.address"
                class="form-control"
                placeholder="Enter your address"
                required
              />
            </div>

            <div class="form-group mb-4">
              <label for="pin_code">PIN Code</label>
              <input
                type="text"
                id="pin_code"
                v-model="form.pin_code"
                class="form-control"
                placeholder="Enter your PIN code"
                required
              />
            </div>

            <div class="text-center">
              <button type="submit" class="btn btn-primary btn-sm px-4">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      form: {
        user_name: "",
        full_name: "",
        address: "",
        pin_code: "",
      },
      user_id: "",
      message: "",
      category: "",
    };
  },

  mounted() {
    this.fetchCustomerProfile();
  },

  methods: {
    // Fetch profile data from backend
    async fetchCustomerProfile() {
      try {
        const response = await fetch(`${location.origin}/patient/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.user_id = data.user_id;
          this.form.user_name = data.username;
          this.form.full_name = data.full_name || "";
          this.form.address = data.address || "";
          this.form.pin_code = data.pin_code || "";
        } else {
          const err = await response.json();
          this.message = err.message || "Failed to load profile data.";
          this.category = err.category || "danger";
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        this.message = "An error occurred while fetching the profile data.";
        this.category = "danger";
      }
    },

    // Submit updated profile data to backend
    async handleSubmit() {
      if (!this.form.full_name.trim() || !this.form.address.trim() || !this.form.pin_code.trim()) {
        this.message = "Please fill out all required fields.";
        this.category = "warning";
        return;
      }

      try {
        const response = await fetch(`${location.origin}/patient/profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({
            full_name: this.form.full_name,
            address: this.form.address,
            pin_code: this.form.pin_code,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          this.message = data.message || "Profile updated successfully!";
          this.category = data.category || "success";
        } else {
          this.message = data.message || "Failed to update profile.";
          this.category = data.category || "danger";
        }
      } catch (error) {
        console.error("Profile update error:", error);
        this.message = "An unexpected error occurred while updating your profile.";
        this.category = "danger";
      }
    },
  },
};
