// 1. Supabase Config
const SUPABASE_URL = 'https://dvutnthqhkmqzgkihdtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXRudGhxaGttcXpna2loZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzcxOTAsImV4cCI6MjEwMzExMzE5MH0.nfcTnpmzJ8Jz9bO10Xox9T6D1UOF7fwfG-3IOtn9ceI';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;
let currentDataType = 'total'; 

// 2. Initialization & Router
document.addEventListener('DOMContentLoaded', () => {
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
    }, 4000);
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
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    userProfile = profile || { role: 'user' }; 

    if (userProfile.role === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
        document.getElementById('user-nav').classList.add('hidden');
        switchTab('admin-requests-tab');
    } else {
        document.getElementById('user-nav').classList.remove('hidden');
        document.getElementById('admin-nav').classList.add('hidden');
        switchTab('request-tab');
        updateSummary();
    }
}

// ==========================================
// 5. VISUAL SELECTOR LOGIC (No Dates)
// ==========================================

function setDataType(type) {
    currentDataType = type;
    const slider = document.getElementById('gb_slider');
    const btnTotal = document.getElementById('btn_type_total');
    const btnDaily = document.getElementById('btn_type_daily');
    
    if(type === 'total') {
        btnTotal.className = "flex-1 py-2 text-sm font-bold rounded-md bg-white shadow-sm text-blue-700 transition";
        btnDaily.className = "flex-1 py-2 text-sm font-bold rounded-md text-gray-500 hover:text-gray-800 transition";
        document.getElementById('slider-type-display').innerText = "total";
        slider.max = "50";
        document.getElementById('slider-max-label').innerText = "50 GB+";
    } else {
        btnDaily.className = "flex-1 py-2 text-sm font-bold rounded-md bg-white shadow-sm text-blue-700 transition";
        btnTotal.className = "flex-1 py-2 text-sm font-bold rounded-md text-gray-500 hover:text-gray-800 transition";
        document.getElementById('slider-type-display').innerText = "/ day";
        slider.max = "10";
        document.getElementById('slider-max-label').innerText = "10 GB";
        
        if(parseInt(slider.value) > 10) slider.value = 5; 
    }
    updateSummary();
}

function triggerAnimation(element) {
    element.classList.remove('animate-pop');
    void element.offsetWidth; 
    element.classList.add('animate-pop');
}

function updateSummary() {
    try {
        let selectedCountry = "";
        const radioSelected = document.querySelector('input[name="country_selection"]:checked');
        const customDiv = document.getElementById('custom-country-div');
        
        if(radioSelected) {
            if(radioSelected.value === 'custom') {
                customDiv.classList.remove('hidden');
                selectedCountry = document.getElementById('custom_country_input').value.trim();
            } else {
                customDiv.classList.add('hidden');
                selectedCountry = radioSelected.value;
            }
        } else {
            customDiv.classList.add('hidden');
        }

        const sumCountry = document.getElementById('sum_country');
        if(selectedCountry) {
            if (sumCountry.dataset.val !== selectedCountry) {
                sumCountry.innerHTML = `<span>${selectedCountry}</span>`;
                sumCountry.dataset.val = selectedCountry;
                triggerAnimation(sumCountry);
            }
        } else {
            if (sumCountry.dataset.val !== "empty") {
                sumCountry.innerHTML = `<span class="text-gray-500 font-normal text-lg">Select region...</span>`;
                sumCountry.dataset.val = "empty";
            }
        }

        const gbValue = document.getElementById('gb_slider').value;
        document.getElementById('slider-val-display').innerText = gbValue;
        
        const typeLabel = currentDataType === 'total' ? 'Total' : '/ Day';
        const dataString = `${gbValue} GB <span class="text-sm font-normal text-gray-400">(${typeLabel})</span>`;
        
        const sumData = document.getElementById('sum_data');
        if (sumData.dataset.val !== dataString) {
            sumData.innerHTML = dataString;
            sumData.dataset.val = dataString;
            triggerAnimation(sumData);
        }

        const btn = document.getElementById('submit_btn');
        if (selectedCountry !== "") btn.removeAttribute('disabled');
        else btn.setAttribute('disabled', 'true');
    } catch (e) {
        console.error(e);
    }
}

async function requestEsim() {
    let selectedCountry = document.querySelector('input[name="country_selection"]:checked').value;
    if(selectedCountry === 'custom') selectedCountry = document.getElementById('custom_country_input').value.trim();

    const dummyDate = new Date().toISOString().split('T')[0];

    const payload = {
        user_id: currentUser.id,
        country: selectedCountry,
        start_date: dummyDate, 
        end_date: dummyDate,   
        data_type: currentDataType,
        requested_gb: document.getElementById('gb_slider').value,
        status: 'pending'
    };

    document.getElementById('submit_btn').setAttribute('disabled', 'true');
    const { error } = await supabaseClient.from('esim_requests').insert([payload]);
    
    if (error) {
        showToast(error.message, 'error');
        document.getElementById('submit_btn').removeAttribute('disabled');
    } else {
        showToast('eSIM Request sent successfully!');
        
        document.getElementById('gb_slider').value = 5;
        document.getElementById('custom_country_input').value = "";
        const radioSelected = document.querySelector('input[name="country_selection"]:checked');
        if(radioSelected) radioSelected.checked = false;
        
        setDataType('total');
        updateSummary(); 
        switchTab('my-esims-tab');
    }
}

// ==========================================
// 6. USER VIEWS
// ==========================================

