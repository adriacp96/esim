// 1. Supabase Config
const SUPABASE_URL = 'https://dvutnthqhkmqzgkihdtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXRudGhxaGttcXpna2loZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzcxOTAsImV4cCI6MjEwMzExMzE5MH0.nfcTnpmzJ8Jz9bO10Xox9T6D1UOF7fwfG-3IOtn9ceI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;
let currentDataType = 'total'; 

// 2. Initialization
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
    currentUser = null; userProfile = null;
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    toast.className = `${color} text-white px-5 py-3 rounded-2xl shadow-xl transform transition-all translate-x-full font-bold flex items-center text-sm md:text-base`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-3 text-lg"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => { toast.classList.add('translate-x-full'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    // Highlight Nav Buttons (Desktop & Mobile)
    document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'text-purple-700', 'bg-gray-800');
        if(btn.classList.contains('mob-nav-btn')) btn.classList.add('text-gray-400');
    });

    if(event && event.currentTarget) {
        const btn = event.currentTarget;
        if(btn.classList.contains('mob-nav-btn')) {
            let color = userProfile.role === 'admin' ? 'text-purple-700' : 'text-blue-600';
            btn.classList.replace('text-gray-400', color);
        } else {
            btn.classList.add('bg-gray-800');
        }
    }

    // Toggle Sticky Mobile Summary
    if (tabId === 'request-tab') document.getElementById('mobile-summary').classList.remove('hidden');
    else document.getElementById('mobile-summary').classList.add('hidden');

    if (tabId === 'my-esims-tab') loadUserRequests();
    if (tabId === 'billing-tab') loadUserBilling();
    if (tabId === 'admin-requests-tab') loadAdminRequests();
    if (tabId === 'admin-history-tab') loadAdminHistory();
    if (tabId === 'admin-billing-tab') loadAdminBilling();
}

// 3. Auth
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password) return showToast("Fill both fields", "error");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message, 'error');
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password) return showToast("Fill both fields", "error");
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) showToast(error.message, 'error');
    else showToast('Success! Logging in...');
}

async function logout() { await supabaseClient.auth.signOut(); }

async function checkProfileAndLoadUI() {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    userProfile = profile || { role: 'user' }; 

    if (userProfile.role === 'admin') {
        document.getElementById('desktop-admin-nav').classList.remove('hidden');
        document.getElementById('desktop-user-nav').classList.add('hidden');
        document.getElementById('mob-admin-nav').classList.remove('hidden');
        document.getElementById('mob-user-nav').classList.add('hidden');
        
        // Auto-select first tab
        const firstBtn = document.querySelector('#desktop-admin-nav button');
        const firstMobBtn = document.querySelector('#mob-admin-nav button');
        if(firstBtn) firstBtn.classList.add('bg-gray-800');
        if(firstMobBtn) firstMobBtn.classList.replace('text-gray-400', 'text-purple-700');
        
        switchTab('admin-requests-tab');
    } else {
        document.getElementById('desktop-user-nav').classList.remove('hidden');
        document.getElementById('desktop-admin-nav').classList.add('hidden');
        document.getElementById('mob-user-nav').classList.remove('hidden');
        document.getElementById('mob-admin-nav').classList.add('hidden');
        
        // Auto-select first tab
        const firstBtn = document.querySelector('#desktop-user-nav button');
        const firstMobBtn = document.querySelector('#mob-user-nav button');
        if(firstBtn) firstBtn.classList.add('bg-gray-800');
        if(firstMobBtn) firstMobBtn.classList.replace('text-gray-400', 'text-blue-600');

        switchTab('request-tab');
        updateSummary();
    }
}

