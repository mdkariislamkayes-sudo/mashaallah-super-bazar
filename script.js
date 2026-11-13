import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import { getDatabase, ref, set, get, child, push, onValue } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAifTcD-hqTE4PlkQcjHE6cJOdIA42h_lc",
  authDomain: "nayon-panjabi-fashion.firebaseapp.com",
  databaseURL: "https://nayon-panjabi-fashion-default-rtdb.firebaseio.com/",
  projectId: "nayon-panjabi-fashion",
  storageBucket: "nayon-panjabi-fashion.firebasestorage.app",
  messagingSenderId: "79938380496",
  appId: "1:79938380496:web:51cf96c400a0cab6b6f4d5",
  measurementId: "G-386PD4W2PP"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

window.db = database;
window.databaseRef = ref;
window.set = set;
window.get = get;
window.child = child;
window.push = push;
window.onValue = onValue;

const form = document.getElementById('productForm');
const productGrid = document.getElementById('product-grid');
const loadingSpinnerContainer = document.getElementById('loadingSpinnerContainer');
const imageInput = document.getElementById('productImage');
const imagePreviewListContainer = document.getElementById('imagePreviewListContainer');
const searchInput = document.getElementById('searchInput');
const adminPanel = document.getElementById('adminPanel');
const customerShopSection = document.getElementById('customerShopSection');
const categoriesPageSection = document.getElementById('categoriesPageSection');
const cartPageSection = document.getElementById('cartPageSection');
const ordersPageSection = document.getElementById('ordersPageSection');
const floatingCartBar = document.getElementById('floatingCartBar');
const secretTrigger = document.getElementById('secretTrigger');
const productModal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const cartPageItemsList = document.getElementById('cartPageItemsList');
const cartSubtotalPrice = document.getElementById('cartSubtotalPrice');
const cartDeliveryTotalPrice = document.getElementById('cartDeliveryTotalPrice');
const cartPageTotalPrice = document.getElementById('cartPageTotalPrice');
const storeSettingsModal = document.getElementById('storeSettingsModal');
const settingsTitle = document.getElementById('settingsTitle');
const bannerImg = document.getElementById('bannerImg');
const customerActiveOrdersContainer = document.getElementById('customerActiveOrdersContainer');
const ordersLoadingSpinner = document.getElementById('ordersLoadingSpinner');
const sideDrawer = document.getElementById('sideDrawer');
const sideDrawerOverlay = document.getElementById('sideDrawerOverlay');

let currentSelectedProduct = null;
let selectedCategory = 'all';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentLang = localStorage.getItem('siteLang') || 'bn';

let cart = currentUser ? (JSON.parse(localStorage.getItem('cart_' + currentUser.email)) || []) : (JSON.parse(localStorage.getItem('cart')) || []);
let orders = [];

let globalProducts = JSON.parse(localStorage.getItem('cached_products')) || [];
if (globalProducts.length > 0) {
    loadingSpinnerContainer.style.display = 'none';
    productGrid.style.display = 'grid';
    renderProductsToDOM(globalProducts, '');
}

let cachedOrders = currentUser ? (JSON.parse(localStorage.getItem('cached_orders_' + currentUser.email)) || []) : [];
if (cachedOrders.length > 0) {
    ordersLoadingSpinner.style.display = 'none';
    customerActiveOrdersContainer.style.display = 'block';
    renderOrdersToDOM(cachedOrders);
}

let isRegisterMode = false;
let pendingOrderType = 'cart';
let uploadedProductImages = [];

document.addEventListener('DOMContentLoaded', function() {
    applyLanguage();
    updateCartUI();
    updateAuthUI();
    setInterval(updateCountdowns, 1000);
    loadProductsRealtime();
    if (currentUser) setupOrdersRealtimeListener();

    // ৩০ সেকেন্ড পরপর প্রোডাক্টগুলোর পজিশন এলোমেলোভাবে পরিবর্তন করার টাইমার
    setInterval(() => {
        if (globalProducts.length > 1 && customerShopSection.style.display !== 'none' && adminPanel.style.display === 'none') {
            shuffleProductsAndRender();
        }
    }, 30000);
});

