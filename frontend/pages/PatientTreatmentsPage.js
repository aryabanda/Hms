export default {
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <h3 class="mb-4 text-center">Service Request Feedback</h3>

          <!-- Flash Messages -->
          <div v-if="flashMessages.length" class="mb-3">
            <div
              v-for="(message, index) in flashMessages"
              :key="index"
              class="alert"
              :class="'alert-' + message.category"
            >
              {{ message.text }}
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitForm">
            <div class="form-group mb-3">
              <label for="requestId">Request ID</label>
              <input
                type="text"
                id="requestId"
                v-model="formData.request_id"
                class="form-control"
                readonly
              />
            </div>

            <div class="form-group mb-3">
              <label for="serviceName">Service Name</label>
              <input
                type="text"
                id="serviceName"
                v-model="formData.service_name"
                class="form-control"
                readonly
              />
            </div>

            <div class="form-group mb-3">
              <label for="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                v-model="formData.full_name"
                class="form-control"
                readonly
              />
            </div>

            <div class="form-group mb-3">
              <label for="serviceDescription">Service Description</label>
              <input
                type="text"
                id="serviceDescription"
                v-model="formData.service_description"
                class="form-control"
                readonly
              />
            </div>

            <div class="form-group mb-3">
              <label for="remarks">Remarks</label>
              <textarea
                id="remarks"
                v-model="formData.remarks"
                class="form-control"
                placeholder="Enter your remarks"
              ></textarea>
            </div>

            <div class="form-group mb-4">
              <label for="rating">Rating (1–5)</label>
              <input
                type="number"
                id="rating"
                v-model.number="formData.rating"
                class="form-control"
                min="1"
                max="5"
              />
            </div>

            <div class="text-center">
              <button type="submit" class="btn btn-primary btn-sm me-2">
                Submit
              </button>
              <button type="button" @click="cancel" class="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,

  props: {
    id: {
      type: [String, Number],
      required: true,
    },
  },

  data() {
    return {
      flashMessages: [],
      formData: {
        request_id: "",
        service_name: "",
        full_name: "",
        service_description: "",
        remarks: "",
        rating: null,
      },
    };
  },

  created() {
    if (this.id) {
      this.fetchServiceRequest();
    } else {
      alert("No service request ID provided.");
      this.$router.push("/customer/dashboard");
    }
  },

  methods: {
    async fetchServiceRequest() {
      try {
        const response = await fetch(`${location.origin}/customer/close_service_request/${this.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.formData = {
            request_id: data.id,
            service_name: data.service_name,
            full_name: data.full_name,
            service_description: data.service_description,
            remarks: data.remarks || "",
            rating: data.rating || "",
          };
        } else {
          const err = await response.json();
          this.flashMessages = [
            { text: err.message || "Failed to load service request.", category: err.category || "danger" },
          ];
        }
      } catch (error) {
        console.error("Error fetching service request:", error);
        this.flashMessages = [{ text: "Error loading data.", category: "danger" }];
      }
    },

    async submitForm() {
      if (!this.formData.remarks.trim() || !this.formData.rating) {
        this.flashMessages = [{ text: "Please enter remarks and rating.", category: "warning" }];
        return;
      }

      try {
        const response = await fetch(`${location.origin}/customer/close_service_request/${this.formData.request_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(this.formData),
        });

        const data = await response.json();

        if (response.ok) {
          this.flashMessages = [{ text: data.message || "Service request closed successfully.", category: "success" }];
          setTimeout(() => this.$router.push("/customer/dashboard"), 1500);
        } else {
          this.flashMessages = [{ text: data.message || "Failed to close service request.", category: "danger" }];
        }
      } catch (error) {
        console.error("Submit error:", error);
        this.flashMessages = [{ text: "Network error. Please try again later.", category: "danger" }];
      }
    },

    cancel() {
      this.$router.push("/customer/dashboard");
    },
  },
};
