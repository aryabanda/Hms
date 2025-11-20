export default {
  template: `
  <div class="row">
    <div class="col-md-8 offset-md-2">
      <h3 class="text-center mb-3">Doctor Profile</h3>

      <!-- Flash Messages -->
      <div v-if="messages.length" class="mb-3">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="'alert alert-' + message.category"
        >
          {{ message.text }}
        </div>
      </div>

      <!-- Profile Info -->
      <div class="card p-3 shadow-sm">
        <div class="mb-2">
          <strong>Username:</strong>
          <div class="form-control bg-light">{{ form.username }}</div>
        </div>

        <div class="mb-2">
          <strong>Specialization:</strong>
          <div class="form-control bg-light">
            {{ specializationName(form.specialization_id) }}
          </div>
        </div>

        <div class="mb-2">
          <strong>Experience (Years):</strong>
          <div class="form-control bg-light">{{ form.experience || 'N/A' }}</div>
        </div>
      </div>
    </div>
  </div>
  `,

  data() {
    return {
      form: {
        username: "",
        specialization_id: "",
        experience: "",
      },
      specializationOptions: [],
      messages: [],
    };
  },

  mounted() {
    this.fetchProfileData();
    this.fetchSpecializations();
  },

  methods: {
    /** Fetch existing doctor profile **/
    async fetchProfileData() {
      this.messages = [];
      try {
        const res = await fetch(`${location.origin}/doctor/profile`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        const data = await res.json();

        if (res.ok) {
          if (data.message === "no profile") {
            this.messages.push({
              category: "info",
              text: "No profile found. Please contact admin to update your details.",
            });
            return;
          }

          this.form.username = data.username || localStorage.getItem("username") || "";
          this.form.specialization_id = data.specialization_id || "";
          this.form.experience = data.experience || "";
        } else {
          this.messages.push({
            category: "danger",
            text: data.message || "Failed to load profile data.",
          });
        }
      } catch (error) {
        console.error(error);
        this.messages.push({
          category: "danger",
          text: "Error loading profile information.",
        });
      }
    },

    /** Fetch specialization names **/
    async fetchSpecializations() {
      try {
        const res = await fetch(`${location.origin}/departments`);
        if (res.ok) {
          this.specializationOptions = await res.json();
        }
      } catch (error) {
        console.error("Error loading specializations:", error);
      }
    },

    /** Helper: get specialization name **/
    specializationName(id) {
      const spec = this.specializationOptions.find(s => s.id === id);
      return spec ? spec.name : "Unknown";
    },
  },
};
