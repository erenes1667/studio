/* Enes Eren Studio: shared script. No dependencies, no network, no tracking.
   Reveals on scroll, scroll bar, hero drift, Istanbul clock. All motion is skipped
   when the visitor asks for reduced motion. Without JS every section is visible. */
(function () {
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var reduce = mq.matches;
  if (mq.addEventListener) mq.addEventListener("change", function (e) { reduce = e.matches; location.reload(); });

  // Istanbul clock (plain text update, once a minute)
  var clock = document.querySelector("[data-clock]");
  if (clock && window.Intl) {
    var tick = function () {
      try {
        clock.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul" }).format(new Date());
      } catch (e) {}
    };
    tick();
    setInterval(tick, 30000);
  }

  if (reduce) return;

  // reveal on scroll, staggered inside each group
  var els = [].slice.call(document.querySelectorAll(".reveal, .steps li"));
  var groups = new Map();
  els.forEach(function (el) {
    var p = el.parentElement;
    var i = groups.get(p) || 0;
    groups.set(p, i + 1);
    el.style.setProperty("--d", Math.min(i, 5) * 0.08 + "s");
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add("in"); });
  }

  // scroll bar and hero drift
  var bar = document.querySelector(".bar");
  var bg = document.querySelector(".hero-bg");
  var hero = document.querySelector(".hero .wrap");
  var queued = false;
  function frame() {
    queued = false;
    var y = window.scrollY || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    if (y < window.innerHeight * 1.2) {
      if (bg) bg.style.transform = "translate3d(0," + y * 0.18 + "px,0) scale(" + (1 + y * 0.00012) + ")";
      if (hero) { hero.style.transform = "translate3d(0," + y * -0.06 + "px,0)"; hero.style.opacity = Math.max(1 - y / (window.innerHeight * 0.9), 0.15); }
    }
  }
  window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();
})();
