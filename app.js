// 1. Supabase Config
const SUPABASE_URL = 'https://dvutnthqhkmqzgkihdtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXRudGhxaGttcXpna2loZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzcxOTAsImV4cCI6MjEwMzExMzE5MH0.nfcTnpmzJ8Jz9bO10Xox9T6D1UOF7fwfG-3IOtn9ceI';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;
let currentDataType = 'total'; // default slider type

// 2. Initialization & Router
document.addEventListener('DOMContentLoaded', () => {
    // Set min dates (24h advance)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    if(document.getElementById('start_date')) {
        document.getElementById('start_date').min = minDate;
        document.getElementById('end_date').min = minDate;
    }

    // Check session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) activarSesionUI(session);
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) activarSesionUI(session);
        else desactivarSesionUI();
    });
});

function activarSesionUI(session) {
    currentUser = session.user;
    document.getElementById('user-display-email').innerText = currentUser.email;
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    checkProfileAndLoadUI();
}

function desactivarSesionUI() {
    currentUser = null;
    userProfile = null;
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    toast.className = `${color} text-white px-6 py-4 rounded-lg shadow-xl transform transition-all duration-300 translate-x-full border-2 border-white font-bold flex items-center`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-3 text-xl"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

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

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message, 'error');
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if(!email || !password) return showToast("Please fill in both fields", "error");
    if(password.length < 6) return showToast("Password must be at least 6 characters", "error");

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) showToast(error.message, 'error');
    else showToast('Registration successful! Logging you in...');
}

async function logout() {
    await supabaseClient.auth.signOut();
}

// 4. Role Routing
async function checkProfileAndLoadUI() {
    const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    userProfile = profile || { role: 'user' }; 

    if (userProfile.role === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
        document.getElementById('user-nav').classList.add('hidden');
        switchTab('admin-requests-tab');
    } else {
        document.getElementById('user-nav').classList.remove('hidden');
        document.getElementById('admin-nav').classList.add('hidden');
        switchTab('request-tab');
        updateSummary(); // init UI
    }
}

// ==========================================
// 5. VISUAL SELECTOR LOGIC (NEW)
// ==========================================

function setDataType(type) {
    currentDataType = type;
    
    // Toggle UI buttons
    const btnTotal = document.getElementById('btn_type_total');
    const btnDaily = document.getElementById('btn_type_daily');
    
    if(type === 'total') {
        btnTotal.className = "flex-1 py-2 text-sm font-bold rounded-md bg-white shadow-sm text-gray-800 transition";
        btnDaily.className = "flex-1 py-2 text-sm font-bold rounded-md text-gray-500 hover:text-gray-700 transition";
        document.getElementById('slider-type-display').innerText = "total";
        document.getElementById('gb_slider').max = "50";
    } else {
        btnDaily.className = "flex-1 py-2 text-sm font-bold rounded-md bg-white shadow-sm text-gray-800 transition";
        btnTotal.className = "flex-1 py-2 text-sm font-bold rounded-md text-gray-500 hover:text-gray-700 transition";
        document.getElementById('slider-type-display').innerText = "/ day";
        document.getElementById('gb_slider').max = "5";
        
        // Cap value if switching from total to daily
        if(parseInt(document.getElementById('gb_slider').value) > 5) {
            document.getElementById('gb_slider').value = 2;
        }
    }
    updateSummary();
}

function updateSummary() {
    // 1. Get Country
    let selectedCountry = "";
    const radioSelected = document.querySelector('input[name="country_selection"]:checked');
    const customDiv = document.getElementById('custom-country-div');
    
    if(radioSelected) {
        if(radioSelected.value === 'custom') {
            customDiv.classList.remove('hidden');
            selectedCountry = document.getElementById('custom_country_input').value;
        } else {
            customDiv.classList.add('hidden');
            selectedCountry = radioSelected.value;
        }
    }

    // Update Country UI
    if(selectedCountry) {
        document.getElementById('sum_country').innerHTML = `<i class="fa-solid fa-location-dot text-blue-400"></i> <span>${selectedCountry}</span>`;
    } else {
        document.getElementById('sum_country').innerHTML = `<i class="fa-solid fa-location-dot text-gray-600"></i> <span class="text-gray-500 font-normal">Select region...</span>`;
    }

    // 2. Get Data
    const gbValue = document.getElementById('gb_slider').value;
    document.getElementById('slider-val-display').innerText = gbValue;
    const typeLabel = currentDataType === 'total' ? 'Total' : '/ Day';
    document.getElementById('sum_data').innerText = `${gbValue} GB (${typeLabel})`;

    // 3. Get Dates
    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;
    
    if(start && end) {
        // Calculate days
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        
        if(d2 < d1) {
            document.getElementById('sum_dates').innerHTML = `<span class="text-red-400 text-sm">End date must be after start date</span>`;
        } else {
            document.getElementById('sum_dates').innerHTML = `<i class="fa-regular fa-calendar text-blue-400"></i> <span>${diffDays} Days <span class="text-xs text-gray-400 font-normal ml-1">(${start} to ${end})</span></span>`;
        }
    } else {
        document.getElementById('sum_dates').innerHTML = `<i class="fa-regular fa-calendar text-gray-600"></i> <span class="text-gray-500 font-normal">Select dates...</span>`;
    }

    // 4. Validate and Enable Button
    const btn = document.getElementById('submit_btn');
    if (selectedCountry !== "" && start !== "" && end !== "" && (new Date(end) >= new Date(start))) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

// Submit Visual Form
async function requestEsim() {
    let selectedCountry = document.querySelector('input[name="country_selection"]:checked').value;
    if(selectedCountry === 'custom') {
        selectedCountry = document.getElementById('custom_country_input').value;
    }

    const payload = {
        user_id: currentUser.id,
        country: selectedCountry,
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        data_type: currentDataType,
        requested_gb: document.getElementById('gb_slider').value,
        status: 'pending'
    };

    const { error } = await supabaseClient.from('esim_requests').insert([payload]);
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Request sent successfully!');
        // Reset form visually
        document.getElementById('start_date').value = '';
        document.getElementById('end_date').value = '';
        document.getElementById('gb_slider').value = 5;
        document.querySelector('input[name="country_selection"]').checked = false; // uncheck radios
        updateSummary();
        switchTab('my-esims-tab');
    }
}

