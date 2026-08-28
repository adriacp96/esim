const SUPABASE_URL = 'https://dvutnthqhkmqzgkihdtd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXRudGhxaGttcXpna2loZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzcxOTAsImV4cCI6MjEwMzExMzE5MH0.nfcTnpmzJ8Jz9bO10Xox9T6D1UOF7fwfG-3IOtn9ceI';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;
let currentDataType = 'total'; 

const bgColors = [
    'from-blue-600 to-indigo-900', 'from-rose-500 to-red-800', 
    'from-emerald-500 to-teal-900', 'from-amber-500 to-orange-800',
    'from-violet-600 to-fuchsia-900', 'from-cyan-500 to-blue-800'
];

document.addEventListener('DOMContentLoaded', () => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => { if (session) activarSesionUI(session); });
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) activarSesionUI(session); else desactivarSesionUI();
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
    const isErr = type === 'error';
    toast.className = `glass ${isErr ? 'text-red-600 border-red-200' : 'text-zinc-900 border-white'} border px-5 py-4 rounded-2xl shadow-2xl transform transition-all translate-x-full font-bold flex items-center text-sm md:text-base`;
    toast.innerHTML = `<i class="fa-solid ${isErr ? 'fa-circle-exclamation' : 'fa-check-circle text-green-500'} mr-3 text-xl"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => { toast.classList.add('translate-x-full'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('bg-zinc-800', 'text-white'));
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.remove('text-white', 'bg-white/10');
        btn.classList.add('text-zinc-400');
    });

    if(event && event.currentTarget) {
        const btn = event.currentTarget;
        if(btn.classList.contains('mob-nav-btn')) {
            btn.classList.replace('text-zinc-400', 'text-white');
            btn.classList.add('bg-white/10');
        } else {
            btn.classList.add('bg-zinc-800', 'text-white');
        }
    }

    if (tabId === 'request-tab') document.getElementById('mobile-summary').classList.remove('hidden');
    else document.getElementById('mobile-summary').classList.add('hidden');

    if (tabId === 'my-esims-tab') loadUserRequests();
    if (tabId === 'billing-tab') loadUserBilling();
    if (tabId === 'admin-requests-tab') loadAdminRequests();
    if (tabId === 'admin-history-tab') loadAdminHistory();
    if (tabId === 'admin-billing-tab') loadAdminBilling();
}

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
    if (error) showToast(error.message, 'error'); else showToast('Success! Logging in...');
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
        
        const firstBtn = document.querySelector('#desktop-admin-nav button');
        const firstMobBtn = document.querySelector('#mob-admin-nav button');
        if(firstBtn) firstBtn.classList.add('bg-zinc-800', 'text-white');
        if(firstMobBtn) { firstMobBtn.classList.replace('text-zinc-400', 'text-white'); firstMobBtn.classList.add('bg-white/10'); }
        
        switchTab('admin-requests-tab');
    } else {
        document.getElementById('desktop-user-nav').classList.remove('hidden');
        document.getElementById('desktop-admin-nav').classList.add('hidden');
        document.getElementById('mob-user-nav').classList.remove('hidden');
        document.getElementById('mob-admin-nav').classList.add('hidden');
        
        const firstBtn = document.querySelector('#desktop-user-nav button');
        const firstMobBtn = document.querySelector('#mob-user-nav button');
        if(firstBtn) firstBtn.classList.add('bg-zinc-800', 'text-white');
        if(firstMobBtn) { firstMobBtn.classList.replace('text-zinc-400', 'text-white'); firstMobBtn.classList.add('bg-white/10'); }

        switchTab('request-tab');
        updateSummary();
    }
}

function triggerAnimation(element) {
    element.classList.remove('animate-pop'); void element.offsetWidth; element.classList.add('animate-pop');
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

    const sliderVal = document.getElementById('gb_slider').value;
    const gbValueText = currentDataType === 'total' ? getGbLabel(sliderVal) : `${sliderVal} GB`;

    const payload = {
        user_id: currentUser.id, country: selectedCountry,
        start_date: dummyDateStr, end_date: endDateStr,   
        data_type: currentDataType, requested_gb: gbValueText,
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
        showToast('eSIM Requested!');
        document.getElementById('gb_slider').value = 2;
        document.getElementById('custom_country_input').value = "";
        if(document.querySelector('input[name="country_selection"]:checked')) document.querySelector('input[name="country_selection"]:checked').checked = false;
        setDataType('total'); updateSummary(); 
        
        document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => {
            btn.classList.remove('bg-zinc-800', 'text-white', 'bg-white/10');
            if(btn.classList.contains('mob-nav-btn')) btn.classList.add('text-zinc-400');
        });
        
        switchTab('my-esims-tab');
        
        const dBtn = document.querySelectorAll('#desktop-user-nav button')[1];
        const mBtn = document.querySelectorAll('#mob-user-nav button')[1];
        if(dBtn) dBtn.classList.add('bg-zinc-800', 'text-white');
        if(mBtn) { mBtn.classList.replace('text-zinc-400', 'text-white'); mBtn.classList.add('bg-white/10'); }
    }
}

function getPlanInfo(req) {
    if (req.data_type === 'daily') {
        const diffDays = Math.round(Math.abs((new Date(req.end_date) - new Date(req.start_date)) / 86400000));
        const gbText = req.requested_gb.includes('GB') ? req.requested_gb : `${req.requested_gb}GB`;
        return { large: gbText, small: `/ DAY FOR ${diffDays} DAYS` };
    } else {
        const gbText = req.requested_gb.includes('GB') || req.requested_gb.includes('∞') ? req.requested_gb : `${req.requested_gb} GB`;
        return { large: gbText, small: 'TOTAL PLAN' };
    }
}

function hashCode(str) { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } return hash; }

async function loadUserRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('user-requests-list');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<div class="col-span-full p-10 text-center text-zinc-400 font-bold bg-white rounded-[2rem] border border-zinc-100 shadow-sm">No eSIMs in your wallet.</div>`; return;
    }

    data.forEach((req, idx) => {
        const plan = getPlanInfo(req);
        const bgClass = req.is_gift ? 'from-yellow-400 to-yellow-600' : bgColors[Math.abs(hashCode(req.country)) % bgColors.length];
        
        let actionUI = '';
        let statusUI = '';

        if(req.status === 'approved' && req.installation_link) {
            statusUI = `<span class="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white tracking-widest uppercase">Active</span>`;
            actionUI = `<a href="${req.installation_link}" target="_blank" class="bg-white text-black text-center px-4 py-2 rounded-xl font-black text-xs active:scale-95 transition inline-flex items-center shadow-md"><i class="fa-solid fa-qrcode mr-1.5"></i> Install</a>`;
        } else if(req.status === 'rejected') {
            statusUI = `<span class="bg-red-500/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white tracking-widest uppercase">Cancelled</span>`;
            actionUI = `<span class="text-white/50 text-xs font-bold">Denied</span>`;
        } else if(req.status === 'processing') {
            statusUI = `<span class="bg-blue-500/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white tracking-widest uppercase"><i class="fa-solid fa-gear fa-spin mr-1"></i> Processing</span>`;
            actionUI = `<span class="text-white/80 text-xs font-bold">Preparing...</span>`;
        } else {
            statusUI = `<span class="bg-orange-500/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white tracking-widest uppercase"><i class="fa-solid fa-clock mr-1"></i> Pending</span>`;
            actionUI = `<span class="text-white/80 text-xs font-bold">Waiting</span>`;
        }

        if (req.is_gift) {
            statusUI = `<span class="bg-yellow-500/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white tracking-widest uppercase mr-2 shadow-sm"><i class="fa-solid fa-gift mr-1"></i> Gift</span>` + statusUI;
        }

        container.innerHTML += `
            <div class="relative bg-gradient-to-r ${bgClass} rounded-2xl p-5 text-white shadow-lg overflow-hidden flex items-center justify-between gap-4">
                <div class="absolute -right-6 -bottom-6 text-white/10 text-7xl pointer-events-none"><i class="fa-solid fa-sim-card"></i></div>
                <div class="relative z-10 min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 class="text-lg font-black tracking-tight truncate">${req.country}</h3>
                        <div class="flex">${statusUI}</div>
                    </div>
                    <div class="flex items-baseline gap-1.5">
                        <span class="text-2xl font-black tracking-tighter">${plan.large}</span>
                        <span class="text-[10px] font-bold text-white/80 uppercase">${plan.small}</span>
                    </div>
                </div>
                <div class="relative z-10 shrink-0">
                    ${actionUI}
                </div>
            </div>`;
    });
}

