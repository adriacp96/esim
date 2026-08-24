// 1. Supabase Config
const SUPABASE_URL = 'https://dvutnthqhkmqzgkihdtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXRudGhxaGttcXpna2loZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzcxOTAsImV4cCI6MjEwMzExMzE5MH0.nfcTnpmzJ8Jz9bO10Xox9T6D1UOF7fwfG-3IOtn9ceI';

// SOLUCIÓN: Cambiamos el nombre a supabaseClient para que no colisione con el CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;

// 2. Initialization & Router
document.addEventListener('DOMContentLoaded', () => {
    // Configurar fechas mínimas
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    if(document.getElementById('start_date')) {
        document.getElementById('start_date').min = minDate;
        document.getElementById('end_date').min = minDate;
    }

    // Comprobar la sesión inicial al cargar la página
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log("Sesión inicial detectada:", session.user.email);
            activarSesionUI(session);
        }
    });

    // Escuchar cambios de estado (Login, Logout)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log("Cambio de estado de Auth:", event);
        if (session) {
            activarSesionUI(session);
        } else {
            desactivarSesionUI();
        }
    });
});

// Función centralizada para mostrar la UI cuando hay sesión
function activarSesionUI(session) {
    currentUser = session.user;
    document.getElementById('user-display-email').innerText = currentUser.email;
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    checkProfileAndLoadUI();
}

// Función centralizada para ocultar la UI al cerrar sesión
function desactivarSesionUI() {
    currentUser = null;
    userProfile = null;
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    toast.className = `${color} text-white px-6 py-4 rounded-lg shadow-xl transform transition-all duration-300 translate-x-full border-2 border-white font-bold`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2"></i> ${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 5000); // 5 segundos de mensaje
}

// Tab Management
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    if (tabId === 'my-esims-tab') loadUserRequests();
    if (tabId === 'billing-tab') loadUserBilling();
    if (tabId === 'admin-requests-tab') loadAdminRequests();
    if (tabId === 'admin-billing-tab') loadAdminDropdown();
}

// 3. Auth Functions
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if(!email || !password) return showToast("Please fill in both fields", "error");

    console.log("Intentando Login...");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        console.error("Login Error:", error.message);
        showToast(error.message, 'error');
    } else {
        showToast("Login successful!");
    }
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if(!email || !password) return showToast("Please fill in both fields", "error");
    if(password.length < 6) return showToast("Password must be at least 6 characters", "error");

    console.log("Intentando Registro...");
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    if (error) {
        console.error("Register Error:", error.message);
        showToast(error.message, 'error');
    } else {
        showToast('Registration successful! Logging you in...');
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
}

// 4. Role Routing
async function checkProfileAndLoadUI() {
    const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    
    if (error) {
        console.warn("No se encontró perfil en base de datos. Cayendo a rol 'user' por defecto.");
    }
    
    userProfile = profile || { role: 'user' }; 

    if (userProfile.role === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
        document.getElementById('user-nav').classList.add('hidden');
        switchTab('admin-requests-tab');
    } else {
        document.getElementById('user-nav').classList.remove('hidden');
        document.getElementById('admin-nav').classList.add('hidden');
        switchTab('request-tab');
    }
}

// 5. USER: Request & View eSIMs
async function requestEsim(e) {
    e.preventDefault();
    const payload = {
        user_id: currentUser.id,
        country: document.getElementById('country').value,
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        data_type: document.getElementById('data_type').value,
        requested_gb: document.getElementById('requested_gb').value,
        status: 'pending'
    };

    const { error } = await supabaseClient.from('esim_requests').insert([payload]);
    if (error) {
        console.error("Error pidiendo esim:", error.message);
        showToast(error.message, 'error');
    } else {
        showToast('Request sent successfully!');
        document.getElementById('esim-form').reset();
        switchTab('my-esims-tab');
    }
}

