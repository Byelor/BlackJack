/**
 * game.js — клиентский Socket.IO скрипт для страницы комнаты BlackJack.
 * Подключается к серверу, обрабатывает все игровые события.
 *
 * Использование: передать roomId в data-атрибуте тега <body>:
 *   <body data-room-id="<roomId>">
 */

const socket = io({ transports: ["websocket"] });
const roomId = document.body.dataset.roomId;

// ─── Состояние на клиенте ─────────────────────────────────────────────────────

let myUserId    = window.__MY_USER_ID__ ?? null;  // задаётся из HBS-шаблона
let currentTurn = null; // userId чей сейчас ход

// ─── Инициализация ────────────────────────────────────────────────────────────

socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
    socket.emit("ROOM_JOIN", { roomId });
});

socket.on("disconnect", () => {
    console.log("[socket] disconnected");
    showNotification("Соединение потеряно", "error");
});

// ─── Серверные события ───────────────────────────────────────────────────────

/** Полное состояние комнаты (при входе или GET_ROOM_STATE) */
socket.on("ROOM_STATE", (data) => {
    console.log("[ROOM_STATE]", data);
    renderFullState(data);
});

/** Игра началась — раздача карт */
socket.on("GAME_STARTED", (data) => {
    console.log("[GAME_STARTED]", data);
    showNotification("Игра началась!", "success");
    renderFullState(data);
    updateControls(data.currentPlayerId);
});

/** Игрок совершил действие */
socket.on("PLAYER_ACTION", (data) => {
    console.log("[PLAYER_ACTION]", data);
    renderPlayerHands(data.userId, data.hands, data.currentHandIndex);
});

/** Ход перешёл к другому игроку */
socket.on("TURN_CHANGED", ({ userId }) => {
    console.log("[TURN_CHANGED] userId:", userId);
    currentTurn = userId;
    updateControls(userId);
    highlightCurrentPlayer(userId);
});

/** Дилер тянет карты */
socket.on("DEALER_PLAY", ({ cards, score }) => {
    console.log("[DEALER_PLAY]", cards, score);
    renderDealer(cards, score, true);
    showNotification(`Дилер: ${score} очков`, "info");
});

/** Итоги раунда */
socket.on("ROUND_RESULT", (data) => {
    console.log("[ROUND_RESULT]", data);
    renderDealer(data.dealer.cards, data.dealer.score, true);
    renderRoundResults(data.results);
    setControlsDisabled(true);
});

/** Начало фазы ставок */
socket.on("BETTING_PHASE", ({ deckShuffled }) => {
    console.log("[BETTING_PHASE]");
    if (deckShuffled) showNotification("Колода перетасована!", "info");
    showBettingUI();
});

/** Колода перетасована */
socket.on("DECK_SHUFFLED", ({ remainingCards }) => {
    showNotification(`🔀 Колода перетасована (${remainingCards} карт)`, "info");
});

/** Игрок вошёл в лобби */
socket.on("PLAYER_JOINED", ({ userId, name }) => {
    showNotification(`${name} подключился`, "info");
    addPlayerToList(userId, name);
});

/** Игрок покинул комнату */
socket.on("PLAYER_LEFT", ({ userId }) => {
    showNotification(`Игрок #${userId} покинул комнату`, "warning");
    removePlayerFromList(userId);
});

/** Сообщение в чат */
socket.on("CHAT_MESSAGE", ({ userId, name, text }) => {
    appendChatMessage(name, text, userId === myUserId);
});

/** Сессия истекла */
socket.on("SESSION_INVALID", () => {
    alert("Сессия истекла. Вы будете перенаправлены на страницу входа.");
    window.location.href = "/authorization";
});

/** Принудительное отключение */
socket.on("FORCE_DISCONNECT", ({ reason }) => {
    alert(reason);
    window.location.href = "/authorization";
});

/** Ошибка */
socket.on("ERROR", ({ code, message }) => {
    console.error("[ERROR]", code, message);
    showNotification(message, "error");
});

/** Ставка принята */
socket.on("BET_CONFIRMED", ({ balance }) => {
    showNotification(`Ставка принята! Баланс: ${balance}`, "success");
    updateBalance(balance);
    hideBettingUI();
    showNotification("Ожидание других игроков...", "info");
});

// ─── Действия игрока ─────────────────────────────────────────────────────────

document.getElementById("btn-hit")?.addEventListener("click", () => {
    socket.emit("HIT", { roomId });
});

document.getElementById("btn-stand")?.addEventListener("click", () => {
    socket.emit("STAND", { roomId });
});

document.getElementById("btn-double")?.addEventListener("click", () => {
    socket.emit("DOUBLE", { roomId });
});

document.getElementById("btn-split")?.addEventListener("click", () => {
    socket.emit("SPLIT", { roomId });
});

document.getElementById("btn-surrender")?.addEventListener("click", () => {
    if (confirm("Вы уверены, что хотите сдаться? Вернётся 50% ставки.")) {
        socket.emit("SURRENDER", { roomId });
    }
});

document.getElementById("btn-bet")?.addEventListener("click", () => {
    const input  = document.getElementById("bet-input");
    const amount = Number(input?.value ?? 0);
    if (amount <= 0) { showNotification("Введите корректную ставку", "error"); return; }
    socket.emit("PLACE_BET", { roomId, amount });
});

// Чипы быстрой ставки
document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        const input = document.getElementById("bet-input");
        if (input) input.value = chip.dataset.value;
    });
});

document.getElementById("btn-send-msg")?.addEventListener("click", sendChatMessage);
document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
});