function shuffleProductsAndRender() {
    let shuffled = [...globalProducts];
    for (let i = shuffled.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    renderProductsToDOM(shuffled, searchInput ? searchInput.value : '');
}

window.toggleSideDrawer = function() {
    if (sideDrawer.classList.contains('open')) {
        sideDrawer.classList.remove('open');
        sideDrawerOverlay.style.display = 'none';
    } else {
        sideDrawer.classList.add('open');
        sideDrawerOverlay.style.display = 'block';
    }
}

window.selectDrawerCategory = function(categoryName) {
    selectedCategory = categoryName;
    window.toggleSideDrawer();
    window.switchPage('shop');
    
    document.querySelectorAll('.home-cat-card').forEach(card => card.classList.remove('active'));
    
    loadingSpinnerContainer.style.display = 'block';
    productGrid.style.display = 'none';
    
    setTimeout(() => {
        renderProductsToDOM(globalProducts, searchInput.value);
    }, 150);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.switchPage = function(pageName) {
    customerShopSection.style.display = 'none';
    categoriesPageSection.style.display = 'none';
    cartPageSection.style.display = 'none';
    ordersPageSection.style.display = 'none';
    adminPanel.style.display = 'none';

    const topNavbar = document.querySelector('.top-header-navbar');
    const mainBanner = document.querySelector('.main-header-banner-container');
    if(topNavbar) topNavbar.style.display = 'flex';
    if(mainBanner) mainBanner.style.display = 'block';
    if(floatingCartBar) floatingCartBar.style.display = 'flex';

    document.querySelectorAll('.floating-nav-bar .nav-item').forEach(el => el.classList.remove('active'));

    if (pageName === 'shop') {
        customerShopSection.style.display = 'block';
        let homeBtn = document.getElementById('navHomeBtn');
        if(homeBtn) homeBtn.classList.add('active');
    } else if (pageName === 'categories') {
        categoriesPageSection.style.display = 'block';
        let catBtn = document.getElementById('navCategoryBtn');
        if(catBtn) catBtn.classList.add('active');
    } else if (pageName === 'cart') {
        cartPageSection.style.display = 'block';
        renderCartPageItems();
    } else if (pageName === 'orders') {
        ordersPageSection.style.display = 'block';
        let ordBtn = document.getElementById('navOrdersBtn');
        if(ordBtn) ordBtn.classList.add('active');
        loadCustomerActiveOrdersRealtime();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.setActiveNav = function(btn) {
    document.querySelectorAll('.floating-nav-bar .nav-item').forEach(el => el.classList.remove('active'));
    if(btn) btn.classList.add('active');
}

window.handleAccountNavClick = function() {
    let accBtn = document.getElementById('navAccountBtn');
    if(accBtn) window.setActiveNav(accBtn);
    if (currentUser) {
        handleGearClick();
    } else {
        openAuthModal('login');
    }
}

window.toggleLanguage = function() {
    currentLang = (currentLang === 'en') ? 'bn' : 'en';
    localStorage.setItem('siteLang', currentLang);
    applyLanguage();
    if (currentUser && cachedOrders.length > 0) renderOrdersToDOM(cachedOrders);
    if (cartPageSection.style.display === 'block') renderCartPageItems();
}

function applyLanguage() {
    const topLangText = document.getElementById('topLangBtnText');

    if (currentLang === 'en') {
        if(bannerImg) bannerImg.src = 'header-bg-en.png';
        if(topLangText) topLangText.innerText = 'বাংলা';
    } else {
        if(bannerImg) bannerImg.src = 'header-bg.png';
        if(topLangText) topLangText.innerText = 'English';
    }

    document.querySelectorAll('[data-en]').forEach(el => {
        if (el.getAttribute('data-' + currentLang)) {
            el.innerHTML = el.getAttribute('data-' + currentLang);
        }
    });
}

window.handleCategoryChange = function(catValue) {
    const sizeContainer = document.getElementById('clothingSizeContainer');
    if (catValue === 'Clothing') {
        sizeContainer.style.display = 'flex';
    } else {
        sizeContainer.style.display = 'none';
    }
}

window.toggleDeliveryChargeInput = function() {
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const feeContainer = document.getElementById('deliveryFeeInputContainer');
    if (deliveryType === 'Paid') {
        feeContainer.style.display = 'flex';
    } else {
        feeContainer.style.display = 'none';
    }
}

window.openAuthModal = function(mode) {
    isRegisterMode = (mode === 'register');
    const titleElem = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const nameFieldContainer = document.getElementById('nameFieldContainer');
    const registerFieldsContainer = document.getElementById('registerFieldsContainer');
    const switchContainer = document.getElementById('authSwitchTextContainer');

    if (isRegisterMode) {
        titleElem.innerHTML = `<i class="fa-solid fa-user-plus" style="color: #27ae60;"></i> ` + (currentLang === 'en' ? "Create New Account" : "নতুন অ্যাকাউন্ট তৈরি করুন");
        submitBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ` + (currentLang === 'en' ? "Register Account" : "অ্যাকাউন্ট রেজিস্টার করুন");
        nameFieldContainer.style.display = 'flex';
        document.getElementById('userName').required = true;
        registerFieldsContainer.style.display = 'flex';
        document.getElementById('userPhone').required = true;
        document.getElementById('userAddress').required = true;
        switchContainer.style.display = 'block';
        document.getElementById('authToggleText').innerText = (currentLang === 'en' ? "Already have an account?" : "ইতিমধ্যে অ্যাকাউন্ট আছে?");
        document.getElementById('authToggleLink').innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> ` + (currentLang === 'en' ? "Login" : "লগইন করুন");
    } else {
        titleElem.innerHTML = `<i class="fa-solid fa-right-to-bracket" style="color: #27ae60;"></i> ` + (currentLang === 'en' ? "Account Login" : "অ্যাকাউন্ট লগইন");
        submitBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ` + (currentLang === 'en' ? "Login" : "লগইন করুন");
        nameFieldContainer.style.display = 'none';
        document.getElementById('userName').required = false;
        registerFieldsContainer.style.display = 'none';
        document.getElementById('userPhone').required = false;
        document.getElementById('userAddress').required = false;
        switchContainer.style.display = 'block';
        document.getElementById('authToggleText').innerText = (currentLang === 'en' ? "Don't have an account?" : "একাউন্ট নেই?");
        document.getElementById('authToggleLink').innerHTML = `<i class="fa-solid fa-user-plus"></i> ` + (currentLang === 'en' ? "Create a new account" : "নতুন অ্যাকাউন্ট তৈরি করুন");
    }

    document.getElementById('authForm').reset();
    document.getElementById('authModal').style.display = 'flex';
}

window.closeAuthModal = function() { document.getElementById('authModal').style.display = 'none'; }
window.switchAuthMode = function(e) { e.preventDefault(); window.openAuthModal(isRegisterMode ? 'login' : 'register'); }

window.handleAuthSubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    const name = isRegisterMode ? document.getElementById('userName').value.trim() : '';
    const phone = isRegisterMode ? document.getElementById('userPhone').value.trim() : '';
    const address = isRegisterMode ? document.getElementById('userAddress').value.trim() : '';
    const userKey = email.replace(/[.#$\/\[\]]/g, "_");

    if (isRegisterMode) {
        let userData = { name, email, password, phone, address, profileImg: '', createdAt: new Date().toLocaleDateString() };
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'users/' + userKey), userData).catch((err) => console.log(err));
        }
        localStorage.setItem('user_' + userKey, JSON.stringify(userData));
        currentUser = { name, email, password, phone, address, profileImg: '' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        cart = JSON.parse(localStorage.getItem('cart_' + email)) || [];

        alert(currentLang === 'en' ? "Registration successful! Welcome." : "রেজিস্ট্রেশন সম্পন্ন হয়েছে! স্বাগতম.");
        window.closeAuthModal();
        updateAuthUI();
        updateCartUI();
        setupOrdersRealtimeListener();
    } else {
        let localUserData = localStorage.getItem('user_' + userKey);
        if (localUserData) {
            let parsedData = JSON.parse(localUserData);
            if (parsedData.password === password) {
                currentUser = { name: parsedData.name || 'Valued Customer', email: parsedData.email, password: parsedData.password, phone: parsedData.phone || 'N/A', address: parsedData.address || 'N/A', profileImg: parsedData.profileImg || '' };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                cart = JSON.parse(localStorage.getItem('cart_' + email)) || [];
                alert(currentLang === 'en' ? "Successfully logged in! ✓" : "সফলভাবে লগইন হয়েছে! ✓");
                window.closeAuthModal();
                updateAuthUI();
                updateCartUI();
                setupOrdersRealtimeListener();
                return;
            }
        }

        if (window.db && window.databaseRef && window.get && window.child) {
            window.get(window.child(window.databaseRef(window.db), 'users/' + userKey)).then((snapshot) => {
                if (snapshot.exists()) {
                    let data = snapshot.val();
                    if (data.password === password) {
                        currentUser = { name: data.name || 'Valued Customer', email: data.email, password: data.password, phone: data.phone || 'N/A', address: data.address || 'N/A', profileImg: data.profileImg || '' };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        cart = JSON.parse(localStorage.getItem('cart_' + email)) || data.cart || [];
                        alert(currentLang === 'en' ? "Successfully logged in! ✓" : "সফলভাবে লগইন হয়েছে! ✓");
                        window.closeAuthModal();
                        updateAuthUI();
                        updateCartUI();
                        setupOrdersRealtimeListener();
                    } else {
                        alert(currentLang === 'en' ? "Wrong password!" : "ভুল পাসওয়ার্ড!");
                    }
                } else {
                    alert(currentLang === 'en' ? "No account found with this email!" : "এই জিমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি!");
                }
            }).catch(() => {
                alert(currentLang === 'en' ? "Wrong email or password!" : "ভুল জিমেইল অথবা পাসওয়ার্ড!");
            });
        } else {
            alert(currentLang === 'en' ? "Wrong email or password!" : "ভুল জিমেইল অথবা পাসওয়ার্ড!");
        }
    }
}

window.handleLogout = function() {
    currentUser = null;
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    cachedOrders = [];
    localStorage.removeItem('currentUser');
    updateCartUI();
    window.switchPage('shop');
    alert(currentLang === 'en' ? "Logged out successfully!" : "সফলভাবে লগআউট করা হয়েছে!");
    updateAuthUI();
}

function updateAuthUI() {
    const navAccountBtnContainer = document.getElementById('navAccountBtnContainer');
    const settingsUserProfileDiv = document.getElementById('settingsUserProfileDiv');
    const settingsAuthBtns = document.getElementById('settingsAuthButtons');
    const modalProfileAvatar = document.getElementById('modalProfileAvatar');
    const removePhotoBtn = document.getElementById('removePhotoBtn');

    if (currentUser) {
        let firstLetter = (currentUser.name || currentUser.email).charAt(0).toUpperCase();
        let avatarContent = currentUser.profileImg ? `<img src="${currentUser.profileImg}" alt="Avatar">` : firstLetter;
        
        if(navAccountBtnContainer) {
            navAccountBtnContainer.innerHTML = `<div class="nav-profile-avatar">${avatarContent}</div>`;
        }
        
        if(modalProfileAvatar) {
            modalProfileAvatar.innerHTML = avatarContent;
        }

        if(removePhotoBtn) {
            removePhotoBtn.style.display = currentUser.profileImg ? 'inline-flex' : 'none';
        }

        if(settingsAuthBtns) settingsAuthBtns.style.display = 'none';
        if(settingsUserProfileDiv) settingsUserProfileDiv.style.display = 'block';
        let pName = document.getElementById('profileNameDisplay');
        let pEmail = document.getElementById('profileEmailDisplay');
        let pPhone = document.getElementById('profilePhoneDisplay');
        let pAddress = document.getElementById('profileAddressDisplay');

        if(pName) pName.innerText = currentUser.name || 'N/A';
        if(pEmail) pEmail.innerText = currentUser.email;
        if(pPhone) pPhone.innerText = currentUser.phone || 'N/A';
        if(pAddress) pAddress.innerText = currentUser.address || 'N/A';
    } else {
        if(navAccountBtnContainer) {
            navAccountBtnContainer.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
        if(settingsAuthBtns) settingsAuthBtns.style.display = 'block';
        if(settingsUserProfileDiv) settingsUserProfileDiv.style.display = 'none';
    }
}

window.openProfileImageModal = function() { document.getElementById('profileImageModal').style.display = 'flex'; }
window.closeProfileImageModal = function() { document.getElementById('profileImageModal').style.display = 'none'; }

window.handleProfileImageUpload = function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Img = event.target.result;
            currentUser.profileImg = base64Img;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
            let localUserData = JSON.parse(localStorage.getItem('user_' + userKey)) || {};
            localUserData.profileImg = base64Img;
            localStorage.setItem('user_' + userKey, JSON.stringify(localUserData));
            if (window.db && window.databaseRef && window.set) {
                window.set(window.databaseRef(window.db, 'users/' + userKey + '/profileImg'), base64Img);
            }
            window.closeProfileImageModal();
            updateAuthUI();
            alert(currentLang === 'en' ? "Profile picture updated successfully!" : "প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!");
        };
        reader.readAsDataURL(file);
    }
}

window.removeProfilePhoto = function() {
    if (confirm(currentLang === 'en' ? "Are you sure you want to remove your profile picture?" : "আপনি কি আপনার প্রোফাইল ছবি মুছে ফেলতে চান?")) {
        currentUser.profileImg = '';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
        let localUserData = JSON.parse(localStorage.getItem('user_' + userKey)) || {};
        localUserData.profileImg = '';
        localStorage.setItem('user_' + userKey, JSON.stringify(localUserData));
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'users/' + userKey + '/profileImg'), '');
        }
        updateAuthUI();
        alert(currentLang === 'en' ? "Profile picture removed successfully!" : "প্রোফাইল ছবি সফলভাবে মুছে ফেলা হয়েছে!");
    }
}

window.openUpdateNameModal = function() {
    window.closeStoreSettings();
    document.getElementById('newNameInput').value = currentUser.name || '';
    document.getElementById('updateNameModal').style.display = 'flex';
}
window.closeUpdateNameModal = function() { document.getElementById('updateNameModal').style.display = 'none'; }

window.handleUpdateName = function(e) {
    e.preventDefault();
    const newName = document.getElementById('newNameInput').value.trim();
    currentUser.name = newName;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
    let localUserData = JSON.parse(localStorage.getItem('user_' + userKey)) || {};
    localUserData.name = newName;
    localStorage.setItem('user_' + userKey, JSON.stringify(localUserData));
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'users/' + userKey + '/name'), newName);
    }
    alert(currentLang === 'en' ? "Name updated successfully!" : "নাম সফলভাবে আপডেট করা হয়েছে!");
    window.closeUpdateNameModal();
    updateAuthUI();
}

window.openUpdatePhoneModal = function() {
    window.closeStoreSettings();
    document.getElementById('newPhoneInput').value = currentUser.phone || '';
    document.getElementById('updatePhoneModal').style.display = 'flex';
}
window.closeUpdatePhoneModal = function() { document.getElementById('updatePhoneModal').style.display = 'none'; }

window.handleUpdatePhone = function(e) {
    e.preventDefault();
    const newPhone = document.getElementById('newPhoneInput').value.trim();
    currentUser.phone = newPhone;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
    let localUserData = JSON.parse(localStorage.getItem('user_' + userKey)) || {};
    localUserData.phone = newPhone;
    localStorage.setItem('user_' + userKey, JSON.stringify(localUserData));
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'users/' + userKey + '/phone'), newPhone);
    }
    alert(currentLang === 'en' ? "Phone number updated successfully!" : "ফোন নম্বর সফলভাবে আপডেট করা হয়েছে!");
    window.closeUpdatePhoneModal();
    updateAuthUI();
}

window.openUpdateAddressModal = function() {
    window.closeStoreSettings();
    document.getElementById('newAddress').value = currentUser.address || '';
    document.getElementById('updateAddressModal').style.display = 'flex';
}
window.closeUpdateAddressModal = function() { document.getElementById('updateAddressModal').style.display = 'none'; }

window.handleUpdateAddress = function(e) {
    e.preventDefault();
    const newAddr = document.getElementById('newAddress').value.trim();
    currentUser.address = newAddr;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
    let localUserData = JSON.parse(localStorage.getItem('user_' + userKey)) || {};
    localUserData.address = newAddr;
    localStorage.setItem('user_' + userKey, JSON.stringify(localUserData));
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'users/' + userKey + '/address'), newAddr);
    }
    alert(currentLang === 'en' ? "Address updated successfully!" : "ঠিকানা সফলভাবে আপডেট করা হয়েছে!");
    window.closeUpdateAddressModal();
    updateAuthUI();
}

window.openUpdatePasswordModal = function() {
    window.closeStoreSettings();
    document.getElementById('updatePasswordModal').style.display = 'flex';
}
window.closeUpdatePasswordModal = function() { document.getElementById('updatePasswordModal').style.display = 'none'; }

window.handleUpdatePassword = function(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPasswordInput').value.trim();
    currentUser.password = newPass;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
    let localUserData = JSON.parse(localStorage.getItem('user_' + userKey)) || {};
    localUserData.password = newPass;
    localStorage.setItem('user_' + userKey, JSON.stringify(localUserData));
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'users/' + userKey + '/password'), newPass);
    }
    alert(currentLang === 'en' ? "Password changed successfully!" : "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
    window.closeUpdatePasswordModal();
}

window.togglePaymentFields = function() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const bkashInst = document.getElementById('bkashPaymentInstructions');
    const trxContainer = document.getElementById('trxIdContainer');
    const trxInput = document.getElementById('trxIdInput');

    if (method.includes('bKash') || method.includes('Nagad')) {
        bkashInst.style.display = 'block';
        trxContainer.style.display = 'flex';
        trxInput.required = true;
    } else {
        bkashInst.style.display = 'none';
        trxContainer.style.display = 'none';
        trxInput.required = false;
    }
}

window.openCheckoutForSingleProduct = function() {
    if (!currentUser) {
        alert(currentLang === 'en' ? "Please login first!" : "দয়া করে প্রথমে লগইন করুন!");
        window.openAuthModal('login');
        return;
    }
    pendingOrderType = 'single';
    window.closeModal();
    setupCheckoutBillSummary();
    document.getElementById('checkoutModal').style.display = 'flex';
}

window.openCheckoutForCart = function() {
    if (!currentUser) {
        alert(currentLang === 'en' ? "Please login first!" : "দয়া করে প্রথমে লগইন করুন!");
        window.openAuthModal('login');
        return;
    }
    let selectedItems = cart.filter(item => item.selected !== false);
    if (selectedItems.length === 0) {
        alert(currentLang === 'en' ? "Please select at least one product!" : "অর্ডার করার জন্য অন্তত একটি পণ্য সিলেক্ট করুন!");
        return;
    }
    pendingOrderType = 'cart';
    setupCheckoutBillSummary();
    document.getElementById('checkoutModal').style.display = 'flex';
}

window.closeCheckoutModal = function() { document.getElementById('checkoutModal').style.display = 'none'; }

function setupCheckoutBillSummary() {
    const summaryContainer = document.getElementById('checkoutBillSummary');
    let subtotal = 0;
    let totalDelivery = 0;
    let itemsToCalc = [];

    if (pendingOrderType === 'single' && currentSelectedProduct) {
        itemsToCalc = [{ ...currentSelectedProduct, quantity: 1 }];
    } else {
        itemsToCalc = cart.filter(item => item.selected !== false);
    }

    itemsToCalc.forEach(item => {
        subtotal += Number(item.price) * item.quantity;
        let fee = (item.deliveryType === 'Paid' && item.deliveryFee) ? Number(item.deliveryFee) : 0;
        totalDelivery += fee * item.quantity;
    });

    let grandTotal = subtotal + totalDelivery;
    summaryContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>পণ্যের দাম (Subtotal):</span> <strong>৳${subtotal}</strong></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>ডেলিভারি চার্জ (Delivery):</span> <strong style="color: #e67e22;">৳${totalDelivery}</strong></div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; font-weight: bold; color: #27ae60;"><span>সর্বমোট (Grand Total):</span> <span>৳${grandTotal}</span></div>
    `;
}

window.submitFinalOrder = function(e) {
    e.preventDefault();
    const verifiedPhone = currentUser.phone || 'N/A';
    const customerName = currentUser.name || 'গ্রাহক';
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const trxId = paymentMethod.includes('bKash') || paymentMethod.includes('Nagad') ? document.getElementById('trxIdInput').value.trim() : (currentLang === 'en' ? 'Cash on Delivery' : 'ক্যাশ অন ডেলিভারি');

    let itemsToOrder = [];
    let subtotal = 0;
    let totalDelivery = 0;

    if (pendingOrderType === 'single' && currentSelectedProduct) {
        itemsToOrder = [{ ...currentSelectedProduct, quantity: 1 }];
        subtotal = Number(currentSelectedProduct.price);
        let fee = (currentSelectedProduct.deliveryType === 'Paid' && currentSelectedProduct.deliveryFee) ? Number(currentSelectedProduct.deliveryFee) : 0;
        totalDelivery = fee;
    } else {
        itemsToOrder = cart.filter(item => item.selected !== false);
        itemsToOrder.forEach(item => {
            subtotal += Number(item.price) * item.quantity;
            let fee = (item.deliveryType === 'Paid' && item.deliveryFee) ? Number(item.deliveryFee) : 0;
            totalDelivery += fee * item.quantity;
        });
    }

    let grandTotal = subtotal + totalDelivery;
    let orderTimestamp = new Date().getTime();
    let newOrder = {
        items: itemsToOrder,
        subtotal: subtotal,
        deliveryFeeTotal: totalDelivery,
        total: grandTotal,
        customerName: customerName,
        customer: currentUser.email,
        phone: verifiedPhone,
        address: currentUser.address,
        paymentMethod: paymentMethod,
        trxId: trxId,
        status: currentLang === 'en' ? 'Pending' : 'পেন্ডিং',
        timestamp: orderTimestamp,
        date: new Date().toLocaleDateString()
    };

    if (window.db && window.databaseRef && window.push && window.set) {
        const newOrderRef = window.push(window.databaseRef(window.db, 'orders'));
        window.set(window.databaseRef(window.db, 'orders/' + newOrderRef.key), newOrder);
    }

    let productDetailsText = itemsToOrder.map(i => `• ${i.name} - ${i.quantity} pcs (৳${i.price * i.quantity})`).join('\n');
    let whatsappMsg = `🛍️ *নতুন অর্ডার - মাশাআল্লাহ সুপার বাজার*\n\n` +
                      `👤 নাম: ${customerName}\n` +
                      `📞 ফোন: ${verifiedPhone}\n` +
                      `📍 ঠিকানা: ${currentUser.address || 'N/A'}\n` +
                      `💳 পেমেন্ট: ${paymentMethod} ${trxId ? '(' + trxId + ')' : ''}\n` +
                      `📦 পণ্যের মূল্য: ৳${subtotal}\n` +
                      `🚚 ডেলিভারি চার্জ: ৳${totalDelivery}\n` +
                      `💰 সর্বমোট মূল্য: ৳${grandTotal}\n\n` +
                      `📦 *পণ্যসমূহ:*\n${productDetailsText}`;

    let whatsappUrl = `https://wa.me/8801723518610?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(whatsappUrl, '_blank');

    if (pendingOrderType === 'cart') {
        cart = cart.filter(item => item.selected === false);
        saveCartToStorageAndDB();
        updateCartUI();
        renderCartPageItems();
    }

    alert(currentLang === 'en' ? "Order placed successfully! Delivery in 48 hours." : "আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে! ৪৮ ঘণ্টার মধ্যে ডেলিভারি দেওয়া হবে।");
    window.closeCheckoutModal();
    window.switchPage('orders');
}

function setupOrdersRealtimeListener() {
    if (!currentUser) return;
    if (window.db && window.databaseRef && window.onValue) {
        window.onValue(window.databaseRef(window.db, 'orders'), (snapshot) => {
            let myOrders = [];
            if (snapshot.exists()) {
                let allOrders = snapshot.val();
                Object.keys(allOrders).forEach(key => {
                    if (allOrders[key].customer === currentUser.email) {
                        myOrders.push({ ...allOrders[key], firebaseKey: key });
                    }
                });
            }
            cachedOrders = myOrders;
            localStorage.setItem('cached_orders_' + currentUser.email, JSON.stringify(cachedOrders));
            
            if(ordersLoadingSpinner) ordersLoadingSpinner.style.display = 'none';
            if(customerActiveOrdersContainer) customerActiveOrdersContainer.style.display = 'block';
            renderOrdersToDOM(cachedOrders);
        });
    }
}

function loadCustomerActiveOrdersRealtime() {
    if (!currentUser) {
        if(ordersLoadingSpinner) ordersLoadingSpinner.style.display = 'none';
        if(customerActiveOrdersContainer) {
            customerActiveOrdersContainer.style.display = 'block';
            customerActiveOrdersContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;"><i class="fa-solid fa-triangle-exclamation"></i> ${currentLang === 'en' ? 'Please login to view your orders.' : 'আপনার অর্ডার দেখতে প্রথমে লগইন করুন।'}</p>`;
        }
        return;
    }

    if (cachedOrders.length > 0) {
        if(ordersLoadingSpinner) ordersLoadingSpinner.style.display = 'none';
        if(customerActiveOrdersContainer) customerActiveOrdersContainer.style.display = 'block';
        renderOrdersToDOM(cachedOrders);
    } else {
        if(ordersLoadingSpinner) ordersLoadingSpinner.style.display = 'block';
        if(customerActiveOrdersContainer) customerActiveOrdersContainer.style.display = 'none';
    }

    if (window.db && window.databaseRef && window.get && window.child) {
        window.get(window.child(window.databaseRef(window.db), 'orders')).then((snapshot) => {
            if(ordersLoadingSpinner) ordersLoadingSpinner.style.display = 'none';
            if(customerActiveOrdersContainer) customerActiveOrdersContainer.style.display = 'block';

            let myOrders = [];
            if (snapshot.exists()) {
                let allOrders = snapshot.val();
                Object.keys(allOrders).forEach(key => {
                    if (allOrders[key].customer === currentUser.email) {
                        myOrders.push({ ...allOrders[key], firebaseKey: key });
                    }
                });
            }
            cachedOrders = myOrders;
            localStorage.setItem('cached_orders_' + currentUser.email, JSON.stringify(cachedOrders));
            renderOrdersToDOM(cachedOrders);
        }).catch(() => {
            if(ordersLoadingSpinner) ordersLoadingSpinner.style.display = 'none';
            if(customerActiveOrdersContainer) customerActiveOrdersContainer.style.display = 'block';
            if (cachedOrders.length === 0 && customerActiveOrdersContainer) {
                customerActiveOrdersContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 25px;">${currentLang === 'en' ? 'Failed to load orders.' : 'অর্ডার লোড করতে সমস্যা হয়েছে।'}</p>`;
            }
        });
    }
}

function renderOrdersToDOM(myOrders) {
    if (!customerActiveOrdersContainer) return;
    if (myOrders.length > 0) {
        let html = `<div style="display: flex; flex-direction: column; gap: 20px;">`;
        myOrders.forEach((ord, idx) => {
            let isCompleted = ord.status === 'Delivered' || ord.status === 'ডেলিভারি সম্পন্ন';
            let itemsListHtml = ord.items.map(i => `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <img src="${i.imgSrc}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 3px 0; color: #1e293b; font-size: 15px;"><i class="fa-solid fa-box" style="color: #27ae60; margin-right: 5px;"></i> ${i.name}</h4>
                        <p style="margin: 0; color: #64748b; font-size: 13px;"><i class="fa-solid fa-hashtag" style="color: #3b82f6;"></i> ${i.quantity} ${currentLang === 'en' ? 'pcs' : 'টি'} &nbsp;|&nbsp; <strong style="color: #27ae60;">৳${i.price * i.quantity}</strong></p>
                    </div>
                </div>
            `).join('');

            html += `
                <div style="background: #ffffff; border: 2px solid #27ae60; padding: 22px; border-radius: 16px; box-shadow: 0 8px 25px rgba(39, 174, 96, 0.08); position: relative; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 18px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-bag-shopping" style="color: #27ae60;"></i> 
                            <span>${currentLang === 'en' ? 'Order' : 'অর্ডার'} #${idx + 101}</span>
                        </h3>
                        <span style="font-size: 13px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">
                            <i class="fa-regular fa-calendar-days" style="color: #f39c12; margin-right: 4px;"></i> ${ord.date || ''}
                        </span>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <strong style="display: block; font-size: 14px; color: #475569; margin-bottom: 8px;">
                            <i class="fa-solid fa-list-check" style="color: #8e44ad; margin-right: 5px;"></i> ${currentLang === 'en' ? 'Product Details & Image:' : 'পণ্যের বিবরণ ও ছবি:'}
                        </strong>
                        ${itemsListHtml}
                    </div>

                    <div style="background: #f8fafc; padding: 12px 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #e2e8f0; font-size: 14px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>পণ্যের মূল্য:</span> <strong>৳${ord.subtotal || ord.total}</strong></div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>ডেলিভারি চার্জ:</span> <strong style="color: #e67e22;">৳${ord.deliveryFeeTotal || 0}</strong></div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; font-weight: bold; color: #27ae60;"><span>সর্বমোট:</span> <span>৳${ord.total}</span></div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 13px; color: #64748b;"><i class="fa-solid fa-wallet" style="color: #2980b9;"></i> ${ord.paymentMethod}</span>
                        <span style="color: ${isCompleted ? '#27ae60' : '#d35400'}; font-weight: bold; background: ${isCompleted ? '#e8f8f5' : '#fef9e7'}; padding: 4px 10px; border-radius: 6px;">
                            <i class="fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-clock-rotate-left'}"></i> ${ord.status}
                        </span>
                    </div>
                    
                    ${!isCompleted ? `
                        <div style="background: linear-gradient(135deg, #fef9e7, #fdf6e2); border: 1px dashed #f39c12; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: bold; color: #d35400; text-align: center;" class="countdown-timer" data-timestamp="${ord.timestamp || new Date().getTime()}">
                            <i class="fa-solid fa-stopwatch" style="font-size: 16px; margin-right: 5px;"></i> ${currentLang === 'en' ? 'Delivery in:' : 'ডেলিভারি বাকি:'} <span class="time-left" style="color: #c0392b;">Calculating...</span>
                        </div>
                    ` : `
                        <div style="margin-top: 10px; text-align: right;">
                            <button onclick="deleteCustomerOrder('${ord.firebaseKey}')" style="background: #e74c3c; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-trash-can"></i> ${currentLang === 'en' ? 'Delete History' : 'হিস্ট্রি ডিলিট করুন'}
                            </button>
                        </div>
                    `}
                </div>
            `;
        });
        html += `</div>`;
        customerActiveOrdersContainer.innerHTML = html;
    } else {
        customerActiveOrdersContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 25px;"><i class="fa-solid fa-box-open" style="font-size: 24px; display: block; margin-bottom: 8px; color: #cbd5e1;"></i> ${currentLang === 'en' ? 'No active orders found.' : 'কোনো অর্ডার পাওয়া যায়নি।'}</p>`;
    }
}

function updateCountdowns() {
    document.querySelectorAll('.countdown-timer').forEach(el => {
        let orderTime = Number(el.getAttribute('data-timestamp'));
        let deliveryTimeLimit = orderTime + (48 * 60 * 60 * 1000);
        let now = new Date().getTime();
        let distance = deliveryTimeLimit - now;

        let timeLeftSpan = el.querySelector('.time-left');
        if (!timeLeftSpan) return;

        if (distance < 0) {
            timeLeftSpan.innerHTML = `<i class="fa-solid fa-truck-fast"></i> ${currentLang === 'en' ? "Delivering Soon / Arrived" : "ডেলিভারি হয়ে গেছে / পৌঁছানোর পথে"}`;
        } else {
            let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timeLeftSpan.innerText = `${hours}h ${minutes}m ${seconds}s`;
        }
    });
}

window.deleteCustomerOrder = function(firebaseKey) {
    if (confirm(currentLang === 'en' ? "Are you sure you want to delete this order history?" : "আপনি কি নিশ্চিতভাবে এই অর্ডার হিস্ট্রি মুছে ফেলতে চান?")) {
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'orders/' + firebaseKey), null).then(() => {
                alert(currentLang === 'en' ? "Order history deleted successfully!" : "অর্ডার হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে!");
                loadCustomerActiveOrdersRealtime();
            });
        }
    }
}

