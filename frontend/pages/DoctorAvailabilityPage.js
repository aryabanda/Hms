export default {
  template: `
  <div class="container mt-4">
    <h3 class="text-center mb-3">Manage Availability</h3>

    <div v-if="message" :class="'alert alert-' + category" role="alert">
      {{ message }}
    </div>

    <div v-if="loading" class="text-center mt-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else>
      <table class="table table-bordered text-center">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="day in days" :key="day.date">
            <td>{{ day.date }}</td>
            <td>{{ day.dayName }}</td>
            <td>
              <input type="checkbox" v-model="day.available" />
            </td>
          </tr>
        </tbody>
      </table>

      <div class="text-center mt-3">
        <button class="btn btn-primary px-4" @click="saveAvailability">Save Availability</button>
      </div>
    </div>
  </div>
  `,

  data() {
    return {
      days: [],
      loading: true,
      message: null,
      category: null,
    };
  },

  async mounted() {
    this.generateNext7Days();
    await this.fetchAvailability();
  },

  methods: {
    /** Generate next 7 days **/
    generateNext7Days() {
      const today = new Date();
      this.days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const formatted = date.toLocaleDateString("en-CA"); // ✅ YYYY-MM-DD (safe)
        return {
          date: formatted,
          dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
          available: true, // default true
        };
      });
    },

    /** Fetch saved availability from backend **/
    async fetchAvailability() {
      this.loading = true;
      try {
        const res = await fetch(`${location.origin}/doctor/availability`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        const data = await res.json();

        if (res.ok && data.availability) {
          let saved = data.availability;

          // Parse if string
          if (typeof saved === "string") {
            try {
              saved = JSON.parse(saved);
            } catch (e) {
              console.error("Invalid JSON from backend:", saved);
              saved = {};
            }
          }

          // ✅ Match saved values to generated days
          this.days.forEach((d) => {
            if (Object.prototype.hasOwnProperty.call(saved, d.date)) {
              d.available = Boolean(saved[d.date]);
            }
          });
        } else {
          console.warn("No availability found, using defaults.");
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
        this.message = "Error loading availability.";
        this.category = "danger";
      } finally {
        this.loading = false;
      }
    },

    /** Save doctor availability **/
    async saveAvailability() {
      const availability = {};
      this.days.forEach((d) => (availability[d.date] = d.available));

      try {
        const res = await fetch(`${location.origin}/doctor/availability`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({ availability }),
        });

        const data = await res.json();
        if (res.ok) {
          this.message = "Availability saved successfully.";
          this.category = "success";
        } else {
          this.message = data.message || "Failed to save availability.";
          this.category = "danger";
        }
      } catch (err) {
        console.error(err);
        this.message = "Network error saving availability.";
        this.category = "danger";
      }
    },
  },
};
