/**
 * webOSTV.js stub — replaced with the real LG webOSTV.js library at build time.
 * On non-webOS platforms (browser dev), provides no-op stubs.
 * Download the real library from: https://webostv.developer.lge.com/develop/references/webostv-js
 */
(function () {
  if (typeof window.webOS !== "undefined") return;

  window.webOS = {
    platformBack: function () {
      console.log("[webOSTV stub] platformBack called");
      if (window.history.length > 1) window.history.back();
    },
    service: {
      request: function (uri, params) {
        console.log("[webOSTV stub] service.request:", uri);
        if (params.onFailure) {
          params.onFailure({ errorText: "webOS service not available (stub)" });
        }
      },
    },
    systemInfo: {},
  };
})();
