// ========================================
// ODPOČET DO ZAČÁTKU TURNAJE
// ========================================


// Datum a čas začátku turnaje

const targetDate =
    new Date("2026-11-21T09:00:00").getTime();



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
// MOBILNÍ MENU
// ========================================

const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".navigation");

menuButton.addEventListener("click", () => {

    const isOpen = navigation.classList.toggle("open");

    menuButton.classList.toggle("open", isOpen);

    menuButton.setAttribute(
        "aria-expanded",
        isOpen
    );

    menuButton.setAttribute(
        "aria-label",
        isOpen ? "Zavřít menu" : "Otevřít menu"
    );

});


// Zavřít menu po kliknutí na položku

navigation.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {

        navigation.classList.remove("open");
        menuButton.classList.remove("open");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        menuButton.setAttribute(
            "aria-label",
            "Otevřít menu"
        );

    });

});