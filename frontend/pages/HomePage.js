export default {
    template: `
    <div class="row">
        <div class="col-md-4 offset-md-4">   
            <h1>HMS Portal</h1>
            <div class="form-group">
                <router-link to="/admin/login">Admin Login</router-link>
            </div>
            <div class="form-group">
                <router-link to="/login">Patient/Doctor Login</router-link>
            </div>
        </div>    
    </div>
    `,
}
