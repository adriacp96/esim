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
    if (tabId === 'admin-history-tab') loadAdminHistory();
    if (tabId === 'admin-billing-tab') loadAdminBilling();
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
// 5. VISUAL SELECTOR LOGIC
// ==========================================

function setDataType(type) {
    currentDataType = type;
    const slider = document.getElementById('gb_slider');
    const btnTotal = document.getElementById('btn_type_total');
    const btnDaily = document.getElementById('btn_type_daily');
    const daysContainer = document.getElementById('days_container');
    
    if(type === 'total') {
        btnTotal.className = "flex-1 py-2 text-sm font-bold rounded-md bg-white shadow-sm text-blue-700 transition";
        btnDaily.className = "flex-1 py-2 text-sm font-bold rounded-md text-gray-500 hover:text-gray-800 transition";
        document.getElementById('slider-type-display').innerText = "total";
        slider.max = "50";
        document.getElementById('slider-max-label').innerText = "50 GB+";
        daysContainer.classList.add('hidden'); 
    } else {
        btnDaily.className = "flex-1 py-2 text-sm font-bold rounded-md bg-white shadow-sm text-blue-700 transition";
        btnTotal.className = "flex-1 py-2 text-sm font-bold rounded-md text-gray-500 hover:text-gray-800 transition";
        document.getElementById('slider-type-display').innerText = "/ day";
        slider.max = "10";
        document.getElementById('slider-max-label').innerText = "10 GB";
        daysContainer.classList.remove('hidden'); 
        
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

        let dataString = "";
        if (currentDataType === 'total') {
            dataString = `${gbValue} GB <span class="text-sm font-normal text-gray-400">(Total)</span>`;
        } else {
            const daysValue = document.getElementById('days_slider').value;
            document.getElementById('days-val-display').innerText = daysValue;
            dataString = `${gbValue} GB <span class="text-sm font-normal text-gray-300">/ day for ${daysValue} Days</span>`;
        }
        
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

    const dummyDateStr = new Date().toISOString().split('T')[0];
    let endDateStr = dummyDateStr;

    if (currentDataType === 'daily') {
        const days = parseInt(document.getElementById('days_slider').value);
        let endDateObj = new Date();
        endDateObj.setDate(endDateObj.getDate() + days);
        endDateStr = endDateObj.toISOString().split('T')[0];
    }

    const payload = {
        user_id: currentUser.id,
        country: selectedCountry,
        start_date: dummyDateStr, 
        end_date: endDateStr,   
        data_type: currentDataType,
        requested_gb: document.getElementById('gb_slider').value,
        status: 'pending',
        price: 0
    };

    document.getElementById('submit_btn').setAttribute('disabled', 'true');
    const { error } = await supabaseClient.from('esim_requests').insert([payload]);
    
    if (error) {
        showToast(error.message, 'error');
        document.getElementById('submit_btn').removeAttribute('disabled');
    } else {
        showToast('eSIM Request sent successfully!');
        
        document.getElementById('gb_slider').value = 5;
        document.getElementById('days_slider').value = 7;
        document.getElementById('custom_country_input').value = "";
        const radioSelected = document.querySelector('input[name="country_selection"]:checked');
        if(radioSelected) radioSelected.checked = false;
        
        setDataType('total');
        updateSummary(); 
        switchTab('my-esims-tab');
    }
}

// ==========================================
// 6. HELPER TO PARSE PLAN STRING
// ==========================================
function getPlanDescription(req) {
    if (req.data_type === 'daily') {
        const d1 = new Date(req.start_date);
        const d2 = new Date(req.end_date);
        const diffDays = Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)));
        return `<span class="font-bold text-gray-800 text-lg">${req.requested_gb}GB</span> <span class="text-gray-500 text-xs font-semibold ml-1 uppercase tracking-wider">/ DAY FOR ${diffDays} DAYS</span>`;
    } else {
        return `<span class="font-bold text-gray-800 text-lg">${req.requested_gb}GB</span> <span class="text-gray-500 text-xs font-semibold ml-1 uppercase tracking-wider">(TOTAL)</span>`;
    }
}

function getPlanDescriptionAdmin(req) {
    if (req.data_type === 'daily') {
        const d1 = new Date(req.start_date);
        const d2 = new Date(req.end_date);
        const diffDays = Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)));
        return `${req.requested_gb}GB/day for ${diffDays} Days`;
    } else {
        return `${req.requested_gb}GB (Total)`;
    }
}

function getStatusHTML(status) {
    if(status === 'pending') return `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200"><i class="fa-solid fa-hourglass-half mr-1"></i> PENDING</span>`;
    if(status === 'processing') return `<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200"><i class="fa-solid fa-gear fa-spin mr-1"></i> PROCESSING</span>`;
    if(status === 'approved') return `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200"><i class="fa-solid fa-check mr-1"></i> APPROVED</span>`;
    if(status === 'rejected') return `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200"><i class="fa-solid fa-xmark mr-1"></i> REJECTED</span>`;
    return status;
}

