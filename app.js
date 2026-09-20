/**
 * Temple des Souhaits - Logique Professionnelle
 * Support Multi-listes, Anti-spoil et interface épurée
 */

const STORAGE_LISTS = "tds_lists_v3";
const STORAGE_HISTORY = "tds_history_v3";
const AUTH_PREFIX = "tds_auth_";

// Image élégante neutre par défaut
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80";

// Données d'exemple initiales
const SEED_LISTS = {
    "mariage-alex-lea": {
        slug: "mariage-alex-lea",
        title: "Mariage d'Alexandre & Léa",
        owner: "Alexandre & Léa",
        password: "admin",
        createdAt: "2026-09-20T12:00:00.000Z",
        gifts: [
            {
                id: "g_1",
                name: "Robot Pâtissier KitchenAid Artisan",
                price: 499.00,
                category: "Cuisine",
                url: "https://www.kitchenaid.fr",
                image: "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80",
                reservedBy: "Marc & Valérie",
                reservedAt: "2026-09-20T14:30:00.000Z"
            },
            {
                id: "g_2",
                name: "Service de Table en Grès Émaillé (12 personnes)",
                price: 180.00,
                category: "Maison",
                url: "https://www.ikea.com",
                image: "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&w=600&q=80",
                reservedBy: null,
                reservedAt: null
            },
            {
                id: "g_3",
                name: "Participation Voyage de Noces en Grèce",
                price: 100.00,
                category: "Voyage",
                url: "",
                image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
                reservedBy: null,
                reservedAt: null
            }
        ]
    }
};

let lists = {};
let currentList = null;
let currentRole = "home"; // 'home', 'creator', 'guest'
let guestFilter = "all";

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
    loadLists();
    handleRouting();
    renderSavedLists();
});

// Routing par URL
function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("temple") || params.get("liste");
    const mode = params.get("mode");

    if (!slug || !lists[slug]) {
        currentList = null;
        currentRole = "home";
        showView("viewHome");
        updateHeaderBadge();
        return;
    }

    currentList = lists[slug];
    trackHistory(currentList.slug, currentList.title, currentList.owner);

    const isAuthed = sessionStorage.getItem(AUTH_PREFIX + currentList.slug) === "true";

    if (mode === "creator") {
        if (isAuthed) {
            currentRole = "creator";
            showView("viewCreator");
            renderCreatorView();
        } else {
            openModal("modalAuth");
            currentRole = "guest";
            showView("viewGuest");
            renderGuestView();
        }
    } else {
        currentRole = "guest";
        showView("viewGuest");
        renderGuestView();
    }

    updateHeaderBadge();
    updateGuestLinks();
}

function showView(id) {
    ["viewHome", "viewCreator", "viewGuest"].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add("hidden");
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");
}

function updateHeaderBadge() {
    const badge = document.getElementById("activeListIndicator");
    if (!badge) return;

    if (currentRole === "creator") {
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1.5"></span> ${escapeHtml(currentList.title)} (Propriétaire)`;
        badge.classList.remove("hidden");
    } else if (currentRole === "guest") {
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5"></span> ${escapeHtml(currentList.title)} (Invité)`;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function navigateHome() {
    window.location.href = window.location.pathname;
}

// Persistance
function loadLists() {
    const stored = localStorage.getItem(STORAGE_LISTS);
    if (stored) {
        try {
            lists = JSON.parse(stored);
        } catch(e) {
            lists = SEED_LISTS;
        }
    } else {
        lists = SEED_LISTS;
        saveLists();
    }
}

function saveLists() {
    localStorage.setItem(STORAGE_LISTS, JSON.stringify(lists));
}

function trackHistory(slug, title, owner) {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(STORAGE_HISTORY)) || []; } catch(e) {}
    hist = hist.filter(h => h.slug !== slug);
    hist.unshift({ slug, title, owner, time: Date.now() });
    if (hist.length > 6) hist.pop();
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(hist));
}