// 5. VISUAL SELECTOR
function setDataType(type) {
    currentDataType = type;
    const slider = document.getElementById('gb_slider');
    const btnTotal = document.getElementById('btn_type_total');
    const btnDaily = document.getElementById('btn_type_daily');
    const daysContainer = document.getElementById('days_container');
    
    if(type === 'total') {
        btnTotal.className = "flex-1 py-1.5 text-sm font-bold rounded-md bg-white shadow-sm text-blue-700";
        btnDaily.className = "flex-1 py-1.5 text-sm font-bold rounded-md text-gray-500";
        document.getElementById('slider-type-display').innerText = "total";
        slider.max = "50";
        daysContainer.classList.add('hidden'); 
    } else {
        btnDaily.className = "flex-1 py-1.5 text-sm font-bold rounded-md bg-white shadow-sm text-blue-700";
        btnTotal.className = "flex-1 py-1.5 text-sm font-bold rounded-md text-gray-500";
        document.getElementById('slider-type-display').innerText = "/ day";
        slider.max = "10";
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
    } else customDiv.classList.add('hidden');

    // Desktop
    const dCountry = document.getElementById('desktop_sum_country');
    if(selectedCountry) dCountry.innerHTML = `<span>${selectedCountry}</span>`;
    else dCountry.innerHTML = `<span class="text-gray-500 font-normal">Select region...</span>`;
    
    // Mobile
    const mCountry = document.getElementById('mob_sum_country');
    if(selectedCountry) mCountry.innerText = selectedCountry;
    else mCountry.innerText = "Select region";

    // Data Calculation
    const gbValue = document.getElementById('gb_slider').value;
    document.getElementById('slider-val-display').innerText = gbValue;

    let dataStringDesktop = "", dataStringMobile = "";
    if (currentDataType === 'total') {
        dataStringDesktop = `${gbValue} GB <span class="text-sm font-normal text-gray-400">(Total)</span>`;
        dataStringMobile = `${gbValue} GB Total`;
    } else {
        const daysValue = document.getElementById('days_slider').value;
        document.getElementById('days-val-display').innerText = daysValue;
        dataStringDesktop = `${gbValue} GB <span class="text-sm font-normal text-gray-300">/ day for ${daysValue} Days</span>`;
        dataStringMobile = `${gbValue}GB/day (${daysValue}d)`;
    }
    
    const dData = document.getElementById('desktop_sum_data');
    if (dData.dataset.val !== dataStringDesktop) {
        dData.innerHTML = dataStringDesktop;
        dData.dataset.val = dataStringDesktop;
        triggerAnimation(dData);
    }
    
    document.getElementById('mob_sum_data').innerText = dataStringMobile;

    // Buttons
    const dBtn = document.getElementById('desktop_submit_btn');
    const mBtn = document.getElementById('mob_submit_btn');
    if (selectedCountry !== "") {
        dBtn.removeAttribute('disabled'); mBtn.removeAttribute('disabled');
    } else {
        dBtn.setAttribute('disabled', 'true'); mBtn.setAttribute('disabled', 'true');
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
        user_id: currentUser.id, country: selectedCountry,
        start_date: dummyDateStr, end_date: endDateStr,   
        data_type: currentDataType, requested_gb: document.getElementById('gb_slider').value,
        status: 'pending', price: 0
    };

    document.getElementById('desktop_submit_btn').setAttribute('disabled', 'true');
    document.getElementById('mob_submit_btn').setAttribute('disabled', 'true');
    
    const { error } = await supabaseClient.from('esim_requests').insert([payload]);
    
    if (error) {
        showToast(error.message, 'error');
        document.getElementById('desktop_submit_btn').removeAttribute('disabled');
        document.getElementById('mob_submit_btn').removeAttribute('disabled');
    } else {
        showToast('Request sent successfully!');
        document.getElementById('gb_slider').value = 5;
        document.getElementById('custom_country_input').value = "";
        if(document.querySelector('input[name="country_selection"]:checked')) document.querySelector('input[name="country_selection"]:checked').checked = false;
        setDataType('total');
        updateSummary(); 
        
        // Auto switch tab & button highlight
        document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => btn.classList.remove('bg-gray-800', 'text-blue-600'));
        document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.add('text-gray-400'));
        
        switchTab('my-esims-tab');
        
        // Manually highlight the middle button
        const dBtn = document.querySelectorAll('#desktop-user-nav button')[1];
        const mBtn = document.querySelectorAll('#mob-user-nav button')[1];
        if(dBtn) dBtn.classList.add('bg-gray-800');
        if(mBtn) mBtn.classList.replace('text-gray-400', 'text-blue-600');
    }
}