window.toggleSection = function(sectionId, btnElement) {
    const section = document.getElementById(sectionId);
    const isVisible = section.style.display === 'block';

    document.querySelectorAll('.admin-section-content').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.admin-menu-buttons .menu-action-btn').forEach(btn => btn.classList.remove('active'));

    if (!isVisible) {
        section.style.display = 'block';
        btnElement.classList.add('active');
    }
}

function handleGearClick() { storeSettingsModal.style.display = 'flex'; }
window.closeStoreSettings = function() { storeSettingsModal.style.display = 'none'; }

let titleClickCount = 0;
if (settingsTitle) {
    settingsTitle.addEventListener('click', function() {
        titleClickCount++;
        if (titleClickCount === 3) {
            window.closeStoreSettings();
            verifyAdminPinAndOpenPanel();
            titleClickCount = 0;
        }
    });
}

function verifyAdminPinAndOpenPanel() {
    let defaultPin = '1234';
    if (window.db && window.databaseRef && window.get && window.child) {
        window.get(window.child(window.databaseRef(window.db), 'adminPin')).then((snapshot) => {
            let savedPin = snapshot.exists() ? snapshot.val() : defaultPin;
            promptForPin(savedPin);
        }).catch(() => {
            promptForPin(defaultPin);
        });
    } else {
        let savedPin = localStorage.getItem('adminPin') || defaultPin;
        promptForPin(savedPin);
    }
}