// ==========================================
// 6. USER/ADMIN VIEWS (Unchanged logic, just UI classes updated)
// ==========================================

async function loadUserRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('user-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        let btn = req.status === 'approved' && req.installation_link 
            ? `<a href="${req.installation_link}" target="_blank" class="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition"><i class="fa-solid fa-qrcode mr-1"></i> Install eSIM</a>` 
            : `<span class="text-gray-400 text-xs italic"><i class="fa-solid fa-clock mr-1"></i> Awaiting Admin</span>`;
        
        let statusTag = req.status === 'pending' 
            ? `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">PENDING</span>` 
            : `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">APPROVED</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-5 font-bold text-gray-800 text-base">${req.country}</td>
                <td class="p-5 text-gray-600"><div class="text-xs text-gray-400 mb-1">From</div> ${req.start_date} <br> <div class="text-xs text-gray-400 mt-1 mb-1">To</div> ${req.end_date}</td>
                <td class="p-5"><span class="font-bold text-gray-800">${req.requested_gb}GB</span> <span class="text-gray-500 text-xs">(${req.data_type})</span></td>
                <td class="p-5">${statusTag}</td>
                <td class="p-5">${btn}</td>
            </tr>
        `;
    });
}

async function loadUserBilling() {
    const { data, error } = await supabaseClient.from('consumptions').select('*, esim_requests(country)').eq('user_id', currentUser.id).order('billing_month', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('user-billing-list');
    tbody.innerHTML = '';

    data.forEach(bill => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-5 font-bold text-gray-800">${bill.billing_month} <span class="text-xs font-normal text-gray-400 ml-2 block sm:inline">(${bill.esim_requests?.country || 'Unknown'})</span></td>
                <td class="p-5 text-gray-600 font-medium">${bill.used_gb} GB</td>
                <td class="p-5 font-black text-gray-900 text-right text-lg">${bill.total_due}</td>
            </tr>
        `;
    });
}

async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').eq('status', 'pending').order('start_date', { ascending: true });
    if (error) return;

    const tbody = document.getElementById('admin-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        tbody.innerHTML += `
            <tr class="hover:bg-purple-50 transition">
                <td class="p-5 font-bold text-gray-700">${req.profiles?.email || 'Unknown'}</td>
                <td class="p-5 font-black text-purple-900 text-lg">${req.country}</td>
                <td class="p-5 text-gray-600">
                    <span class="text-xs text-gray-400 block">${req.start_date} -> ${req.end_date}</span>
                    <span class="font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded mt-1 inline-block text-xs">${req.requested_gb}GB (${req.data_type})</span>
                </td>
                <td class="p-5">
                    <input type="text" id="link_${req.id}" class="border border-gray-300 rounded-lg p-2 w-full text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Paste URL/QR Link...">
                </td>
                <td class="p-5">
                    <button onclick="approveRequest('${req.id}')" class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 shadow-md transition w-full"><i class="fa-solid fa-check mr-1"></i> Approve</button>
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

async function loadAdminDropdown() {
    const { data } = await supabaseClient.from('esim_requests').select('id, country, requested_gb, profiles(email)').eq('status', 'approved');
    const select = document.getElementById('bill_request_id');
    select.innerHTML = '<option value="">Select a completed request...</option>';
    
    if(data) {
        data.forEach(req => {
            select.innerHTML += `<option value="${req.id}" data-user="${req.profiles?.id}">${req.profiles?.email || 'Unknown'} — ${req.country} (${req.requested_gb}GB)</option>`;
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