async function loadUserBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*').eq('user_id', currentUser.id).eq('status', 'approved');
    if (error) return;
    const monthlyData = {};
    data.forEach(req => {
        const month = req.created_at.substring(0, 7); 
        if(!monthlyData[month]) monthlyData[month] = { cost: 0, items: 0 };
        monthlyData[month].cost += parseFloat(req.price || 0); monthlyData[month].items += 1;
    });
    const container = document.getElementById('user-billing-list');
    container.innerHTML = '';
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    if(sortedMonths.length === 0) return container.innerHTML = `<div class="col-span-full p-10 text-center text-zinc-400 font-bold bg-white rounded-[2rem] border border-zinc-100 shadow-sm">No billing history yet.</div>`;
    sortedMonths.forEach(month => {
        const info = monthlyData[month];
        container.innerHTML += `
            <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-zinc-100 flex flex-col justify-between">
                <div class="flex justify-between items-center mb-6">
                    <h4 class="font-black text-2xl text-zinc-900 tracking-tight">${month}</h4>
                    <span class="bg-zinc-100 text-zinc-600 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">${info.items} eSIMs</span>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Status</p>
                        <p class="font-bold text-zinc-700">Settled</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Due</p>
                        <p class="font-black text-3xl text-black tracking-tighter leading-none">${info.cost.toFixed(2)} <span class="text-sm font-bold text-zinc-500">AED</span></p>
                    </div>
                </div>
            </div>`;
    });
}

