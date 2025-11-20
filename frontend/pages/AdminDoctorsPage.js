export default {
  template: `
    <div class="container mt-4">
      <h3 class="mb-3">Manage Doctors</h3>

      <div v-if="message" :class="'alert alert-' + category" role="alert">
        {{ message }}
      </div>

      <!-- Add Doctor Form -->
      <div class="card p-3 mb-4">
        <h5>Add New Doctor</h5>
        <form @submit.prevent="addDoctor">
          <div class="row g-2">
            <div class="col-md-3">
              <input v-model="newDoctor.username" type="email" class="form-control" placeholder="Doctor Email" required>
            </div>
            <div class="col-md-2">
              <input v-model="newDoctor.password" type="password" class="form-control" placeholder="Password (default changeme123)">
            </div>
            <div class="col-md-3">
              <select v-model="newDoctor.specialization_id" class="form-select" required>
                <option disabled value="">Select Department</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <input v-model="newDoctor.experience" type="text" class="form-control" placeholder="Experience">
            </div>
            <div class="col-md-2">
              <button class="btn btn-success w-100">Add</button>
            </div>
          </div>
        </form>
      </div>

      <!-- Doctor List -->
      <div class="card p-3">
        <h5>All Doctors</h5>
        <table class="table table-striped mt-2">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Department</th>
              <th>Approved</th>
              <th>Blocked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in doctors" :key="doc.id">
              <td>{{ doc.id }}</td>
              <td>{{ doc.username }}</td>
              <td>{{ doc.specialization_name || '—' }}</td>
              <td>
                <span class="badge" :class="doc.approve ? 'bg-success' : 'bg-warning'">{{ doc.approve ? 'Yes' : 'No' }}</span>
              </td>
              <td>
                <span class="badge" :class="doc.blocked ? 'bg-danger' : 'bg-secondary'">{{ doc.blocked ? 'Yes' : 'No' }}</span>
              </td>
              <td>
                <button class="btn btn-sm btn-primary me-1" @click="editProfile(doc.id)">Edit</button>
                <button class="btn btn-sm btn-danger" @click="deleteDoctor(doc.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Edit Modal -->
      <div v-if="editingProfile" class="modal-backdrop fade show"></div>
      <div v-if="editingProfile" class="modal d-block" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit Doctor Profile (ID: {{ selectedDoctorId }})</h5>
              <button type="button" class="btn-close" @click="editingProfile = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label>Specialization</label>
                <select v-model="profileForm.specialization_id" class="form-select">
                  <option disabled value="">Select Department</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                </select>
              </div>
              <div class="mb-2">
                <label>Experience</label>
                <input v-model="profileForm.experience" type="text" class="form-control">
              </div>
              <div class="mb-2">
                <label>Availability</label>
                <textarea v-model="profileForm.availability" class="form-control"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="editingProfile = false">Close</button>
              <button class="btn btn-primary" @click="saveProfile">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      message: null,
      category: null,
      doctors: [],
      departments: [],
      newDoctor: { username: '', password: '', specialization_id: '', experience: '', approve: true },
      editingProfile: false,
      selectedDoctorId: null,
      profileForm: { specialization_id: '', experience: '', availability: '' },
    };
  },

  mounted() {
    this.fetchDepartments();
    this.fetchDoctors();
  },

  methods: {
    async fetchDepartments() {
      try {
        const res = await fetch(`${location.origin}/departments`, {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        if (res.ok) this.departments = await res.json();
      } catch (err) {
        console.error('Error loading departments', err);
      }
    },

    async fetchDoctors() {
      try {
        const res = await fetch(`${location.origin}/admin/doctors`, {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        if (res.ok) this.doctors = await res.json();
      } catch (err) {
        console.error('Error loading doctors', err);
      }
    },

    async addDoctor() {
      try {
        const res = await fetch(`${location.origin}/admin/doctors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('token')
          },
          body: JSON.stringify(this.newDoctor)
        });
        const data = await res.json();
        this.message = data.message;
        this.category = res.ok ? 'success' : 'danger';
        if (res.ok) {
          this.fetchDoctors();
          this.newDoctor = { username: '', password: '', specialization_id: '', experience: '', approve: true };
        }
      } catch (err) {
        console.error('Error adding doctor', err);
      }
    },

    async editProfile(id) {
      this.selectedDoctorId = id;
      this.editingProfile = true;
      try {
        const res = await fetch(`${location.origin}/admin/doctors/${id}`, {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        if (res.ok) {
          const data = await res.json();
          this.profileForm = data.profile || { specialization_id: '', experience: '', availability: '' };
        }
      } catch (err) {
        console.error(err);
      }
    },

    async saveProfile() {
      try {
        const res = await fetch(`${location.origin}/admin/doctors/${this.selectedDoctorId}/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('token')
          },
          body: JSON.stringify(this.profileForm)
        });
        const data = await res.json();
        this.message = data.message;
        this.category = res.ok ? 'success' : 'danger';
        this.editingProfile = false;
        this.fetchDoctors();
      } catch (err) {
        console.error(err);
      }
    },

    async deleteDoctor(id) {
      if (!confirm('Are you sure you want to delete this doctor?')) return;
      try {
        const res = await fetch(`${location.origin}/admin/doctors/${id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        this.message = data.message;
        this.category = res.ok ? 'success' : 'danger';
        this.fetchDoctors();
      } catch (err) {
        console.error(err);
      }
    }
  }
};
