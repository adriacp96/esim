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
    toast.className = `${color} text-white px-5 py-3 rounded-lg shadow-xl transform transition-all translate-x-full font-bold flex items-center text-sm md:text-base`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-3 text-lg"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => { toast.classList.add('translate-x-full'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    // Highlight Mobile Nav
    document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.replace('text-blue-600', 'text-gray-400'));
    document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.replace('text-purple-700', 'text-gray-400'));
    if(event && event.currentTarget.classList.contains('mob-nav-btn')){
        let color = userProfile.role === 'admin' ? 'text-purple-700' : 'text-blue-600';
        event.currentTarget.classList.replace('text-gray-400', color);
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
        switchTab('admin-requests-tab');
    } else {
        document.getElementById('desktop-user-nav').classList.remove('hidden');
        document.getElementById('desktop-admin-nav').classList.add('hidden');
        document.getElementById('mob-user-nav').classList.remove('hidden');
        document.getElementById('mob-admin-nav').classList.add('hidden');
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
        switchTab('my-esims-tab');
    }
}

// 6. HELPERS
function getPlanDescription(req) {
    if (req.data_type === 'daily') {
        const diffDays = Math.round(Math.abs((new Date(req.end_date) - new Date(req.start_date)) / 86400000));
        return `<span class="font-bold">${req.requested_gb}GB</span><span class="text-xs text-gray-500 ml-1">/day (${diffDays}d)</span>`;
    } else return `<span class="font-bold">${req.requested_gb}GB</span><span class="text-xs text-gray-500 ml-1">(Total)</span>`;
}

function getStatusIcon(status) {
    if(status === 'pending') return `<span class="text-orange-500"><i class="fa-solid fa-hourglass-half"></i></span>`;
    if(status === 'processing') return `<span class="text-blue-500"><i class="fa-solid fa-gear fa-spin"></i></span>`;
    if(status === 'approved') return `<span class="text-green-500"><i class="fa-solid fa-check"></i></span>`;
    if(status === 'rejected') return `<span class="text-red-500"><i class="fa-solid fa-xmark"></i></span>`;
    return status;
}

// 7. USER VIEWS
async function loadUserRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return;
    const tbody = document.getElementById('user-requests-list');
    tbody.innerHTML = '';
    data.forEach(req => {
        let actionHTML = '';
        if(req.status === 'approved' && req.installation_link) actionHTML = `<a href="${req.installation_link}" target="_blank" class="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"><i class="fa-solid fa-qrcode"></i> Install</a>`;
        else if(req.status === 'rejected') actionHTML = `<span class="text-red-400 text-xs italic">Cancelled</span>`;
        else actionHTML = `<span class="text-gray-400 text-xs italic">Wait...</span>`;

        tbody.innerHTML += `
            <tr class="border-b border-gray-50">
                <td class="p-3 font-bold text-gray-800 text-sm whitespace-nowrap">${req.country}</td>
                <td class="p-3 whitespace-nowrap">${getPlanDescription(req)}</td>
                <td class="p-3 text-center">${getStatusIcon(req.status)}</td>
                <td class="p-3">${actionHTML}</td>
            </tr>
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
    const tbody = document.getElementById('user-billing-list');
    tbody.innerHTML = '';
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    if(sortedMonths.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400 font-bold">No bills yet.</td></tr>`;
    sortedMonths.forEach(month => {
        const info = monthlyData[month];
        tbody.innerHTML += `
            <tr class="border-b border-gray-50">
                <td class="p-4 font-bold text-blue-600">${month}</td>
                <td class="p-4 text-gray-500 text-sm">${info.items}</td>
                <td class="p-4 text-gray-800 text-sm">${info.gb} GB</td>
                <td class="p-4 font-black text-gray-900 text-right">${info.cost.toFixed(2)}</td>
            </tr>
        `;
    });
}

// 8. ADMIN VIEWS
async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;
    const tbody = document.getElementById('admin-requests-list');
    tbody.innerHTML = '';
    let pending = 0;
    data.forEach(req => {
        if (req.status === 'pending' || req.status === 'processing') {
            pending++;
            let actionArea = '';
            if (req.status === 'pending') {
                actionArea = `
                    <div class="flex gap-2">
                        <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-50 text-red-500 p-2 rounded text-xs hover:bg-red-100"><i class="fa-solid fa-ban"></i></button>
                        <button onclick="changeStatus('${req.id}', 'processing')" class="bg-blue-100 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-200">Process</button>
                    </div>`;
            } else {
                actionArea = `
                    <div class="flex flex-col gap-1 w-48">
                        <input type="text" id="link_${req.id}" class="border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-purple-500" placeholder="QR Link...">
                        <div class="flex gap-1">
                            <input type="number" step="0.01" id="price_${req.id}" class="w-16 border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-purple-500" placeholder="$$">
                            <button onclick="approveRequest('${req.id}')" class="flex-1 bg-green-600 text-white px-2 py-1.5 rounded text-xs font-bold hover:bg-green-700">OK</button>
                        </div>
                    </div>`;
            }
            tbody.innerHTML += `
                <tr class="border-b border-purple-50">
                    <td class="p-3 text-xs"><p class="font-bold truncate w-24">${req.profiles?.email?.split('@')[0]}</p></td>
                    <td class="p-3 text-sm font-bold text-purple-900">${req.country}<br><span class="text-xs text-purple-600 font-normal">${getPlanDescription(req)}</span></td>
                    <td class="p-3 text-center">${getStatusIcon(req.status)}</td>
                    <td class="p-3">${actionArea}</td>
                </tr>`;
        }
    });
    if(pending===0) tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400 font-bold">No pending requests!</td></tr>`;
}