// 6. CARD HELPERS
function getPlanDescriptionCard(req) {
    if (req.data_type === 'daily') {
        const diffDays = Math.round(Math.abs((new Date(req.end_date) - new Date(req.start_date)) / 86400000));
        return `<span class="font-bold text-gray-800 text-xl">${req.requested_gb}GB</span> <span class="text-gray-500 text-xs font-semibold ml-1">/ day (${diffDays} days)</span>`;
    } else return `<span class="font-bold text-gray-800 text-xl">${req.requested_gb}GB</span> <span class="text-gray-500 text-xs font-semibold ml-1 uppercase">(Total)</span>`;
}

function getStatusBadge(status) {
    if(status === 'pending') return `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 shadow-sm"><i class="fa-solid fa-hourglass-half mr-1"></i> PENDING</span>`;
    if(status === 'processing') return `<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 shadow-sm"><i class="fa-solid fa-gear fa-spin mr-1"></i> ADMIN BUYING</span>`;
    if(status === 'approved') return `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm"><i class="fa-solid fa-check mr-1"></i> APPROVED</span>`;
    if(status === 'rejected') return `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 shadow-sm"><i class="fa-solid fa-xmark mr-1"></i> CANCELLED</span>`;
    return status;
}

// 7. USER VIEWS (Cards)
async function loadUserRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('user-requests-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<div class="col-span-full p-8 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-100"><i class="fa-solid fa-ghost text-4xl mb-3 block"></i> No eSIMs yet.</div>`;
        return;
    }

    data.forEach(req => {
        let actionHTML = '';
        if(req.status === 'approved' && req.installation_link) actionHTML = `<a href="${req.installation_link}" target="_blank" class="w-full text-center block bg-blue-100 text-blue-700 px-4 py-3 rounded-xl text-sm font-bold hover:bg-blue-200 transition"><i class="fa-solid fa-qrcode mr-2"></i> Install QR</a>`;
        else if(req.status === 'rejected') actionHTML = `<div class="w-full text-center text-red-400 text-sm font-bold italic py-2">Request denied</div>`;
        else if(req.status === 'processing') actionHTML = `<div class="w-full text-center text-blue-500 text-sm font-bold italic py-2">Hold on, admin is processing...</div>`;
        else actionHTML = `<div class="w-full text-center text-gray-400 text-sm font-bold italic py-2">Waiting for admin to see it</div>`;

        container.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition relative overflow-hidden group">
                <div class="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h4 class="font-black text-2xl text-gray-800 leading-tight">${req.country}</h4>
                        <div class="mt-2">${getPlanDescriptionCard(req)}</div>
                    </div>
                </div>
                <div class="absolute top-4 right-4 z-10">${getStatusBadge(req.status)}</div>
                <div class="pt-4 border-t border-gray-50 mt-auto relative z-10">
                    ${actionHTML}
                </div>
            </div>
        `;
    });
}

async function loadUserBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).eq('status', 'approved');
    if (error) return;
    const monthlyData = {};
    data.forEach(req => {
        const month = req.created_at.substring(0, 7); 
        if(!monthlyData[month]) monthlyData[month] = { gb: 0, cost: 0, items: 0 };
        let reqGb = parseFloat(req.requested_gb);
        if(req.data_type === 'daily') reqGb = reqGb * Math.round(Math.abs((new Date(req.end_date) - new Date(req.start_date)) / 86400000));
        monthlyData[month].gb += reqGb;
        monthlyData[month].cost += parseFloat(req.price || 0);
        monthlyData[month].items += 1;
    });
    const container = document.getElementById('user-billing-list');
    container.innerHTML = '';
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    
    if(sortedMonths.length === 0) return container.innerHTML = `<div class="col-span-full p-8 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">No billing history yet.</div>`;
    
    sortedMonths.forEach(month => {
        const info = monthlyData[month];
        container.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div class="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
                    <h4 class="font-black text-xl text-blue-600">${month}</h4>
                    <span class="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">${info.items} eSIMs</span>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-xs text-gray-400 font-bold uppercase mb-1">Total Used</p>
                        <p class="font-bold text-gray-800">${info.gb} GB</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-400 font-bold uppercase mb-1">Total Due</p>
                        <p class="font-black text-3xl text-gray-900 leading-none">${info.cost.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

// 8. ADMIN VIEWS (Cards)
async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('admin-requests-list');
    container.innerHTML = '';
    let pending = 0;

    data.forEach(req => {
        if (req.status === 'pending' || req.status === 'processing') {
            pending++;
            let actionArea = '';
            
            if (req.status === 'pending') {
                actionArea = `
                    <div class="flex gap-2 mt-4">
                        <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-100 transition"><i class="fa-solid fa-ban"></i></button>
                        <button onclick="changeStatus('${req.id}', 'processing')" class="flex-1 bg-blue-100 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-200 transition">Start Process</button>
                    </div>`;
            } else {
                actionArea = `
                    <div class="flex flex-col gap-2 mt-4">
                        <input type="text" id="link_${req.id}" class="bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-purple-400" placeholder="Paste QR Link here...">
                        <div class="flex gap-2">
                            <div class="relative w-1/3">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 font-bold">$</span>
                                <input type="number" step="0.01" id="price_${req.id}" class="w-full bg-purple-50 border border-purple-100 rounded-xl p-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-purple-400 font-bold" placeholder="Cost">
                            </div>
                            <button onclick="approveRequest('${req.id}')" class="flex-1 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition shadow-md">Approve</button>
                            <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-50 text-red-500 px-4 rounded-xl hover:bg-red-100 transition"><i class="fa-solid fa-ban"></i></button>
                        </div>
                    </div>`;
            }
            
            container.innerHTML += `
                <div class="bg-white p-5 rounded-3xl shadow-sm border border-purple-100 flex flex-col justify-between">
                    <div class="flex justify-between items-start mb-2">
                        <div class="truncate pr-2 w-full">
                            <p class="text-xs text-gray-400 font-bold uppercase truncate">${req.profiles?.email || 'Unknown'}</p>
                            <h4 class="font-black text-xl text-purple-900 truncate mt-1">${req.country}</h4>
                        </div>
                        <div class="shrink-0">${getStatusBadge(req.status)}</div>
                    </div>
                    <div class="mt-2">
                        ${getPlanDescriptionCard(req)}
                    </div>
                    <div class="pt-4 border-t border-purple-50 mt-4">
                        ${actionArea}
                    </div>
                </div>`;
        }
    });
    
    if(pending===0) container.innerHTML = `<div class="col-span-full p-8 text-center text-purple-300 font-bold bg-white rounded-3xl border border-purple-50"><i class="fa-solid fa-mug-hot text-4xl mb-3 block"></i> All caught up! No pending requests.</div>`;
}

async function loadAdminHistory() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('admin-history-list');
    container.innerHTML = '';
    
    if (data.length === 0) return container.innerHTML = `<div class="col-span-full p-8 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">No history found.</div>`;

    data.forEach(req => {
        let dateStr = new Date(req.created_at).toLocaleDateString();
        let linkHtml = req.installation_link ? `<a href="${req.installation_link}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition"><i class="fa-solid fa-link"></i></a>` : '';
        let costStr = req.price ? `<span class="text-green-600 font-black">${parseFloat(req.price).toFixed(2)}</span>` : '<span class="text-gray-300">-</span>';
        
        container.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                    <div class="truncate pr-2">
                        <p class="text-xs text-gray-400 font-bold uppercase truncate">${req.profiles?.email?.split('@')[0] || 'Unknown'}</p>
                        <h4 class="font-bold text-lg text-gray-800 truncate">${req.country}</h4>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-xs text-gray-400">${dateStr}</p>
                        ${getStatusBadge(req.status)}
                    </div>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="text-sm">${getPlanDescriptionCard(req)}</div>
                    <div class="text-lg">${costStr}</div>
                </div>
                <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                    <div>${linkHtml}</div>
                    <button onclick="deleteRequest('${req.id}')" class="text-red-400 hover:bg-red-50 p-2 rounded-lg transition text-sm font-bold"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
                </div>
            </div>`;
    });
}

