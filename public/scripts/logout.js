(function () {
    const btn = document.getElementById("logout");
    if (!btn || btn.dataset.logoutBound === "1") return;
    btn.dataset.logoutBound = "1";

    btn.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
            const response = await fetch("/api/authorization/logout", {
                method: "POST",
                headers: { "content-type": "application/json" },
            });
            const responseJson = await response.json();
            if (responseJson["message"] === "all good") {
                window.location.href = "/main";
                return;
            }
            console.log("Ошибка при попытке выхода из аккаунта!");
        } catch (error) {
            console.log("error occurred: ", error);
        }
    });
})();