async function loadAdminHistory() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;
    const tbody = document.getElementById('admin-history-list');
    tbody.innerHTML = '';
    data.forEach(req => {
        let linkHtml = req.installation_link ? `<a href="${req.installation_link}" target="_blank" class="text-blue-500"><i class="fa-solid fa-link"></i></a>` : '-';
        let costStr = req.price ? `<span class="text-green-600 font-bold">${parseFloat(req.price).toFixed(2)}</span>` : '-';
        tbody.innerHTML += `
            <tr class="border-b border-gray-100">
                <td class="p-3 text-xs truncate max-w-[80px]">${req.profiles?.email?.split('@')[0]}</td>
                <td class="p-3 text-xs font-bold">${req.country}</td>
                <td class="p-3 text-xs">${costStr}</td>
                <td class="p-3 text-center text-xs">${getStatusIcon(req.status)} ${linkHtml}</td>
                <td class="p-3 text-center"><button onclick="deleteRequest('${req.id}')" class="text-red-400 p-1"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
    });
}

async function loadAdminBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').eq('status', 'approved');
    if (error) return;
    const adminMonthly = {};
    data.forEach(req => {
        const month = req.created_at.substring(0, 7);
        const email = req.profiles?.email || '?';
        const key = `${month}_${email}`;
        if(!adminMonthly[key]) adminMonthly[key] = { email, month, gb: 0, cost: 0, items: 0 };
        let reqGb = parseFloat(req.requested_gb);
        if(req.data_type === 'daily') reqGb = reqGb * Math.round(Math.abs((new Date(req.end_date) - new Date(req.start_date)) / 86400000));
        adminMonthly[key].gb += reqGb; adminMonthly[key].cost += parseFloat(req.price || 0); adminMonthly[key].items += 1;
    });
    const tbody = document.getElementById('admin-billing-records-list');
    tbody.innerHTML = '';
    const sortedKeys = Object.keys(adminMonthly).sort().reverse();
    if(sortedKeys.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400">No bills.</td></tr>`;
    sortedKeys.forEach(key => {
        const info = adminMonthly[key];
        tbody.innerHTML += `
            <tr class="border-b border-purple-50">
                <td class="p-3 text-xs font-bold truncate max-w-[100px]">${info.email}</td>
                <td class="p-3 text-xs text-purple-700">${info.month}</td>
                <td class="p-3 text-xs">${info.items}</td>
                <td class="p-3 text-sm font-black text-right">${info.cost.toFixed(2)}</td>
            </tr>`;
    });
}

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
