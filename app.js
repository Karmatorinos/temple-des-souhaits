/**
 * Temple des Souhaits - Application Logic
 * Mot de passe administrateur : admin123
 */

// Mot de passe configuré
const ADMIN_PASSWORD = "admin123";

// Clé de stockage locale et cloud
const STORAGE_KEY_GIFTS = "temple_des_souhaits_gifts_v1";
const STORAGE_KEY_AUTH = "temple_des_souhaits_auth_creator";
const CLOUD_SYNC_ENDPOINT = "https://temple-des-souhaits-default-rtdb.firebaseio.com";

// Données par défaut si vide
const DEFAULT_GIFTS = [
    {
        id: "gift_1",
        name: "PlayStation 5 Slim Édition Standard",
        price: 549.99,
        category: "High-Tech",
        url: "https://www.playstation.com",
        image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80",
        reservedBy: null, // Si réservé : nom de la personne
        reservedAt: null
    },
    {
        id: "gift_2",
        name: "Casque Audio à Réduction de Bruit Sans Fil",
        price: 199.00,
        category: "Musique & Audio",
        url: "https://www.sony.fr",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        reservedBy: "Lucas", // Déjà réservé à titre d'exemple
        reservedAt: "2026-09-20T10:30:00.000Z"
    },
    {
        id: "gift_3",
        name: "Livre Recettes Gourmandes du Monde",
        price: 29.90,
        category: "Cuisine & Lecture",
        url: "https://www.fnac.com",
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
        reservedBy: null,
        reservedAt: null
    }
];

// État de l'application
let currentRole = "guest"; // 'creator' ou 'guest'
let activeFilter = "all";   // 'all', 'available', 'reserved'
let gifts = [];

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    detectRoleFromUrl();
    updateShareLinkDisplay();
    render();

    // Tenter la synchronisation cloud en arrière plan si disponible
    initCloudSync();
});

// Détecte le rôle selon l'URL ou la session
function detectRoleFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    const adminKey = urlParams.get("admin");

    // Si le paramètre admin est présent et valide ou stocké en session
    const isStoredAuth = sessionStorage.getItem(STORAGE_KEY_AUTH) === "true";

    if (adminKey === ADMIN_PASSWORD || isStoredAuth) {
        sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
        currentRole = "creator";
    } else {
        currentRole = "guest";
    }
}

// Basculer l'affichage et les badges
function updateViewDisplay() {
    const creatorView = document.getElementById("creatorView");
    const guestView = document.getElementById("guestView");
    const roleBadge = document.getElementById("roleBadge");
    const authBtnText = document.getElementById("authBtnText");
    const authBtn = document.getElementById("authBtn");
    const pageSubtitle = document.getElementById("pageSubtitle");

    if (currentRole === "creator") {
        creatorView.classList.remove("hidden");
        guestView.classList.add("hidden");

        roleBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200";
        roleBadge.innerHTML = `<i class="fa-solid fa-crown text-amber-500"></i> Mode Créateur`;

        authBtnText.textContent = "Déconnexion";
        authBtn.className = "text-xs px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium transition-all flex items-center gap-1.5";
        authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket text-[10px]"></i> Déconnexion`;

        pageSubtitle.textContent = "Administration secrète de tes souhaits";
    } else {
        creatorView.classList.add("hidden");
        guestView.classList.remove("hidden");

        roleBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200";
        roleBadge.innerHTML = `<i class="fa-solid fa-users text-indigo-600"></i> Espace Invité`;

        authBtnText.textContent = "Accès Créateur";
        authBtn.className = "text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-all flex items-center gap-1.5";
        authBtn.innerHTML = `<i class="fa-solid fa-lock text-[10px]"></i> Accès Créateur`;

        pageSubtitle.textContent = "Liste de cadeaux & Réservations pour les proches";
    }
}

