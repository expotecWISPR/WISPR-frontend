// wispr :: motion pass — cursor spotlight, tilt 3D, reveal en scroll, contadores, hero animado, ticker
(function () {
  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const spotlight = document.getElementById("wispr-spotlight");
  if (spotlight && !reduced) {
    const sx = gsap.quickTo(spotlight, "x", { duration: 0.5, ease: "power3.out" });
    const sy = gsap.quickTo(spotlight, "y", { duration: 0.5, ease: "power3.out" });
    window.addEventListener("mousemove", (e) => { sx(e.clientX); sy(e.clientY); });
  }

  function enhanceCard(card) {
    if (card.dataset.motionReady) return;
    card.dataset.motionReady = "1";
    if (!reduced) {
      const qx = gsap.quickTo(card, "rotationY", { duration: 0.4, ease: "power2.out" });
      const qy = gsap.quickTo(card, "rotationX", { duration: 0.4, ease: "power2.out" });
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        qx((px - 0.5) * 8);
        qy((0.5 - py) * 8);
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
      });
      card.addEventListener("mouseleave", () => { qx(0); qy(0); });
    }
    gsap.fromTo(card, { opacity: 0, y: 28 }, {
      opacity: 1, y: 0, duration: 0.6, ease: "power3.out",
      scrollTrigger: { trigger: card, start: "top 92%" }
    });
  }

  function enhanceCounter(el) {
    if (el.dataset.motionReady) return;
    const raw = el.textContent.trim();
    if (!/^\d+$/.test(raw)) return;
    el.dataset.motionReady = "1";
    const target = parseInt(raw, 10);
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target, duration: 0.9, ease: "power2.out",
      onUpdate: () => { el.textContent = Math.floor(counter.val); }
    });
  }

  function enhanceRing(ring) {
    if (ring.dataset.motionReady) return;
    ring.dataset.motionReady = "1";
    const final = ring.style.getPropertyValue("--progress").trim() || "0deg";
    const label = ring.querySelector("span");
    const match = label && label.textContent.match(/^(\d+)%$/);
    ring.style.setProperty("--progress", "0deg");
    gsap.to(ring, { "--progress": final, duration: 1.2, ease: "power2.out" });
    if (match) {
      const target = parseInt(match[1], 10);
      const counter = { val: 0 };
      gsap.to(counter, {
        val: target, duration: 1.2, ease: "power2.out",
        onUpdate: () => { label.textContent = Math.floor(counter.val) + "%"; }
      });
    }
  }

  function enhanceGhostHeading(h2) {
    if (h2.dataset.motionReady) return;
    h2.dataset.motionReady = "1";
    const ghost = document.createElement("div");
    ghost.className = "wispr-ghost-heading";
    ghost.textContent = h2.textContent;
    ghost.setAttribute("aria-hidden", "true");
    h2.parentElement.insertBefore(ghost, h2);
    if (!reduced) {
      gsap.to(ghost, {
        x: -30, ease: "none",
        scrollTrigger: { trigger: ghost, start: "top top", end: "bottom top", scrub: 0.6 }
      });
    }
  }

  function createHeroNetwork(hero) {
  if (hero.querySelector(".hero-network")) return;

  const network = document.createElement("div");
  network.className = "hero-network";
  network.setAttribute("aria-hidden", "true");

  network.innerHTML = `
    <svg viewBox="0 0 900 360" preserveAspectRatio="none">
      <g class="network-lines">
        <line x1="120" y1="210" x2="310" y2="100"/>
        <line x1="120" y1="210" x2="360" y2="280"/>
        <line x1="310" y1="100" x2="520" y2="170"/>
        <line x1="360" y1="280" x2="520" y2="170"/>
        <line x1="520" y1="170" x2="700" y2="80"/>
        <line x1="520" y1="170" x2="760" y2="260"/>
        <line x1="700" y1="80" x2="820" y2="190"/>
      </g>

      <g class="network-nodes">
        <circle cx="120" cy="210" r="5"/>
        <circle cx="310" cy="100" r="5"/>
        <circle cx="360" cy="280" r="5"/>
        <circle cx="520" cy="170" r="8"/>
        <circle cx="700" cy="80" r="5"/>
        <circle cx="760" cy="260" r="5"/>
        <circle cx="820" cy="190" r="4"/>
      </g>

      <circle class="network-pulse" cx="520" cy="170" r="22"/>
    </svg>
  `;

  hero.prepend(network);

  if (!reduced) {
  const moveX = gsap.quickTo(network, "x", {
    duration: 0.8,
    ease: "power3.out"
  });

  const moveY = gsap.quickTo(network, "y", {
    duration: 0.8,
    ease: "power3.out"
  });

  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    moveX(x * 20);
    moveY(y * 12);
  });

  hero.addEventListener("mouseleave", () => {
    moveX(0);
    moveY(0);
  });
}
}

  function enhanceHero(hero) {
    if (hero.dataset.motionReady) return;
    hero.dataset.motionReady = "1";
    createHeroNetwork(hero);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(hero, { opacity: 0, y: 20, duration: 0.6 })
      .from(".metric-card", { opacity: 0, y: 24, duration: 0.5, stagger: 0.08 }, "-=0.3")
      .from(".focus-panel, .protocol-panel", { opacity: 0, y: 24, duration: 0.5, stagger: 0.12 }, "-=0.3")
      .from(".protocol-step", { opacity: 0, x: -12, duration: 0.4, stagger: 0.08 }, "-=0.2");
  }

  // --- landing pública: fade-in del hero + reveal en scroll de cada sección ---
  function enhanceLandingHero(hero) {
    if (hero.dataset.motionReady) return;
    hero.dataset.motionReady = "1";
    gsap.from(hero.children, { opacity: 0, y: 24, duration: 0.7, stagger: 0.08, ease: "power3.out" });
  }

  function enhanceReveal(el) {
    if (el.dataset.motionReady) return;
    el.dataset.motionReady = "1";
    gsap.fromTo(el, { opacity: 0, y: 26 }, {
      opacity: 1, y: 0, duration: 0.6, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" }
    });
  }

  // --- ticker en vivo debajo del header (movimiento constante) ---
  function enhanceTicker() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    const existing = topbar.nextElementSibling && topbar.nextElementSibling.classList.contains("wispr-ticker") ? topbar.nextElementSibling : null;
    // Una vista de gestión (panel admin, home del profesor) no es la de un
    // jugador: nada de racha/ranking/flavor-text encima.
    if (topbar.dataset.view === "management") { if (existing) existing.remove(); return; }
    // Los textos salen de tickerItems() (app.js), con datos reales del jugador.
    const items = typeof tickerItems === "function" ? tickerItems() : [];
    const signature = items.join("|");
    if (existing && existing.dataset.signature === signature) return;
    if (existing) existing.remove();
    if (!items.length) return;
    const track = document.createElement("div");
    track.className = "wispr-ticker-track";
    for (let copy = 0; copy < 2; copy++) {
      items.forEach(text => {
        const item = document.createElement("span");
        item.textContent = `◆ ${text}`; // textContent: los nombres vienen de usuarios
        track.appendChild(item);
      });
    }
    const ticker = document.createElement("div");
    ticker.className = "wispr-ticker";
    ticker.dataset.signature = signature;
    ticker.appendChild(track);
    topbar.insertAdjacentElement("afterend", ticker);
  }

  function enhance() {
    document.querySelectorAll(".challenge-card").forEach(enhanceCard);
    document.querySelectorAll(".metric-card strong, .kpi strong, .landing-stat strong").forEach(enhanceCounter);
    document.querySelectorAll(".mission-ring").forEach(enhanceRing);
    document.querySelectorAll(".mission-hero h2").forEach(enhanceGhostHeading);
    document.querySelectorAll(".mission-hero").forEach(enhanceHero);
    document.querySelectorAll(".landing-hero").forEach(enhanceLandingHero);
    document.querySelectorAll(".landing-stats, .landing-section, .flip-card, .benefit-row, .team-card").forEach(enhanceReveal);
    enhanceTicker();
  }

  const root = document.getElementById("root");
  if (root) {
    new MutationObserver(enhance).observe(root, { childList: true, subtree: true });
  }
  enhance();
})();