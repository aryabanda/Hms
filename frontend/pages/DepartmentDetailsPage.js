export default {
  template: `
    <div class="container mt-4">
      <div v-if="loading" class="text-center my-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else>
        <h3 class="text-center mb-3">{{ department.name }}</h3>
        <p class="text-center text-muted">{{ department.description }}</p>

        <div v-if="message" :class="'alert alert-' + category" role="alert">
          {{ message }}
        </div>

        <h4 class="mt-4">Doctors in this Department</h4>
        <table class="table table-bordered align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Doctor Name</th>
              <th>Experience</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="doctors.length === 0">
              <td colspan="4" class="text-center text-muted">No doctors available</td>
            </tr>
            <tr v-for="doc in doctors" :key="doc.id">
              <td>{{ doc.id }}</td>
              <td>{{ doc.name }}</td>
              <td>{{ doc.experience || 'N/A' }}</td>
              <td>
                <button class="btn btn-sm btn-primary" @click="openBooking(doc)">
                  Book Appointment
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Booking Modal -->
        <div v-if="selectedDoctor" class="modal-backdrop fade show"></div>
        <div v-if="selectedDoctor" class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  Book Appointment with Dr. {{ selectedDoctor.name }}
                </h5>
                <button type="button" class="btn-close" @click="closeBooking"></button>
              </div>
              <div class="modal-body">
                <div v-if="availableSlots.length === 0" class="text-center text-muted">
                  No available slots.
                </div>
                <div v-else>
                  <div v-for="(day, index) in availableSlots" :key="index" class="mb-3">
                    <strong>{{ day.date }}</strong>
                    <div class="d-flex flex-wrap gap-2 mt-1">
                      <button
                        v-for="slot in day.slots"
                        :key="slot"
                        class="btn btn-sm"
                        :class="isSlotBooked(day.date, slot) ? 'btn-secondary disabled' : 'btn-outline-success'"
                        :disabled="isSlotBooked(day.date, slot)"
                        @click="bookSlot(day.date, slot)"
                      >
                        {{ slot }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="closeBooking">Close</button>
              </div>
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
      loading: true,
      department: {},
      doctors: [],
      message: null,
      category: null,
      selectedDoctor: null,
      availableSlots: [],
      bookedAppointments: [], // Track booked slots
    };
  },

  async mounted() {
    const deptId = this.$route.params.id;
    try {
      const res = await fetch(`${location.origin}/departments/${deptId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await res.json();

      if (res.ok) {
        this.department = data.department;
        this.doctors = data.doctors;
      } else {
        this.message = data.message || "Failed to load department details.";
        this.category = "danger";
      }
    } catch (err) {
      console.error(err);
      this.message = "Error fetching department details.";
      this.category = "danger";
    } finally {
      this.loading = false;
    }
  },

  methods: {
    /** Fetch available slots for selected doctor **/
    async openBooking(doctor) {
      this.selectedDoctor = doctor;
      this.availableSlots = [];
      this.bookedAppointments = [];

      try {
        const res = await fetch(`${location.origin}/doctor/${doctor.id}/availability`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        const data = await res.json();

        if (res.ok) {
          // backend should return: { availability: [{ date, slots: [...] }] }
          this.availableSlots = data.availability || [];

          // Also fetch booked appointments to disable them
          const bookedRes = await fetch(`${location.origin}/doctor/${doctor.id}/appointments`, {
            headers: { Authorization: "Bearer " + localStorage.getItem("token") },
          });
          if (bookedRes.ok) {
            const bookedData = await bookedRes.json();
            this.bookedAppointments = bookedData.appointments || [];
          }
        } else {
          this.message = data.message || "Failed to load availability.";
          this.category = "danger";
        }
      } catch (err) {
        console.error(err);
        this.message = "Error loading availability.";
        this.category = "danger";
      }
    },

    /** Check if slot already booked **/
    isSlotBooked(date, time) {
      return this.bookedAppointments.some(a => a.date === date && a.time === time);
    },

    /** Book selected slot **/
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
            doctor_id: this.selectedDoctor.id,
            date,
            time,
          }),
        });

        const data = await res.json();
        this.message = data.message;
        this.category = res.ok ? "success" : "danger";

        if (res.ok) {
          this.closeBooking();
        }
      } catch (err) {
        console.error(err);
        this.message = "Error booking appointment.";
        this.category = "danger";
      }
    },

    /** Close booking modal **/
    closeBooking() {
      this.selectedDoctor = null;
      this.availableSlots = [];
      this.bookedAppointments = [];
    },
  },
};