async function loadAdminRequests() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('admin-requests-list');
    container.innerHTML = '';
    let pending = 0;

    data.forEach(req => {
        if (req.status === 'pending' || req.status === 'processing') {
            pending++;
            const plan = getPlanInfo(req);
            let actionArea = '';
            
            if (req.status === 'pending') {
                actionArea = `
                    <div class="flex gap-2">
                        <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-50 text-red-500 px-4 py-3 rounded-xl hover:bg-red-100 transition active:scale-95"><i class="fa-solid fa-ban"></i></button>
                        <button onclick="changeStatus('${req.id}', 'processing')" class="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg active:scale-95">Accept & Process</button>
                    </div>`;
            } else {
                actionArea = `
                    <div class="flex flex-col gap-2">
                        <input type="text" id="link_${req.id}" class="bg-zinc-50 border-0 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-black" placeholder="Paste QR Link here...">
                        <div class="flex gap-2">
                            <div class="relative flex-1">
                                <input type="number" step="0.01" id="price_${req.id}" class="w-full bg-zinc-50 border-0 rounded-xl p-3 pr-14 text-sm font-black outline-none focus:ring-2 focus:ring-black" placeholder="0.00">
                                <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-zinc-400 uppercase">AED</span>
                            </div>
                            <button onclick="approveRequest('${req.id}')" class="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95">Send</button>
                            <button onclick="changeStatus('${req.id}', 'rejected')" class="bg-red-50 text-red-500 px-3 rounded-xl hover:bg-red-100 transition active:scale-95"><i class="fa-solid fa-ban"></i></button>
                        </div>
                    </div>`;
            }
            
            container.innerHTML += `
                <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-zinc-100 flex flex-col justify-between">
                    <div class="flex justify-between items-start mb-4">
                        <div class="truncate pr-2 w-full">
                            <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase truncate mb-1">${req.profiles?.email || 'Unknown'}</p>
                            <h4 class="font-black text-2xl text-zinc-900 truncate tracking-tight">${req.country}</h4>
                        </div>
                        <div class="shrink-0">
                            <span class="w-8 h-8 rounded-full flex items-center justify-center ${req.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}"><i class="fa-solid ${req.status === 'pending' ? 'fa-hourglass-half' : 'fa-gear fa-spin'}"></i></span>
                        </div>
                    </div>
                    <div class="bg-zinc-50 rounded-xl p-3 mb-4">
                        <span class="font-black text-lg">${plan.large}</span> <span class="text-xs font-bold text-zinc-500">${plan.small}</span>
                    </div>
                    <div class="mt-auto">${actionArea}</div>
                </div>`;
        }
    });
    
    if(pending===0) container.innerHTML = `<div class="col-span-full p-10 text-center text-zinc-400 font-bold bg-white rounded-[2rem] border border-zinc-100 shadow-sm"><div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3"><i class="fa-solid fa-check text-2xl"></i></div> Inbox Zero. Great job!</div>`;
}

