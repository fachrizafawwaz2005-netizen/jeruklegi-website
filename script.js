// ===================== NAV ACTIVE LINK =====================
document.addEventListener('DOMContentLoaded', function () {
  var navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      navLinks.forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
    });
  });

  // ===================== BUTTON RIPPLE / SMOOTH SCROLL PLACEHOLDER =====================
  var exploreBtn = document.querySelector('.btn-primary');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector('.about');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Note: "Buka Peta Interaktif" now links directly to peta-desa.html,
  // so no click-intercept/scroll handler is bound to it anymore.
});
