// --- CONFIGURATION ET ETAT GLOBAL ---
const CONFIG = {
    pageSize: 50,
};

let STATE = {
    searchQuery: "",
    selectedCategory: null,
    freeOnly: false,
    favoritesOnly: false,
    sortBy: "id-asc",
    currentPage: 1,
    favorites: new Set()
};

// --- INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
    loadFavorites();
    initCategoryList();
    initStaticStats();
    setupEventListeners();
    applyFiltersAndRender();
});

// --- CHARGEMENT DES FAVORIS ---
function loadFavorites() {
    try {
        const savedFavs = localStorage.getItem("ai_gems_favorites");
        if (savedFavs) {
            const parsed = JSON.parse(savedFavs);
            STATE.favorites = new Set(parsed);
        }
    } catch (e) {
        console.error("Erreur de lecture des favoris :", e);
    }
    updateFavoritesStat();
}

function saveFavorites() {
    try {
        localStorage.setItem("ai_gems_favorites", JSON.stringify(Array.from(STATE.favorites)));
    } catch (e) {
        console.error("Erreur d'écriture des favoris :", e);
    }
    updateFavoritesStat();
}

// --- STATISTIQUES STATIQUES DE BASE ---
function initStaticStats() {
    document.getElementById("stat-total").textContent = AI_TOOLS.length.toLocaleString();
    const freeCount = AI_TOOLS.filter(t => t.free).length;
    document.getElementById("stat-free").textContent = freeCount.toLocaleString();
}

function updateFavoritesStat() {
    document.getElementById("stat-favs").textContent = STATE.favorites.size.toLocaleString();
}

// --- INITIALISATION DES CATEGORIES ---
function initCategoryList() {
    const counts = {};
    AI_TOOLS.forEach(tool => {
        counts[tool.category] = (counts[tool.category] || 0) + 1;
    });

    const categoriesContainer = document.getElementById("categories-filter");
    categoriesContainer.innerHTML = "";

    // Header option "Toutes"
    const allPill = document.createElement("div");
    allPill.className = "category-pill active";
    allPill.dataset.category = "all";
    allPill.innerHTML = `
        <span>Toutes les catégories</span>
        <span class="category-count">${AI_TOOLS.length}</span>
    `;
    categoriesContainer.appendChild(allPill);

    // Dynamic sorting of category names
    Object.keys(counts).sort().forEach(cat => {
        const pill = document.createElement("div");
        pill.className = "category-pill";
        pill.dataset.category = cat;
        pill.innerHTML = `
            <span>${cat}</span>
            <span class="category-count">${counts[cat]}</span>
        `;
        categoriesContainer.appendChild(pill);
    });
}