function renderSavedLists() {
    const container = document.getElementById("savedListsContainer");
    const countEl = document.getElementById("savedListsCount");
    if (!container) return;

    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(STORAGE_HISTORY)) || []; } catch(e) {}

    if (countEl) countEl.textContent = hist.length;

    if (hist.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-400 py-3 text-center">Aucune liste enregistrée récemment.</p>`;
        return;
    }

    container.innerHTML = hist.map(item => `
        <div class="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors">
            <div class="truncate mr-3">
                <p class="text-xs font-semibold text-stone-900 truncate">${escapeHtml(item.title)}</p>
                <p class="text-[11px] text-stone-500">Par ${escapeHtml(item.owner)}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <a href="?liste=${encodeURIComponent(item.slug)}" class="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:border-stone-400 transition-colors">
                    Invité
                </a>
                <a href="?liste=${encodeURIComponent(item.slug)}&mode=creator" class="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors">
                    Gérer
                </a>
            </div>
        </div>
    `).join("");
}

// Création de Liste
function handleCreateList(event) {
    event.preventDefault();
    const title = document.getElementById("newListTitle").value.trim();
    const owner = document.getElementById("newListOwner").value.trim();
    const password = document.getElementById("newListPass").value.trim();

    if (!title || !owner || !password) return;

    const base = title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "liste";
    const slug = `${base}-${Math.random().toString(36).substring(2, 6)}`;

    lists[slug] = {
        slug: slug,
        title: title,
        owner: owner,
        password: password,
        createdAt: new Date().toISOString(),
        gifts: []
    };

    saveLists();
    sessionStorage.setItem(AUTH_PREFIX + slug, "true");
    showToast("Votre liste a été créée !");
    window.location.href = `?liste=${encodeURIComponent(slug)}&mode=creator`;
}

function handleFindList(event) {
    event.preventDefault();
    const code = document.getElementById("inputListCode").value.trim();
    if (!code) return;

    if (lists[code]) {
        window.location.href = `?liste=${encodeURIComponent(code)}`;
    } else {
        alert("Liste introuvable pour le code '" + code + "'. Vérifiez le lien ou créez votre propre liste.");
    }
}

// Liens Invités
function updateGuestLinks() {
    if (!currentList) return;
    const base = window.location.origin + window.location.pathname;
    const url = `${base}?liste=${encodeURIComponent(currentList.slug)}`;

    const input = document.getElementById("guestLinkInput");
    const testBtn = document.getElementById("testGuestViewBtn");

    if (input) input.value = url;
    if (testBtn) testBtn.href = url;
}

function copyGuestLink() {
    const input = document.getElementById("guestLinkInput");
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        showToast("Lien des invités copié !");
    }).catch(() => {
        input.select();
        showToast("Lien sélectionné, faites CTRL+C");
    });
}

