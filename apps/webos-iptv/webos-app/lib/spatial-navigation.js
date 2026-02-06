/**
 * js-spatial-navigation stub — replaced with the real library at build time.
 * Minimal stub for development outside webOS.
 * Real library: https://github.com/nicolesung/spatial-navigation
 */
(function () {
  if (typeof window.SpatialNavigation !== "undefined") return;

  window.SpatialNavigation = {
    init: function () {},
    add: function () {},
    remove: function () {},
    makeFocusable: function () {},
    focus: function (section) {
      var selector = section
        ? document.querySelector("#" + section + " .focusable")
        : document.querySelector(".focusable");
      if (selector) selector.focus();
    },
    pause: function () {},
    resume: function () {},
    set: function () {},
  };
})();
