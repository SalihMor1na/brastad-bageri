/* Brastad Bageri — interaktion & animation
   Allt är transform/opacity-baserat och respekterar prefers-reduced-motion. */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Sidhuvud: kompakt läge vid scroll ---------- */

  var header = document.querySelector(".site-header");
  var lastScrolled = null;

  function onScroll() {
    var scrolled = window.scrollY > 24;
    if (scrolled !== lastScrolled) {
      header.classList.toggle("is-scrolled", scrolled);
      lastScrolled = scrolled;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobilmeny ---------- */

  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobilmeny");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Stäng menyn" : "Öppna menyn");
    header.classList.toggle("nav-open", open);
    if (open) {
      mobileNav.hidden = false;
      requestAnimationFrame(function () {
        mobileNav.classList.add("is-open");
      });
      document.body.style.overflow = "hidden";
    } else {
      mobileNav.classList.remove("is-open");
      document.body.style.overflow = "";
      window.setTimeout(function () { mobileNav.hidden = true; }, 300);
    }
  }

  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () { setMenu(false); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ---------- Robust mjuk scroll för ankarlänkar ----------
     Egen rAF-animation istället för CSS scroll-behavior: den fungerar
     pålitligt vid varje klick (även när målet redan är i URL:en),
     landar med exakt offset under sidhuvudet och kan avbrytas av användaren. */

  var scrollRaf = null;

  function stopScrollAnim() {
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
  }
  ["wheel", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, stopScrollAnim, { passive: true });
  });

  function headerOffset() {
    return (header.offsetHeight || 84) + 12;
  }

  function scrollToY(toY) {
    toY = Math.max(0, Math.round(toY));
    if (reducedMotion) {
      window.scrollTo(0, toY);
      return;
    }
    var startY = window.scrollY;
    var dist = toY - startY;
    if (Math.abs(dist) < 2) return;
    var duration = Math.min(900, Math.max(350, Math.abs(dist) * 0.5));
    var startTime = null;
    stopScrollAnim();

    function step(ts) {
      if (startTime === null) startTime = ts;
      var p = Math.min(1, (ts - startTime) / duration);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      window.scrollTo(0, Math.round(startY + dist * eased));
      if (p < 1) {
        scrollRaf = requestAnimationFrame(step);
      } else {
        scrollRaf = null;
      }
    }
    scrollRaf = requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    var hash = link.getAttribute("href");
    if (hash.length < 2) return;

    link.addEventListener("click", function (e) {
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();

      var menuWasOpen = header.classList.contains("nav-open");
      if (menuWasOpen) setMenu(false);

      var run = function () {
        var y = target.getBoundingClientRect().top + window.scrollY - headerOffset();
        scrollToY(y);
        history.replaceState(null, "", hash);
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      };
      // Vänta in att mobilmenyn hunnit stängas innan vi scrollar
      if (menuWasOpen) {
        window.setTimeout(run, 320);
      } else {
        run();
      }
    });
  });

  /* ---------- Scrollavslöjanden ---------- */

  // Dela rubriker med .split-reveal i ord som var för sig stiger upp bakom en mask
  function splitWords(el) {
    var text = el.textContent.trim();
    el.textContent = "";
    var words = text.split(/\s+/);
    words.forEach(function (w, i) {
      var mask = document.createElement("span");
      mask.className = "word-mask";
      var inner = document.createElement("span");
      inner.className = "word";
      inner.style.setProperty("--i", i);
      inner.textContent = w;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  var splitEls = document.querySelectorAll(".split-reveal");
  var revealEls = document.querySelectorAll("[data-reveal]");

  if (!reducedMotion && "IntersectionObserver" in window) {
    splitEls.forEach(splitWords);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    revealEls.forEach(function (el) { io.observe(el); });
    splitEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    splitEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Diskret parallax i hjälten ---------- */

  var heroImg = document.querySelector(".hero-img");

  if (heroImg && !reducedMotion) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          heroImg.style.transform = "translateY(" + y * 0.22 + "px)";
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Mobil åtgärdsrad: glid in efter hjälten ---------- */

  var mobileBar = document.querySelector(".mobile-bar");
  if (mobileBar) {
    var barShown = null;
    window.addEventListener("scroll", function () {
      var show = window.scrollY > window.innerHeight * 0.55;
      if (show !== barShown) {
        mobileBar.classList.toggle("is-shown", show);
        barShown = show;
      }
    }, { passive: true });
  }

  /* ---------- Öppet nu / stängt ---------- */

  // Öppettider: [öppnar, stänger] i decimaltimmar, per veckodag (0 = söndag)
  var HOURS = {
    0: null,
    1: [8.5, 18],
    2: [8.5, 18],
    3: [8.5, 18],
    4: [8.5, 18],
    5: [8.5, 18],
    6: [8, 13]
  };
  var DAY_NAMES = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];

  function fmt(dec) {
    var h = Math.floor(dec);
    var m = Math.round((dec - h) * 60);
    return (h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m);
  }

  function openStatus() {
    var now = new Date();
    var day = now.getDay();
    var t = now.getHours() + now.getMinutes() / 60;
    var today = HOURS[day];

    if (today && t >= today[0] && t < today[1]) {
      return { open: true, text: "Öppet nu · stänger " + fmt(today[1]) };
    }
    if (today && t < today[0]) {
      return { open: false, text: "Stängt · öppnar i dag " + fmt(today[0]) };
    }
    // Hitta nästa öppna dag
    for (var i = 1; i <= 7; i++) {
      var next = (day + i) % 7;
      if (HOURS[next]) {
        var label = i === 1 ? "i morgon" : "på " + DAY_NAMES[next];
        return { open: false, text: "Stängt · öppnar " + label + " " + fmt(HOURS[next][0]) };
      }
    }
    return { open: false, text: "Stängt" };
  }

  var status = openStatus();
  document.querySelectorAll("[data-open-status]").forEach(function (el) {
    el.textContent = status.text;
  });
  document.querySelectorAll("[data-open-dot]").forEach(function (el) {
    el.classList.toggle("is-closed", !status.open);
  });

  // Markera dagens rad i öppettidstabellen
  var day = new Date().getDay();
  var rowDay = day >= 1 && day <= 5 ? "1" : String(day);
  var row = document.querySelector('.hours tr[data-day="' + rowDay + '"]');
  if (row) row.classList.add("is-today");

  /* ---------- Årtal i sidfoten ---------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Interaktiv karta (Leaflet + OpenStreetMap) ---------- */

  var mapEl = document.getElementById("karta");

  if (mapEl && typeof window.L !== "undefined") {
    var COORD = [58.38388, 11.48649]; // Bagarvägen, Brastad (geokodad via OSM)

    var map = L.map(mapEl, {
      scrollWheelZoom: false, // hindrar att kartan kapar sidans scroll
      zoomControl: true,
      attributionControl: true
    }).setView(COORD, 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      detectRetina: true, // skarpa rutor på högupplösta skärmar
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    var pin = L.divIcon({
      className: "map-pin",
      html:
        '<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 0C5.4 0 0 5.3 0 11.8 0 20.3 12 32 12 32s12-11.7 12-20.2C24 5.3 18.6 0 12 0Z"/>' +
        '<circle cx="12" cy="11.8" r="4.6"/></svg>',
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -36]
    });

    L.marker(COORD, { icon: pin, keyboard: false })
      .addTo(map)
      .bindPopup("<strong>Brastad Bageri</strong><br>Bagarvägen 8, 454 31 Brastad");

    // Aktivera scroll-zoom bara när kartan är i fokus/klickad
    map.on("focus click", function () { map.scrollWheelZoom.enable(); });
    map.on("blur mouseout", function () { map.scrollWheelZoom.disable(); });

    if (reducedMotion) {
      map.options.zoomAnimation = false;
      map.options.fadeAnimation = false;
    }

    // Säkerställ korrekt storlek när sektionen scrollas in
    window.setTimeout(function () { map.invalidateSize(); }, 200);
  }
})();
