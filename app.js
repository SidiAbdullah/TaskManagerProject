/* =========================================================
         ✅ Task Manager (IndexedDB) — Beginner Friendly Comments
         =========================================================

         ✅ What this app does:
         1️⃣ Stores tasks in IndexedDB (browser database)
         2️⃣ Reads tasks on startup (so refresh does NOT lose data)
         3️⃣ Lets you: Add / Toggle Done / Delete / Clear All
         4️⃣ Lets you: Filter (All/Pending/Done) + Search
      */

/* =========================================================
         ✅ 1) DOM References (UI elements)
         ---------------------------------------------------------
         We store all important elements in one object (UI)
         so we can access them easily everywhere.
      ========================================================= */
const UI = {
  loading: document.getElementById("loading"), // spinner container
  error: document.getElementById("error"), // error message container
  toast: document.getElementById("toast"), // toast popup

  stats: document.getElementById("stats"), // stats text (Total/Pending/Done)
  shown: document.getElementById("shown"), // how many tasks are shown after filter/search

  filters: document.getElementById("filters"), // filters buttons container
  search: document.getElementById("search"), // search input

  title: document.getElementById("title"), // add form title input
  desc: document.getElementById("desc"), // add form description textarea
  btnAdd: document.getElementById("btnAdd"), // add task button
  btnReset: document.getElementById("btnReset"), // reset form button

  btnSeed: document.getElementById("btnSeed"), // seed demo tasks
  btnClearAll: document.getElementById("btnClearAll"), // clear all tasks

  list: document.getElementById("list"), // tasks container (cards go here)
};

/* =========================================================
         ✅ 2) App State
         ---------------------------------------------------------
         db            → the opened IndexedDB database instance
         tasks         → cached in-memory list of tasks (render reads from here)
         currentFilter → "all" | "pending" | "done"
      ========================================================= */
let db = null;
let tasks = [];
let currentFilter = "all";

/* =========================================================
         ✅ 3) UI Helpers
      ========================================================= */

// ✅ Toast: small popup message (success info, etc.)
function showToast(message) {
  UI.toast.textContent = message;
  UI.toast.style.display = "block";
  setTimeout(() => (UI.toast.style.display = "none"), 2200);
}

// ✅ Loading: show spinner and disable main actions to prevent double clicks
function setLoading(isLoading) {
  UI.loading.style.display = isLoading ? "flex" : "none";
  UI.btnAdd.disabled = isLoading;
  UI.btnSeed.disabled = isLoading;
  UI.btnClearAll.disabled = isLoading;
}

// ✅ Error: show a styled error box
function setError(message) {
  UI.error.textContent = message || "";
  UI.error.style.display = message ? "block" : "none";
}

// ✅ Escape text before putting it into innerHTML
// This prevents user text from being interpreted as real HTML.
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ✅ Convert timestamp into readable date/time
function formatDate(ms) {
  return new Date(ms).toLocaleString();
}

/* =========================================================
         ✅ 4) IndexedDB - Open DB + Upgrade
         ---------------------------------------------------------
         IndexedDB is event-based, so we wrap it in a Promise
         to use async/await cleanly.
      ========================================================= */
