const API_URL = "https://nave-dinobase-api-9a4p.vercel.app/api/v1";
const TOKEN_STORE = "bonebedAdminToken";  

const PERIODS = ["Cambrian", "Ordovician", "Silurian", "Devonian", "Carboniferous", "Permian", "Triassic", "Jurassic", "Cretaceous", "Paleogene", "Neogene", "Quaternary"];
const DIETS = ["Carnivore", "Herbivore", "Omnivore", "Piscivore", "Insectivore", "Filter Feeder"];
const HABITATS = ["Terrestrial", "Amphibious", "Aquatic", "Aerial", "Fossorial", "Arboreal"];

const FIELDS = [
    { key: "name", label: "Name", max: 100 },
    { key: "scientific_name", label: "Scientific name", max: 150 },
    { key: "period", label: "Period", options: PERIODS },
    { key: "diet", label: "Diet", options: DIETS },
    { key: "family", label: "Family", max: 100 },
    { key: "type", label: "Type", max: 50 },
    { key: "defence", label: "Defence", max: 255 },
    { key: "location", label: "Location", max: 150 },
    { key: "discovered", label: "Discovered by", max: 150 },
    { key: "life_span", label: "Life span", max: 50 },
    { key: "habitat", label: "Habitat", options: HABITATS },
    { key: "weight", label: "Weight", max: 50 },
    { key: "height", label: "Height", max: 50 },
    { key: "extinction", label: "Extinction", max: 255 }
];

let dinosaurs = [];
let editingId = null;   

const $ = id => document.getElementById(id);

// STATUS MESSAGES
function showStatus(message, type) {
    const box = $("status");
    box.textContent = message;
    box.className = "status " + (message ? type : "");
}

// BUSY STATE FOR BUTTONS
function setBusy(button, busy, busyText) {
    if (busy) {
        button.dataset.label = button.textContent;
        button.textContent = busyText;
    } else if (button.dataset.label) {
        button.textContent = button.dataset.label;
    }
    button.disabled = busy;
}

// API HELPER
function getToken() {
    return sessionStorage.getItem(TOKEN_STORE) || "";
}

function describeError(body, status) {
    if (Array.isArray(body.detail)) {
        return body.detail.map(d => `${d.loc.slice(1).join(".")}: ${d.msg}`).join("; ");
    }
    return body.detail || `Request failed (${status}).`;
}

async function api(path, options = {}) {
    const headers = { "x-admin-token": getToken() };
    if (options.body) headers["Content-Type"] = "application/json";

    const res = await fetch(API_URL + path, { ...options, headers });

    if (res.status === 401) {
        logout("Your session ended. Please log in again.");
        throw new Error("Unauthorized");
    }
    if (res.status === 204) return null;

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(describeError(body, res.status));
    return body;
}