function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const text  = input?.value?.trim();
    if (!text) return;
    socket.emit("CHAT_MESSAGE", { roomId, text });
    input.value = "";
}

document.getElementById("btn-refresh")?.addEventListener("click", () => {
    socket.emit("GET_ROOM_STATE", { roomId });
});

// ─── Render-функции ───────────────────────────────────────────────────────────

function renderFullState(state) {
    currentTurn = state.currentPlayerId;

    renderDealer(state.dealer.cards, state.dealer.score, state.status === "BETTING");
    renderAllPlayers(state.players);
    updateDeckCount(state.deckRemaining);

    if (state.status === "BETTING") {
        showBettingUI();
        setControlsDisabled(true);
    } else {
        hideBettingUI();
        updateControls(state.currentPlayerId);
    }
}

function renderDealer(cards, score, reveal) {
    const el = document.getElementById("dealer-cards");
    if (!el) return;
    el.innerHTML = cards.map(c => `<div class="card">${reveal ? formatCard(c) : (c === "??" ? "🂠" : formatCard(c))}</div>`).join("");
    const scoreEl = document.getElementById("dealer-score");
    if (scoreEl) scoreEl.textContent = reveal && score > 0 ? `Дилер: ${score}` : "";
}

function renderAllPlayers(players) {
    const container = document.getElementById("players-container");
    if (!container) return;
    container.innerHTML = "";
    players.forEach(p => {
        const div = document.createElement("div");
        div.className = "player-slot";
        div.id        = `player-${p.userId}`;
        div.innerHTML = `
            <div class="player-name">${escapeHtml(p.name)} <span class="player-balance">${p.balance}$</span></div>
            <div class="player-hands" id="hands-${p.userId}"></div>
        `;
        container.appendChild(div);
        renderPlayerHands(p.userId, p.hands, p.currentHandIndex);
    });
}

function renderPlayerHands(userId, hands, currentHandIndex) {
    const container = document.getElementById(`hands-${userId}`);
    if (!container) return;
    container.innerHTML = hands.map((hand, i) => `
        <div class="hand ${i === currentHandIndex ? "hand--active" : ""} hand--${hand.status.toLowerCase()}">
            <div class="hand-cards">${hand.cards.map(c => `<span class="card">${formatCard(c)}</span>`).join("")}</div>
            <div class="hand-info">
                ${hand.score} очков · ${hand.bet}$ · <span class="hand-status">${hand.status}</span>
            </div>
        </div>
    `).join("");
}

function renderRoundResults(results) {
    const modal = document.getElementById("result-modal");
    const body  = document.getElementById("result-body");
    if (!modal || !body) return;
    body.innerHTML = results.map(r => `
        <div class="result-row result-row--${r.result}">
            <span>${escapeHtml(r.name)}</span>
            <span>${r.result === "blackjack" ? "🃏 Блекджек!" : r.result === "win" ? "✅ Победа" : r.result === "push" ? "🤝 Ничья" : "❌ Поражение"}</span>
            <span>${(r.netProfit ?? 0) > 0 ? "+" : ""}${r.netProfit ?? 0}$</span>
            <span>Баланс: ${r.newBalance}$</span>
        </div>
    `).join("");
    modal.style.display = "flex";
    setTimeout(() => { modal.style.display = "none"; }, 6000);
}

function updateControls(currentPlayerId) {
    const isMyTurn = currentPlayerId === myUserId;
    ["btn-hit","btn-stand","btn-double","btn-split","btn-surrender"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !isMyTurn;
    });
}

function setControlsDisabled(disabled) {
    ["btn-hit","btn-stand","btn-double","btn-split","btn-surrender"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = disabled;
    });
}

function highlightCurrentPlayer(userId) {
    document.querySelectorAll(".player-slot").forEach(el => el.classList.remove("player-slot--active"));
    document.getElementById(`player-${userId}`)?.classList.add("player-slot--active");
}

function showBettingUI()  { document.getElementById("betting-panel")?.classList.remove("hidden"); }
function hideBettingUI()  { document.getElementById("betting-panel")?.classList.add("hidden"); }

function updateBalance(balance) {
    const el = document.getElementById("my-balance");
    if (el) el.textContent = `${balance}$`;
}

function updateDeckCount(remaining) {
    const el = document.getElementById("deck-remaining");
    if (el) el.textContent = `Колода: ${remaining} карт`;
}

function addPlayerToList(userId, name) {
    const container = document.getElementById("players-container");
    if (!container || document.getElementById(`player-${userId}`)) return;
    const div = document.createElement("div");
    div.className = "player-slot";
    div.id = `player-${userId}`;
    div.innerHTML = `<div class="player-name">${escapeHtml(name)}</div><div class="player-hands" id="hands-${userId}"></div>`;
    container.appendChild(div);
}

function removePlayerFromList(userId) {
    document.getElementById(`player-${userId}`)?.remove();
}

function appendChatMessage(name, text, isMine) {
    const container = document.getElementById("chat-messages");
    if (!container) return;
    const div = document.createElement("div");
    div.className = `chat-msg ${isMine ? "chat-msg--mine" : ""}`;
    div.innerHTML = `<b>${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showNotification(message, type = "info") {
    const el = document.getElementById("notification");
    if (!el) return;
    el.textContent  = message;
    el.className    = `notification notification--${type} notification--visible`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("notification--visible"), 3500);
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Компактная карта "AH" → "A♥" */
function formatCard(card) {
    if (card === "??") return "🂠";
    const suitMap = { H: "♥", D: "♦", C: "♣", S: "♠" };
    const rank = card[0] === "T" ? "10" : card[0];
    const suit = suitMap[card[1]] ?? card[1];
    return `${rank}${suit}`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
