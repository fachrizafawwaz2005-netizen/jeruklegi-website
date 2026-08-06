// =========================================================================
// INTERACTIONS.JS
// Production-polish behaviour layer, loaded on every page after script.js.
// Responsibilities:
//   1. Scroll-reveal: fades/slides repeating components into view once,
//      the first time they cross the viewport (IntersectionObserver).
//   2. Lazy image fade-in: toggles a class once a lazy-loaded image has
//      actually finished loading, so polish.css can fade it in smoothly
//      instead of it just popping onto the page.
//   3. A one-time, on-load fade for the hero content (it's already in
//      view on first paint, so it doesn't need scroll-reveal).
// Every effect here is purely additive (adds/removes classes) and is a
// no-op if the relevant elements aren't present on a given page.
// Respects prefers-reduced-motion by skipping straight to the end state.
// =========================================================================

(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -----------------------------------------------------------------------
  // 1. SCROLL REVEAL
  // -----------------------------------------------------------------------
  // Selectors are grouped so elements that visually belong to the same
  // grid/row stagger together, instead of every element on the page
  // sharing one global counter.
  var REVEAL_GROUPS = [
    '.stat-card',
    '.info-card',
    '.struktur-list .struktur-img',
    '.story-card',
    '.edukasi-card',
    '.story-info-card, .story-lain-card',
    '.edu-doc-card, .edu-stats-card, .edu-lain',
    '.edu-caption-card, .edu-article-card',
    '.kontak-map-card, .kontak-social-card',
    '.layer-panel, .map-wrap, .umkm-map-wrap',
    '.kelembagaan-header'
  ];

  function setupReveal() {
    var targets = [];

    REVEAL_GROUPS.forEach(function (selector) {
      var group = document.querySelectorAll(selector);
      group.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', Math.min(i * 70, 350) + 'ms');
        targets.push(el);
      });
    });

    if (!targets.length) return;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  // -----------------------------------------------------------------------
  // 2. LAZY IMAGE FADE-IN
  // -----------------------------------------------------------------------
  function setupImageFade() {
    var lazyImages = document.querySelectorAll('img[loading="lazy"]');

    lazyImages.forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        // Already cached/loaded before this script ran.
        img.classList.add('img-loaded-instant');
        return;
      }
      img.addEventListener('load', function () {
        img.classList.add('img-loaded');
      }, { once: true });
      img.addEventListener('error', function () {
        // Don't leave a broken image stuck at opacity: 0.
        img.classList.add('img-loaded');
      }, { once: true });
    });
  }

  // -----------------------------------------------------------------------
  // 3. HERO ON-LOAD FADE (above-the-fold, so it's time-based, not scroll)
  // -----------------------------------------------------------------------
  function setupHeroFade() {
    var heroEls = document.querySelectorAll(
      '.hero-text, .hero-image-wrap, .story-banner, .edu-banner'
    );
    if (!heroEls.length) return;

    if (reduceMotion) {
      heroEls.forEach(function (el) { el.classList.add('hero-in'); });
      return;
    }

    heroEls.forEach(function (el, i) {
      el.classList.add('hero-fade');
      window.setTimeout(function () {
        el.classList.add('hero-in');
      }, 60 + i * 90);
    });
  }

  function init() {
    setupReveal();
    setupImageFade();
    setupHeroFade();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