function promptForPin(correctPin) {
    let enteredPin = prompt(currentLang === 'en' ? "Enter Admin PIN code:" : "অ্যাডমিন পিন কোড দিন:");
    if (enteredPin === correctPin) {
        adminPanel.style.display = 'block';
        customerShopSection.style.display = 'none';
        categoriesPageSection.style.display = 'none';
        cartPageSection.style.display = 'none';
        ordersPageSection.style.display = 'none';
        
        const topNavbar = document.querySelector('.top-header-navbar');
        const mainBanner = document.querySelector('.main-header-banner-container');
        if(topNavbar) topNavbar.style.display = 'none';
        if(mainBanner) mainBanner.style.display = 'none';

        if(floatingCartBar) floatingCartBar.style.display = 'none';
        loadAdminStockTable();
        loadAdminOrdersTable();
        updateSalesAnalytics();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (enteredPin !== null) {
        alert(currentLang === 'en' ? "Wrong PIN code!" : "ভুল পিন কোড!");
    }
}

window.toggleAdminPanel = function() {
    if (adminPanel.style.display === 'block') {
        adminPanel.style.display = 'none';
        customerShopSection.style.display = 'block';
        
        const topNavbar = document.querySelector('.top-header-navbar');
        const mainBanner = document.querySelector('.main-header-banner-container');
        if(topNavbar) topNavbar.style.display = 'flex';
        if(mainBanner) mainBanner.style.display = 'block';

        if(floatingCartBar) floatingCartBar.style.display = 'flex';
    } else {
        adminPanel.style.display = 'block';
        customerShopSection.style.display = 'none';
        categoriesPageSection.style.display = 'none';
        cartPageSection.style.display = 'none';
        ordersPageSection.style.display = 'none';

        const topNavbar = document.querySelector('.top-header-navbar');
        const mainBanner = document.querySelector('.main-header-banner-container');
        if(topNavbar) topNavbar.style.display = 'none';
        if(mainBanner) mainBanner.style.display = 'none';

        if(floatingCartBar) floatingCartBar.style.display = 'none';
    }
}

let clickCount = 0;
if (secretTrigger) {
    secretTrigger.addEventListener('click', function() {
        clickCount++;
        if (clickCount === 3) {
            verifyAdminPinAndOpenPanel();
            clickCount = 0;
        }
    });
}

window.changeAdminPin = function(e) {
    e.preventDefault();
    let newPin = document.getElementById('newPin').value.trim();
    if (newPin !== '') {
        localStorage.setItem('adminPin', newPin);
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'adminPin'), newPin).then(() => {
                alert(currentLang === 'en' ? "Admin PIN updated successfully in Database!" : "ডেটাবেসে অ্যাডমিন পিন সফলভাবে আপডেট করা হয়েছে!");
                document.getElementById('pinForm').reset();
            });
        } else {
            alert(currentLang === 'en' ? "Admin PIN updated!" : "অ্যাডমিন পিন আপডেট করা হয়েছে!");
            document.getElementById('pinForm').reset();
        }
    }
}

