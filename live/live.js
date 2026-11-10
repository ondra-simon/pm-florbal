/*
 * P&M LIVE – veřejná výsledková stránka
 * Data načítá z veřejného Google Apps Script API pomocí JSONP.
 * Veřejný endpoint musí vracet výhradně obsah listu WEB_DATA.
 */

const PM_LIVE_CONFIG = {
  // Vlož původní URL webové aplikace Apps Scriptu končící /exec.
  // Nepoužívej přesměrovanou adresu script.googleusercontent.com.
  apiUrl: "https://script.google.com/macros/s/AKfycbwolPE_JPqSfVwoI1MaJ5IljcikmFBj-zmUb0jn9HlpdFSwzLsrF8RuJTkFsGVi89uu3w/exec",
  refreshMs: 20000
};

(() => {
  "use strict";

  const state = {
    data: null,
    leaderboardMode: "goals",
    lastRequestAt: null,
    requestTimer: null
  };

  const el = {
    connection: document.getElementById("connectionStatus"),
    connectionText: document.getElementById("connectionText"),
    lastUpdated: document.getElementById("lastUpdated"),
    videoFrame: document.getElementById("videoFrame"),
    videoPlaceholder: document.getElementById("videoPlaceholder"),
    streamNote: document.getElementById("streamNote"),
    groupMatches: document.getElementById("groupMatches"),
    playoffMatches: document.getElementById("playoffMatches"),
    groupProgress: document.getElementById("groupProgress"),
    matrix: document.getElementById("matrixMount"),
    leaderboard: document.getElementById("leaderboardMount")
  };

  function setConnection(kind, message) {
    el.connection.classList.remove("is-online", "is-error");
    if (kind === "online") el.connection.classList.add("is-online");
    if (kind === "error") el.connection.classList.add("is-error");
    el.connectionText.textContent = message;
  }

  function requestData() {
    if (!PM_LIVE_CONFIG.apiUrl || PM_LIVE_CONFIG.apiUrl.includes("SEM_VLOZ")) {
      setConnection("error", "API NENÍ NASTAVENO");
      showLoadError("Do souboru live.js zatím nebyla vložena URL veřejného API.");
      return;
    }

    setConnection("loading", "AKTUALIZUJI VÝSLEDKY");

    const callbackName = "PMLivePublic.receive";
    const url = new URL(PM_LIVE_CONFIG.apiUrl);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", String(Date.now()));

    const script = document.createElement("script");
    let completed = false;

    const timeout = window.setTimeout(() => {
      if (completed) return;
      completed = true;
      script.remove();
      setConnection("error", "DATA SE NEPODAŘILO NAČÍST");
      if (!state.data) showLoadError("Veřejné výsledky se nepodařilo načíst. Zkus stránku obnovit.");
    }, 15000);

    script.onerror = () => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      script.remove();
      setConnection("error", "CHYBA PŘIPOJENÍ");
      if (!state.data) showLoadError("Nepodařilo se spojit s veřejným datovým rozhraním.");
    };

    window.PMLivePublic = window.PMLivePublic || {};
    window.PMLivePublic.receive = (payload) => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      script.remove();

      if (!payload || payload.ok !== true) {
        setConnection("error", "CHYBA DATOVÉHO ZDROJE");
        if (!state.data) showLoadError("Datové rozhraní vrátilo chybu. Zkontrolujeme jeho nastavení.");
        return;
      }

      state.data = payload;
      state.lastRequestAt = new Date();
      renderAll(payload);
      setConnection("online", "VÝSLEDKY AKTUALIZOVÁNY");
      el.lastUpdated.textContent = formatDateTime(payload.meta?.lastUpdated) ||
        formatDateTime(payload.generatedAt) || "PRÁVĚ TEĎ";
    };

    script.src = url.toString();
    document.head.appendChild(script);
  }

  function showLoadError(message) {
    [el.groupMatches, el.playoffMatches, el.matrix, el.leaderboard].forEach(node => {
      node.replaceChildren(makeElement("div", "error-card", message));
    });
  }

  function renderAll(data) {
    renderVideo(data.meta || {});
    renderMatches(data.matches || [], data.goals || []);
    renderMatrix(data.matrix || {});
    renderLeaderboard(data.players || []);
  }

  function renderVideo(meta) {
    const videoId = String(meta.youtubeVideoId || "").trim();
    if (!videoId) {
      el.videoFrame.replaceChildren();
      const placeholder = makeElement("div", "video-placeholder");
      placeholder.append(
        makeElement("span", "youtube-mark", "▶"),
        makeElement("strong", "", "ŽIVÝ PŘENOS"),
        makeElement("p", "", "YouTube livestream bude dostupný zde.")
      );
      el.videoFrame.appendChild(placeholder);
      el.streamNote.textContent = "Přenos se zobrazí po jeho spuštění pořadateli.";
      return;
    }

    // Povolená ID jsou YouTube video ID; nepřebíráme libovolnou URL.
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      el.streamNote.textContent = "ID YouTube přenosu není ve správném formátu.";
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?rel=0&playsinline=1";
    iframe.title = "P&M florbalový turnaj – živý přenos";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    el.videoFrame.replaceChildren(iframe);
    el.streamNote.textContent = "Živý přenos z turnaje P&M.";
  }

  function renderMatches(matches, goals) {
    const sorted = [...matches].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const group = sorted.filter(match => String(match.stage).toUpperCase() === "SKUPINA");
    const playoff = sorted.filter(match => String(match.stage).toUpperCase() !== "SKUPINA");

    el.groupProgress.textContent = group.length + " UTKÁNÍ · " +
      group.filter(match => match.finished).length + " DOHRÁNO";

    renderMatchList(el.groupMatches, group, goals);
    renderMatchList(el.playoffMatches, playoff, goals);
  }

  function renderMatchList(container, matches, goals) {
    container.replaceChildren();

    if (!matches.length) {
      container.appendChild(makeElement("div", "empty-card", "Zatím zde nejsou žádná utkání."));
      return;
    }

    matches.forEach(match => container.appendChild(renderMatchCard(match, goals)));
  }

  function renderMatchCard(match, allGoals) {
    const card = makeElement("article", "match-card");
    const events = allGoals.filter(goal => goal.matchId === match.id)
      .sort((a, b) => Number(a.goalNo || 0) - Number(b.goalNo || 0));

    const head = makeElement("div", "match-card-head");
    const meta = makeElement("div", "match-meta");
    meta.append(
      makeElement("span", "match-time", match.startAt || "ČAS BUDE DOPLNĚN"),
      makeElement("span", "", "· " + (match.roundName || match.stage || "ZÁPAS"))
    );
    head.appendChild(meta);
    if (match.finished) head.appendChild(makeElement("span", "match-finished", "UKONČENO"));

    const main = makeElement("div", "match-main");
    const teamA = makeTeamElement(match.teamAName, false);
    const teamB = makeTeamElement(match.teamBName, true);
    const hasScore = events.length > 0 || match.finished;
    const score = makeElement("div", hasScore ? "match-score" : "match-score is-empty",
      hasScore ? Number(match.scoreA || 0) + " : " + Number(match.scoreB || 0) : "VS");
    main.append(teamA, score, teamB);

    card.append(head, main);

    if (events.length) {
      const eventList = makeElement("div", "match-events");
      events.forEach(goal => {
        const side = getGoalTeamSide(goal, match);
        const event = makeElement("div", "goal-event" + (side === "b" ? " goal-event--b" : " goal-event--a"));
        const scoreText = makeElement("span", "goal-score", goal.scoreAfter || "");
        const text = makeElement("div", "goal-text");
        text.appendChild(makeElement("strong", "", goal.scorerName || "Neznámý střelec"));
        if (goal.assistName) {
          text.appendChild(makeElement("span", "goal-assist", "Asistence: " + goal.assistName));
        }
        if (side === "b") event.append(text, scoreText);
        else event.append(scoreText, text);
        eventList.appendChild(event);
      });
      card.appendChild(eventList);
    } else if (!match.teamAName || !match.teamBName) {
      card.appendChild(makeElement("div", "match-pending", "Soupeři budou doplněni podle konečného pořadí skupiny."));
    } else if (match.finished) {
      card.appendChild(makeElement("div", "match-pending", "Konečný výsledek · bez vstřelených branek."));
    }

    return card;
  }

  function makeTeamElement(name, right) {
    const team = makeElement("div", "match-team", name || "ČEKÁ NA SOUPEŘE");
    if (right) team.style.textAlign = "right";
    return team;
  }

  function getGoalTeamSide(goal, match) {
    // Nejprve porovnáme stabilní ID, pokud je veřejná data obsahují.
    const scoringId = String(goal.scoringTeamId || goal.teamId || "").trim().toLowerCase();
    const teamAId = String(match.teamAId || "").trim().toLowerCase();
    const teamBId = String(match.teamBId || "").trim().toLowerCase();
    if (scoringId && teamAId && scoringId === teamAId) return "a";
    if (scoringId && teamBId && scoringId === teamBId) return "b";

    // Záloha pro případ, že API posílá pouze názvy týmů.
    const normalize = value => String(value || "").trim().toLocaleLowerCase("cs-CZ");
    const scoringName = normalize(goal.scoringTeamName);
    if (scoringName && scoringName === normalize(match.teamAName)) return "a";
    if (scoringName && scoringName === normalize(match.teamBName)) return "b";
    return "a";
  }

  function renderMatrix(matrix) {
    const rows = Array.isArray(matrix.rows) ? matrix.rows : [];
    const headers = Array.isArray(matrix.headers) ? matrix.headers : [];
    if (!rows.length) {
      el.matrix.replaceChildren(makeElement("div", "empty-card", "Výsledková mřížka zatím není dostupná."));
      return;
    }

    const wrap = makeElement("div", "table-scroll");
    const table = makeElement("table", "matrix-table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const labels = ["TÝM", ...headers.slice(2, 8), "SKÓRE", "BODY", "POŘADÍ"];
    labels.forEach((label, index) => {
      const th = makeElement("th", (index >= 7 ? "summary" : ""), label || "");
      if (index === 0) th.scope = "col";
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    const tbody = document.createElement("tbody");
    rows.forEach(row => {
      const tr = document.createElement("tr");
      const name = makeElement("th", "", row.teamName || row.teamId || "");
      name.scope = "row";
      tr.appendChild(name);

      (row.results || []).forEach(value => {
        const cellValue = value === "" || value === null ? "·" : String(value);
        const td = makeElement("td", cellValue === "—" ? "diagonal" : "", cellValue);
        tr.appendChild(td);
      });

      tr.appendChild(makeElement("td", "summary", row.score || "0:0"));
      tr.appendChild(makeElement("td", "summary", String(row.points ?? 0)));
      tr.appendChild(makeElement("td", "summary rank-cell", row.rank === "" || row.rank === null ? "—" : String(row.rank)));
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
    wrap.appendChild(table);
    el.matrix.replaceChildren(wrap);
  }

  function renderLeaderboard(players) {
    const mode = state.leaderboardMode;
    const sorted = [...players].sort((a, b) => {
      if (mode === "goals") {
        return Number(b.goals || 0) - Number(a.goals || 0) ||
          Number(b.points || 0) - Number(a.points || 0) ||
          String(a.name || "").localeCompare(String(b.name || ""), "cs");
      }
      return Number(b.points || 0) - Number(a.points || 0) ||
        Number(b.goals || 0) - Number(a.goals || 0) ||
        Number(b.assists || 0) - Number(a.assists || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""), "cs");
    });

    const visible = sorted.filter(player => Number(player.goals || 0) + Number(player.assists || 0) > 0);
    if (!visible.length) {
      el.leaderboard.replaceChildren(makeElement("div", "empty-card", "Statistiky hráčů se zobrazí po zapsání prvních gólů."));
      return;
    }

    const table = makeElement("table", "leaderboard-table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    ["#", "HRÁČ / TÝM", "GÓLY", "ASISTENCE", "BODY"].forEach((label, index) => {
      const th = makeElement("th", index > 1 ? "num" : "", label);
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    const tbody = document.createElement("tbody");

    visible.forEach((player, index) => {
      const tr = document.createElement("tr");
      tr.appendChild(makeElement("td", "player-rank", String(index + 1) + "."));
      const nameCell = document.createElement("td");
      nameCell.appendChild(makeElement("span", "player-name", player.name || "Neznámý hráč"));
      nameCell.appendChild(makeElement("span", "player-team", player.teamName || ""));
      tr.appendChild(nameCell);
      tr.appendChild(makeElement("td", "num", String(player.goals || 0)));
      tr.appendChild(makeElement("td", "num", String(player.assists || 0)));
      tr.appendChild(makeElement("td", "num points-cell", String(player.points || 0)));
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
    el.leaderboard.replaceChildren(table);
  }

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZone: "Europe/Prague"
    }).format(date);
  }

  document.querySelectorAll("[data-leaderboard]").forEach(button => {
    button.addEventListener("click", () => {
      state.leaderboardMode = button.dataset.leaderboard;
      document.querySelectorAll("[data-leaderboard]").forEach(other => {
        const active = other === button;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", String(active));
      });
      if (state.data) renderLeaderboard(state.data.players || []);
    });
  });

  requestData();
  state.requestTimer = window.setInterval(requestData, PM_LIVE_CONFIG.refreshMs);
})();
