const API_URL = "https://nave-dinobase-api-9a4p.vercel.app/api/v1";
const API_KEY  = "nave-api-codex-110605";
const HEADERS = {headers: {"x-api-key": API_KEY }};

// SAVED COPY
const SNAPSHOT_KEY = "ancient-archives-snapshot";

function saveSnapshot(dinosaurs) {
    try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ savedAt: new Date().toISOString(), dinosaurs }));
    } catch (e) {}
}

function loadSnapshot() {
    try {
        const saved = JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
        return saved && Array.isArray(saved.dinosaurs) ? saved.dinosaurs : null;
    } catch (e) {
        return null;
    }
}

// When the API cannot be reached, use the copy saved by the last successful read
async function getSavedDinos() {
    const snapshot = loadSnapshot();
    if (!snapshot) throw new Error("No saved copy yet");
    return snapshot;
}

// GET ALL DINOS
async function loadDinosaurs() {
    try {
        const response = await fetch(`${API_URL}/dinosaurs`, HEADERS);
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        saveSnapshot(data.dinosaurs);   // save a JSON copy of what the database returned
        displayDinosaurs(data.dinosaurs);
    } catch (error) {
        console.error(error);
        try {
            displayDinosaurs(await getSavedDinos());   // saved copy of the last API read
        } catch (e) {
            document.getElementById("dinosaurList").innerHTML = "Unable to connect to the API.";
        }
    }
}
 
// DISPLAY DINOS
function displayDinosaurs(dinosaurs) {
    const dinosaurList = document.getElementById("dinosaurList");
    
    dinosaurList.innerHTML = "";
 
    if (dinosaurs.length === 0) {
        dinosaurList.innerHTML = "<p>No dinosaurs found matching your search.</p>";
        return;
    }
 
    dinosaurs.forEach(dino => {
        const card = document.createElement("div");
        card.className = "dinosaur-card";
        card.innerHTML = `
            <div>
                <span class="dinosaur-period" data-period="${dino.period}">${dino.period}</span>
                <h3 class="dinosaur-name">${dino.name}</h3>
                <div class="scientific-name">${dino.scientific_name}</div>
                <p><strong>Diet:</strong> ${dino.diet}</p>
                <p><strong>Family:</strong> ${dino.family}</p>
                <p><strong>Type:</strong> ${dino.type}</p>
                <p><strong>Defense:</strong> ${dino.defence}</p>
            </div>
            <button onclick="viewDinosaur(${dino.id})">View Details</button>
        `;
        dinosaurList.appendChild(card);
    });
}
 
// GET ONE DINOS
async function viewDinosaur(id) {
    try {
        const response = await fetch(`${API_URL}/dinosaurs/${id}`, HEADERS);
        if (!response.ok) throw new Error("API error");
        const dino = await response.json();
        openDinoModal(dino);
    } catch (error) {
        console.error(error);
        try {
            const all = await getSavedDinos();           // saved copy of the last API read
            const dino = all.find(d => d.id === id);
            if (!dino) throw new Error("Not found");
            openDinoModal(dino);
        } catch (e) {
            alert("Unable to retrieve dinosaur.");
        }
    }
}
 
// Dino Modal
function openDinoModal(dino) {
    const content = document.getElementById("modalDinoContent");
 
    const fields = [
        { label: "Location", value: dino.location },
        { label: "Discovered By", value: dino.discovered },
        { label: "Life Span", value: dino.life_span },
        { label: "Habitat", value: dino.habitat },
        { label: "Weight", value: dino.weight },
        { label: "Height", value: dino.height },
        { label: "Extinction", value: dino.extinction }
    ];
 
    const factsHTML = fields
        .filter(f => f.value !== undefined && f.value !== null && f.value !== "")
        .map(f => `
            <div class="modal-fact">
                <span class="modal-fact-label">${f.label}</span>
                <span class="modal-fact-value">${f.value}</span>
            </div>
        `)
        .join("");
 
    content.innerHTML = `
        <span class="dinosaur-period" data-period="${dino.period}">${dino.period}</span>
        <h2 id="modalDinoName" class="modal-dino-name">${dino.name}</h2>
        <div class="scientific-name">${dino.scientific_name}</div>
 
        <div class="modal-summary">
            <p><strong>Diet:</strong> ${dino.diet}</p>
            <p><strong>Family:</strong> ${dino.family}</p>
            <p><strong>Type:</strong> ${dino.type}</p>
            <p><strong>Defense:</strong> ${dino.defence}</p>
        </div>
 
        <div class="modal-facts-grid">
            ${factsHTML}
        </div>
    `;
 
    document.getElementById("dinoModalOverlay").classList.add("open");
    document.body.classList.add("modal-open");
}
 
// Card Close
function closeDinoModal() {
    document.getElementById("dinoModalOverlay").classList.remove("open");
    document.body.classList.remove("modal-open");
}

function closeModalOnBackdrop(event) {
    if (event.target.id === "dinoModalOverlay") {
        closeDinoModal();
    }
}
 
// SEARCH
async function searchDinosaurs() {
    const query = document.getElementById("searchInput").value;
    if (!query) {
        loadDinosaurs();
        return;
    }
    try {
        const response =
            await fetch(`${API_URL}/dinosaurs/search?q=${encodeURIComponent(query)}`, HEADERS);
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        displayDinosaurs(data.results);
    } catch (error) {
        console.error(error);
        try {
            const all = await getSavedDinos();
            const q = query.toLowerCase();
            displayDinosaurs(all.filter(d =>
                [d.name, d.scientific_name, d.diet, d.family, d.type, d.period]
                    .some(v => v && String(v).toLowerCase().includes(q))
            ));
        } catch (e) {
            alert("Search failed.");
        }
    }
}

loadDinosaurs();

// service worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}