async function loadUserRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return console.error(error);

    const tbody = document.getElementById('user-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        let btn = req.status === 'approved' && req.installation_link 
            ? `<a href="${req.installation_link}" target="_blank" class="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200">Install QR</a>` 
            : `<span class="text-gray-400 text-xs">Waiting...</span>`;
        
        let statusTag = req.status === 'pending' 
            ? `<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">PENDING</span>` 
            : `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">APPROVED</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-4 font-semibold text-gray-800">${req.country}</td>
                <td class="p-4 text-gray-600">${req.start_date} <br> ${req.end_date}</td>
                <td class="p-4 text-gray-600">${req.requested_gb}GB (${req.data_type})</td>
                <td class="p-4">${statusTag}</td>
                <td class="p-4">${btn}</td>
            </tr>
        `;
    });
}

// 6. USER: Billing View
async function loadUserBilling() {
    const { data, error } = await supabaseClient.from('consumptions').select('*, esim_requests(country)').eq('user_id', currentUser.id).order('billing_month', { ascending: false });
    if (error) return console.error(error);

    const tbody = document.getElementById('user-billing-list');
    tbody.innerHTML = '';

    data.forEach(bill => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-4 font-semibold text-gray-800">${bill.billing_month} <span class="text-xs text-gray-400 ml-2">(${bill.esim_requests.country})</span></td>
                <td class="p-4 text-gray-600">${bill.used_gb} GB</td>
                <td class="p-4 font-bold text-gray-900 text-right">${bill.total_due}</td>
            </tr>
        `;
    });
}

// 7. ADMIN: Manage Requests
async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').eq('status', 'pending').order('start_date', { ascending: true });
    if (error) return console.error(error);

    const tbody = document.getElementById('admin-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-4 font-medium text-gray-800">${req.profiles?.email || 'Unknown'}</td>
                <td class="p-4 font-bold">${req.country}</td>
                <td class="p-4 text-gray-600">${req.start_date} to ${req.end_date} <br> <span class="text-xs font-bold">${req.requested_gb}GB (${req.data_type})</span></td>
                <td class="p-4">
                    <input type="text" id="link_${req.id}" class="border border-gray-300 rounded p-1 w-full text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="Paste QR URL...">
                </td>
                <td class="p-4">
                    <button onclick="approveRequest('${req.id}')" class="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700 shadow">Approve</button>
                </td>
            </tr>
        `;
    });
}

async function approveRequest(reqId) {
    const linkInput = document.getElementById(`link_${reqId}`).value;
    if(!linkInput) return showToast("Provide an installation link", "error");

    const { error } = await supabaseClient.from('esim_requests').update({ status: 'approved', installation_link: linkInput }).eq('id', reqId);
    if (error) showToast(error.message, 'error');
    else {
        showToast("eSIM Approved!");
        loadAdminRequests(); 
    }
}

// 8. ADMIN: Add Billing
async function loadAdminDropdown() {
    const { data } = await supabaseClient.from('esim_requests').select('id, country, requested_gb, profiles(email)').eq('status', 'approved');
    const select = document.getElementById('bill_request_id');
    select.innerHTML = '<option value="">Select a request...</option>';
    
    if(data) {
        data.forEach(req => {
            select.innerHTML += `<option value="${req.id}" data-user="${req.profiles?.id}">${req.profiles?.email || 'Unknown'} - ${req.country} (${req.requested_gb}GB)</option>`;
        });
    }
}

async function addBillingRecord(e) {
    e.preventDefault();
    const select = document.getElementById('bill_request_id');
    
    const { data: requestData } = await supabaseClient.from('esim_requests').select('user_id, requested_gb').eq('id', select.value).single();

    const payload = {
        user_id: requestData.user_id,
        request_id: select.value,
        billing_month: document.getElementById('bill_month').value,
        used_gb: requestData.requested_gb, 
        total_due: document.getElementById('bill_cost').value
    };

    const { error } = await supabaseClient.from('consumptions').insert([payload]);
    if (error) showToast(error.message, 'error');
    else {
        showToast("Bill recorded successfully!");
        document.getElementById('billing-form').reset();
    }
}