// ==========================================
// RENDU CRÉATEUR (ZÉRO SPOIL)
// ==========================================
function renderCreatorView() {
    if (!currentList) return;

    document.getElementById("creatorListTitle").textContent = currentList.title;
    document.getElementById("creatorListOwner").textContent = currentList.owner;
    document.getElementById("creatorListCode").textContent = `#${currentList.slug}`;

    const gifts = currentList.gifts || [];
    const countEl = document.getElementById("creatorItemCount");
    const grid = document.getElementById("creatorGiftsGrid");
    const emptyState = document.getElementById("creatorEmptyState");

    countEl.textContent = `${gifts.length} cadeau${gifts.length > 1 ? "x" : ""}`;

    if (gifts.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = gifts.map(gift => {
        const imgSrc = gift.image || DEFAULT_IMAGE;
        const price = gift.price ? `${parseFloat(gift.price).toFixed(2)} €` : "Prix libre";
        const cat = gift.category ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 uppercase tracking-wider">${escapeHtml(gift.category)}</span>` : "";

        return `
        <div class="bg-white rounded-2xl border border-stone-200 overflow-hidden card-shadow flex flex-col transition-all duration-200 hover:-translate-y-0.5">
            <!-- Image -->
            <div class="relative h-44 w-full bg-stone-100 overflow-hidden">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(gift.name)}" class="w-full h-full object-cover" onerror="this.src='${DEFAULT_IMAGE}'">
                <div class="absolute top-2.5 right-2.5">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/95 text-stone-900 shadow-xs backdrop-blur-xs">
                        ${price}
                    </span>
                </div>
            </div>

            <!-- Content -->
            <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                    ${cat ? `<div class="mb-1.5">${cat}</div>` : ''}
                    <h4 class="text-sm font-bold text-stone-900 line-clamp-2 leading-snug">${escapeHtml(gift.name)}</h4>
                </div>

                <!-- Anti Spoil Tag -->
                <div class="rounded-xl bg-stone-50 p-2.5 border border-stone-200 flex items-center gap-2 text-[11px] text-stone-600">
                    <i class="fa-solid fa-lock text-stone-400 text-xs"></i>
                    <span>Réservation masquée (Zéro spoil)</span>
                </div>

                <!-- Controls -->
                <div class="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    ${gift.url ? `
                        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1">
                            <span>Voir l'article</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-stone-400"></i>
                        </a>
                    ` : `<div></div>`}

                    <div class="flex items-center gap-1">
                        <button onclick="openGiftModal('${gift.id}')" title="Modifier" class="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button onclick="deleteGift('${gift.id}')" title="Supprimer" class="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50">
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
// RENDU INVITÉ
// ==========================================
function renderGuestView() {
    if (!currentList) return;

    document.getElementById("guestListTitle").textContent = currentList.title;
    document.getElementById("guestListOwner").textContent = currentList.owner;

    const gifts = currentList.gifts || [];
    let filtered = gifts;

    if (guestFilter === "available") {
        filtered = gifts.filter(g => !g.reservedBy);
    } else if (guestFilter === "reserved") {
        filtered = gifts.filter(g => g.reservedBy);
    }

    const reservedCount = gifts.filter(g => g.reservedBy).length;
    const availCount = gifts.length - reservedCount;
    document.getElementById("guestGiftCounter").textContent = `${availCount} disponible${availCount > 1 ? "s" : ""} · ${reservedCount} réservé${reservedCount > 1 ? "s" : ""}`;

    const grid = document.getElementById("guestGiftsGrid");
    const emptyState = document.getElementById("guestEmptyState");

    if (filtered.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    grid.innerHTML = filtered.map(gift => {
        const isReserved = !!gift.reservedBy;
        const imgSrc = gift.image || DEFAULT_IMAGE;
        const price = gift.price ? `${parseFloat(gift.price).toFixed(2)} €` : "Prix libre";
        const cat = gift.category ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 uppercase tracking-wider">${escapeHtml(gift.category)}</span>` : "";

        return `
        <div class="bg-white rounded-2xl border border-stone-200 overflow-hidden card-shadow flex flex-col transition-all duration-200 hover:-translate-y-0.5 ${isReserved ? 'opacity-90 bg-stone-50/50' : ''}">
            <!-- Image & Badge -->
            <div class="relative h-44 w-full bg-stone-100 overflow-hidden">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(gift.name)}" class="w-full h-full object-cover ${isReserved ? 'grayscale-25' : ''}" onerror="this.src='${DEFAULT_IMAGE}'">
                
                <div class="absolute top-2.5 right-2.5">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/95 text-stone-900 shadow-xs backdrop-blur-xs">
                        ${price}
                    </span>
                </div>

                <div class="absolute top-2.5 left-2.5">
                    ${isReserved ? `
                        <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-xs">
                            Réservé
                        </span>
                    ` : `
                        <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs">
                            Disponible
                        </span>
                    `}
                </div>
            </div>

            <!-- Content -->
            <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                    ${cat ? `<div class="mb-1.5">${cat}</div>` : ''}
                    <h4 class="text-sm font-bold text-stone-900 line-clamp-2 leading-snug">${escapeHtml(gift.name)}</h4>
                </div>

                <!-- Statut Réservation -->
                <div class="rounded-xl p-3 text-xs ${isReserved ? 'bg-amber-50/70 border border-amber-200 text-amber-900' : 'bg-stone-50 border border-stone-200 text-stone-600'}">
                    ${isReserved ? `
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <span class="font-semibold block">Réservé par ${escapeHtml(gift.reservedBy)}</span>
                                <span class="text-[11px] text-amber-700/80">Pour éviter les doublons</span>
                            </div>
                            <button onclick="cancelReservation('${gift.id}')" class="text-[11px] px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold hover:bg-amber-100 transition-colors">
                                Annuler
                            </button>
                        </div>
                    ` : `
                        <span>Ce cadeau est libre pour vous !</span>
                    `}
                </div>

                <!-- Actions -->
                <div class="pt-2 border-t border-stone-100 flex items-center gap-2">
                    ${gift.url ? `
                        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 border border-stone-200 hover:border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex-shrink-0" title="Acheter en ligne">
                            Boutique ↗
                        </a>
                    ` : ''}

                    ${isReserved ? `
                        <button disabled class="w-full py-2 bg-stone-100 text-stone-400 rounded-xl text-xs font-semibold cursor-not-allowed">
                            Déjà réservé
                        </button>
                    ` : `
                        <button onclick="openReserveModal('${gift.id}')" class="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors">
                            Je le réserve
                        </button>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join("");
}

function filterGuestItems(type) {
    guestFilter = type;
    ["filterAll", "filterAvail", "filterRes"].forEach(id => {
        const btn = document.getElementById(id);
        btn.className = "px-3 py-1 rounded-lg text-stone-600 hover:text-stone-900";
    });

    if (type === "all") document.getElementById("filterAll").className = "px-3 py-1 rounded-lg bg-white text-stone-900 font-semibold shadow-xs";
    if (type === "available") document.getElementById("filterAvail").className = "px-3 py-1 rounded-lg bg-white text-stone-900 font-semibold shadow-xs";
    if (type === "reserved") document.getElementById("filterRes").className = "px-3 py-1 rounded-lg bg-white text-stone-900 font-semibold shadow-xs";

    renderGuestView();
}


// Modals Helper
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
}

// Mot de passe Propriétaire
function promptCreatorAuth() {
    openModal("modalAuth");
}

function handleAuthSubmit(event) {
    event.preventDefault();
    if (!currentList) return;

    const val = document.getElementById("authPasswordInput").value.trim();
    const err = document.getElementById("authErrorMsg");

    if (val === currentList.password) {
        sessionStorage.setItem(AUTH_PREFIX + currentList.slug, "true");
        closeModal("modalAuth");
        currentRole = "creator";
        showView("viewCreator");
        updateHeaderBadge();
        renderCreatorView();
        showToast("Connexion réussie !");
    } else {
        err.classList.remove("hidden");
    }
}

// Ajout / Modification de Cadeau
function openGiftModal(id = null) {
    if (!currentList) return;
    const title = document.getElementById("modalGiftHeading");
    const editId = document.getElementById("editGiftId");
    const name = document.getElementById("inputGiftName");
    const price = document.getElementById("inputGiftPrice");
    const cat = document.getElementById("inputGiftCategory");
    const url = document.getElementById("inputGiftUrl");
    const img = document.getElementById("inputGiftImg");

    if (id) {
        const item = (currentList.gifts || []).find(g => g.id === id);
        if (!item) return;
        title.textContent = "Modifier le cadeau";
        editId.value = item.id;
        name.value = item.name || "";
        price.value = item.price || "";
        cat.value = item.category || "";
        url.value = item.url || "";
        img.value = item.image || "";
        displayScrapedImage(item.image);
    } else {
        title.textContent = "Ajouter un cadeau";
        editId.value = "";
        name.value = "";
        price.value = "";
        cat.value = "";
        url.value = "";
        img.value = "";
        displayScrapedImage("");
    }

    openModal("modalGift");
}

function displayScrapedImage(url) {
    const img = document.getElementById("imgPreview");
    const placeholder = document.getElementById("imgPlaceholder");
    const hiddenInput = document.getElementById("inputGiftImg");

    if (url && (url.startsWith("http") || url.startsWith("//"))) {
        img.src = url;
        img.classList.remove("hidden");
        placeholder.classList.add("hidden");
        hiddenInput.value = url;
    } else {
        img.classList.add("hidden");
        placeholder.classList.remove("hidden");
        hiddenInput.value = "";
    }
}

// SCRAPER MULTI-SOURCES : Contourne les protections anti-scraping d'Amazon & marchands
async function autoFetchProductFromUrl(rawUrl) {
    if (!rawUrl || !rawUrl.startsWith("http")) return;

    const spinner = document.getElementById("fetchBtnSpinner");
    const text = document.getElementById("fetchBtnText");
    const nameInput = document.getElementById("inputGiftName");
    const catInput = document.getElementById("inputGiftCategory");

    spinner.classList.remove("hidden");
    text.textContent = "Extraction...";

    let foundImage = null;
    let foundTitle = null;

    // 1. Spécifique AMAZON : Extraction chirurgicale de l'ASIN avec test des 3 CDN d'images officiels non-bloqués
    const isAmazon = /amazon\.(fr|com|de|co\.uk|es|it|ca)/i.test(rawUrl);
    const amazonAsinMatch = rawUrl.match(/(?:\/dp\/|\/gp\/product\/|\/ASIN\/|\/d\/)([A-Z0-9]{10})/i) ||
                           rawUrl.match(/\/([A-Z0-9]{10})(?:[/?]|$)/i);

    if (isAmazon && amazonAsinMatch) {
        const asin = amazonAsinMatch[1].toUpperCase();
        // Le CDN média Amazon direct (ssl-images-amazon / m.media-amazon) ne bloque JAMAIS les requêtes d'images !
        const testAmazonUrl = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
        
        // Vérification rapide de validité
        const imgTest = new Image();
        imgTest.onload = () => {
            if (imgTest.naturalWidth > 1) {
                foundImage = testAmazonUrl;
                displayScrapedImage(foundImage);
            }
        };
        imgTest.onerror = () => {
            // Deuxième format CDN Amazon de secours
            foundImage = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SX600_.jpg`;
            displayScrapedImage(foundImage);
        };
        imgTest.src = testAmazonUrl;
        foundImage = testAmazonUrl;

        // Titre générique si vide depuis l'URL
        const urlSlug = rawUrl.split('/')[3] || "";
        if (urlSlug && !urlSlug.startsWith("dp") && !nameInput.value) {
            nameInput.value = decodeURIComponent(urlSlug.replace(/-/g, ' '));
        }
    }

    // 2. Moteur Métadonnées Universel (Pour Fnac, Leclerc, Boulanger, Darty, etc.)
    if (!foundImage || !foundTitle) {
        try {
            const encoded = encodeURIComponent(rawUrl);
            const res = await fetch(`https://api.microlink.io?url=${encoded}`);
            const data = await res.json();
            if (data && data.data) {
                if (!foundImage && data.data.image && data.data.image.url) {
                    foundImage = data.data.image.url;
                }
                if (!foundTitle && data.data.title) {
                    foundTitle = data.data.title;
                }
            }
        } catch (e) {
            console.log("Moteur Microlink ignoré");
        }
    }

    // 3. Moteur Proxy CORS Fallback : scraping direct du HTML (balises og:image)
    if (!foundImage) {
        try {
            const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`);
            const proxyData = await proxyRes.json();
            if (proxyData && proxyData.contents) {
                const doc = new DOMParser().parseFromString(proxyData.contents, "text/html");
                const ogImg = doc.querySelector('meta[property="og:image"]')?.content ||
                              doc.querySelector('meta[name="twitter:image"]')?.content ||
                              doc.querySelector('link[rel="image_src"]')?.href;
                if (ogImg) foundImage = ogImg;

                if (!foundTitle) {
                    const ogTitle = doc.querySelector('meta[property="og:title"]')?.content || doc.title;
                    if (ogTitle) foundTitle = ogTitle;
                }
            }
        } catch (e) {
            console.log("Moteur Proxy ignoré");
        }
    }

    // 4. Moteur Fallback Visuel (Aperçu direct du produit)
    if (!foundImage) {
        foundImage = `https://image.thum.io/get/width/600/crop/600/${rawUrl}`;
    }

    if (foundImage) {
        displayScrapedImage(foundImage);
    }
    if (foundTitle && !nameInput.value) {
        let cleanTitle = foundTitle.split(/[-–|:]/)[0].trim();
        nameInput.value = cleanTitle || foundTitle;
    }

    // Catégorisation
    if (!catInput.value) {
        if (/livre|book|fnac/i.test(rawUrl)) catInput.value = "Livre & Culture";
        else if (/jeu|game|playstation|nintendo|xbox/i.test(rawUrl)) catInput.value = "Jeux & High-Tech";
        else if (/ikea|maison|deco/i.test(rawUrl)) catInput.value = "Maison & Déco";
        else if (/vetement|mode|zara|nike|adidas/i.test(rawUrl)) catInput.value = "Mode";
    }

    spinner.classList.add("hidden");
    text.textContent = "Extraire";
    showToast(foundImage ? "Photo du produit récupérée !" : "Lien enregistré !");
}

// OPTION DE SECOURS : Importer une image depuis l'ordinateur
function handleLocalImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Limitation de taille (max 3Mo pour le stockage)
    if (file.size > 3 * 1024 * 1024) {
        alert("L'image est trop lourde (max 3 Mo). Choisissez une image plus légère.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Img = e.target.result;
        displayScrapedImage(base64Img);
        showToast("Photo importée depuis votre ordinateur ! 📸");
    };
    reader.readAsDataURL(file);
}

function handleSaveGift(event) {
    event.preventDefault();
    if (!currentList) return;

    const editId = document.getElementById("editGiftId").value;
    const name = document.getElementById("inputGiftName").value.trim();
    const price = document.getElementById("inputGiftPrice").value;
    const cat = document.getElementById("inputGiftCategory").value.trim();
    const url = document.getElementById("inputGiftUrl").value.trim();
    const img = document.getElementById("inputGiftImg").value.trim();

    if (!name) return;

    if (!currentList.gifts) currentList.gifts = [];

    if (editId) {
        const idx = currentList.gifts.findIndex(g => g.id === editId);
        if (idx !== -1) {
            currentList.gifts[idx].name = name;
            currentList.gifts[idx].price = price ? parseFloat(price) : null;
            currentList.gifts[idx].category = cat;
            currentList.gifts[idx].url = url;
            currentList.gifts[idx].image = img || currentList.gifts[idx].image;
            showToast("Cadeau mis à jour !");
        }
    } else {
        currentList.gifts.unshift({
            id: "g_" + Date.now(),
            name: name,
            price: price ? parseFloat(price) : null,
            category: cat || "Divers",
            url: url,
            image: img || DEFAULT_IMAGE,
            reservedBy: null,
            reservedAt: null
        });
        showToast("Cadeau ajouté à votre liste !");
    }

    lists[currentList.slug] = currentList;
    saveLists();
    closeModal("modalGift");
    renderCreatorView();
}

function deleteGift(id) {
    if (!currentList) return;
    const item = (currentList.gifts || []).find(g => g.id === id);
    if (!item) return;

    if (confirm(`Supprimer "${item.name}" de votre liste ?`)) {
        currentList.gifts = currentList.gifts.filter(g => g.id !== id);
        lists[currentList.slug] = currentList;
        saveLists();
        renderCreatorView();
        showToast("Cadeau supprimé.");
    }
}

// Réservation
function openReserveModal(id) {
    if (!currentList) return;
    const item = (currentList.gifts || []).find(g => g.id === id);
    if (!item) return;

    document.getElementById("reserveItemId").value = item.id;
    document.getElementById("reserveItemName").textContent = item.name;
    document.getElementById("reserveNameInput").value = "";
    openModal("modalReserve");
}

function handleConfirmReserve(event) {
    event.preventDefault();
    if (!currentList) return;

    const id = document.getElementById("reserveItemId").value;
    const name = document.getElementById("reserveNameInput").value.trim();
    if (!name) return;

    const gift = (currentList.gifts || []).find(g => g.id === id);
    if (gift) {
        gift.reservedBy = name;
        gift.reservedAt = new Date().toISOString();
        lists[currentList.slug] = currentList;
        saveLists();
        closeModal("modalReserve");
        renderGuestView();
        showToast(`Cadeau réservé par ${name} !`);
    }
}

function cancelReservation(id) {
    if (!currentList) return;
    const gift = (currentList.gifts || []).find(g => g.id === id);
    if (!gift) return;

    if (confirm(`Annuler la réservation pour "${gift.name}" ?`)) {
        gift.reservedBy = null;
        gift.reservedAt = null;
        lists[currentList.slug] = currentList;
        saveLists();
        renderGuestView();
        showToast("Réservation annulée.");
    }
}

// Utilitaires
function escapeHtml(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    const label = document.getElementById("toastMsg");
    label.textContent = msg;
    toast.classList.remove("translate-y-20", "opacity-0");
    setTimeout(() => toast.classList.add("translate-y-20", "opacity-0"), 3000);
}
