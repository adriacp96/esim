let giftCurrentDataType = 'total';

function setGiftDataType(type) {
    giftCurrentDataType = type;
    const slider = document.getElementById('gift_gb_slider');
    const btnTotal = document.getElementById('gift_btn_type_total');
    const btnDaily = document.getElementById('gift_btn_type_daily');
    const daysContainer = document.getElementById('gift_days_container');
    const sliderTypeDisplay = document.getElementById('gift-slider-type-display');

    if (type === 'total') {
        btnTotal.className = "flex-1 py-1.5 text-xs font-bold rounded-lg bg-white shadow text-black transition-all";
        btnDaily.className = "flex-1 py-1.5 text-xs font-bold rounded-lg text-zinc-500 transition-all bg-transparent";
        sliderTypeDisplay.innerText = "total plan";
        slider.max = "12";
        slider.value = "2";
        slider.classList.remove('slider-orange');
        slider.classList.add('slider-black');
        if (daysContainer) daysContainer.classList.add('hidden');
    } else {
        btnDaily.className = "flex-1 py-1.5 text-xs font-bold rounded-lg bg-white shadow text-black transition-all";
        btnTotal.className = "flex-1 py-1.5 text-xs font-bold rounded-lg text-zinc-500 transition-all bg-transparent";
        sliderTypeDisplay.innerText = "/ day";
        slider.max = "10";
        slider.value = "2";
        slider.classList.add('slider-orange');
        slider.classList.remove('slider-black');
        if (daysContainer) daysContainer.classList.remove('hidden');
    }
    onGiftSliderChange();
}

function onGiftSliderChange() {
    const val = document.getElementById('gift_gb_slider').value;
    const label = getGbLabel(val, giftCurrentDataType);
    document.getElementById('gift-slider-val-display').innerText = label;
    updateGiftSummary();
}

function updateGiftSummary() {
    const radioSelected = document.querySelector('input[name="gift_country_selection"]:checked');
    const customDiv = document.getElementById('gift-custom-country-div');

    if (radioSelected && radioSelected.value === 'custom') {
        customDiv.classList.remove('hidden');
    } else {
        customDiv.classList.add('hidden');
    }

    if (giftCurrentDataType === 'daily') {
        const daysVal = document.getElementById('gift_days_slider').value;
        document.getElementById('gift-days-val-display').innerText = daysVal;
    }
}

async function openGiftModal() {
    document.getElementById('gift-modal').classList.remove('hidden');
    
    // Reset controls
    if (document.querySelector('input[name="gift_country_selection"]:checked')) {
        document.querySelector('input[name="gift_country_selection"]:checked').checked = false;
    }
    document.getElementById('gift_custom_country_input').value = '';
    document.getElementById('gift_link').value = '';
    setGiftDataType('total');

    // Populate Users dropdown
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
    const link = document.getElementById('gift_link').value;

    let selectedCountry = "";
    const radioSelected = document.querySelector('input[name="gift_country_selection"]:checked');
    if (radioSelected) {
        if (radioSelected.value === 'custom') {
            selectedCountry = document.getElementById('gift_custom_country_input').value.trim();
        } else {
            selectedCountry = radioSelected.value;
        }
    }

    if (!userId || !selectedCountry || !link) {
        return showToast("Please select a user, destination, and enter the QR link.", "error");
    }

    const sliderVal = document.getElementById('gift_gb_slider').value;
    const gbValueText = giftCurrentDataType === 'total' 
        ? getGbLabel(sliderVal, 'total') 
        : `${sliderVal} GB`;

    const dummyDateStr = new Date().toISOString().split('T')[0];
    let endDateStr = dummyDateStr;

    if (giftCurrentDataType === 'daily') {
        const days = parseInt(document.getElementById('gift_days_slider').value);
        let endDateObj = new Date();
        endDateObj.setDate(endDateObj.getDate() + days);
        endDateStr = endDateObj.toISOString().split('T')[0];
    }

    const payload = {
        user_id: userId,
        country: selectedCountry,
        start_date: dummyDateStr,
        end_date: endDateStr,
        data_type: giftCurrentDataType,
        requested_gb: gbValueText,
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
        if (typeof loadAdminHistory === 'function') loadAdminHistory();
    }
}