// ==========================================
// 7. USER VIEWS
// ==========================================

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
                <td class="p-5">${getPlanDescription(req)}</td>
                <td class="p-5">${getStatusHTML(req.status)}</td>
                <td class="p-5">${actionHTML}</td>
            </tr>
        `;
    });
}

// USER BILLING (Aggregated dynamically by Month)
async function loadUserBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).eq('status', 'approved');
    if (error) return;

    const monthlyData = {};
    
    // Grouping
    data.forEach(req => {
        const month = req.created_at.substring(0, 7); // Format: YYYY-MM
        if(!monthlyData[month]) monthlyData[month] = { gb: 0, cost: 0, items: 0 };
        
        let reqGb = parseFloat(req.requested_gb);
        // If daily, calculate total gb for the trip
        if(req.data_type === 'daily') {
            const d1 = new Date(req.start_date);
            const d2 = new Date(req.end_date);
            const diffDays = Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)));
            reqGb = reqGb * diffDays;
        }

        monthlyData[month].gb += reqGb;
        monthlyData[month].cost += parseFloat(req.price || 0);
        monthlyData[month].items += 1;
    });

    const tbody = document.getElementById('user-billing-list');
    tbody.innerHTML = '';
    
    // Sort months descending
    const sortedMonths = Object.keys(monthlyData).sort().reverse();

    if(sortedMonths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-400 font-bold">No billing data yet.</td></tr>`;
        return;
    }

    sortedMonths.forEach(month => {
        const info = monthlyData[month];
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-none">
                <td class="p-5 font-black text-blue-600 text-lg">${month}</td>
                <td class="p-5 text-gray-500 font-bold">${info.items} eSIMs</td>
                <td class="p-5 text-gray-800 font-medium">${info.gb} GB</td>
                <td class="p-5 font-black text-gray-900 text-right text-xl">${info.cost.toFixed(2)}</td>
            </tr>
        `;
    });
}

// ==========================================
// 8. ADMIN VIEWS
// ==========================================

async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;

    let countPending = 0, countProcessing = 0, countApproved = 0;
    const tbody = document.getElementById('admin-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        if(req.status === 'pending') countPending++;
        if(req.status === 'processing') countProcessing++;
        if(req.status === 'approved') countApproved++;

        // Actionable View (Only Pending/Processing)
        if (req.status === 'pending' || req.status === 'processing') {
            let dateStr = new Date(req.created_at).toLocaleDateString();
            let actionArea = '';
            
            if (req.status === 'pending') {
                actionArea = `
                    <div class="flex justify-end gap-2">
                        <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-100 text-red-700 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition"><i class="fa-solid fa-ban mr-1"></i> Deny</button>
                        <button onclick="changeStatus('${req.id}', 'processing')" class="bg-blue-100 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-200 transition">Start Processing</button>
                    </div>
                `;
            } else if (req.status === 'processing') {
                actionArea = `
                    <div class="flex flex-col gap-2 w-full">
                        <input type="text" id="link_${req.id}" class="w-full border border-purple-200 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-purple-500" placeholder="Paste URL/QR Link...">
                        <div class="flex gap-2">
                            <input type="number" step="0.01" id="price_${req.id}" class="w-24 border border-purple-200 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-purple-500" placeholder="Cost ($/€)">
                            <button onclick="approveRequest('${req.id}')" class="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-green-700 transition">Approve</button>
                            <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-100 text-red-700 px-3 py-2 rounded text-xs font-bold hover:bg-red-200 transition" title="Deny / Cancel"><i class="fa-solid fa-ban"></i></button>
                        </div>
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
                        <br><span class="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded inline-block text-xs mt-1">${getPlanDescriptionAdmin(req)}</span>
                    </td>
                    <td class="p-4">${getStatusHTML(req.status)}</td>
                    <td class="p-4 min-w-[280px]">${actionArea}</td>
                </tr>
            `;
        }
    });

    if(countPending === 0 && countProcessing === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-400 font-bold"><i class="fa-solid fa-mug-hot text-2xl mb-2 block"></i> All caught up! No pending requests.</td></tr>`;
    }

    document.getElementById('stat-pending').innerText = countPending;
    document.getElementById('stat-processing').innerText = countProcessing;
    document.getElementById('stat-approved').innerText = countApproved;
}

