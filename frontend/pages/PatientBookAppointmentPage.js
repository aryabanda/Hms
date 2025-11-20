export default {
  template: `
  <div class="container mt-4">
    <h3 class="text-center mb-3">Book Appointment with Dr. {{ doctorName }}</h3>

    <div v-if="message" :class="'alert alert-' + category" role="alert">
      {{ message }}
    </div>

    <div v-if="loading" class="text-center mt-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else>
      <div v-if="availability.length === 0" class="alert alert-warning text-center">
        No available slots found.
      </div>

      <div v-for="day in availability" :key="day.date" class="card mb-3">
        <div class="card-header fw-bold">{{ day.date }}</div>
        <div class="card-body">
          <div class="d-flex flex-wrap gap-2">
            <button
              v-for="slot in day.slots"
              :key="slot"
              class="btn btn-outline-primary"
              :disabled="false"
              @click="bookSlot(day.date, slot)"
            >
              {{ slot }}
            </button>
          </div>
        </div>
      </div>

      <div class="text-center mt-3">
        <button class="btn btn-secondary" @click="$router.back()">Back</button>
      </div>
    </div>
  </div>
  `,

  data() {
    return {
      doctorId: null,
      doctorName: "",
      availability: [],
      loading: true,
      message: null,
      category: null,
    };
  },

  async mounted() {
    this.doctorId = this.$route.params.id;
    await this.fetchAvailability();
  },

  methods: {
    async fetchAvailability() {
      try {
        const res = await fetch(`${location.origin}/doctor/${this.doctorId}/availability`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        const data = await res.json();
        if (res.ok) {
          this.availability = data.availability || [];
        } else {
          this.message = data.message || "Failed to load availability.";
          this.category = "danger";
        }
      } catch (err) {
        console.error(err);
        this.message = "Error fetching availability.";
        this.category = "danger";
      } finally {
        this.loading = false;
      }
    },

    async bookSlot(date, time) {
      if (!confirm(`Book appointment on ${date} at ${time}?`)) return;
      try {
        const res = await fetch(`${location.origin}/appointments/book`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({
            doctor_id: this.doctorId,
            date,
            time,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          this.message = "Appointment booked successfully!";
          this.category = "success";
          this.fetchAvailability(); // refresh after booking
        } else {
          this.message = data.message || "Failed to book appointment.";
          this.category = "danger";
        }
      } catch (err) {
        console.error(err);
        this.message = "Error booking appointment.";
        this.category = "danger";
      }
    },
  },
};