window.filterByCategory = function(category, cardElement) {
    selectedCategory = category;
    document.querySelectorAll('.home-cat-card').forEach(card => card.classList.remove('active'));
    if(cardElement) cardElement.classList.add('active');
    
    window.switchPage('shop');
    loadingSpinnerContainer.style.display = 'block';
    productGrid.style.display = 'none';

    setTimeout(() => {
        renderProductsToDOM(globalProducts, searchInput.value);
    }, 150);
}

function loadProductsRealtime() {
    if (window.db && window.databaseRef && window.onValue) {
        window.onValue(window.databaseRef(window.db, 'products'), (snapshot) => {
            globalProducts = [];
            if (snapshot.exists()) {
                let data = snapshot.val();
                Object.keys(data).forEach(key => {
                    globalProducts.push({ ...data[key], firebaseKey: key });
                });
            }
            localStorage.setItem('cached_products', JSON.stringify(globalProducts));
            loadingSpinnerContainer.style.display = 'none';
            productGrid.style.display = 'grid';
            renderProductsToDOM(globalProducts, searchInput.value);
        });
    } else {
        let saved = JSON.parse(localStorage.getItem('cached_products')) || [];
        globalProducts = saved;
        loadingSpinnerContainer.style.display = 'none';
        productGrid.style.display = 'grid';
        renderProductsToDOM(globalProducts, searchInput.value);
    }
}

function renderProductsToDOM(productsList, filterText = '') {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    let filtered = productsList.filter(product => {
        const searchString = `${product.name} ${product.material} ${product.price}`.toLowerCase();
        let matchesCategory = selectedCategory === 'all' || product.material === selectedCategory;
        let matchesSearch = filterText === '' || searchString.includes(filterText.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    loadingSpinnerContainer.style.display = 'none';
    productGrid.style.display = 'grid';

    if (filtered.length === 0) {
        productGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #7f8c8d; padding: 20px;">${currentLang === 'en' ? 'No products found!' : 'কোনো পণ্য পাওয়া যায়নি!'}</p>`;
        return;
    }

    filtered.forEach((product) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = function(e) {
            if(!e.target.classList.contains('delete-btn')) {
                openProductModal(product);
            }
        };

        let stockText = product.stock === 'In Stock' || product.stock === 'ইন স্টক' ? 
            `<span style="color: #27ae60; font-weight: bold; font-size: 10px;"><i class="fa-solid fa-circle-check"></i> ${currentLang === 'en' ? 'In Stock' : 'ইন স্টক'}</span>` : 
            `<span style="color: #e74c3c; font-weight: bold; font-size: 10px;"><i class="fa-solid fa-circle-xmark"></i> ${currentLang === 'en' ? 'Out' : 'আউট'}</span>`;

        card.innerHTML = `
            <img src="${product.imgSrc}" alt="${product.name}">
            <h3>${product.name}</h3>
            <div class="price-tag">৳ ${product.price}</div>
            <div style="margin-top: 2px;">${stockText}</div>
        `;
        productGrid.appendChild(card);
    });
}

if (imageInput) {
    imageInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    uploadedProductImages.push(event.target.result);
                    renderImagePreviews();
                };
                reader.readAsDataURL(file);
            });
        }
        imageInput.value = '';
    });
}

