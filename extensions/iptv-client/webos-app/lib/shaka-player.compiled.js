/**
 * Shaka Player stub — replaced with the real compiled build at deploy time.
 * Download from: https://github.com/shaka-project/shaka-player/releases
 * Use the compiled build (shaka-player.compiled.js) for webOS.
 */
(function () {
  if (typeof window.shaka !== "undefined") return;

  window.shaka = {
    polyfill: {
      installAll: function () {},
    },
    Player: function ShakaPlayerStub(videoElement) {
      this.video = videoElement;
      this.listeners = {};
    },
  };

  window.shaka.Player.isBrowserSupported = function () {
    return typeof MediaSource !== "undefined";
  };

  var proto = window.shaka.Player.prototype;
  proto.configure = function () {};
  proto.load = function (uri) {
    // Stub: set video src directly
    this.video.src = uri;
    return this.video.play() || Promise.resolve();
  };
  proto.unload = function () {
    this.video.removeAttribute("src");
    return Promise.resolve();
  };
  proto.destroy = function () {
    return this.unload();
  };
  proto.addEventListener = function (event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  };
  proto.getMediaElement = function () {
    return this.video;
  };
  proto.isLive = function () {
    return true;
  };
})();