async function loadAdminHistory() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('admin-history-list');
    container.innerHTML = '';
    
    if (data.length === 0) return container.innerHTML = `<div class="col-span-full p-10 text-center text-zinc-400 font-bold bg-white rounded-[2rem] border border-zinc-100 shadow-sm">No data found.</div>`;

    data.forEach(req => {
        const plan = getPlanInfo(req);
        let linkHtml = req.installation_link ? `<a href="${req.installation_link}" target="_blank" class="w-8 h-8 bg-zinc-100 text-zinc-600 hover:bg-blue-100 hover:text-blue-600 rounded-full flex items-center justify-center transition" title="View Link"><i class="fa-solid fa-link text-xs"></i></a>` : '';
        let costStr = req.price ? `<span class="text-green-600 font-black">${parseFloat(req.price).toFixed(2)} <span class="text-xs font-bold text-zinc-400">AED</span></span>` : '<span class="text-zinc-300">-</span>';
        
        container.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-between gap-4">
                <div class="w-2 h-12 rounded-full bg-zinc-100 ${req.status === 'approved' ? '!bg-green-400' : req.status === 'rejected' ? '!bg-red-400' : ''}"></div>
                <div class="flex-1 overflow-hidden">
                    <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase truncate">${req.profiles?.email?.split('@')[0] || 'Unknown'}</p>
                    <h4 class="font-bold text-lg text-zinc-900 truncate tracking-tight leading-tight">${req.country} ${req.is_gift ? '🎁' : ''}</h4>
                    <p class="text-xs text-zinc-500 font-medium">${plan.large} ${plan.small.toLowerCase()}</p>
                </div>
                <div class="text-right">
                    <div class="text-base">${costStr}</div>
                </div>
                <div class="flex items-center gap-1.5 border-l border-zinc-100 pl-3 ml-2">
                    ${linkHtml}
                    <button onclick="openEditModal('${req.id}', '${req.installation_link || ''}', '${req.price || 0}')" class="w-8 h-8 bg-zinc-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 rounded-full flex items-center justify-center transition" title="Edit Link & Price"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button onclick="deleteRequest('${req.id}')" class="w-8 h-8 bg-zinc-50 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-full flex items-center justify-center transition" title="Delete"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
            </div>`;
    });
}

function openEditModal(reqId, currentLink, currentPrice) {
    const newLink = prompt("Update eSIM Link / QR URL:", currentLink);
    if (newLink === null) return;
    
    const newPrice = prompt("Update Price (AED):", currentPrice);
    if (newPrice === null) return;

    updateEsimDetails(reqId, newLink, newPrice);
}

async function updateEsimDetails(reqId, link, price) {
    const { error } = await supabaseClient.from('esim_requests').update({ 
        installation_link: link, 
        price: parseFloat(price) || 0,
        status: 'approved'
    }).eq('id', reqId);

    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('eSIM details updated successfully!');
        loadAdminHistory();
    }
}

async function loadAdminBilling() {
    const { data, error } = await supabaseClient.from('esim_requests').select('*, profiles(email)').eq('status', 'approved');
    if (error) return;
    const adminMonthly = {};
    data.forEach(req => {
        const month = req.created_at.substring(0, 7);
        const email = req.profiles?.email || 'Unknown';
        const key = `${month}_${email}`;
        if(!adminMonthly[key]) adminMonthly[key] = { email, month, cost: 0, items: 0 };
        adminMonthly[key].cost += parseFloat(req.price || 0); adminMonthly[key].items += 1;
    });
    
    const container = document.getElementById('admin-billing-records-list');
    container.innerHTML = '';
    const sortedKeys = Object.keys(adminMonthly).sort().reverse();
    
    if(sortedKeys.length === 0) return container.innerHTML = `<div class="col-span-full p-10 text-center text-zinc-400 font-bold bg-white rounded-[2rem] border border-zinc-100 shadow-sm">No revenue recorded yet.</div>`;
    
    sortedKeys.forEach(key => {
        const info = adminMonthly[key];
        container.innerHTML += `
            <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-zinc-100 flex flex-col justify-between">
                <div class="flex justify-between items-center mb-6">
                    <h4 class="font-black text-2xl text-zinc-900 tracking-tight">${info.month}</h4>
                    <span class="bg-blue-50 text-blue-600 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">${info.items} eSIMs</span>
                </div>
                <div class="bg-zinc-50 rounded-xl p-3 mb-6">
                    <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mb-1">User</p>
                    <p class="font-bold text-sm text-zinc-800 truncate">${info.email}</p>
                </div>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mb-1">Status</p>
                        <p class="font-bold text-zinc-600">Collected</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mb-1">Total Due</p>
                        <p class="font-black text-3xl text-black tracking-tighter leading-none">${info.cost.toFixed(2)} <span class="text-sm font-bold text-zinc-500">AED</span></p>
                    </div>
                </div>
            </div>`;
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
    else { showToast("Approved & Sent!"); loadAdminRequests(); }
}

async function deleteRequest(reqId) {
    if(!confirm("Delete forever?")) return;
    await supabaseClient.from('esim_requests').delete().eq('id', reqId);
    loadAdminHistory();
}

async function openGiftModal() {
    document.getElementById('gift-modal').classList.remove('hidden');
    const { data, error } = await supabaseClient.from('profiles').select('id, email').order('email');
    if (data) {
        const select = document.getElementById('gift_user_select');
        select.innerHTML = '<option value="">Select a user...</option>' + data.map(u => `<option value="${u.id}">${u.email}</option>`).join('');
    }
}

function closeGiftModal() {
    document.getElementById('gift-modal').classList.add('hidden');
}

async function submitGift() {
    const userId = document.getElementById('gift_user_select').value;
    const country = document.getElementById('gift_country').value;
    const plan = document.getElementById('gift_plan').value;
    const link = document.getElementById('gift_link').value;

    if (!userId || !country || !plan || !link) {
        return showToast("Fill all fields to send a gift", "error");
    }

    const dummyDateStr = new Date().toISOString().split('T')[0];

    const payload = {
        user_id: userId,
        country: country,
        start_date: dummyDateStr,
        end_date: dummyDateStr,
        data_type: 'total',
        requested_gb: plan,
        status: 'approved',
        price: 0,
        installation_link: link,
        is_gift: true
    };

    const { error } = await supabaseClient.from('esim_requests').insert([payload]);

    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Gift successfully sent!');
        closeGiftModal();
        document.getElementById('gift_user_select').value = '';
        document.getElementById('gift_country').value = '';
        document.getElementById('gift_plan').value = '';
        document.getElementById('gift_link').value = '';
        loadAdminHistory();
    }
}