function getStatusHTML(status) {
    if(status === 'pending') return `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200"><i class="fa-solid fa-hourglass-half mr-1"></i> PENDING</span>`;
    if(status === 'processing') return `<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200"><i class="fa-solid fa-gear fa-spin mr-1"></i> PROCESSING</span>`;
    if(status === 'approved') return `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200"><i class="fa-solid fa-check mr-1"></i> APPROVED</span>`;
    if(status === 'rejected') return `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200"><i class="fa-solid fa-xmark mr-1"></i> REJECTED</span>`;
    return status;
}

async function loadUserRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('user-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        let actionHTML = '';
        if(req.status === 'approved' && req.installation_link) {
            actionHTML = `<a href="${req.installation_link}" target="_blank" class="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition inline-block"><i class="fa-solid fa-qrcode mr-1"></i> Install eSIM</a>`;
        } else if(req.status === 'rejected') {
            actionHTML = `<span class="text-red-400 text-xs italic"><i class="fa-solid fa-ban mr-1"></i> Cancelled</span>`;
        } else if(req.status === 'processing') {
            actionHTML = `<span class="text-blue-500 text-xs italic font-semibold">Admin is buying it...</span>`;
        } else {
            actionHTML = `<span class="text-gray-400 text-xs italic"><i class="fa-solid fa-clock mr-1"></i> Awaiting Admin</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-none">
                <td class="p-5 font-bold text-gray-800 text-base">${req.country}</td>
                <td class="p-5"><span class="font-bold text-gray-800 text-lg">${req.requested_gb}GB</span> <span class="text-gray-500 text-xs font-semibold ml-1 uppercase tracking-wider">(${req.data_type})</span></td>
                <td class="p-5">${getStatusHTML(req.status)}</td>
                <td class="p-5">${actionHTML}</td>
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
            <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-none">
                <td class="p-5 font-bold text-gray-800">${bill.billing_month} <span class="text-xs font-normal text-gray-400 ml-2 block sm:inline">(${bill.esim_requests?.country || 'Unknown'})</span></td>
                <td class="p-5 text-gray-600 font-medium">${bill.used_gb} GB</td>
                <td class="p-5 font-black text-gray-900 text-right text-lg">${bill.total_due}</td>
            </tr>
        `;
    });
}

// ==========================================
// 7. ADMIN VIEWS (New Dashboard logic)
// ==========================================

async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;

    // Calculate Stats
    let countPending = 0, countProcessing = 0, countApproved = 0;
    const tbody = document.getElementById('admin-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        if(req.status === 'pending') countPending++;
        if(req.status === 'processing') countProcessing++;
        if(req.status === 'approved') countApproved++;

        // Only show pending and processing in the main action table to keep it clean.
        // We will show approved/rejected as historical data or simplified rows.
        if (req.status === 'pending' || req.status === 'processing') {
            
            let dateStr = new Date(req.created_at).toLocaleDateString();
            
            let actionArea = '';
            if (req.status === 'pending') {
                actionArea = `
                    <div class="flex justify-end gap-2">
                        <button onclick="changeStatus('${req.id}', 'processing')" class="bg-blue-100 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-200 transition">Start Processing</button>
                        <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-50 text-red-500 px-3 py-2 rounded text-xs font-bold hover:bg-red-100 transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            } else if (req.status === 'processing') {
                actionArea = `
                    <div class="flex gap-2">
                        <input type="text" id="link_${req.id}" class="border border-purple-200 rounded p-2 w-full text-xs outline-none focus:ring-1 focus:ring-purple-500" placeholder="Paste URL/QR Link...">
                        <button onclick="approveRequest('${req.id}')" class="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-green-700 transition">Approve</button>
                    </div>
                `;
            }

            tbody.innerHTML += `
                <tr class="hover:bg-purple-50 transition border-b border-purple-50">
                    <td class="p-4">
                        <p class="font-bold text-gray-800 text-sm">${req.profiles?.email || 'Unknown'}</p>
                        <p class="text-xs text-gray-400">${dateStr}</p>
                    </td>
                    <td class="p-4">
                        <span class="font-black text-purple-900 text-base">${req.country}</span>
                        <br><span class="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded inline-block text-xs mt-1">${req.requested_gb}GB (${req.data_type})</span>
                    </td>
                    <td class="p-4">${getStatusHTML(req.status)}</td>
                    <td class="p-4 min-w-[250px]">${actionArea}</td>
                </tr>
            `;
        }
    });

    // If no actionable items
    if(countPending === 0 && countProcessing === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-400 font-bold"><i class="fa-solid fa-mug-hot text-2xl mb-2 block"></i> All caught up! No pending requests.</td></tr>`;
    }

    // Update Stats Display
    document.getElementById('stat-pending').innerText = countPending;
    document.getElementById('stat-processing').innerText = countProcessing;
    document.getElementById('stat-approved').innerText = countApproved;
}

async function changeStatus(reqId, newStatus) {
    const { error } = await supabaseClient.from('esim_requests').update({ status: newStatus }).eq('id', reqId);
    if (error) showToast(error.message, 'error');
    else {
        showToast(newStatus === 'rejected' ? 'Request cancelled.' : 'Moved to Processing!');
        loadAdminRequests();
    }
}

async function approveRequest(reqId) {
    const linkInput = document.getElementById(`link_${reqId}`).value;
    if(!linkInput) return showToast("Provide an installation link or QR url", "error");

    const { error } = await supabaseClient.from('esim_requests').update({ status: 'approved', installation_link: linkInput }).eq('id', reqId);
    if (error) showToast(error.message, 'error');
    else {
        showToast("eSIM Approved & Sent to user!");
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
