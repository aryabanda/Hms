export default {
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <h3 class="text-center mb-4">Customer Search</h3>

          <!-- Flash Messages -->
          <div v-if="messages.length" class="flash-messages mb-3">
            <div
              v-for="(message, index) in messages"
              :key="index"
              :class="'alert alert-' + message.category"
              role="alert"
            >
              {{ message.text }}
            </div>
          </div>

          <!-- Search Form -->
          <form @submit.prevent="submitSearch">
            <div class="form-group mb-3">
              <label for="search_type">Search Type</label>
              <select
                v-model="form.search_type"
                id="search_type"
                class="form-control"
                required
              >
                <option value="service">Service Name</option>
                <option value="location">Location</option>
                <option value="pin">PIN</option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label for="search_text">Search Text</label>
              <input
                v-model="form.search_text"
                id="search_text"
                type="text"
                class="form-control"
                placeholder="Enter your search keyword..."
                required
              />
            </div>

            <div class="form-group text-center">
              <button type="submit" class="btn btn-primary btn-sm me-2">
                Search
              </button>
              <router-link to="/customer/dashboard" class="btn btn-secondary btn-sm">
                Cancel
              </router-link>
            </div>
          </form>
        </div>
      </div>

      <!-- Search Results -->
      <div class="mt-5">
        <div v-if="service_professional.length">
          <h4>Search Results</h4>
          <table class="table table-striped mt-3">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Description</th>
                <th>Location</th>
                <th>PIN Code</th>
                <th>Base Price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(service, index) in service_professional" :key="index">
                <td>{{ service.service_name }}</td>
                <td>{{ service.service_description }}</td>
                <td>{{ service.address }}</td>
                <td>{{ service.pin_code }}</td>
                <td>₹{{ service.service_price }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center text-muted mt-5">
          <p>No results found. Try adjusting your search criteria.</p>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      form: {
        search_type: "service", // Default value
        search_text: ""
      },
      service_professional: [],
      messages: []
    };
  },

  methods: {
    async submitSearch() {
      this.messages = [];

      if (!this.form.search_text.trim()) {
        this.messages.push({
          category: "warning",
          text: "Please enter a search term."
        });
        return;
      }

      try {
        const response = await fetch(`${location.origin}/customer/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify(this.form)
        });

        const data = await response.json();

        if (response.ok) {
          this.service_professional = data.data?.service_professional || [];
          this.messages.push({
            category: "success",
            text: data.message || "Search completed successfully."
          });
        } else {
          this.service_professional = [];
          this.messages.push({
            category: data.category || "danger",
            text: data.message || "No results found or an error occurred."
          });
        }
      } catch (error) {
        console.error("Search request failed:", error);
        this.service_professional = [];
        this.messages.push({
          category: "danger",
          text: "An unexpected error occurred. Please try again later."
        });
      }
    }
  }
};