function renderImagePreviews() {
    if (!imagePreviewListContainer) return;
    imagePreviewListContainer.innerHTML = `
        <label for="productImage" class="upload-plus-btn" title="ছবি যোগ করুন"><i class="fa-solid fa-plus"></i></label>
        <input type="file" id="productImage" accept="image/*" multiple style="display: none;" onchange="handleFileSelect(this)">
    `;
    uploadedProductImages.forEach((imgSrc, index) => {
        const thumbBox = document.createElement('div');
        thumbBox.className = 'preview-thumb-box';
        thumbBox.innerHTML = `
            <img src="${imgSrc}" alt="Preview">
            <button type="button" class="preview-delete-btn" onclick="removeUploadedImage(${index})"><i class="fa-solid fa-xmark"></i></button>
        `;
        imagePreviewListContainer.appendChild(thumbBox);
    });
}

window.handleFileSelect = function(input) {
    const files = input.files;
    if (files.length > 0) {
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedProductImages.push(event.target.result);
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    }
}

window.removeUploadedImage = function(index) {
    uploadedProductImages.splice(index, 1);
    renderImagePreviews();
}

function loadAdminStockTable() {
    const tbody = document.getElementById('adminStockTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if(globalProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: #7f8c8d;">${currentLang === 'en' ? 'No products found!' : 'কোনো পণ্য পাওয়া যায়নি!'}</td></tr>`;
        return;
    }

    if (window.db && window.databaseRef && window.get && window.child) {
        window.get(window.child(window.databaseRef(window.db), 'orders')).then((snapshot) => {
            let allOrders = snapshot.exists() ? snapshot.val() : {};
            renderStockTableContent(globalProducts, allOrders, tbody);
        }).catch(() => {
            renderStockTableContent(globalProducts, {}, tbody);
        });
    } else {
        renderStockTableContent(globalProducts, {}, tbody);
    }
}

function renderStockTableContent(savedProducts, allOrders, tbody) {
    let salesCountMap = {};
    Object.values(allOrders).forEach(order => {
        if ((order.status === 'Delivered' || order.status === 'ডেলিভারি সম্পন্ন') && order.items) {
            order.items.forEach(item => {
                salesCountMap[item.name] = (salesCountMap[item.name] || 0) + Number(item.quantity);
            });
        }
    });

    savedProducts.forEach((product) => {
        let soldQty = salesCountMap[product.name] || 0;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;"><img src="${product.imgSrc}" style="width: 35px; height: 35px; object-fit: cover; border-radius: 4px;"></td>
            <td>${product.name}</td>
            <td>৳ ${product.price}</td>
            <td><strong style="color: #27ae60; font-size: 14px;">${soldQty} ${currentLang === 'en' ? 'pcs' : 'টি'}</strong></td>
            <td>
                <select onchange="updateProductStock('${product.firebaseKey}', this.value)">
                    <option value="In Stock" ${product.stock === 'In Stock' || product.stock === 'ইন স্টক' ? 'selected' : ''}>${currentLang === 'en' ? 'In Stock' : 'ইন স্টক'}</option>
                    <option value="Out of Stock" ${product.stock === 'Out of Stock' || product.stock === 'স্টক আউট' ? 'selected' : ''}>${currentLang === 'en' ? 'Out of Stock' : 'স্টক আউট'}</option>
                </select>
            </td>
            <td>
                <input type="text" value="${product.restockNote || ''}" placeholder="যেমন: ৩ দিন" onchange="updateRestockNote('${product.firebaseKey}', this.value)" style="padding: 5px; width: 100px;">
            </td>
            <td>
                <button onclick="deleteProduct('${product.firebaseKey}')" style="background: #e74c3c; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-trash-can"></i> ${currentLang === 'en' ? 'Delete' : 'ডিলিট'}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProductStock = function(firebaseKey, stockValue) {
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'products/' + firebaseKey + '/stock'), stockValue).then(() => {
            alert(currentLang === 'en' ? "Stock status updated!" : "স্টক স্ট্যাটাস আপডেট করা হয়েছে!");
        });
    }
}

window.updateRestockNote = function(firebaseKey, noteValue) {
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'products/' + firebaseKey + '/restockNote'), noteValue);
    }
}

/* 🌟 ফায়ারবেস থেকে প্রোডাক্ট ডিলিট করার ফাংশন (নতুন যুক্ত করা হয়েছে) */
window.deleteProduct = function(firebaseKey) {
    if (confirm(currentLang === 'en' ? "Are you sure you want to delete this product?" : "আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি ডিলিট করতে চান?")) {
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'products/' + firebaseKey), null).then(() => {
                alert(currentLang === 'en' ? "Product deleted successfully!" : "প্রোডাক্টটি সফলভাবে ডিলিট করা হয়েছে!");
                loadAdminStockTable();
            }).catch((err) => {
                console.error(err);
                alert(currentLang === 'en' ? "Failed to delete product!" : "প্রোডাক্ট ডিলিট করতে ব্যর্থ হয়েছে!");
            });
        }
    }
}