async function loadAdminBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').eq('status', 'approved');
    if (error) return;
    const adminMonthly = {};
    data.forEach(req => {
        const month = req.created_at.substring(0, 7);
        const email = req.profiles?.email || 'Unknown';
        const key = `${month}_${email}`;
        if(!adminMonthly[key]) adminMonthly[key] = { email, month, gb: 0, cost: 0, items: 0 };
        let reqGb = parseFloat(req.requested_gb);
        if(req.data_type === 'daily') reqGb = reqGb * Math.round(Math.abs((new Date(req.end_date) - new Date(req.start_date)) / 86400000));
        adminMonthly[key].gb += reqGb; adminMonthly[key].cost += parseFloat(req.price || 0); adminMonthly[key].items += 1;
    });
    
    const container = document.getElementById('admin-billing-records-list');
    container.innerHTML = '';
    const sortedKeys = Object.keys(adminMonthly).sort().reverse();
    
    if(sortedKeys.length === 0) return container.innerHTML = `<div class="col-span-full p-8 text-center text-purple-300 font-bold bg-white rounded-2xl border border-purple-50">No bills generated yet.</div>`;
    
    sortedKeys.forEach(key => {
        const info = adminMonthly[key];
        container.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-between">
                <div class="flex justify-between items-center mb-4 pb-4 border-b border-purple-50">
                    <h4 class="font-black text-xl text-purple-700">${info.month}</h4>
                    <span class="bg-purple-50 text-purple-600 text-xs font-bold px-2 py-1 rounded-lg">${info.items} eSIMs</span>
                </div>
                <div class="mb-4">
                    <p class="text-xs text-gray-400 font-bold uppercase mb-1">User</p>
                    <p class="font-bold text-gray-800 truncate">${info.email}</p>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-xs text-gray-400 font-bold uppercase mb-1">Total Data</p>
                        <p class="font-bold text-gray-600">${info.gb} GB</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-400 font-bold uppercase mb-1">Total Due</p>
                        <p class="font-black text-3xl text-gray-900 leading-none">${info.cost.toFixed(2)}</p>
                    </div>
                </div>
            </div>`;
    });
}

// 9. API CALLS
async function changeStatus(reqId, newStatus) {
    const { error } = await supabaseClient.from('esim_requests').update({ status: newStatus }).eq('id', reqId);
    if (error) showToast(error.message, 'error');
    else { showToast('Status updated!'); loadAdminRequests(); }
}

async function approveRequest(reqId) {
    const linkInput = document.getElementById(`link_${reqId}`).value;
    const priceInput = document.getElementById(`price_${reqId}`).value || 0;
    if(!linkInput) return showToast("Provide link", "error");
    const { error } = await supabaseClient.from('esim_requests').update({ status: 'approved', installation_link: linkInput, price: priceInput }).eq('id', reqId);
    if (error) showToast(error.message, 'error');
    else { showToast("Approved!"); loadAdminRequests(); }
}

async function deleteRequest(reqId) {
    if(!confirm("Delete forever?")) return;
    await supabaseClient.from('esim_requests').delete().eq('id', reqId);
    loadAdminHistory();
}
