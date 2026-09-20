/**
 * Temple des Souhaits - Thème Grèce Antique & Multi-Utilisateurs
 * 
 * Architecture :
 * - Chaque utilisateur peut créer son propre Temple (avec son slug, nom, mot de passe admin, et cadeaux).
 * - Les invités consultent le temple via l'URL : ?temple=slug
 * - Le créateur administre son temple via l'URL : ?temple=slug&mode=creator (sécurisé par son mot de passe)
 * - Anti-spoil absolu : Les réservations ne sont JAMAIS visibles dans l'espace créateur.
 */

// Stockage des temples
const STORAGE_KEY_TEMPLES = "temple_des_souhaits_all_temples_v2";
const STORAGE_KEY_RECENTS = "temple_des_souhaits_recents_v2";
const SESSION_AUTH_PREFIX = "auth_temple_";

// Image antique par défaut
const DEFAULT_GIFT_IMG = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80";

// Temples initiaux par défaut
const INITIAL_TEMPLES = {
    "olympe-zeus": {
        slug: "olympe-zeus",
        title: "Le Banquet de l'Olympe",
        owner: "Zeus",
        password: "admin",
        createdAt: "2026-09-20T12:00:00.000Z",
        gifts: [
            {
                id: "g_1",
                name: "Éclair Foudroyant Forgé par les Cyclopes",
                price: 999.00,
                category: "Mythique",
                url: "https://fr.wikipedia.org/wiki/Foudre_de_Zeus",
                image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
                reservedBy: "Hermès",
                reservedAt: "2026-09-20T14:00:00.000Z"
            },
            {
                id: "g_2",
                name: "Amphore de Nectar & Ambroisie Pure",
                price: 120.00,
                category: "Gastronomie Divine",
                url: "https://fr.wikipedia.org/wiki/Ambroisie",
                image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=600&q=80",
                reservedBy: null,
                reservedAt: null
            },
            {
                id: "g_3",
                name: "Couronne de Lauriers d'Or Massif",
                price: 350.00,
                category: "Ornements",
                url: "https://fr.wikipedia.org/wiki/Couronne_triomphale",
                image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
                reservedBy: null,
                reservedAt: null
            }
        ]
    }
};

// État courant
let allTemples = {};
let currentTemple = null;
let currentMode = "home"; // 'home', 'creator', 'guest'
let guestFilter = "all";  // 'all', 'available', 'reserved'

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadAllTemples();
    route();
    renderRecentTemples();
});

// Navigation / Routeur basé sur les paramètres URL
function route() {
    const params = new URLSearchParams(window.location.search);
    const templeSlug = params.get("temple");
    const modeParam = params.get("mode");

    if (!templeSlug || !allTemples[templeSlug]) {
        currentTemple = null;
        currentMode = "home";
        showView("viewHome");
        updateNavBadge();
        return;
    }

    currentTemple = allTemples[templeSlug];
    saveRecentTemple(currentTemple.slug, currentTemple.title, currentTemple.owner);

    const isAuth = sessionStorage.getItem(SESSION_AUTH_PREFIX + currentTemple.slug) === "true";

    if (modeParam === "creator") {
        if (isAuth) {
            currentMode = "creator";
            showView("viewCreator");
            renderCreatorView();
        } else {
            // Demande le mot de passe du temple
            openModal("modalLogin");
            currentMode = "guest";
            showView("viewGuest");
            renderGuestView();
        }
    } else {
        currentMode = "guest";
        showView("viewGuest");
        renderGuestView();
    }

    updateNavBadge();
    updateShareLinks();
}

