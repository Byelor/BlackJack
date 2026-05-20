const header = document.getElementById("header");
if (!header) {
    console.warn("[roomHeaderScript] header not found");
} else {
    header.addEventListener("click", async (event) => {
        const targetEl = event.target.closest("button, a");
        if (!targetEl || targetEl.id === "logout") return;

        const href = targetEl.getAttribute("href");
        if (!href) return;

        event.preventDefault();

        if (!confirm("Покинуть комнату?")) return;

        try {
            const response = await fetch("/api/lobby/room/leave", {
                method: "PUT",
                headers: { "content-type": "application/json" },
            });

            const data = await response.json();
            if (!response.ok || data?.message !== "all good") {
                alert(data?.message ?? "Не удалось выйти из комнаты");
                return;
            }

            window.location.href = href;
        } catch (error) {
            console.error("[roomHeaderScript]", error);
            alert("Ошибка при выходе из комнаты");
        }
    });
}