function openDB() {
  return new Promise((resolve, reject) => {
    // ✅ Open "TaskDB" version 1
    const request = indexedDB.open("TaskDB", 1);

    // ✅ onupgradeneeded runs only:
    // - first time creating the DB
    // - OR when you increase the version number
    request.onupgradeneeded = () => {
      const db = request.result;

      // ✅ Create store "tasks"
      // keyPath: "id" means each task has an "id"
      // autoIncrement: true means IDs generated automatically (1,2,3,...)
      const store = db.createObjectStore("tasks", {
        keyPath: "id",
        autoIncrement: true,
      });

      // ✅ Indexes (optional but useful for searching/sorting later)
      store.createIndex("status", "status", { unique: false });
      store.createIndex("createdAt", "createdAt", { unique: false });
    };

    // ✅ Success: return the opened DB
    request.onsuccess = () => resolve(request.result);

    // ✅ Failure: return the error
    request.onerror = () =>
      reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

/* =========================================================
         ✅ 5) IndexedDB Helpers
      ========================================================= */

// ✅ Create transaction then return store
// mode: "readonly" OR "readwrite"
function tx(storeName, mode = "readonly") {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// ✅ Convert IDBRequest (event-based) into Promise (awaitable)
function idbRequestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB request failed"));
  });
}

/* =========================================================
         ✅ 6) CRUD (Create / Read / Update / Delete)
      ========================================================= */

// ✅ READ: fetch all tasks
async function readAllTasks() {
  const store = tx("tasks", "readonly");
  const all = await idbRequestToPromise(store.getAll());

  // ✅ Sort newest tasks first
  all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return all;
}

// ✅ CREATE: add task
async function createTask({ title, description }) {
  const now = Date.now();

  // ✅ Create the object we store in IndexedDB
  const task = {
    title,
    description,
    status: "pending", // new tasks start as pending
    createdAt: now,
    updatedAt: now,
  };

  const store = tx("tasks", "readwrite");

  // ✅ add() stores and returns generated id
  const id = await idbRequestToPromise(store.add(task));

  // ✅ Return task + id (so UI can use it immediately)
  return { ...task, id };
}

// ✅ UPDATE: patch task by id
async function updateTask(id, patch) {
  const store = tx("tasks", "readwrite");

  // 1️⃣ Read existing task
  const existing = await idbRequestToPromise(store.get(id));
  if (!existing) throw new Error("Task not found");

  // 2️⃣ Merge existing data + patch
  const updated = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  // 3️⃣ Save back to DB
  await idbRequestToPromise(store.put(updated));
  return updated;
}

// ✅ DELETE: remove task by id
async function deleteTask(id) {
  const store = tx("tasks", "readwrite");
  await idbRequestToPromise(store.delete(id));
}

// ✅ Clear store completely
async function clearAllTasks() {
  const store = tx("tasks", "readwrite");
  await idbRequestToPromise(store.clear());
}

/* =========================================================
         ✅ 7) Input Validation
      ========================================================= */
function validateInput() {
  const title = UI.title.value.trim();
  const description = UI.desc.value.trim();

  if (!title) return { ok: false, message: "❌ Title is required" };
  if (title.length < 3)
    return {
      ok: false,
      message: "❌ Title must be at least 3 characters",
    };
  if (description.length > 300)
    return {
      ok: false,
      message: "❌ Description must be 300 characters or less",
    };

  return { ok: true, title, description };
}

/* =========================================================
         ✅ 8) Filtering + Searching
         ---------------------------------------------------------
         currentFilter controls status filter
         search text checks title/description
      ========================================================= */
function getVisibleTasks() {
  const q = UI.search.value.trim().toLowerCase();

  return tasks.filter((t) => {
    // ✅ Filter: All vs Pending vs Done
    const matchesFilter =
      currentFilter === "all" ? true : t.status === currentFilter;

    // ✅ Search: if search is empty, everything matches
    const matchesSearch = !q
      ? true
      : (t.title || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q);

    // ✅ Keep the task only if it matches both conditions
    return matchesFilter && matchesSearch;
  });
}

/* =========================================================
         ✅ 9) Render UI (Tasks → HTML)
      ========================================================= */
function render() {
  const visible = getVisibleTasks();

  // ✅ Stats
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const done = tasks.filter((t) => t.status === "done").length;

  UI.stats.textContent = `Total: ${total.toLocaleString()} • Pending: ${pending.toLocaleString()} • Done: ${done.toLocaleString()}`;
  UI.shown.textContent = `${visible.length.toLocaleString()} shown`;

  // ✅ Empty state
  if (visible.length === 0) {
    UI.list.innerHTML = `<div class="empty muted">No tasks match your filter/search.</div>`;
    return;
  }

  // ✅ Build task cards
  UI.list.innerHTML = visible
    .map((t) => {
      const isDone = t.status === "done";

      const badge = isDone ? "Done" : "Pending";
      const toggleLabel = isDone ? "Mark Pending ↩️" : "Mark Done ✅";
      const statusClass = isDone ? "done" : "pending";

      return `
              <div class="task ${statusClass}" data-id="${t.id}">
                <div>
                  <h3>${esc(t.title)}</h3>
                  <p>${esc(t.description || "—")}</p>

                  <div class="meta">
                    <span class="pill">#${t.id}</span>
                    <span class="pill">${badge}</span>
                    <span class="pill">Created: ${esc(
                      formatDate(t.createdAt),
                    )}</span>
                  </div>
                </div>

                <div class="actions">
                  <button class="secondary" data-action="toggle">${toggleLabel}</button>
                  <button class="danger" data-action="delete">Delete 🗑️</button>
                </div>
              </div>
            `;
    })
    .join("");
}

/* =========================================================
         ✅ 10) Actions (Add / Toggle / Delete / Seed / Clear All)
      ========================================================= */

// ✅ Add task
async function handleAdd() {
  setError("");

  const v = validateInput();
  if (!v.ok) return setError(v.message);

  // ✅ block double click
  UI.btnAdd.disabled = true;

  try {
    const created = await createTask({
      title: v.title,
      description: v.description,
    });

    // ✅ Put newest task at top
    tasks.unshift(created);

    // ✅ Clear form
    UI.title.value = "";
    UI.desc.value = "";

    render();
    showToast("✅ Task added");
  } catch (e) {
    setError(`❌ Add failed: ${e.message}`);
  } finally {
    UI.btnAdd.disabled = false;
  }
}

// ✅ Toggle done/pending
async function handleToggle(id) {
  setError("");

  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;

  // ✅ Backup for revert if DB fails
  const old = { ...tasks[idx] };

  // ✅ New status
  const newStatus = old.status === "done" ? "pending" : "done";

  // ✅ Optimistic UI update (fast feeling)
  tasks[idx] = {
    ...tasks[idx],
    status: newStatus,
    updatedAt: Date.now(),
  };
  render();

  try {
    await updateTask(id, { status: newStatus });
    showToast(
      newStatus === "done" ? "✅ Marked as done" : "✅ Marked as pending",
    );
  } catch (e) {
    // ✅ Revert if failed
    tasks[idx] = old;
    render();

    setError(`❌ Update failed: ${e.message}`);
    showToast("❌ Update failed (reverted)");
  }
}

// ✅ Delete task
async function handleDelete(id) {
  setError("");

  const t = tasks.find((x) => x.id === id);
  if (!t) return;

  // ✅ confirm is safer than instant delete
  if (!confirm(`Delete this task?\n\n"${t.title}"`)) return;

  // ✅ Optimistic remove (feels instant)
  const backup = [...tasks];
  tasks = tasks.filter((x) => x.id !== id);
  render();

  try {
    await deleteTask(id);
    showToast("✅ Task deleted");
  } catch (e) {
    // ✅ revert if DB fails
    tasks = backup;
    render();

    setError(`❌ Delete failed: ${e.message}`);
    showToast("❌ Delete failed (reverted)");
  }
}

// ✅ Seed demo tasks
async function handleSeed() {
  setError("");

  const samples = [
    {
      title: "Record lesson: Event Delegation",
      description: "Add examples with bubbling and delegation.",
    },
    {
      title: "Build IndexedDB Task Project",
      description: "CRUD + search + filters + modern cards.",
    },
    {
      title: "Prepare quiz questions",
      description: "Mix MCQ and true/false for DOM lessons.",
    },
  ];

  UI.btnSeed.disabled = true;

  try {
    for (const s of samples) {
      const created = await createTask({
        title: s.title,
        description: s.description,
      });
      tasks.unshift(created);
    }

    render();
    showToast("✅ Seeded sample tasks");
  } catch (e) {
    setError(`❌ Seed failed: ${e.message}`);
  } finally {
    UI.btnSeed.disabled = false;
  }
}

// ✅ Clear all tasks
async function handleClearAll() {
  setError("");

  if (!confirm("Clear ALL tasks?\n\nThis cannot be undone.")) return;

  UI.btnClearAll.disabled = true;

  try {
    await clearAllTasks();
    tasks = [];
    render();
    showToast("✅ All tasks cleared");
  } catch (e) {
    setError(`❌ Clear failed: ${e.message}`);
  } finally {
    UI.btnClearAll.disabled = false;
  }
}

// ✅ Reset form (does not touch DB)
function resetForm() {
  UI.title.value = "";
  UI.desc.value = "";
  setError("");
}

/* =========================================================
         ✅ 11) Event Delegation (Task Buttons)
         ---------------------------------------------------------
         Instead of adding listeners to each card button,
         we add ONE listener to the list container.
      ========================================================= */
UI.list.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  const card = event.target.closest(".task");
  if (!card) return;

  const id = Number(card.dataset.id);
  const action = btn.dataset.action;

  if (action === "toggle") handleToggle(id);
  if (action === "delete") handleDelete(id);
});