function showView(viewId) {
    ["viewHome", "viewCreator", "viewGuest"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove("hidden");
}

function updateNavBadge() {
    const badge = document.getElementById("navStatusBadge");
    if (!badge) return;

    if (currentMode === "creator") {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Mode Créateur : ${escapeHtml(currentTemple.title)}`;
        badge.classList.remove("hidden");
    } else if (currentMode === "guest") {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Invité : ${escapeHtml(currentTemple.title)}`;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function goHome() {
    window.location.href = window.location.pathname;
}

// ==========================================
// GESTION DU STOCKAGE
// ==========================================
function loadAllTemples() {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLES);
    if (stored) {
        try {
            allTemples = JSON.parse(stored);
        } catch (e) {
            allTemples = INITIAL_TEMPLES;
        }
    } else {
        allTemples = INITIAL_TEMPLES;
        saveAllTemples();
    }
}

function saveAllTemples() {
    localStorage.setItem(STORAGE_KEY_TEMPLES, JSON.stringify(allTemples));
}

function saveRecentTemple(slug, title, owner) {
    let recents = [];
    try {
        recents = JSON.parse(localStorage.getItem(STORAGE_KEY_RECENTS)) || [];
    } catch(e) {}
    recents = recents.filter(r => r.slug !== slug);
    recents.unshift({ slug, title, owner, lastVisited: Date.now() });
    if (recents.length > 5) recents.pop();
    localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(recents));
}

function renderRecentTemples() {
    const container = document.getElementById("recentTemplesList");
    if (!container) return;

    let recents = [];
    try {
        recents = JSON.parse(localStorage.getItem(STORAGE_KEY_RECENTS)) || [];
    } catch(e) {}

    if (recents.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic font-sans">Aucun temple récent enregistré.</p>`;
        return;
    }

    container.innerHTML = recents.map(r => `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-greek-gold/20 hover:border-greek-gold/50 transition-all">
            <div class="truncate">
                <p class="font-cinzel text-xs font-bold text-greek-goldLight truncate">${escapeHtml(r.title)}</p>
                <p class="text-[11px] text-slate-400">Fondé par ${escapeHtml(r.owner)} · <span class="font-mono text-[10px] text-greek-gold/70">${escapeHtml(r.slug)}</span></p>
            </div>
            <div class="flex gap-2">
                <a href="?temple=${encodeURIComponent(r.slug)}" class="px-2.5 py-1 rounded-xl bg-greek-gold/20 hover:bg-greek-gold/30 text-greek-gold text-[11px] font-cinzel font-bold">
                    Invité
                </a>
                <a href="?temple=${encodeURIComponent(r.slug)}&mode=creator" class="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-cinzel font-bold">
                    Gérer
                </a>
            </div>
        </div>
    `).join("");
}

// ==========================================
// CRÉATION ET NAVIGATION ENTRE TEMPLES
// ==========================================
function handleCreateTemple(event) {
    event.preventDefault();
    const title = document.getElementById("newTempleTitle").value.trim();
    const owner = document.getElementById("newTempleOwner").value.trim();
    const password = document.getElementById("newTemplePass").value.trim();

    if (!title || !owner || !password) return;

    // Création d'un slug unique et propre (ex: anniversaire-lucas-78a)
    const baseSlug = title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "temple";
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const newTemple = {
        slug: slug,
        title: title,
        owner: owner,
        password: password,
        createdAt: new Date().toISOString(),
        gifts: []
    };

    allTemples[slug] = newTemple;
    saveAllTemples();

    // Authentifier automatiquement le créateur
    sessionStorage.setItem(SESSION_AUTH_PREFIX + slug, "true");

    showToast("Votre Temple a été érigé avec succès ! 🏛️");
    window.location.href = `?temple=${encodeURIComponent(slug)}&mode=creator`;
}

function handleJoinTempleById(event) {
    event.preventDefault();
    const slug = document.getElementById("inputTempleSlug").value.trim();
    if (!slug) return;

    if (allTemples[slug]) {
        window.location.href = `?temple=${encodeURIComponent(slug)}`;
    } else {
        alert("Aucun temple n'a été trouvé avec l'identifiant '" + slug + "'. Vérifiez l'orthographe ou créez-en un nouveau !");
    }
}


// ==========================================
// LIENS DE PARTAGE & INVITATIONS
// ==========================================
function updateShareLinks() {
    if (!currentTemple) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const guestUrl = `${baseUrl}?temple=${encodeURIComponent(currentTemple.slug)}`;

    const shareUrlDisplay = document.getElementById("guestShareUrl");
    const previewBtn = document.getElementById("previewGuestBtn");

    if (shareUrlDisplay) shareUrlDisplay.textContent = guestUrl;
    if (previewBtn) previewBtn.href = guestUrl;
}

function copyGuestUrl() {
    if (!currentTemple) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const guestUrl = `${baseUrl}?temple=${encodeURIComponent(currentTemple.slug)}`;

    navigator.clipboard.writeText(guestUrl).then(() => {
        showToast("Lien sacré copié ! Transmettez-le à vos invités 📜");
    }).catch(() => {
        showToast("Lien : " + guestUrl);
    });
}


// ==========================================
// 1. RENDU CRÉATEUR (ANTI-SPOIL ABSOLU)
// ==========================================
function renderCreatorView() {
    if (!currentTemple) return;

    document.getElementById("creatorTempleTitle").textContent = currentTemple.title;
    document.getElementById("creatorOwnerName").textContent = currentTemple.owner;
    document.getElementById("creatorTempleIdDisplay").textContent = `#${currentTemple.slug}`;

    const gifts = currentTemple.gifts || [];
    const countEl = document.getElementById("creatorGiftCount");
    const grid = document.getElementById("creatorGiftsGrid");
    const emptyState = document.getElementById("creatorEmptyState");

    countEl.textContent = `${gifts.length} souhait${gifts.length > 1 ? "s" : ""} dans votre registre`;

    if (gifts.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = gifts.map(gift => {
        const imgSrc = gift.image || DEFAULT_GIFT_IMG;
        const priceTag = gift.price ? `${parseFloat(gift.price).toFixed(2)} €` : "Prix libre";
        const catTag = gift.category ? `<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-cinzel font-bold tracking-wider bg-greek-gold/10 text-greek-gold border border-greek-gold/30 uppercase">${escapeHtml(gift.category)}</span>` : "";

        return `
        <div class="marble-card rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-greek-gold/60">
            <!-- Image Antique -->
            <div class="relative h-48 w-full bg-black/50 overflow-hidden group">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(gift.name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='${DEFAULT_GIFT_IMG}'">
                <div class="absolute top-3 right-3">
                    <span class="px-3 py-1 rounded-full text-xs font-cinzel font-bold bg-black/80 text-greek-gold border border-greek-gold/40 shadow-lg backdrop-blur-sm">
                        ${priceTag}
                    </span>
                </div>
            </div>

            <!-- Infos -->
            <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        ${catTag}
                    </div>
                    <h4 class="font-cinzel text-base font-bold text-greek-goldLight leading-snug line-clamp-2">${escapeHtml(gift.name)}</h4>
                </div>

                <!-- Sceau Secret Anti-Spoil -->
                <div class="p-3 rounded-2xl bg-black/40 border border-greek-gold/20 flex items-center gap-2.5 text-xs text-slate-300">
                    <span class="text-base text-greek-gold">🛡️</span>
                    <div>
                        <p class="font-cinzel font-bold text-[11px] text-greek-gold uppercase tracking-wider">Secret Divin Garanti</p>
                        <p class="text-[10px] text-slate-400 font-sans">Réservations cachées pour préserver votre surprise totale.</p>
                    </div>
                </div>

                <!-- Actions Créateur -->
                <div class="pt-2 border-t border-greek-gold/15 flex items-center justify-between gap-2">
                    ${gift.url ? `
                        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl border border-greek-gold/30 text-greek-gold hover:bg-greek-gold/10 text-xs font-cinzel font-semibold flex items-center gap-1.5 transition-colors">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Voir le présent
                        </a>
                    ` : `<div></div>`}

                    <div class="flex items-center gap-1">
                        <button onclick="openGiftModal('${gift.id}')" title="Modifier l'offrande" class="p-2 rounded-xl text-slate-400 hover:text-greek-gold hover:bg-greek-gold/10 transition-colors">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button onclick="deleteGift('${gift.id}')" title="Supprimer l'offrande" class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join("");
}


// ==========================================
// 2. RENDU INVITÉ (RÉSERVATIONS & DONS)
// ==========================================
function renderGuestView() {
    if (!currentTemple) return;

    document.getElementById("guestTempleTitle").textContent = currentTemple.title;
    document.getElementById("guestOwnerName").textContent = currentTemple.owner;

    const gifts = currentTemple.gifts || [];
    let filteredGifts = gifts;

    if (guestFilter === "available") {
        filteredGifts = gifts.filter(g => !g.reservedBy);
    } else if (guestFilter === "reserved") {
        filteredGifts = gifts.filter(g => g.reservedBy);
    }

    const reservedCount = gifts.filter(g => g.reservedBy).length;
    const availableCount = gifts.length - reservedCount;
    document.getElementById("guestGiftCount").textContent = `${availableCount} offrande${availableCount > 1 ? "s" : ""} disponible${availableCount > 1 ? "s" : ""} · ${reservedCount} déjà promise${reservedCount > 1 ? "s" : ""}`;

    const grid = document.getElementById("guestGiftsGrid");
    const emptyState = document.getElementById("guestEmptyState");

    if (filteredGifts.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = filteredGifts.map(gift => {
        const isReserved = !!gift.reservedBy;
        const imgSrc = gift.image || DEFAULT_GIFT_IMG;
        const priceTag = gift.price ? `${parseFloat(gift.price).toFixed(2)} €` : "Prix libre";
        const catTag = gift.category ? `<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-cinzel font-bold tracking-wider bg-greek-gold/10 text-greek-gold border border-greek-gold/30 uppercase">${escapeHtml(gift.category)}</span>` : "";

        return `
        <div class="marble-card rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 ${isReserved ? 'border-amber-500/40 bg-amber-950/10' : 'hover:border-greek-gold/60'}">
            <!-- Image & Statut -->
            <div class="relative h-48 w-full bg-black/50 overflow-hidden group">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(gift.name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isReserved ? 'brightness-75' : ''}" onerror="this.src='${DEFAULT_GIFT_IMG}'">
                
                <div class="absolute top-3 right-3">
                    <span class="px-3 py-1 rounded-full text-xs font-cinzel font-bold bg-black/80 text-greek-gold border border-greek-gold/40 shadow-lg backdrop-blur-sm">
                        ${priceTag}
                    </span>
                </div>

                <div class="absolute top-3 left-3">
                    ${isReserved ? `
                        <span class="px-3 py-1 rounded-full text-xs font-cinzel font-bold bg-amber-600/90 text-white border border-amber-400 shadow-md flex items-center gap-1.5">
                            <i class="fa-solid fa-lock text-[10px]"></i> Réservé
                        </span>
                    ` : `
                        <span class="px-3 py-1 rounded-full text-xs font-cinzel font-bold bg-emerald-600/90 text-white border border-emerald-400 shadow-md flex items-center gap-1.5">
                            <i class="fa-solid fa-sparkles text-[10px]"></i> Disponible
                        </span>
                    `}
                </div>
            </div>

            <!-- Contenu -->
            <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        ${catTag}
                    </div>
                    <h4 class="font-cinzel text-base font-bold text-greek-goldLight leading-snug line-clamp-2">${escapeHtml(gift.name)}</h4>
                </div>

                <!-- Statut de la promesse -->
                <div class="p-3 rounded-2xl text-xs ${isReserved ? 'bg-amber-900/30 border border-amber-500/40 text-amber-200' : 'bg-black/40 border border-greek-gold/20 text-slate-300'}">
                    ${isReserved ? `
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <p class="font-cinzel font-bold text-xs flex items-center gap-1.5 text-amber-300">
                                    <i class="fa-solid fa-hand-holding-heart text-amber-400"></i> Réservé par ${escapeHtml(gift.reservedBy)}
                                </p>
                                <p class="text-[10px] text-slate-400 font-sans mt-0.5">Offrande promise par ce proche</p>
                            </div>
                            <button onclick="cancelReservation('${gift.id}')" class="text-[10px] px-2.5 py-1 rounded-lg border border-rose-400/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 font-cinzel font-bold transition-colors">
                                Annuler
                            </button>
                        </div>
                    ` : `
                        <p class="font-cinzel font-bold text-xs text-greek-goldLight flex items-center gap-1.5">
                            <i class="fa-solid fa-gift text-greek-gold"></i> Offrande libre !
                        </p>
                        <p class="text-[10px] text-slate-400 font-sans mt-0.5">Soyez le noble donateur qui offrira ce présent.</p>
                    `}
                </div>

                <!-- Boutons Invités -->
                <div class="pt-2 border-t border-greek-gold/15 flex items-center gap-2">
                    ${gift.url ? `
                        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2.5 rounded-2xl border border-greek-gold/40 text-greek-goldLight hover:bg-greek-gold/10 text-xs font-cinzel font-bold flex items-center gap-1.5 transition-colors flex-shrink-0" title="Aller sur la boutique en ligne">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Se procurer
                        </a>
                    ` : ''}

                    ${isReserved ? `
                        <button disabled class="w-full py-2.5 rounded-2xl bg-black/40 border border-slate-700 text-slate-500 font-cinzel font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-check"></i> Déjà promis
                        </button>
                    ` : `
                        <button onclick="openReserveModal('${gift.id}')" class="w-full py-2.5 gold-button rounded-2xl font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-hand-sparkles"></i> Je l'offre
                        </button>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join("");
}

function setGuestFilter(filter) {
    guestFilter = filter;
    ["filterBtnAll", "filterBtnAvail", "filterBtnRes"].forEach(id => {
        const btn = document.getElementById(id);
        btn.className = "px-3 py-1.5 rounded-xl text-slate-300 hover:text-greek-gold transition-all";
    });

    if (filter === "all") document.getElementById("filterBtnAll").className = "px-3 py-1.5 rounded-xl bg-greek-gold text-black font-bold transition-all";
    if (filter === "available") document.getElementById("filterBtnAvail").className = "px-3 py-1.5 rounded-xl bg-greek-gold text-black font-bold transition-all";
    if (filter === "reserved") document.getElementById("filterBtnRes").className = "px-3 py-1.5 rounded-xl bg-greek-gold text-black font-bold transition-all";

    renderGuestView();
}


// ==========================================
// MODALS & ACTIONS
// ==========================================
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("hidden");
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("hidden");
}

// Connexion au Temple (Mot de passe)
function handleLoginSubmit(event) {
    event.preventDefault();
    if (!currentTemple) return;

    const pass = document.getElementById("modalLoginPass").value.trim();
    const errorEl = document.getElementById("modalLoginError");

    if (pass === currentTemple.password) {
        sessionStorage.setItem(SESSION_AUTH_PREFIX + currentTemple.slug, "true");
        closeModal("modalLogin");
        currentMode = "creator";
        showView("viewCreator");
        updateNavBadge();
        renderCreatorView();
        showToast("Bienvenue sur l'Autel du Temple ! 🏛️");
    } else {
        errorEl.classList.remove("hidden");
    }
}

// Gestion des Cadeaux / Souhaits
function openGiftModal(giftId = null) {
    if (!currentTemple) return;
    const title = document.getElementById("modalGiftTitle");
    const editId = document.getElementById("giftEditId");
    const name = document.getElementById("giftName");
    const price = document.getElementById("giftPrice");
    const cat = document.getElementById("giftCategory");
    const url = document.getElementById("giftUrl");
    const img = document.getElementById("giftImage");

    if (giftId) {
        const item = (currentTemple.gifts || []).find(g => g.id === giftId);
        if (!item) return;
        title.innerHTML = `<span>🏺</span> Modifier l'Offrande`;
        editId.value = item.id;
        name.value = item.name || "";
        price.value = item.price || "";
        cat.value = item.category || "";
        url.value = item.url || "";
        img.value = item.image || "";
        previewGiftImg(item.image);
    } else {
        title.innerHTML = `<span>🏺</span> Inscrire une Offrande`;
        editId.value = "";
        name.value = "";
        price.value = "";
        cat.value = "";
        url.value = "";
        img.value = "";
        previewGiftImg("");
    }

    openModal("modalGift");
}

function previewGiftImg(url) {
    const container = document.getElementById("giftImgPreviewContainer");
    const preview = document.getElementById("giftImgPreview");
    if (url && url.startsWith("http")) {
        preview.src = url;
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
    }
}

function handleSaveGift(event) {
    event.preventDefault();
    if (!currentTemple) return;

    const editId = document.getElementById("giftEditId").value;
    const name = document.getElementById("giftName").value.trim();
    const price = document.getElementById("giftPrice").value;
    const cat = document.getElementById("giftCategory").value.trim();
    const url = document.getElementById("giftUrl").value.trim();
    const img = document.getElementById("giftImage").value.trim();

    if (!name) return;

    if (!currentTemple.gifts) currentTemple.gifts = [];

    if (editId) {
        const index = currentTemple.gifts.findIndex(g => g.id === editId);
        if (index !== -1) {
            currentTemple.gifts[index].name = name;
            currentTemple.gifts[index].price = price ? parseFloat(price) : null;
            currentTemple.gifts[index].category = cat;
            currentTemple.gifts[index].url = url;
            currentTemple.gifts[index].image = img || currentTemple.gifts[index].image;
            showToast("Offrande renouvelée dans le temple ! ✨");
        }
    } else {
        const newGift = {
            id: "g_" + Date.now(),
            name: name,
            price: price ? parseFloat(price) : null,
            category: cat || "Offrande",
            url: url,
            image: img || DEFAULT_GIFT_IMG,
            reservedBy: null,
            reservedAt: null
        };
        currentTemple.gifts.unshift(newGift);
        showToast("Nouveau vœu gravé sur le marbre sacré ! 🏺");
    }

    allTemples[currentTemple.slug] = currentTemple;
    saveAllTemples();
    closeModal("modalGift");
    renderCreatorView();
}

function deleteGift(giftId) {
    if (!currentTemple) return;
    const item = (currentTemple.gifts || []).find(g => g.id === giftId);
    if (!item) return;

    if (confirm(`Effacer à jamais l'offrande "${item.name}" du marbre de votre temple ?`)) {
        currentTemple.gifts = currentTemple.gifts.filter(g => g.id !== giftId);
        allTemples[currentTemple.slug] = currentTemple;
        saveAllTemples();
        renderCreatorView();
        showToast("Offrande retirée du registre.");
    }
}

// Réservation Invités
function openReserveModal(giftId) {
    if (!currentTemple) return;
    const item = (currentTemple.gifts || []).find(g => g.id === giftId);
    if (!item) return;

    document.getElementById("reserveGiftId").value = item.id;
    document.getElementById("reserveGiftName").textContent = item.name;
    document.getElementById("reserveGuestName").value = "";
    openModal("modalReserve");
}

function handleConfirmReservation(event) {
    event.preventDefault();
    if (!currentTemple) return;

    const giftId = document.getElementById("reserveGiftId").value;
    const guestName = document.getElementById("reserveGuestName").value.trim();
    if (!guestName) return;

    const gift = (currentTemple.gifts || []).find(g => g.id === giftId);
    if (gift) {
        gift.reservedBy = guestName;
        gift.reservedAt = new Date().toISOString();
        allTemples[currentTemple.slug] = currentTemple;
        saveAllTemples();
        closeModal("modalReserve");
        renderGuestView();
        showToast(`Bénédiction à vous, noble ${guestName} ! Présent réservé 🌿`);
    }
}

function cancelReservation(giftId) {
    if (!currentTemple) return;
    const gift = (currentTemple.gifts || []).find(g => g.id === giftId);
    if (!gift) return;

    if (confirm(`Rompre votre promesse d'offrande pour "${gift.name}" ? Le souhait redeviendra disponible pour les autres invités.`)) {
        gift.reservedBy = null;
        gift.reservedAt = null;
        allTemples[currentTemple.slug] = currentTemple;
        saveAllTemples();
        renderGuestView();
        showToast("La réservation a été levée.");
    }
}

// Utilitaires
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
    toast.classList.remove("translate-y-24", "opacity-0");
    setTimeout(() => {
        toast.classList.add("translate-y-24", "opacity-0");
    }, 3500);
}
