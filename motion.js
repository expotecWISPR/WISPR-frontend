// wispr :: motion pass — cursor spotlight, contadores, anillo de progreso, reveal de la landing.
// (12 oct) Se quitaron tilt 3D, título fantasma, red decorativa del hero y
// ticker: repetían datos o se movían sin dar información.
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

  function enhance() {
    document.querySelectorAll(".metric-card strong, .landing-stat strong").forEach(enhanceCounter);
    document.querySelectorAll(".mission-ring").forEach(enhanceRing);
    document.querySelectorAll(".landing-hero").forEach(enhanceLandingHero);
    document.querySelectorAll(".landing-stats, .landing-section, .flip-card, .benefit-row, .team-card").forEach(enhanceReveal);
  }

  const root = document.getElementById("root");
  if (root) {
    new MutationObserver(enhance).observe(root, { childList: true, subtree: true });
  }
  enhance();
})();