/* =========================================================
         ✅ 12) Filters (All / Pending / Done)
      ========================================================= */
UI.filters.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  currentFilter = btn.dataset.filter;

  // ✅ Update active class
  [...UI.filters.querySelectorAll("button")].forEach((b) =>
    b.classList.remove("active"),
  );
  btn.classList.add("active");

  render();
});

// ✅ Search (re-render on each keystroke)
UI.search.addEventListener("input", render);

// ✅ Buttons
UI.btnAdd.addEventListener("click", handleAdd);
UI.btnReset.addEventListener("click", resetForm);
UI.btnSeed.addEventListener("click", handleSeed);
UI.btnClearAll.addEventListener("click", handleClearAll);

// ✅ Keyboard shortcut: Ctrl + Enter to add task quickly
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") handleAdd();
});

/* =========================================================
         ✅ 13) Boot (Start app)
         ---------------------------------------------------------
         1️⃣ Open DB
         2️⃣ Read tasks
         3️⃣ Render UI
      ========================================================= */
(async function boot() {
  setLoading(true);
  setError("");

  try {
    db = await openDB(); // open IndexedDB
    tasks = await readAllTasks(); // load stored tasks
    render(); // show on screen
  } catch (e) {
    setError(`❌ Failed to initialize app: ${e.message}`);
  } finally {
    setLoading(false);
  }
})();