// LOGIN / LOGOUT
async function login(event) {
    event.preventDefault();
    const password = $("keyInput").value;
    const button = $("loginBtn");
    setBusy(button, true, "Logging in...");

    try {
        // the API checks the password and sends back a session token
        const res = await fetch(`${API_URL}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            showStatus(res.status === 401 ? "Incorrect password." : "Login failed. Try again later.", "error");
            $("keyInput").select();
            return;
        }
        const data = await res.json();
        sessionStorage.setItem(TOKEN_STORE, data.token);
        $("keyInput").value = "";
        showStatus("", "");
        showPanel(true);
        loadDinosaurs();
    } catch (error) {
        showStatus("Could not reach the API. Try again later.", "error");
    } finally {
        setBusy(button, false);
    }
}

function logout(message) {
    sessionStorage.removeItem(TOKEN_STORE);
    dinosaurs = [];
    $("rows").innerHTML = "";
    $("searchInput").value = "";
    if ($("formDialog").open) $("formDialog").close();
    showPanel(false);
    showStatus(typeof message === "string" ? message : "", "error");
}

function showPanel(loggedIn) {
    $("loginPanel").hidden = loggedIn;
    $("adminPanel").hidden = !loggedIn;
    $("logoutBtn").hidden = !loggedIn;
    if (!loggedIn) $("keyInput").focus();
}

function togglePassword() {
    const input = $("keyInput");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("togglePw").textContent = show ? "Hide" : "Show";
    $("togglePw").setAttribute("aria-pressed", String(show));
    $("togglePw").setAttribute("aria-label", show ? "Hide password" : "Show password");
}

// READ
async function loadDinosaurs() {
    try {
        const data = await api("/dinosaurs");
        dinosaurs = data.dinosaurs;
        render(`${data.count} record${data.count === 1 ? "" : "s"}`);
    } catch (error) {
        if (error.message !== "Unauthorized") showStatus(error.message, "error");
    }
}

async function searchDinosaurs() {
    const q = $("searchInput").value.trim();
    if (!q) return loadDinosaurs();
    try {
        const data = await api(`/dinosaurs/search?q=${encodeURIComponent(q)}`);
        dinosaurs = data.results;
        render(`${data.count} result${data.count === 1 ? "" : "s"} for "${q}"`);
    } catch (error) {
        if (error.message !== "Unauthorized") showStatus(error.message, "error");
    }
}

function makeCell(label, content) {
    const td = document.createElement("td");
    td.dataset.label = label;
    if (content instanceof Node) td.appendChild(content);
    else td.textContent = content;
    return td;
}

function makePill(value) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.dataset.tone = String(value).toLowerCase().replace(/\s+/g, "-");
    pill.textContent = value;
    return pill;
}

function render(countText) {
    $("count").textContent = countText;
    const rows = $("rows");
    rows.innerHTML = "";

    if (dinosaurs.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.className = "empty";
        td.textContent = "No records found. Try a different search or add a dinosaur.";
        tr.appendChild(td);
        rows.appendChild(tr);
        return;
    }

    for (const dino of dinosaurs) {
        const tr = document.createElement("tr");

        tr.appendChild(makeCell("ID", dino.id));
        const nameCell = makeCell("Name", dino.name);
        nameCell.classList.add("name-cell");
        tr.appendChild(nameCell);
        tr.appendChild(makeCell("Period", makePill(dino.period)));
        tr.appendChild(makeCell("Diet", makePill(dino.diet)));
        tr.appendChild(makeCell("Habitat", makePill(dino.habitat)));

        const actions = document.createElement("td");
        actions.className = "actions-cell";

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.setAttribute("aria-label", `Edit ${dino.name}`);
        editBtn.addEventListener("click", () => openForm(dino));

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "danger";
        deleteBtn.setAttribute("aria-label", `Delete ${dino.name}`);
        deleteBtn.addEventListener("click", () => deleteDinosaur(dino));

        actions.append(editBtn, deleteBtn);
        tr.appendChild(actions);
        rows.appendChild(tr);
    }
}

// ADD / EDIT FORM
function buildForm() {
    const container = $("fields");
    for (const field of FIELDS) {
        const label = document.createElement("label");
        label.htmlFor = "f_" + field.key;
        label.textContent = field.label;

        let input;
        if (field.options) {
            input = document.createElement("select");
            for (const option of field.options) {
                input.add(new Option(option, option));
            }
        } else {
            input = document.createElement("input");
            input.type = "text";
            input.maxLength = field.max;
        }
        input.id = "f_" + field.key;
        input.required = true;

        const wrap = document.createElement("div");
        wrap.append(label, input);
        container.appendChild(wrap);
    }
}

function openForm(dino) {
    editingId = dino ? dino.id : null;
    $("formTitle").textContent = dino ? `Edit ${dino.name} (ID ${dino.id})` : "Add dinosaur";
    $("saveBtn").textContent = dino ? "Save changes" : "Add dinosaur";
    for (const field of FIELDS) {
        $("f_" + field.key).value = dino ? dino[field.key] : (field.options ? field.options[0] : "");
    }
    $("formDialog").showModal();
}

// CREATE and UPDATE
async function saveRecord(event) {
    event.preventDefault();
    const values = {};
    for (const field of FIELDS) {
        values[field.key] = $("f_" + field.key).value.trim();
    }

    const button = $("saveBtn");
    setBusy(button, true, "Saving...");

    try {
        if (editingId === null) {
            const created = await api("/dinosaurs", { method: "POST", body: JSON.stringify(values) });
            showStatus(`Created ${created.name} (ID ${created.id}).`, "ok");
        } else {
            // PATCH sends only the fields that changed
            const original = dinosaurs.find(d => d.id === editingId);
            const changes = {};
            for (const field of FIELDS) {
                if (values[field.key] !== original[field.key]) changes[field.key] = values[field.key];
            }
            if (Object.keys(changes).length === 0) {
                $("formDialog").close();
                showStatus("No changes to save.", "ok");
                return;
            }
            const updated = await api(`/dinosaurs/${editingId}`, { method: "PATCH", body: JSON.stringify(changes) });
            showStatus(`Updated ${updated.name} (ID ${updated.id}).`, "ok");
        }
        $("formDialog").close();
        searchDinosaurs();
    } catch (error) {
        if (error.message !== "Unauthorized") showStatus(error.message, "error");
        $("formDialog").close();
    } finally {
        setBusy(button, false);
    }
}

// DELETE
async function deleteDinosaur(dino) {
    if (!confirm(`Delete ${dino.name} (ID ${dino.id})? This cannot be undone.`)) return;
    try {
        await api(`/dinosaurs/${dino.id}`, { method: "DELETE" });
        showStatus(`Deleted ${dino.name}.`, "ok");
        searchDinosaurs();
    } catch (error) {
        if (error.message !== "Unauthorized") showStatus(error.message, "error");
    }
}

// START
buildForm();
$("loginForm").addEventListener("submit", login);
$("togglePw").addEventListener("click", togglePassword);
$("logoutBtn").addEventListener("click", () => logout(""));
$("searchBtn").addEventListener("click", searchDinosaurs);
$("showAllBtn").addEventListener("click", () => { $("searchInput").value = ""; loadDinosaurs(); });
$("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") searchDinosaurs(); });
$("addBtn").addEventListener("click", () => openForm(null));
$("cancelBtn").addEventListener("click", () => $("formDialog").close());
$("recordForm").addEventListener("submit", saveRecord);

// CLICK OUTSIDE TO CLOSE
$("formDialog").addEventListener("click", e => {
    const box = $("formDialog").getBoundingClientRect();
    const outside = e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
    if (outside) $("formDialog").close();
});

if (getToken()) {
    showPanel(true);
    loadDinosaurs();
}