function loadAdminOrdersTable() {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="color: #7f8c8d;">${currentLang === 'en' ? 'Loading...' : 'লোড হচ্ছে...'}</td></tr>`;

    if (window.db && window.databaseRef && window.get && window.child) {
        window.get(window.child(window.databaseRef(window.db), 'orders')).then((snapshot) => {
            tbody.innerHTML = '';
            orders = [];
            if (snapshot.exists()) {
                let ordersData = snapshot.val();
                Object.keys(ordersData).forEach((key, index) => {
                    let order = ordersData[key];
                    order.firebaseKey = key;
                    orders.push(order);

                    let itemsHtml = order.items.map(i => `
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <img src="${i.imgSrc}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                            <span>${i.name} (${i.quantity}${currentLang === 'en' ? 'pcs' : 'টি'})</span>
                        </div>
                    `).join('');

                    let isDelivered = order.status === 'Delivered' || order.status === 'ডেলিভারি সম্পন্ন';
                    let statusText = isDelivered ? (currentLang === 'en' ? 'Delivered' : 'ডেলিভারি সম্পন্ন') : (currentLang === 'en' ? 'Pending' : 'পেন্ডিং');

                    let tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>#ORD-${index + 101}</td>
                        <td style="text-align: left; font-size: 12px;">
                            <strong>👤 ${order.customerName || 'N/A'}</strong><br>
                            ✉️ ${order.customer}<br>
                            📞 ${order.phone || 'N/A'}<br>
                            📍 ${order.address || 'N/A'}
                        </td>
                        <td style="text-align: left; font-size: 12px;">${itemsHtml}</td>
                        <td>
                            দাম: ৳${order.subtotal || order.total}<br>
                            ডেলিভারি: <strong style="color: #e67e22;">৳${order.deliveryFeeTotal || 0}</strong><br>
                            <strong>সর্বমোট: ৳${order.total}</strong><br>
                            <small style="color: #2980b9; font-weight: bold;">${order.paymentMethod || 'COD'}</small>
                        </td>
                        <td>
                            <span style="padding: 3px 6px; border-radius: 4px; font-weight: bold; background: ${isDelivered ? '#e8f8f5; color: #27ae60;' : '#fef9e7; color: #f39c12;'}">
                                ${statusText}
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; gap: 5px; justify-content: center; flex-direction: column;">
                                <div style="display: flex; gap: 4px; justify-content: center;">
                                    <button onclick="printThermalReceipt('${key}')" style="background: #8e44ad; color: white; border: none; padding: 5px 7px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;" title="Print Receipt"><i class="fa-solid fa-print"></i></button>
                                    <button onclick="shareThermalReceipt('${key}')" style="background: #2980b9; color: white; border: none; padding: 5px 7px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;" title="Share Receipt"><i class="fa-solid fa-share-nodes"></i></button>
                                </div>
                                ${!isDelivered ? `<button onclick="markDeliveredFromFirebase('${key}')" style="background: #27ae60; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"><i class="fa-solid fa-check"></i> ${currentLang === 'en' ? 'Deliver' : 'ডেলিভারি দিন'}</button>` : `<span style="color: #27ae60; font-weight: bold; font-size: 11px;"><i class="fa-solid fa-circle-check"></i> ${currentLang === 'en' ? 'Completed' : 'সম্পন্ন'}</span>`}
                                <button onclick="deleteOrderFromFirebase('${key}')" ${!isDelivered ? 'disabled style="background: #bdc3c7; color: #7f8c8d; border: none; padding: 4px 8px; border-radius: 4px; cursor: not-allowed; font-size: 11px;"' : 'style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"'}>
                                    <i class="fa-solid fa-trash-can"></i> ${currentLang === 'en' ? 'Delete' : 'ডিলিট'}
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                updateSalesAnalytics();
            } else {
                tbody.innerHTML = `<tr><td colspan="6" style="color: #7f8c8d;">${currentLang === 'en' ? 'No new orders yet!' : 'এখনো কোনো নতুন অর্ডার আসেনি!'}</td></tr>`;
            }
        });
    }
}

window.printThermalReceipt = function(firebaseKey) {
    let order = orders.find(o => o.firebaseKey === firebaseKey);
    if (!order) return;
    let printArea = document.getElementById('thermalReceiptPrintArea');
    let itemsRows = order.items.map(i => `
        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <img src="${i.imgSrc}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 3px; border: 1px solid #000;">
            <div><strong>- ${i.name}</strong> (${i.quantity} pcs)<br>Price: ৳${i.price * i.quantity}</div>
        </div>
    `).join('');

    printArea.innerHTML = `
        <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px;">MASHAALLAH SUPER BAZAR</div>
        <div style="text-align: center; font-size: 12px; margin-bottom: 8px;">মাশাআল্লাহ সুপার বাজার</div>
        <div style="border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 8px 0; margin-bottom: 8px; font-size: 13px; line-height: 1.5;">
            <strong>Date:</strong> ${order.date || 'N/A'}<br>
            <strong>Customer:</strong> ${order.customerName || 'N/A'}<br>
            <strong>Email:</strong> ${order.customer}<br>
            <strong>Phone:</strong> ${order.phone || 'N/A'}<br>
            <strong>Address:</strong> ${order.address || 'N/A'}
        </div>
        <div style="font-size: 13px; margin-bottom: 8px; border-bottom: 2px dashed #000; padding-bottom: 6px;">
            <strong>Products & Images:</strong><br><br>
            ${itemsRows}
        </div>
        <div style="font-size: 13px; margin-bottom: 8px; border-bottom: 2px dashed #000; padding-bottom: 6px;">
            Subtotal: ৳${order.subtotal || order.total}<br>
            Delivery Charge: ৳${order.deliveryFeeTotal || 0}<br>
            <strong>Grand Total: ৳${order.total}</strong>
        </div>
        <div style="text-align: center; font-size: 12px; border-top: 2px dashed #000; padding-top: 6px;">
            Payment: ${order.paymentMethod}<br>
            Thank you for shopping!
        </div>
    `;
    window.print();
}

window.shareThermalReceipt = function(firebaseKey) {
    let order = orders.find(o => o.firebaseKey === firebaseKey);
    if (!order) return;
    let itemsText = order.items.map(i => `${i.name} (${i.quantity} pcs) - ৳${i.price * i.quantity}`).join(', ');
    let shareText = `--- MASHAALLAH SUPER BAZAR ---\nDate: ${order.date || 'N/A'}\nCustomer: ${order.customerName}\nPhone: ${order.phone}\nAddress: ${order.address}\nItems: ${itemsText}\nSubtotal: ৳${order.subtotal || order.total}\nDelivery: ৳${order.deliveryFeeTotal || 0}\nGrand Total: ৳${order.total}\nPayment: ${order.paymentMethod}\nThank you!`;
    if (navigator.share) {
        navigator.share({ title: 'Order Receipt', text: shareText }).catch((err) => console.log('Share canceled', err));
    } else {
        navigator.clipboard.writeText(shareText);
        alert(currentLang === 'en' ? "Receipt copied to clipboard for sharing!" : "শেয়ার করার জন্য রসিদের তথ্য কপি করা হয়েছে!");
    }
}

window.markDeliveredFromFirebase = function(firebaseKey) {
    let statusVal = currentLang === 'en' ? 'Delivered' : 'ডেলিভারি সম্পন্ন';
    if (window.db && window.databaseRef && window.set) {
        window.set(window.databaseRef(window.db, 'orders/' + firebaseKey + '/status'), statusVal).then(() => {
            alert(currentLang === 'en' ? "Order marked as delivered!" : "অর্ডারটি সফলভাবে ডেলিভারি হিসেবে আপডেট করা হয়েছে!");
            loadAdminOrdersTable();
            loadAdminStockTable();
        });
    }
}

window.deleteOrderFromFirebase = function(firebaseKey) {
    let order = orders.find(o => o.firebaseKey === firebaseKey);
    if (!order) return;
    let isDelivered = order.status === 'Delivered' || order.status === 'ডেলিভারি সম্পন্ন';
    if (!isDelivered) {
        alert(currentLang === 'en' ? "Cannot delete! Order must be delivered first." : "ডিলিট করা সম্ভব নয়! আগে অর্ডারটি ডেলিভারি সম্পন্ন করতে হবে।");
        return;
    }
    if (confirm(currentLang === 'en' ? "Are you sure you want to delete this delivered order?" : "আপনি কি নিশ্চিতভাবে এই ডেলিভারি সম্পন্ন হওয়া অর্ডারটি মুছে ফেলতে চান?")) {
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'orders/' + firebaseKey), null).then(() => {
                alert(currentLang === 'en' ? "Order deleted successfully!" : "অর্ডারটি সফলভাবে মুছে ফেলা হয়েছে!");
                loadAdminOrdersTable();
                loadAdminStockTable();
                updateSalesAnalytics();
            });
        }
    }
}

window.resetSalesReport = function() {
    if (confirm(currentLang === 'en' ? "Do you want to reset/zero the sales report for completed orders?" : "আপনি কি সমস্ত সম্পন্ন হওয়া অর্ডারের সেলস রিপোর্ট রিসেট বা জিরো করতে চান?")) {
        if (window.db && window.databaseRef && window.get && window.set) {
            window.get(window.child(window.databaseRef(window.db), 'orders')).then((snapshot) => {
                if (snapshot.exists()) {
                    let ordersData = snapshot.val();
                    let updates = {};
                    Object.keys(ordersData).forEach(key => {
                        if (ordersData[key].status === 'Delivered' || ordersData[key].status === 'ডেলিভারি সম্পন্ন') {
                            updates[key] = null;
                        }
                    });
                    window.set(window.databaseRef(window.db, 'orders'), { ...ordersData, ...updates }).then(() => {
                        alert(currentLang === 'en' ? "Sales report reset successfully!" : "সেলস রিপোর্ট সফলভাবে রিসেট করা হয়েছে!");
                        loadAdminOrdersTable();
                        loadAdminStockTable();
                        updateSalesAnalytics();
                    });
                }
            });
        }
    }
}

function updateSalesAnalytics() {
    let totalOrdersCount = 0;
    let uniqueUserEmails = new Set();
    let deliveredRevenue = 0;
    let totalItems = 0;

    if (window.db && window.databaseRef && window.get && window.child) {
        window.get(window.child(window.databaseRef(window.db), 'orders')).then((snapshot) => {
            if (snapshot.exists()) {
                let ordersData = snapshot.val();
                Object.values(ordersData).forEach(order => {
                    totalOrdersCount++;
                    if (order.customer) {
                        uniqueUserEmails.add(order.customer);
                    }
                    if((order.status === 'Delivered' || order.status === 'ডেলিভারি সম্পন্ন')) {
                        deliveredRevenue += Number(order.total) || 0;
                        if(order.items) {
                            order.items.forEach(i => {
                                totalItems += Number(i.quantity);
                            });
                        }
                    }
                });
            }
            
            let adminTotalOrdersEl = document.getElementById('adminTotalOrdersCount');
            let adminTotalUsersEl = document.getElementById('adminTotalUsersCount');
            let adminTotalSalesEl = document.getElementById('adminTotalSalesRevenue');
            
            if(adminTotalOrdersEl) adminTotalOrdersEl.innerText = totalOrdersCount;
            if(adminTotalUsersEl) adminTotalUsersEl.innerText = uniqueUserEmails.size;
            if(adminTotalSalesEl) adminTotalSalesEl.innerText = `৳ ${deliveredRevenue}`;

            let soldCountElem = document.getElementById('totalSoldItemsCount');
            let revElem = document.getElementById('totalSalesRevenue');
            if(soldCountElem) soldCountElem.innerText = `${totalItems} ${currentLang === 'en' ? 'pcs' : 'টি'}`;
            if(revElem) revElem.innerText = `৳ ${deliveredRevenue}`;
        });
    }
}

function openProductModal(product) {
    currentSelectedProduct = product;
    let isStock = product.stock === 'In Stock' || product.stock === 'ইন স্টক';
    const stockClass = isStock ? 'in-stock' : 'out-of-stock';
    let stockMsg = isStock ? (currentLang === 'en' ? 'In Stock' : 'স্টকে আছে') : (currentLang === 'en' ? `Out of Stock (Returns: ${product.restockNote || 'Soon'})` : `স্টক আউট (ফিরবে: ${product.restockNote || 'শীঘ্রই'})`);

    let deliveryText = product.deliveryType === 'Free' ? 
        `<span style="color: #27ae60; font-weight: bold;"><i class="fa-solid fa-truck-fast"></i> ফ্রি ডেলিভারি (Free Delivery)</span>` : 
        `<span style="color: #e67e22; font-weight: bold;"><i class="fa-solid fa-truck"></i> ডেলিভারি চার্জ: ৳${product.deliveryFee || 0}</span>`;

    let regPriceText = product.regularPrice ? `<span style="text-decoration: line-through; color: #95a5a6; font-size: 14px; margin-left: 6px;">৳ ${product.regularPrice}</span>` : '';
    let clothingSizeText = product.clothingSize ? `<p><strong><i class="fa-solid fa-shirt" style="color: #27ae60;"></i> সাইজ/মাপ:</strong> ${product.clothingSize}</p>` : '';
    let descText = product.description ? `<p style="background: #f8fafc; padding: 10px; border-radius: 8px; border-left: 4px solid #3498db; margin-top: 8px;"><strong><i class="fa-solid fa-circle-info" style="color: #3498db;"></i> বিবরণ:</strong><br>${product.description}</p>` : '';

    modalBody.innerHTML = `
        <img src="${product.imgSrc}" alt="${product.name}">
        <h2>${product.name}</h2>
        <p><strong>${currentLang === 'en' ? 'Price:' : 'মূল্য:'}</strong> <span style="color: #27ae60; font-weight: bold; font-size: 17px;">৳ ${product.price}</span> ${regPriceText}</p>
        <p><strong>${currentLang === 'en' ? 'Category:' : 'ক্যাটাগরি:'}</strong> ${product.material}</p>
        ${clothingSizeText}
        <p><strong>ডেলিভারি:</strong> ${deliveryText}</p>
        <div><span class="stock-badge ${stockClass}">${stockMsg}</span></div>
        ${descText}
    `;
    productModal.style.display = 'flex';
}

window.closeModal = function() { productModal.style.display = 'none'; }

window.onclick = function(event) {
    if (event.target === productModal) window.closeModal();
    if (event.target === storeSettingsModal) window.closeStoreSettings();
    if (event.target === document.getElementById('authModal')) window.closeAuthModal();
    if (event.target === document.getElementById('profileImageModal')) window.closeProfileImageModal();
    if (event.target === document.getElementById('updateNameModal')) window.closeUpdateNameModal();
    if (event.target === document.getElementById('updatePhoneModal')) window.closeUpdatePhoneModal();
    if (event.target === document.getElementById('updateAddressModal')) window.closeUpdateAddressModal();
    if (event.target === document.getElementById('updatePasswordModal')) window.closeUpdatePasswordModal();
    if (event.target === document.getElementById('checkoutModal')) window.closeCheckoutModal();
}

window.addToCartFromModal = function() {
    let itemPrice = Number(currentSelectedProduct.price);
    let itemDeliveryFee = (currentSelectedProduct.deliveryType === 'Paid' && currentSelectedProduct.deliveryFee) ? Number(currentSelectedProduct.deliveryFee) : 0;

    let existingItem = cart.find(item => item.name === currentSelectedProduct.name && Number(item.price) === itemPrice && Number(item.deliveryFee || 0) === itemDeliveryFee);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        let newItem = { ...currentSelectedProduct, quantity: 1, selected: true };
        cart.push(newItem);
    }

    saveCartToStorageAndDB();
    updateCartUI();
    showCartToast(currentLang === 'en' ? "Successfully added to cart!" : "সফলভাবে কার্টে যোগ করা হয়েছে!");
    window.closeModal();
}

function saveCartToStorageAndDB() {
    if (currentUser) {
        localStorage.setItem('cart_' + currentUser.email, JSON.stringify(cart));
        let userKey = currentUser.email.replace(/[.#$\/\[\]]/g, "_");
        if (window.db && window.databaseRef && window.set) {
            window.set(window.databaseRef(window.db, 'users/' + userKey + '/cart'), cart).catch((err) => console.log(err));
        }
    } else {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
}

function showCartToast(message) {
    const toast = document.getElementById('cartToastNotification');
    const toastText = document.getElementById('toastMessageText');
    if(toastText) toastText.innerText = message;
    
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
}

function updateCartUI() {
    let totalCount = 0;
    cart.forEach(item => totalCount += item.quantity);
    const cartCountEl = document.getElementById('cartCount');
    const topCartBadge = document.getElementById('topCartBadge');
    if(cartCountEl) cartCountEl.innerText = totalCount;
    if(topCartBadge) topCartBadge.innerText = totalCount;
}

function renderCartPageItems() {
    if (!cartPageItemsList) return;
    cartPageItemsList.innerHTML = '';
    if (cart.length === 0) {
        cartPageItemsList.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">${currentLang === 'en' ? 'Your cart is empty!' : 'আপনার কার্ট খালি রয়েছে!'}</p>`;
        if(cartSubtotalPrice) cartSubtotalPrice.innerText = '৳ 0';
        if(cartDeliveryTotalPrice) cartDeliveryTotalPrice.innerText = '৳ 0';
        if(cartPageTotalPrice) cartPageTotalPrice.innerText = '৳ 0';
        return;
    }

    let subtotal = 0;
    let totalDelivery = 0;

    cart.forEach((item, index) => {
        if (item.selected === undefined) item.selected = true;
        if (item.selected) {
            subtotal += Number(item.price) * item.quantity;
            let fee = (item.deliveryType === 'Paid' && item.deliveryFee) ? Number(item.deliveryFee) : 0;
            totalDelivery += fee * item.quantity;
        }

        let deliveryInfoText = item.deliveryType === 'Free' ? 'ফ্রি ডেলিভারি' : `ডেলিভারি চার্জ: ৳${item.deliveryFee || 0}`;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleItemSelection(${index}, this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
            <img src="${item.imgSrc}" alt="${item.name}">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>৳ ${item.price} × ${item.quantity} = ৳ ${item.price * item.quantity}</p>
                <small style="color: #e67e22; display: block; font-size: 11px;">${deliveryInfoText}</small>
                <div class="quantity-control">
                    <button class="qty-btn" onclick="changeQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                </div>
            </div>
            <button class="remove-cart-item" onclick="removeFromCart(${index})"><i class="fa-solid fa-trash-can"></i> ${currentLang === 'en' ? 'Delete' : 'মুছে ফেলুন'}</button>
        `;
        cartPageItemsList.appendChild(itemDiv);
    });

    let grandTotal = subtotal + totalDelivery;
    if(cartSubtotalPrice) cartSubtotalPrice.innerText = `৳ ${subtotal}`;
    if(cartDeliveryTotalPrice) cartDeliveryTotalPrice.innerText = `৳ ${totalDelivery}`;
    if(cartPageTotalPrice) cartPageTotalPrice.innerText = `৳ ${grandTotal}`;
}

window.toggleItemSelection = function(index, isChecked) {
    cart[index].selected = isChecked;
    renderCartPageItems();
}

window.changeQuantity = function(index, amount) {
    cart[index].quantity += amount;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCartToStorageAndDB();
    updateCartUI();
    renderCartPageItems();
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCartToStorageAndDB();
    updateCartUI();
    renderCartPageItems();
}

if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        renderProductsToDOM(globalProducts, query);
    });
}

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('pname').value;
        const price = document.getElementById('price').value;
        const regularPrice = document.getElementById('regularPrice').value;
        const material = document.getElementById('material').value;
        const clothingSize = document.getElementById('clothingSize').value;
        const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
        const deliveryFee = deliveryType === 'Paid' ? document.getElementById('deliveryFeeAmount').value : '0';
        const description = document.getElementById('productDescription').value;
        const stock = document.getElementById('stockStatus').value;

        if (uploadedProductImages.length === 0) {
            alert(currentLang === 'en' ? "Please choose at least one image!" : "দয়া করে অন্তত একটি ছবি সিলেক্ট করুন!");
            return;
        }

        if (window.db && window.databaseRef && window.push && window.set) {
            uploadedProductImages.forEach(imgSrc => {
                const productObj = { name, price, regularPrice, material, clothingSize, deliveryType, deliveryFee, description, stock, restockNote: '', imgSrc };
                const newProdRef = window.push(window.databaseRef(window.db, 'products'));
                window.set(window.databaseRef(window.db, 'products/' + newProdRef.key), productObj);
            });
        }

        searchInput.value = '';
        form.reset();
        document.getElementById('clothingSizeContainer').style.display = 'none';
        document.getElementById('deliveryFeeInputContainer').style.display = 'none';
        uploadedProductImages = [];
        renderImagePreviews();
        alert(currentLang === 'en' ? "New product(s) added to Database successfully!" : "নতুন প্রোডাক্ট সফলভাবে ডেটাবেজে যুক্ত হয়েছে!");
    });
}