// Met à jour l'URL propre à partager aux invités
function updateShareLinkDisplay() {
    // L'URL de base sans aucun paramètre d'admin
    const baseUrl = window.location.origin + window.location.pathname;
    const guestUrl = `${baseUrl}?view=guest`;

    const displaySpan = document.getElementById("guestShareUrlDisplay");
    const testLink = document.getElementById("testGuestLink");

    if (displaySpan) displaySpan.textContent = guestUrl;
    if (testLink) testLink.href = guestUrl;
}

function copyGuestLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const guestUrl = `${baseUrl}?view=guest`;
    navigator.clipboard.writeText(guestUrl).then(() => {
        showToast("Lien des invités copié ! Partage-le à tes proches 🎁");
    }).catch(() => {
        showToast("Lien généré : " + guestUrl);
    });
}

// ==========================================
// GESTION DES DONNÉES (LOCALSTORAGE & CLOUD)
// ==========================================
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY_GIFTS);
    if (stored) {
        try {
            gifts = JSON.parse(stored);
        } catch (e) {
            gifts = DEFAULT_GIFTS;
        }
    } else {
        gifts = DEFAULT_GIFTS;
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY_GIFTS, JSON.stringify(gifts));
    syncWithCloud();
    render();
}

// Synchronisation Cloud (Firebase RTDB REST)
let cloudDbUrl = localStorage.getItem("custom_rtdb_url") || "";

function initCloudSync() {
    if (cloudDbUrl) {
        fetchCloudGifts();
    }
}

function fetchCloudGifts() {
    if (!cloudDbUrl) return;
    const endpoint = cloudDbUrl.replace(/\/$/, "") + "/gifts.json";
    fetch(endpoint)
        .then(res => res.json())
        .then(data => {
            if (data && Array.isArray(data)) {
                gifts = data;
                localStorage.setItem(STORAGE_KEY_GIFTS, JSON.stringify(gifts));
                render();
                document.getElementById("syncStatusText").textContent = "Synchronisé avec le cloud en direct";
            }
        })
        .catch(() => {
            console.log("Mode hors-ligne / local actif.");
        });
}

function syncWithCloud() {
    if (!cloudDbUrl) return;
    const endpoint = cloudDbUrl.replace(/\/$/, "") + "/gifts.json";
    fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gifts)
    }).catch(err => console.log("Sync cloud:", err));
}

function toggleCloudConfig() {
    const modal = document.getElementById("firebaseModal");
    const input = document.getElementById("customDbUrl");
    input.value = cloudDbUrl;
    modal.classList.toggle("hidden");
}

function saveCustomCloudConfig() {
    const input = document.getElementById("customDbUrl");
    cloudDbUrl = input.value.trim();
    localStorage.setItem("custom_rtdb_url", cloudDbUrl);
    toggleCloudConfig();
    showToast("Paramètres Cloud enregistrés !");
    fetchCloudGifts();
}

// ==========================================
// RENDU DE L'APPLICATION
// ==========================================
function render() {
    updateViewDisplay();

    if (currentRole === "creator") {
        renderCreatorView();
    } else {
        renderGuestView();
    }
}

