// ========================================
// ODPOČET DO ZAČÁTKU TURNAJE
// ========================================


// Datum a čas začátku turnaje

const targetDate =
    new Date("2026-11-21T09:20:00").getTime();



function updateCountdown() {


    // Aktuální čas

    const now =
        new Date().getTime();


    // Rozdíl mezi turnajem a současností

    const difference =
        targetDate - now;



    // Pokud už turnaj začal

    if (difference <= 0) {

        document.getElementById("days").textContent = "00";

        document.getElementById("hours").textContent = "00";

        document.getElementById("minutes").textContent = "00";

        document.getElementById("seconds").textContent = "00";

        return;

    }



    // Výpočet jednotlivých hodnot

    const days =
        Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        );


    const hours =
        Math.floor(
            (difference /
            (1000 * 60 * 60)) % 24
        );


    const minutes =
        Math.floor(
            (difference /
            (1000 * 60)) % 60
        );


    const seconds =
        Math.floor(
            (difference /
            1000) % 60
        );



    // Zobrazení

    document.getElementById("days").textContent =
        String(days).padStart(2, "0");


    document.getElementById("hours").textContent =
        String(hours).padStart(2, "0");


    document.getElementById("minutes").textContent =
        String(minutes).padStart(2, "0");


    document.getElementById("seconds").textContent =
        String(seconds).padStart(2, "0");

}



// Spustit okamžitě

updateCountdown();


// Aktualizovat každou sekundu

setInterval(
    updateCountdown,
    1000
);

// ========================================
// AUTOMATICKÉ ZOBRAZENÍ LIVE TLAČÍTKA
// ========================================

// 20. 11. 2026 v 18:00 českého času (CET, UTC+1).
// Explicitní časové pásmo zajistí stejný okamžik i při otevření webu ze zahraničí.
const liveButton = document.getElementById("liveButton");
const liveButtonStart = new Date("2026-11-19T18:00:00+01:00").getTime();

if (liveButton) {
    let liveButtonTimer = null;

    const revealLiveButton = () => {
        if (Date.now() < liveButtonStart) return;

        liveButton.hidden = false;

        if (liveButtonTimer !== null) {
            clearInterval(liveButtonTimer);
            liveButtonTimer = null;
        }
    };

    // Při načtení po stanoveném čase se tlačítko ukáže okamžitě.
    revealLiveButton();

    // Pokud je stránka otevřená před 18:00, tlačítko se ukáže automaticky.
    if (liveButton.hidden) {
        liveButtonTimer = window.setInterval(revealLiveButton, 1000);
    }
}

// ========================================
// MOBILNÍ MENU
// ========================================

const menuButton = document.querySelector(".menu-button");
const header = document.querySelector(".header");
const navigation = document.querySelector(".navigation");

if (menuButton && header && navigation) {

    menuButton.addEventListener("click", () => {

        const isOpen = navigation.classList.toggle("open");
        menuButton.classList.toggle("open", isOpen);

        menuButton.setAttribute("aria-expanded", isOpen);
        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Zavřít menu" : "Otevřít menu"
        );

    });

    navigation.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navigation.classList.remove("open");
            menuButton.classList.remove("open");

            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute(
                "aria-label",
                "Otevřít menu"
            );

        });

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            navigation.classList.remove("open");
            menuButton.classList.remove("open");

            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute(
                "aria-label",
                "Otevřít menu"
            );

        }

    });
}