// 8.1 ADMIN: NEW HISTORY VIEW
async function loadAdminHistory() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('admin-history-list');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-400 font-bold">No eSIM history found.</td></tr>`;
        return;
    }

    data.forEach(req => {
        let dateStr = new Date(req.created_at).toLocaleDateString();
        
        let linkHtml = '';
        if(req.installation_link) {
            linkHtml = `<a href="${req.installation_link}" target="_blank" class="bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1 rounded text-xs font-bold transition ml-2" title="View QR Code"><i class="fa-solid fa-link"></i></a>`;
        }

        let costStr = req.price ? `<span class="font-bold text-green-600">${parseFloat(req.price).toFixed(2)}</span>` : '<span class="text-gray-400">-</span>';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="p-4">
                    <p class="font-bold text-gray-700 text-sm">${req.profiles?.email || 'Unknown'}</p>
                    <p class="text-xs text-gray-400">${dateStr}</p>
                </td>
                <td class="p-4">
                    <span class="font-bold text-gray-800 text-sm">${req.country}</span>
                    <br><span class="text-gray-500 text-xs">${getPlanDescriptionAdmin(req)}</span>
                </td>
                <td class="p-4 text-sm">${costStr}</td>
                <td class="p-4">${getStatusHTML(req.status)} ${linkHtml}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteRequest('${req.id}')" class="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded transition" title="Delete Forever">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ADMIN BILLING (Aggregated dynamically by User & Month)
async function loadAdminBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').eq('status', 'approved');
    if (error) return;

    const adminMonthly = {};
    
    // Grouping
    data.forEach(req => {
        const month = req.created_at.substring(0, 7); // YYYY-MM
        const email = req.profiles?.email || 'Unknown User';
        const key = `${month}_${email}`;

        if(!adminMonthly[key]) adminMonthly[key] = { email, month, gb: 0, cost: 0, items: 0 };
        
        let reqGb = parseFloat(req.requested_gb);
        if(req.data_type === 'daily') {
            const d1 = new Date(req.start_date);
            const d2 = new Date(req.end_date);
            const diffDays = Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)));
            reqGb = reqGb * diffDays;
        }

        adminMonthly[key].gb += reqGb;
        adminMonthly[key].cost += parseFloat(req.price || 0);
        adminMonthly[key].items += 1;
    });

    const tbody = document.getElementById('admin-billing-records-list');
    tbody.innerHTML = '';

    // Sort descending by Key (Month first)
    const sortedKeys = Object.keys(adminMonthly).sort().reverse();

    if (sortedKeys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-purple-400 font-bold">No billing records found. Approve eSIMs with a price to see them here.</td></tr>`;
        return;
    }

    sortedKeys.forEach(key => {
        const info = adminMonthly[key];
        tbody.innerHTML += `
            <tr class="hover:bg-purple-50 transition border-b border-purple-50">
                <td class="p-5 font-bold text-gray-800">${info.email}</td>
                <td class="p-5 font-black text-purple-700 text-lg">${info.month}</td>
                <td class="p-5 text-gray-500 font-bold">${info.items} eSIMs</td>
                <td class="p-5 text-gray-800 font-medium">${info.gb} GB</td>
                <td class="p-5 font-black text-gray-900 text-right text-xl">${info.cost.toFixed(2)}</td>
            </tr>
        `;
    });
}


async function changeStatus(reqId, newStatus) {
    const { error } = await supabaseClient.from('esim_requests').update({ status: newStatus }).eq('id', reqId);
    if (error) showToast(error.message, 'error');
    else {
        showToast(newStatus === 'rejected' ? 'Request denied/cancelled.' : 'Moved to Processing!');
        loadAdminRequests();
        if(document.getElementById('admin-history-tab').classList.contains('hidden') === false) loadAdminHistory();
    }
}

async function approveRequest(reqId) {
    const linkInput = document.getElementById(`link_${reqId}`).value;
    const priceInput = document.getElementById(`price_${reqId}`).value || 0; // Get price

    if(!linkInput) return showToast("Provide an installation link or QR url", "error");

    const { error } = await supabaseClient.from('esim_requests').update({ 
        status: 'approved', 
        installation_link: linkInput,
        price: priceInput
    }).eq('id', reqId);

    if (error) showToast(error.message, 'error');
    else {
        showToast("eSIM Approved, Priced & Sent to user!");
        loadAdminRequests(); 
        if(document.getElementById('admin-history-tab').classList.contains('hidden') === false) loadAdminHistory();
    }
}

async function deleteRequest(reqId) {
    if(!confirm("Are you sure you want to permanently delete this eSIM record? This will also remove it from the user's billing automatically.")) return;

    const { error } = await supabaseClient.from('esim_requests').delete().eq('id', reqId);
    if(error) {
        showToast(error.message, 'error');
    } else {
        showToast("Record completely deleted.");
        loadAdminHistory();
        loadAdminRequests(); 
    }
}