// 1. Rendu Créateur (Anti-spoil absolu : aucune mention de qui a réservé)
function renderCreatorView() {
    const grid = document.getElementById("creatorGiftsGrid");
    const emptyState = document.getElementById("creatorEmptyState");
    const counter = document.getElementById("creatorGiftCounter");

    counter.textContent = `${gifts.length} cadeau${gifts.length > 1 ? "x" : ""} dans ta liste`;

    if (gifts.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = gifts.map(gift => {
        const imageSrc = gift.image || "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80";
        const priceTag = gift.price ? `${parseFloat(gift.price).toFixed(2)} €` : "Prix libre";
        const categoryTag = gift.category ? `<span class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">${escapeHtml(gift.category)}</span>` : "";

        return `
        <div class="glass-card rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <!-- Image du Cadeau -->
            <div class="relative h-48 w-full bg-slate-100 overflow-hidden group">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(gift.name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80'">
                <div class="absolute top-3 right-3 flex items-center gap-1.5">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-900 shadow-md backdrop-blur-sm">
                        ${priceTag}
                    </span>
                </div>
            </div>

            <!-- Contenu du Cadeau -->
            <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        ${categoryTag}
                    </div>
                    <h4 class="text-base font-bold text-slate-900 leading-snug line-clamp-2">${escapeHtml(gift.name)}</h4>
                </div>

                <!-- Anti-Spoil Label -->
                <div class="bg-fuchsia-50/70 border border-fuchsia-100 rounded-2xl p-2.5 flex items-center gap-2 text-xs text-fuchsia-900">
                    <i class="fa-solid fa-lock text-fuchsia-600 text-xs"></i>
                    <span class="font-medium text-[11px]">Réservation cachée (Surprise totale 🎁)</span>
                </div>

                <!-- Actions du Créateur -->
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    ${gift.url ? `
                        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Voir l'article
                        </a>
                    ` : `<div></div>`}

                    <div class="flex items-center gap-1">
                        <button onclick="editGift('${gift.id}')" title="Modifier" class="p-2 rounded-xl text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 transition-colors">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button onclick="deleteGift('${gift.id}')" title="Supprimer" class="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join("");
}

// 2. Rendu Invités (Voir qui a réservé, réserver à son nom, annuler si c'est soi)
function renderGuestView() {
    const grid = document.getElementById("guestGiftsGrid");
    const emptyState = document.getElementById("guestEmptyState");
    const counter = document.getElementById("guestGiftCounter");

    // Filtrage
    let filteredGifts = gifts;
    if (activeFilter === "available") {
        filteredGifts = gifts.filter(g => !g.reservedBy);
    } else if (activeFilter === "reserved") {
        filteredGifts = gifts.filter(g => g.reservedBy);
    }

    const reservedCount = gifts.filter(g => g.reservedBy).length;
    const availableCount = gifts.length - reservedCount;
    counter.textContent = `${availableCount} disponible${availableCount > 1 ? "s" : ""} · ${reservedCount} déjà réservé${reservedCount > 1 ? "s" : ""}`;

    if (filteredGifts.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = filteredGifts.map(gift => {
        const isReserved = !!gift.reservedBy;
        const imageSrc = gift.image || "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80";
        const priceTag = gift.price ? `${parseFloat(gift.price).toFixed(2)} €` : "Prix libre";
        const categoryTag = gift.category ? `<span class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">${escapeHtml(gift.category)}</span>` : "";

        return `
        <div class="glass-card rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isReserved ? 'border-amber-200 bg-amber-50/20' : ''}">
            <!-- Image & Badge Réservé -->
            <div class="relative h-48 w-full bg-slate-100 overflow-hidden group">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(gift.name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isReserved ? 'brightness-90' : ''}" onerror="this.src='https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80'">
                
                <div class="absolute top-3 right-3">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-900 shadow-md backdrop-blur-sm">
                        ${priceTag}
                    </span>
                </div>

                <div class="absolute top-3 left-3">
                    ${isReserved ? `
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md flex items-center gap-1">
                            <i class="fa-solid fa-lock"></i> Réservé
                        </span>
                    ` : `
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md flex items-center gap-1">
                            <i class="fa-solid fa-sparkles"></i> Libre
                        </span>
                    `}
                </div>
            </div>

            <!-- Contenu -->
            <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        ${categoryTag}
                    </div>
                    <h4 class="text-base font-bold text-slate-900 leading-snug line-clamp-2">${escapeHtml(gift.name)}</h4>
                </div>

                <!-- Statut de la réservation -->
                <div class="rounded-2xl p-3 text-xs ${isReserved ? 'bg-amber-100/70 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'}">
                    ${isReserved ? `
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <p class="font-bold flex items-center gap-1.5">
                                    <i class="fa-solid fa-user-check text-amber-600"></i> Réservé par <span>${escapeHtml(gift.reservedBy)}</span>
                                </p>
                                <p class="text-[10px] text-amber-800/80 mt-0.5">Merci pour ce joli geste !</p>
                            </div>
                            <button onclick="cancelReservation('${gift.id}')" class="text-[11px] px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-rose-600 font-semibold border border-rose-200 transition-colors">
                                Annuler
                            </button>
                        </div>
                    ` : `
                        <p class="font-medium text-slate-700 flex items-center gap-1.5">
                            <i class="fa-solid fa-gift text-emerald-600"></i> Ce cadeau est libre !
                        </p>
                        <p class="text-[10px] text-slate-500 mt-0.5">Sois le premier à le réserver pour faire plaisir.</p>
                    `}
                </div>

                <!-- Boutons d'action -->
                <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
                    ${gift.url ? `
                        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0" title="Ouvrir le lien pour acheter ce cadeau">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Acheter
                        </a>
                    ` : ''}

                    ${isReserved ? `
                        <button disabled class="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-400 font-semibold text-xs cursor-not-allowed flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-check"></i> Déjà réservé
                        </button>
                    ` : `
                        <button onclick="openReserveModal('${gift.id}')" class="w-full py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all">
                            <i class="fa-solid fa-hand-holding-heart"></i> Je le réserve
                        </button>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join("");
}

// Filtres
function setFilter(filter) {
    activeFilter = filter;
    ["filterAll", "filterAvail", "filterRes"].forEach(id => {
        const btn = document.getElementById(id);
        btn.className = "px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all";
    });

    if (filter === "all") document.getElementById("filterAll").className = "px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-sm font-semibold transition-all";
    if (filter === "available") document.getElementById("filterAvail").className = "px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-sm font-semibold transition-all";
    if (filter === "reserved") document.getElementById("filterRes").className = "px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-sm font-semibold transition-all";

    renderGuestView();
}


// ==========================================
// GESTION DU MOT DE PASSE ET RÔLES
// ==========================================
function handleAuthClick() {
    if (currentRole === "creator") {
        // Déconnexion
        sessionStorage.removeItem(STORAGE_KEY_AUTH);
        currentRole = "guest";
        // Nettoyer l'URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        showToast("Déconnexion réussie. Tu es maintenant en vue Invité !");
        render();
    } else {
        // Ouvre la boîte de dialogue pour le mot de passe
        openLoginModal();
    }
}

function openLoginModal() {
    const modal = document.getElementById("loginModal");
    const input = document.getElementById("adminPasswordInput");
    const errorMsg = document.getElementById("loginErrorMsg");
    input.value = "";
    errorMsg.classList.add("hidden");
    modal.classList.remove("hidden");
    setTimeout(() => input.focus(), 50);
}

function closeLoginModal() {
    document.getElementById("loginModal").classList.add("hidden");
}

function handleLoginSubmit(event) {
    event.preventDefault();
    const input = document.getElementById("adminPasswordInput").value.trim();
    const errorMsg = document.getElementById("loginErrorMsg");

    if (input === ADMIN_PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY_AUTH, "true");
        currentRole = "creator";
        closeLoginModal();
        showToast("Bienvenue dans ton Temple des Souhaits ! 👑");
        render();
    } else {
        errorMsg.classList.remove("hidden");
    }
}


// ==========================================
// AJOUT / MODIFICATION DE CADEAU (CRÉATEUR)
// ==========================================
function openGiftModal(giftId = null) {
    const modal = document.getElementById("giftModal");
    const title = document.getElementById("modalGiftTitle");
    const editId = document.getElementById("giftEditId");
    const name = document.getElementById("giftName");
    const price = document.getElementById("giftPrice");
    const cat = document.getElementById("giftCategory");
    const url = document.getElementById("giftUrl");
    const img = document.getElementById("giftImage");

    if (giftId) {
        const item = gifts.find(g => g.id === giftId);
        if (!item) return;
        title.innerHTML = `<i class="fa-solid fa-pen text-fuchsia-600"></i> Modifier le cadeau`;
        editId.value = item.id;
        name.value = item.name || "";
        price.value = item.price || "";
        cat.value = item.category || "";
        url.value = item.url || "";
        img.value = item.image || "";
        previewImage(item.image);
    } else {
        title.innerHTML = `<i class="fa-solid fa-gift text-fuchsia-600"></i> Ajouter un cadeau`;
        editId.value = "";
        name.value = "";
        price.value = "";
        cat.value = "";
        url.value = "";
        img.value = "";
        previewImage("");
    }

    modal.classList.remove("hidden");
}

function closeGiftModal() {
    document.getElementById("giftModal").classList.add("hidden");
}

function previewImage(url) {
    const container = document.getElementById("imagePreviewContainer");
    const preview = document.getElementById("imagePreview");
    if (url && url.startsWith("http")) {
        preview.src = url;
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
    }
}

function handleSaveGift(event) {
    event.preventDefault();
    const editId = document.getElementById("giftEditId").value;
    const name = document.getElementById("giftName").value.trim();
    const price = document.getElementById("giftPrice").value;
    const category = document.getElementById("giftCategory").value.trim();
    const url = document.getElementById("giftUrl").value.trim();
    const image = document.getElementById("giftImage").value.trim();

    if (!name) return;

    if (editId) {
        // Modification
        const index = gifts.findIndex(g => g.id === editId);
        if (index !== -1) {
            gifts[index].name = name;
            gifts[index].price = price ? parseFloat(price) : null;
            gifts[index].category = category;
            gifts[index].url = url;
            gifts[index].image = image || gifts[index].image;
            showToast("Cadeau mis à jour avec succès ! ✨");
        }
    } else {
        // Ajout
        const newGift = {
            id: "gift_" + Date.now(),
            name: name,
            price: price ? parseFloat(price) : null,
            category: category || "Autre",
            url: url,
            image: image || "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80",
            reservedBy: null,
            reservedAt: null
        };
        gifts.unshift(newGift);
        showToast("Cadeau ajouté à ta liste ! 🎁");
    }

    saveData();
    closeGiftModal();
}

function editGift(id) {
    openGiftModal(id);
}

function deleteGift(id) {
    const item = gifts.find(g => g.id === id);
    if (!item) return;
    if (confirm(`Supprimer définitivement "${item.name}" de ta liste de souhaits ?`)) {
        gifts = gifts.filter(g => g.id !== id);
        saveData();
        showToast("Cadeau supprimé.");
    }
}


// ==========================================
// RÉSERVATION DU CÔTÉ INVITÉ
// ==========================================
function openReserveModal(giftId) {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;

    document.getElementById("reserveGiftId").value = gift.id;
    document.getElementById("reserveModalGiftName").textContent = gift.name;
    document.getElementById("reserverNameInput").value = "";
    document.getElementById("reserveModal").classList.remove("hidden");
}

function closeReserveModal() {
    document.getElementById("reserveModal").classList.add("hidden");
}

function handleConfirmReservation(event) {
    event.preventDefault();
    const giftId = document.getElementById("reserveGiftId").value;
    const name = document.getElementById("reserverNameInput").value.trim();

    if (!name) return;

    const gift = gifts.find(g => g.id === giftId);
    if (gift) {
        gift.reservedBy = name;
        gift.reservedAt = new Date().toISOString();
        saveData();
        closeReserveModal();
        showToast(`Merci ${name} ! Le cadeau est maintenant réservé pour toi 🎉`);
    }
}

function cancelReservation(giftId) {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;

    if (confirm(`Annuler la réservation pour "${gift.name}" ? Le cadeau redeviendra libre pour tout le monde.`)) {
        gift.reservedBy = null;
        gift.reservedAt = null;
        saveData();
        showToast("La réservation a été annulée. Le cadeau est à nouveau disponible.");
    }
}


// ==========================================
// UTILITAIRES
// ==========================================
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    const msg = document.getElementById("toastMsg");
    msg.textContent = message;
    toast.classList.remove("translate-y-20", "opacity-0");
    setTimeout(() => {
        toast.classList.add("translate-y-20", "opacity-0");
    }, 3500);
}
