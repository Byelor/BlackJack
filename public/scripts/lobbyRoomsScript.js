const updateBtn = document.getElementById("update");
const roomsList = document.getElementById("rooms-list");
const roomsEmpty = document.getElementById("rooms-empty");
const createForm = document.getElementById("create-room-form");
const createError = document.getElementById("create-room-error");
const createBtn = document.getElementById("create-room-btn");
const isPrivateCheckbox = document.getElementById("is-private");
const passwordField = document.getElementById("password-field");

function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
}

function hideError(el) {
    el.textContent = "";
    el.classList.add("hidden");
}

function togglePasswordField() {
    const isPrivate = isPrivateCheckbox?.checked ?? false;
    passwordField?.classList.toggle("hidden", !isPrivate);
    const passwordInput = passwordField?.querySelector('input[name="password"]');
    if (passwordInput) passwordInput.required = isPrivate;
}

isPrivateCheckbox?.addEventListener("change", togglePasswordField);
togglePasswordField();

async function joinRoom(roomObj) {
    let password = null;
    if (roomObj.isPrivate) {
        password = prompt("Введите пароль комнаты:");
        if (!password) return;
    }

    const response = await fetch(`/api/lobby/room/${roomObj.roomId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        alert("Не удалось войти в комнату");
        return;
    }

    const data = await response.json();
    if (data?.message !== "all good") {
        alert(data?.message ?? "Не удалось войти в комнату");
        return;
    }

    window.location.href = `/lobby/room/${roomObj.roomId}`;
}

function makeRoom(roomObj) {
    const roomEl = document.createElement("li");
    roomEl.className = "room-card";
    roomEl.innerHTML = `
        <p class="room-card__name">${escapeHtml(roomObj.name)}</p>
        ${roomObj.description ? `<p class="room-card__meta">${escapeHtml(roomObj.description)}</p>` : ""}
        <p class="room-card__meta">
            Игроков: ${roomObj.currentPlayersCount} / ${roomObj.maxPlayersCount}
            · Колод: ${roomObj.deckCount ?? 6}
        </p>
        ${roomObj.isPrivate ? '<span class="room-card__private">Приватная</span>' : ""}
    `;
    roomEl.addEventListener("click", () => joinRoom(roomObj));
    return roomEl;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

async function showRooms() {
    const response = await fetch("/api/lobby/rooms", {
        method: "GET",
        headers: { "content-type": "application/json" },
    });

    if (!response.ok) {
        console.error("server error!");
        return;
    }

    const data = await response.json();
    const rooms = Array.isArray(data) ? data : [];

    if (rooms.length === 0) {
        roomsList.replaceChildren();
        roomsEmpty?.classList.remove("hidden");
        return;
    }

    roomsEmpty?.classList.add("hidden");
    roomsList.replaceChildren(...rooms.map(makeRoom));
}

createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(createError);
    createBtn.disabled = true;

    const formData = new FormData(createForm);
    const isPrivate = formData.get("isPrivate") === "on";

    const payload = {
        name: formData.get("name"),
        description: formData.get("description") || "",
        maxPlayersCount: Number(formData.get("maxPlayersCount")),
        deckCount: Number(formData.get("deckCount")),
        isPrivate,
        password: isPrivate ? formData.get("password") : null,
    };

    try {
        const response = await fetch("/api/lobby/rooms", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data?.message !== "all good" || !data?.roomId) {
            showError(createError, data?.message ?? "Не удалось создать комнату");
            return;
        }

        window.location.href = `/lobby/room/${data.roomId}`;
    } catch {
        showError(createError, "Ошибка сети");
    } finally {
        createBtn.disabled = false;
    }
});

updateBtn?.addEventListener("click", showRooms);
showRooms();
