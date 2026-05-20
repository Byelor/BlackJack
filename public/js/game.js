
const socket = io({ transports: ["websocket"] });


const myUserId    = Number(window.__MY_USER_ID__) || null;
let currentTurn = null;
let myBalance   = null;
let lastRoomState = null;

function getRoomId() {
    return document.body?.dataset?.roomId || null;
}

function emitGameEvent(event, payload = {}) {
    const roomId = getRoomId();
    if (!roomId) {
        showNotification("Комната не определена", "error");
        return false;
    }
    if (!socket.connected) {
        showNotification("Нет соединения с сервером", "error");
        return false;
    }
    socket.emit(event, { roomId, ...payload });
    return true;
}


socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
    const roomId = getRoomId();
    if (roomId) socket.emit("ROOM_JOIN", { roomId });
});

socket.on("disconnect", () => {
    console.log("[socket] disconnected");
    showNotification("Соединение потеряно", "error");
});


socket.on("ROOM_STATE", (data) => {
    console.log("[ROOM_STATE]", data);
    lastRoomState = data;
    renderFullState(data);
});

socket.on("GAME_STARTED", (data) => {
    console.log("[GAME_STARTED]", data);
    showNotification("Игра началась!", "success");
    renderFullState(data);
    updateControls(data.currentPlayerId);
});

socket.on("PLAYER_ACTION", (data) => {
    console.log("[PLAYER_ACTION]", data);
    renderPlayerHands(data.userId, data.hands, data.currentHandIndex);
    if (data.balance != null) {
        setPlayerBalance(data.userId, data.balance);
    }
    if (isMe(data.userId) && lastRoomState) {
        const me = lastRoomState.players.find(p => isMe(p.userId));
        if (me) {
            me.hands = data.hands;
            me.currentHandIndex = data.currentHandIndex;
            updateActionButtons(lastRoomState);
        }
    }
});

socket.on("TURN_CHANGED", ({ userId, currentHandIndex }) => {
    console.log("[TURN_CHANGED] userId:", userId, "currentHandIndex:", currentHandIndex);
    currentTurn = userId;
    if (lastRoomState) {
        lastRoomState.currentPlayerId = userId;
        if (currentHandIndex != null) {
            const player = lastRoomState.players.find(p => p.userId === userId);
            if (player) {
                player.currentHandIndex = currentHandIndex;
                renderPlayerHands(userId, player.hands, currentHandIndex);
            }
        }
        updateActionButtons(lastRoomState);
    }
    highlightCurrentPlayer(userId);
});

socket.on("DEALER_PLAY", ({ cards, score }) => {
    console.log("[DEALER_PLAY]", cards, score);
    renderDealer(cards, score, true);
    showNotification(`Дилер: ${score} очков`, "info");
});

socket.on("ROUND_RESULT", (data) => {
    console.log("[ROUND_RESULT]", data);
    renderDealer(data.dealer.cards, data.dealer.score, true);
    renderRoundResults(data.results);
    syncBalancesFromResults(data.results);
    setControlsDisabled(true);
});

socket.on("BETTING_PHASE", ({ deckShuffled }) => {
    console.log("[BETTING_PHASE]");
    if (deckShuffled) showNotification("Колода перетасована!", "info");
    showBettingUI();
    setControlsDisabled(true);
});

socket.on("DECK_SHUFFLED", ({ remainingCards }) => {
    showNotification(`Колода перетасована (${remainingCards} карт)`, "info");
});

socket.on("PLAYER_JOINED", ({ userId, name }) => {
    showNotification(`${name} подключился`, "info");
    addPlayerToList(userId, name);
});

socket.on("PLAYER_LEFT", ({ userId }) => {
    showNotification(`Игрок #${userId} покинул комнату`, "warning");
    removePlayerFromList(userId);
});

socket.on("CHAT_MESSAGE", ({ userId, name, text }) => {
    appendChatMessage(name, text, userId === myUserId);
});

socket.on("SESSION_INVALID", () => {
    alert("Сессия истекла. Вы будете перенаправлены на страницу входа.");
    window.location.href = "/authorization";
});

socket.on("FORCE_DISCONNECT", ({ reason }) => {
    alert(reason);
    window.location.href = "/authorization";
});

socket.on("ERROR", ({ code, message }) => {
    console.error("[ERROR]", code, message);
    showNotification(message, "error");
});

socket.on("BET_CONFIRMED", ({ balance }) => {
    showNotification(`Ставка принята! Баланс: ${balance}`, "success");
    updateBalance(balance);
    if (myUserId != null) setPlayerBalance(myUserId, balance);
    hideBettingUI();
    showNotification("Ожидание других игроков...", "info");
});

socket.on("PLAYER_BALANCE", ({ userId, balance }) => {
    setPlayerBalance(userId, balance);
});