// --- EVENEMENTS ---
function setupEventListeners() {
    // Recherche
    const searchInput = document.getElementById("search-input");
    const clearSearch = document.getElementById("clear-search");
    
    searchInput.addEventListener("input", (e) => {
        STATE.searchQuery = e.target.value.trim().toLowerCase();
        clearSearch.style.display = STATE.searchQuery ? "block" : "none";
        STATE.currentPage = 1;
        applyFiltersAndRender();
    });

    clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        STATE.searchQuery = "";
        clearSearch.style.display = "none";
        STATE.currentPage = 1;
        applyFiltersAndRender();
    });

    // Sélection de catégorie
    document.getElementById("categories-filter").addEventListener("click", (e) => {
        const pill = e.target.closest(".category-pill");
        if (!pill) return;

        document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        const cat = pill.dataset.category;
        STATE.selectedCategory = (cat === "all") ? null : cat;
        STATE.currentPage = 1;
        applyFiltersAndRender();
    });

    // Bascules de prix et favoris
    document.getElementById("free-only-toggle").addEventListener("change", (e) => {
        STATE.freeOnly = e.target.checked;
        STATE.currentPage = 1;
        applyFiltersAndRender();
    });

    document.getElementById("favorites-only-toggle").addEventListener("change", (e) => {
        STATE.favoritesOnly = e.target.checked;
        STATE.currentPage = 1;
        applyFiltersAndRender();
    });

    // Tris
    document.getElementById("sort-select").addEventListener("change", (e) => {
        STATE.sortBy = e.target.value;
        STATE.currentPage = 1;
        applyFiltersAndRender();
    });

    // Réinitialisation
    document.getElementById("reset-filters").addEventListener("click", () => {
        searchInput.value = "";
        clearSearch.style.display = "none";
        document.getElementById("free-only-toggle").checked = false;
        document.getElementById("favorites-only-toggle").checked = false;
        document.getElementById("sort-select").value = "id-asc";

        document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
        document.querySelector('.category-pill[data-category="all"]').classList.add("active");

        STATE = {
            searchQuery: "",
            selectedCategory: null,
            freeOnly: false,
            favoritesOnly: false,
            sortBy: "id-asc",
            currentPage: 1,
            favorites: STATE.favorites // Conserver favoris
        };

        applyFiltersAndRender();
    });

    // Pagination
    document.getElementById("prev-page").addEventListener("click", () => {
        if (STATE.currentPage > 1) {
            STATE.currentPage--;
            applyFiltersAndRender();
            scrollToTopGrid();
        }
    });

    document.getElementById("next-page").addEventListener("click", () => {
        const totalFiltered = getFilteredTools().length;
        const totalPages = Math.ceil(totalFiltered / CONFIG.pageSize);
        if (STATE.currentPage < totalPages) {
            STATE.currentPage++;
            applyFiltersAndRender();
            scrollToTopGrid();
        }
    });

    // Gestion du tiroir mobile (Sidebar)
    const mobileToggle = document.getElementById("mobile-filter-toggle");
    const closeSidebarBtn = document.getElementById("close-sidebar");
    const sidebarPanel = document.getElementById("sidebar-panel");
    const backdrop = document.getElementById("sidebar-backdrop");

    if (mobileToggle && closeSidebarBtn && sidebarPanel && backdrop) {
        mobileToggle.addEventListener("click", () => {
            sidebarPanel.classList.add("open");
            backdrop.classList.add("active");
        });

        const closeSidebar = () => {
            sidebarPanel.classList.remove("open");
            backdrop.classList.remove("active");
        };

        closeSidebarBtn.addEventListener("click", closeSidebar);
        backdrop.addEventListener("click", closeSidebar);

        // Fermer la sidebar mobile lors de la sélection d'un filtre sur petit écran
        document.getElementById("categories-filter").addEventListener("click", (e) => {
            if (e.target.closest(".category-pill") && window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
        
        document.getElementById("free-only-toggle").addEventListener("change", () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
        
        document.getElementById("favorites-only-toggle").addEventListener("change", () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    }
}

function scrollToTopGrid() {
    document.getElementById("tools-container").scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- FILTRAGE ET TRI ---
function getFilteredTools() {
    return AI_TOOLS.filter(tool => {
        // Recherche textuelle
        if (STATE.searchQuery) {
            const query = STATE.searchQuery;
            const matchName = tool.name.toLowerCase().includes(query);
            const matchDesc = tool.desc.toLowerCase().includes(query);
            const matchUrl = tool.url.toLowerCase().includes(query);
            if (!matchName && !matchDesc && !matchUrl) return false;
        }

        // Catégorie
        if (STATE.selectedCategory && tool.category !== STATE.selectedCategory) {
            return false;
        }

        // Prix (Gratuit uniquement)
        if (STATE.freeOnly && !tool.free) {
            return false;
        }

        // Uniquement Favoris
        if (STATE.favoritesOnly && !STATE.favorites.has(tool.id)) {
            return false;
        }

        return true;
    });
}

function sortTools(tools) {
    switch (STATE.sortBy) {
        case "free-first":
            // Free tools first (free == true is 1/true, false is 0/false)
            return [...tools].sort((a, b) => (b.free ? 1 : 0) - (a.free ? 1 : 0));
        case "name-asc":
            return [...tools].sort((a, b) => a.name.localeCompare(b.name));
        case "name-desc":
            return [...tools].sort((a, b) => b.name.localeCompare(a.name));
        case "id-asc":
        default:
            return [...tools].sort((a, b) => a.id - b.id);
    }
}

// --- EXECUTION DE RENDU ---
function applyFiltersAndRender() {
    const filtered = getFilteredTools();
    const sorted = sortTools(filtered);
    
    // Mettre à jour les stats du filtrage
    document.getElementById("stat-filtered").textContent = filtered.length.toLocaleString();
    document.getElementById("results-count").textContent = `${filtered.length.toLocaleString()} outil${filtered.length > 1 ? "s" : ""} trouvé${filtered.length > 1 ? "s" : ""}`;

    // Pagination
    const totalPages = Math.ceil(sorted.length / CONFIG.pageSize) || 1;
    if (STATE.currentPage > totalPages) {
        STATE.currentPage = totalPages;
    }

    const startIndex = (STATE.currentPage - 1) * CONFIG.pageSize;
    const paginated = sorted.slice(startIndex, startIndex + CONFIG.pageSize);

    renderGrid(paginated);
    renderPaginationControls(totalPages);
}

// --- RENDU DE LA GRILLE ---
function renderGrid(tools) {
    const container = document.getElementById("tools-container");
    container.innerHTML = "";

    if (tools.length === 0) {
        container.innerHTML = `
            <div class="no-results animate-fade-in">
                <i class="fa-solid fa-face-frown-open"></i>
                <h3>Aucun outil trouvé</h3>
                <p>Essayez de réinitialiser vos filtres ou de modifier votre recherche.</p>
            </div>
        `;
        return;
    }

    tools.forEach(tool => {
        const isFav = STATE.favorites.has(tool.id);
        const card = document.createElement("div");
        card.className = "tool-card animate-fade-in";
        card.dataset.id = tool.id;

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${tool.name}</h3>
                <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(${tool.id})">
                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i>
                </button>
            </div>
            
            <div class="badge-container">
                <span class="badge badge-category">${tool.category}</span>
                ${tool.free ? '<span class="badge badge-free">Gratuit/Freemium</span>' : ''}
            </div>
            
            <p class="card-desc" title="${tool.desc}">${tool.desc || 'Aucune description disponible.'}</p>
            
            <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="card-link">
                <span>Visiter le site</span> <i class="fa-solid fa-up-right-from-square"></i>
            </a>
        `;
        container.appendChild(card);
    });
}

// --- RENDU DE LA PAGINATION ---
function renderPaginationControls(totalPages) {
    const container = document.getElementById("page-numbers-container");
    container.innerHTML = "";

    document.getElementById("prev-page").disabled = STATE.currentPage === 1;
    document.getElementById("next-page").disabled = STATE.currentPage === totalPages;

    const maxVisiblePages = 5;
    const pages = [];

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        // Dynamically compute showing page numbers with dots
        if (STATE.currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (STATE.currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', STATE.currentPage - 1, STATE.currentPage, STATE.currentPage + 1, '...', totalPages);
        }
    }

    pages.forEach(page => {
        const btn = document.createElement("button");
        if (page === '...') {
            btn.className = "page-num dots";
            btn.textContent = "...";
            btn.disabled = true;
        } else {
            btn.className = `page-num ${STATE.currentPage === page ? 'active' : ''}`;
            btn.textContent = page;
            btn.addEventListener("click", () => {
                STATE.currentPage = page;
                applyFiltersAndRender();
                scrollToTopGrid();
            });
        }
        container.appendChild(btn);
    });
}

// --- GESTIONNAIRE D'AJOUT AUX FAVORIS ---
window.toggleFavorite = function(toolId) {
    const btn = document.querySelector(`.tool-card[data-id="${toolId}"] .fav-btn`);
    
    if (STATE.favorites.has(toolId)) {
        STATE.favorites.delete(toolId);
        if (btn) {
            btn.classList.remove("active");
            btn.innerHTML = '<i class="fa-regular fa-star"></i>';
        }
    } else {
        STATE.favorites.add(toolId);
        if (btn) {
            btn.classList.add("active");
            btn.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
    }
    
    saveFavorites();

    // If favoritesOnly is enabled, we need to immediately apply filters and redraw
    if (STATE.favoritesOnly) {
        applyFiltersAndRender();
    }
};
