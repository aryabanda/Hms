export default {
  template: `
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <h3 class="mb-4">Export Service Requests</h3>

        <!-- Flash messages -->
        <div v-if="message" :class="'alert alert-' + category" role="alert">
          {{ message }}
        </div>

        <!-- Input and button -->
        <div class="input-group mb-3">
          <input 
            type="number" 
            class="form-control" 
            placeholder="Enter Professional ID" 
            v-model="professionalId" 
            :disabled="isProcessing"
          >
          <button 
            class="btn btn-primary" 
            @click="triggerExport" 
            :disabled="isProcessing || !professionalId"
          >
            {{ isProcessing ? 'Processing...' : 'Export Service Requests' }}
          </button>
        </div>

        <hr />

        <!-- Available downloads -->
        <h4 class="mt-4">Available Reports</h4>
        <div v-if="downloads.length">
          <ul class="list-group">
            <li v-for="(file, index) in downloads" :key="index" class="list-group-item d-flex justify-content-between align-items-center">
              <span>{{ file }}</span>
              <button class="btn btn-outline-success btn-sm" @click="downloadFile(file)">Download</button>
            </li>
          </ul>
        </div>
        <div v-else class="text-muted mt-3">No reports available yet.</div>
      </div>
    </div>
  </div>
  `,

  data() {
    return {
      professionalId: '',
      downloads: [],
      isProcessing: false,
      message: null,
      category: null,
      timer: null,
    };
  },

  methods: {
    async triggerExport() {
      if (!this.professionalId) {
        this.message = "Please enter a valid professional ID!";
        this.category = "danger";
        return;
      }

      this.isProcessing = true;
      this.message = null;

      try {
        const response = await fetch(`${location.origin}/admin/export/${this.professionalId}`, {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
          },
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          this.message = data.message || "Export triggered successfully!";
          this.category = "success";
          this.fetchDownloads();
        } else {
          const errorData = await response.json();
          this.message = errorData.message || "Failed to start export.";
          this.category = "danger";
        }
      } catch (error) {
        console.error("Error triggering export:", error);
        this.message = "Error triggering export.";
        this.category = "danger";
      } finally {
        this.isProcessing = false;
      }
    },

    async fetchDownloads() {
      try {
        const response = await fetch(`${location.origin}/admin/reports/list`, {
          method: "GET",
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        if (response.ok) {
          const data = await response.json();
          this.downloads = data.downloads || [];
        }
      } catch (error) {
        console.error("Error fetching downloads:", error);
      }
    },

    async downloadFile(filename) {
      try {
        const response = await fetch(`${location.origin}/admin/reports/download/${filename}`, {
          method: "GET",
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        });
        if (!response.ok) {
          alert("Error downloading file.");
          return;
        }

        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error("Error downloading file:", error);
        alert("An error occurred while downloading the file.");
      }
    },
  },

  mounted() {
    this.fetchDownloads();
    // Refresh every 10 seconds to check for new completed reports
    this.timer = setInterval(this.fetchDownloads, 10000);
  },

  beforeDestroy() {
    clearInterval(this.timer);
  },
};