function requestRoomState() {
    const roomId = getRoomId();
    if (!roomId) {
        showNotification("Комната не определена", "error");
        return;
    }
    if (!socket.connected) {
        showNotification("Нет соединения с сервером", "error");
        return;
    }

    const btn = document.getElementById("btn-refresh");
    if (btn) btn.disabled = true;

    socket.emit("GET_ROOM_STATE", { roomId }, (res) => {
        if (btn) btn.disabled = false;
        if (res?.ok) {
            showNotification("Состояние обновлено", "success");
        } else if (res?.message) {
            showNotification(res.message, "error");
        }
    });

    setTimeout(() => {
        if (btn?.disabled) {
            btn.disabled = false;
            showNotification("Таймаут ответа сервера", "warning");
        }
    }, 8000);
}

function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const text  = input?.value?.trim();
    if (!text) return;
    if (!emitGameEvent("CHAT_MESSAGE", { text })) return;
    input.value = "";
}

function initGameButtons() {
    document.getElementById("btn-hit")?.addEventListener("click", () => {
        emitGameEvent("HIT");
    });

    document.getElementById("btn-stand")?.addEventListener("click", () => {
        emitGameEvent("STAND");
    });

    document.getElementById("btn-double")?.addEventListener("click", () => {
        emitGameEvent("DOUBLE");
    });

    document.getElementById("btn-split")?.addEventListener("click", () => {
        emitGameEvent("SPLIT");
    });

    document.getElementById("btn-surrender")?.addEventListener("click", () => {
        if (confirm("Вы уверены, что хотите сдаться? Вернётся 50% ставки.")) {
            emitGameEvent("SURRENDER");
        }
    });

    document.getElementById("btn-bet")?.addEventListener("click", () => {
        const input  = document.getElementById("bet-input");
        const amount = Number(input?.value ?? 0);
        if (amount <= 0) {
            showNotification("Введите корректную ставку", "error");
            return;
        }
        emitGameEvent("PLACE_BET", { amount });
    });

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

    document.getElementById("btn-refresh")?.addEventListener("click", requestRoomState);

    document.getElementById("result-modal-close")?.addEventListener("click", () => {
        const modal = document.getElementById("result-modal");
        if (modal) modal.style.display = "none";
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGameButtons);
} else {
    initGameButtons();
}


function renderFullState(state) {
    lastRoomState = state;
    currentTurn = state.currentPlayerId;

    const revealDealer = state.status === "BETTING"
        || state.dealer.cards.every(c => c !== "??");
    renderDealer(state.dealer.cards, state.dealer.score, revealDealer);
    renderAllPlayers(state.players);
    syncBalancesFromPlayers(state.players);
    updateDeckCount(state.deckRemaining);

    if (state.status === "BETTING") {
        showBettingUI();
        setControlsDisabled(true);
    } else {
        hideBettingUI();
        updateActionButtons(state);
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

function canSplit(hand) {
    return hand.cards.length === 2 && hand.cards[0]?.[0] === hand.cards[1]?.[0];
}

function updateActionButtons(state) {
    const isMyTurn = state.currentPlayerId != null && Number(state.currentPlayerId) === myUserId;
    const me = state.players.find(p => isMe(p.userId));
    const hand = me?.hands[me.currentHandIndex ?? 0];

    const active = isMyTurn && hand?.status === "ACTIVE";

    const hit = document.getElementById("btn-hit");
    const stand = document.getElementById("btn-stand");
    const dbl = document.getElementById("btn-double");
    const split = document.getElementById("btn-split");
    const surrender = document.getElementById("btn-surrender");

    if (hit) hit.disabled = !active;
    if (stand) stand.disabled = !active;
    if (dbl) dbl.disabled = !active || !hand || hand.cards.length !== 2;
    if (split) split.disabled = !active || !hand || !canSplit(hand);
    if (surrender) surrender.disabled = !active || !hand || hand.cards.length !== 2;
}

function updateControls(currentPlayerId) {
    if (lastRoomState) {
        updateActionButtons({ ...lastRoomState, currentPlayerId });
    }
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

function isMe(userId) {
    return myUserId != null && Number(userId) === myUserId;
}

function updateBalance(balance) {
    if (balance == null || Number.isNaN(Number(balance))) return;
    myBalance = Number(balance);
    const el = document.getElementById("my-balance");
    if (el) el.textContent = `${myBalance}$`;
}

function setPlayerBalance(userId, balance) {
    if (balance == null || Number.isNaN(Number(balance))) return;
    const slot = document.getElementById(`player-${userId}`);
    const span = slot?.querySelector(".player-balance");
    if (span) span.textContent = `${Number(balance)}$`;
    if (isMe(userId)) updateBalance(balance);
}

function syncBalancesFromPlayers(players) {
    if (!Array.isArray(players)) return;
    for (const p of players) {
        setPlayerBalance(p.userId, p.balance);
    }
}

function syncBalancesFromResults(results) {
    if (!Array.isArray(results)) return;
    for (const r of results) {
        if (r.newBalance != null) setPlayerBalance(r.userId, r.newBalance);
    }
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


function formatCard(card) {
    if (card === "??") return "🂠";
    const suitMap = { H: "♥", D: "♦", C: "♣", S: "♠" };
    const rank = card[0] === "T" ? "10" : card[0];
    const suitKey = card[1];
    const suit = suitMap[suitKey] ?? suitKey;
    const red = suitKey === "H" || suitKey === "D";
    return `<span class="${red ? "card-red" : ""}">${rank}${suit}</span>`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
