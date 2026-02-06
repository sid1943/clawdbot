/**
 * Thin wrappers around webOS Luna Service APIs.
 * Falls back gracefully when not running on webOS (e.g., browser dev).
 */

declare const webOS: {
  platformBack(): void;
  service: {
    request(
      uri: string,
      params: {
        method?: string;
        parameters?: Record<string, unknown>;
        onSuccess?: (result: Record<string, unknown>) => void;
        onFailure?: (error: Record<string, unknown>) => void;
      },
    ): void;
  };
  systemInfo: {
    country?: string;
    timezone?: string;
  };
};

function isWebOS(): boolean {
  return typeof webOS !== "undefined" && typeof webOS.service !== "undefined";
}

/** Check internet connectivity via Luna Service. */
export function checkNetwork(): Promise<boolean> {
  if (!isWebOS()) return Promise.resolve(true);
  return new Promise((resolve) => {
    webOS.service.request("luna://com.palm.connectionmanager", {
      method: "getstatus",
      onSuccess(res) {
        const wired = res.wired as { state?: string } | undefined;
        const wifi = res.wifi as { state?: string } | undefined;
        resolve(
          wired?.state === "connected" || wifi?.state === "connected",
        );
      },
      onFailure() {
        resolve(false);
      },
    });
  });
}

/** Get TV system info (model, webOS version, etc.). */
export function getSystemInfo(): Promise<Record<string, string>> {
  if (!isWebOS()) return Promise.resolve({ platform: "browser-dev" });
  return new Promise((resolve) => {
    webOS.service.request(
      "luna://com.webos.service.tv.systemproperty",
      {
        method: "getSystemInfo",
        parameters: {
          keys: ["modelName", "firmwareVersion", "sdkVersion"],
        },
        onSuccess(res) {
          resolve(res as Record<string, string>);
        },
        onFailure() {
          resolve({ platform: "webos-unknown" });
        },
      },
    );
  });
}

/** Trigger webOS platform back (exit or minimize). */
export function platformBack(): void {
  if (isWebOS()) {
    webOS.platformBack();
  }
}

/** Get timezone from webOS or fall back to browser. */
export function getTimezone(): string {
  if (isWebOS() && webOS.systemInfo?.timezone) {
    return webOS.systemInfo.timezone;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
