
      /* Remplaçant global des onerror inline (CSP script-src 'self') :
         une image cassée laisse sa lettre de repli ou disparaît. */
      document.addEventListener('error', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLImageElement)) return;
        const letter = t.dataset && t.dataset.letter;
        const parent = t.parentNode;
        t.remove();
        if (letter && parent) parent.textContent = letter;
      }, true);

      const SHORTCUTS = [
        { name: "Ayeba", href: "https://ayeba.app", logo: "https://ayeba.app/brand/ayeba-mark.svg" },
        { name: "Ayebi", href: "https://ayeba.app/ayebi", letter: "A", tint: "linear-gradient(160deg,#12222e,#0a0c12)" },
        { name: "Studio", href: "https://ayeba.app/studio", letter: "S", tint: "linear-gradient(160deg,#12222e,#0a0c12)" },
        { name: "Jemsa", href: "https://jemsa.net", logo: "https://ayeba.app/brand/shortcuts/jemsa.svg" },
        { name: "Sombateka", href: "https://sombatekaonline.com", logo: "https://ayeba.app/brand/shortcuts/sombateka.svg" },
        { name: "DevAlpha", href: "https://ayeba.app/developers", logo: "https://ayeba.app/brand/shortcuts/devalpha1.svg" },
        { name: "Tala", href: "https://ayeba.app/tala", logo: "https://ayeba.app/brand/shortcuts/tala.svg" },
        { name: "Omega", href: "https://omega-web.org", logo: "https://ayeba.app/brand/shortcuts/omega.svg" },
      ];

      const FEED_QUERIES = {
        discover: "actualités monde aujourd'hui",
        sport: "sport football actualité",
        play: "divertissement culture",
        marches: "marchés bourse économie",
        ayebi: "République Démocratique du Congo",
        tech: "technologie innovation IA",
      };

      /* Tuiles */
      const box = document.getElementById("shortcuts");
      for (const s of SHORTCUTS) {
        const a = document.createElement("a");
        a.className = "tile";
        a.href = s.href;
        a.title = s.name;
        const inner = s.logo
          ? `<img src="${s.logo}" alt="" data-letter="${esc(s.letter || s.name[0])}"/>`
          : (s.letter || s.name[0]);
        a.innerHTML = `<span class="tile-box" style="${s.tint ? `background:${s.tint}` : ""}">${inner}</span><span class="tile-label">${s.name}</span>`;
        box.appendChild(a);
      }
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "tile add";
      addBtn.innerHTML = '<span class="tile-box">+</span><span class="tile-label">Ajouter</span>';
      addBtn.addEventListener("click", () => { window.location.href = "https://ayeba.app/compte"; });
      box.appendChild(addBtn);

      document.querySelectorAll("[data-href]").forEach((el) => {
        el.addEventListener("click", () => { window.location.href = el.dataset.href; });
      });

      /* Horloge réelle */
      function tickClock() {
        const now = new Date();
        document.getElementById("clockTime").textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        document.getElementById("clockDate").textContent = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      }
      tickClock();
      setInterval(tickClock, 15000);

      /* Météo réelle — Open-Meteo (sans clé API) */
      const WMO = { 0: ["☀", "Dégagé"], 1: ["🌤", "Peu nuageux"], 2: ["⛅", "Partiellement nuageux"], 3: ["☁", "Couvert"], 45: ["🌫", "Brouillard"], 48: ["🌫", "Brouillard"], 51: ["🌦", "Bruine"], 53: ["🌦", "Bruine"], 55: ["🌧", "Bruine"], 61: ["🌦", "Pluie légère"], 63: ["🌧", "Pluie"], 65: ["🌧", "Forte pluie"], 80: ["🌦", "Averses"], 81: ["🌧", "Averses"], 82: ["⛈", "Fortes averses"], 95: ["⛈", "Orage"], 96: ["⛈", "Orage grêle"], 99: ["⛈", "Orage grêle"] };
      fetch("https://api.open-meteo.com/v1/forecast?latitude=-4.32&longitude=15.31&current=temperature_2m,weather_code&timezone=Africa%2FKinshasa")
        .then((r) => r.json())
        .then((d) => {
          const t = Math.round(d?.current?.temperature_2m ?? 0);
          const [icon, label] = WMO[d?.current?.weather_code] || ["🌡", "--"];
          document.getElementById("weather").innerHTML =
            `<span class="w-icon">${icon}</span><div><strong>Kinshasa · ${t}°C</strong><span>${label}</span></div>`;
        })
        .catch(() => {
          document.getElementById("weatherLine").textContent = "Hors ligne";
        });

      /* Ticker marchés réel */
      fetch("https://ayeba.app/api/market")
        .then((r) => r.json())
        .then((d) => {
          const q = (d?.quotes || []).slice(0, 5);
          if (!q.length) return;
          document.getElementById("ticker").innerHTML = q
            .map((x) => `<span>${x.label} <span class="${String(x.change || "").startsWith("-") ? "down" : "up"}">${x.value}</span></span>`)
            .join("");
        })
        .catch(() => { document.getElementById("ticker").innerHTML = ""; });

      async function goSearch(q) {
        const query = String(q || "").trim();
        if (!query) return;
        if (/^https?:\/\//i.test(query) || (!query.includes(" ") && query.includes("."))) {
          window.location.href = /^https?:\/\//i.test(query) ? query : `https://${query}`;
          return;
        }
        if (window.ayebaTab?.search) await window.ayebaTab.search(query);
        else window.location.href = `https://ayeba.app/?q=${encodeURIComponent(query)}`;
      }

      document.getElementById("searchForm").addEventListener("submit", (e) => {
        e.preventDefault();
        void goSearch(document.getElementById("q").value);
      });

      function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      }

      function cardHtml(item, cls) {
        const img = item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy"/>` : "";
        return `<button type="button" class="card ${cls}${img ? "" : " no-img"}" data-url="${esc(item.url)}">
          ${img}<div class="overlay"></div>
          <div class="body"><div class="source">${esc(item.source || "Ayeba")}</div><h3>${esc(item.title)}</h3></div>
        </button>`;
      }

      function renderGrid(items) {
        const grid = document.getElementById("feedGrid");
        if (!items.length) {
          grid.innerHTML = '<div class="card no-img card-hero" data-url="https://ayeba.app"><div class="overlay"></div><div class="body"><div class="source">Ayeba</div><h3>Explorez le monde entier avec Ayeba</h3></div></div>';
          wireCards();
          return;
        }
        const hero = items[0];
        const rest = items.slice(1, 5);
        let html = cardHtml(hero, "card-hero");
        for (const it of rest) html += cardHtml(it, "");
        grid.innerHTML = html;
        wireCards();
      }

      function wireCards() {
        document.querySelectorAll(".card[data-url]").forEach((el) => {
          el.addEventListener("click", () => { window.location.href = el.dataset.url; });
        });
      }

      async function loadFeed(cat) {
        const grid = document.getElementById("feedGrid");
        grid.innerHTML = '<div class="skeleton hero"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';

        if (cat === "ayebi") {
          try {
            const r = await fetch("https://ayeba.app/api/ayebi/recent");
            const d = await r.json();
            const edits = (d?.edits || []).slice(0, 5);
            if (edits.length) {
              renderGrid(edits.map((e) => ({
                title: e.title || e.slug,
                url: `https://ayeba.app/ayebi/${e.slug}`,
                source: "Ayebi · RDC",
              })));
              return;
            }
          } catch {}
        }

        const q = FEED_QUERIES[cat] || FEED_QUERIES.discover;
        try {
          const r = await fetch("https://ayeba.app/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q, zeroAi: true }),
          });
          const d = await r.json();
          const results = (d?.results || []).slice(0, 5);
          if (!results.length) throw new Error("empty");
          renderGrid(results.map((x) => ({
            title: x.title,
            url: x.url,
            source: x.publisher || x.domain || "Web",
            image: x.thumbnail || x.image || "",
          })));
        } catch {
          renderGrid([{
            title: `Explorer : ${q}`,
            url: `https://ayeba.app/?q=${encodeURIComponent(q)}`,
            source: "Ayeba Search",
          }]);
        }
      }

      document.getElementById("feedNav").addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-cat]");
        if (!btn) return;
        document.querySelectorAll("#feedNav button[data-cat]").forEach((b) => b.classList.toggle("active", b === btn));
        void loadFeed(btn.dataset.cat);
      });

      void loadFeed("discover");
