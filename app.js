// 1. Supabase Configuration
// REPLACE THESE VARIABLES with your Supabase project data
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state variables
let currentUser = null;
let userProfile = null;

// 2. UI Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Configure minimum date input (24h in advance)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    document.getElementById('start_date').min = minDate;
    document.getElementById('end_date').min = minDate;

    // Listen to session changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            document.getElementById('user-email').innerText = currentUser.email;
            checkProfileAndLoadUI();
        } else {
            currentUser = null;
            userProfile = null;
            showView('auth-view');
        }
    });
});

// 3. UI Utility Functions
function showView(viewId) {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('user-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    
    if(viewId !== 'auth-view') {
        document.getElementById('navbar').classList.remove('hidden');
    } else {
        document.getElementById('navbar').classList.add('hidden');
    }

    document.getElementById(viewId).classList.remove('hidden');
}

function showError(msg) {
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = msg;
    errorEl.classList.remove('hidden');
}

// 4. Authentication
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showError(error.message);
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) showError(error.message);
    else alert("Registration successful. Check your email (if confirmation is enabled) or log in.");
}

async function logout() {
    await supabase.auth.signOut();
}

// 5. Main Data Loading
async function checkProfileAndLoadUI() {
    // Fetch the user's profile to check if they are an admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    userProfile = profile || { role: 'user' }; // Fallback in case table isn't created yet

    if (userProfile.role === 'admin') {
        showView('admin-view');
        loadAdminRequests();
    } else {
        showView('user-view');
        loadUserRequests();
    }
}

// 6. User Logic (Friends)
async function requestEsim(e) {
    e.preventDefault();
    const newRequest = {
        user_id: currentUser.id,
        country: document.getElementById('country').value,
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        data_type: document.getElementById('data_type').value,
        requested_gb: document.getElementById('requested_gb').value,
        status: 'pending'
    };

    const { error } = await supabase.from('esim_requests').insert([newRequest]);
    
    if (error) {
        alert("Error requesting: " + error.message);
    } else {
        alert("Request sent successfully");
        document.getElementById('esim-form').reset();
        loadUserRequests(); // Reload the table
    }
}

async function loadUserRequests() {
    const { data, error } = await supabase
        .from('esim_requests')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    const tbody = document.getElementById('user-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        let installBtn = req.status === 'approved' && req.installation_link 
            ? `<a href="${req.installation_link}" target="_blank" class="text-blue-600 underline font-bold">View QR/Install</a>` 
            : `<span class="text-gray-400">Not available</span>`;
        
        let statusColor = req.status === 'pending' ? 'text-orange-500' : 'text-green-600';

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-2">${req.country}</td>
                <td class="p-2">${req.start_date} to ${req.end_date}</td>
                <td class="p-2">${req.requested_gb}GB (${req.data_type})</td>
                <td class="p-2 font-semibold ${statusColor}">${req.status.toUpperCase()}</td>
                <td class="p-2">${installBtn}</td>
            </tr>
        `;
    });
}

// 7. Admin Logic (You)
async function loadAdminRequests() {
    const { data, error } = await supabase
        .from('esim_requests')
        .select('*')
        .eq('status', 'pending')
        .order('start_date', { ascending: true });

    if (error) return console.error(error);

    const tbody = document.getElementById('admin-requests-list');
    tbody.innerHTML = '';

    data.forEach(req => {
        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-2">${req.id.substring(0,6)}...</td>
                <td class="p-2 font-bold">${req.country}</td>
                <td class="p-2">${req.start_date} <br> ${req.end_date}</td>
                <td class="p-2">${req.requested_gb}GB (${req.data_type})</td>
                <td class="p-2">
                    <input type="text" id="link_${req.id}" class="border p-1 w-full text-sm" placeholder="URL or QR Link">
                </td>
                <td class="p-2">
                    <button onclick="approveRequest('${req.id}')" class="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">Approve & Send</button>
                </td>
            </tr>
        `;
    });
}

async function approveRequest(reqId) {
    const linkInput = document.getElementById(`link_${reqId}`).value;
    
    if(!linkInput) return alert("Please enter the eSIM installation link");

    const { error } = await supabase
        .from('esim_requests')
        .update({ 
            status: 'approved', 
            installation_link: linkInput 
        })
        .eq('id', reqId);

    if (error) alert("Error approving: " + error.message);
    else loadAdminRequests(); // Reload the table
}
