/**
 * LG webOS TV SSAP (Simple Service Access Protocol) client.
 * Connects via WebSocket to control the TV — no manual interaction needed.
 *
 * Protocol: ws://<tv-ip>:3000
 * After first pairing (user accepts on TV once), the client key is saved
 * and all future connections are automatic.
 */

import { WebSocket } from "ws";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SSAP_PORT = 3000;
const CONFIG_DIR = join(homedir(), ".webos-iptv");
const KEY_FILE = join(CONFIG_DIR, "tv-client-key.json");

// SSAP handshake payload — registers this app with the TV
const HANDSHAKE_PAYLOAD = {
  type: "register",
  id: "register_0",
  payload: {
    forcePairing: false,
    pairingType: "PROMPT",
    "client-key": "",
    manifest: {
      manifestVersion: 1,
      appVersion: "1.0.0",
      signed: {
        created: "20250101000000",
        appId: "com.clawdbot.iptv.remote",
        vendorId: "com.clawdbot",
        localizedAppNames: { "": "Clawdbot IPTV Setup" },
      },
      permissions: [
        "LAUNCH",
        "LAUNCH_WEBAPP",
        "CONTROL_INPUT_TV",
        "READ_INSTALLED_APPS",
        "READ_TV_DEVICE_INFO",
        "CONTROL_POWER",
        "READ_NETWORK_STATE",
      ],
    },
  },
};

type SSAPMessage = {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  error?: string;
};

export type TVConnection = {
  ws: WebSocket;
  send(uri: string, payload?: Record<string, unknown>): Promise<SSAPMessage>;
  close(): void;
};

/** Load saved client key (persists pairing across sessions). */
function loadClientKey(): string {
  try {
    if (existsSync(KEY_FILE)) {
      const data = JSON.parse(readFileSync(KEY_FILE, "utf-8"));
      return data.clientKey || "";
    }
  } catch {}
  return "";
}

/** Save client key for future connections. */
function saveClientKey(key: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(KEY_FILE, JSON.stringify({ clientKey: key }));
}

/**
 * Connect to an LG TV via SSAP WebSocket.
 * First connection shows a pairing prompt on the TV — user accepts once.
 * Subsequent connections are automatic using the saved client key.
 */
export function connectToTV(tvIp: string): Promise<TVConnection> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${tvIp}:${SSAP_PORT}`);
    let msgId = 1;
    const pending = new Map<string, { resolve: (v: SSAPMessage) => void; reject: (e: Error) => void }>();

    ws.on("error", (err) => reject(new Error(`TV connection failed: ${err.message}`)));

    ws.on("open", () => {
      // Send handshake with saved client key (if any)
      const handshake = JSON.parse(JSON.stringify(HANDSHAKE_PAYLOAD));
      const savedKey = loadClientKey();
      if (savedKey) {
        handshake.payload["client-key"] = savedKey;
      }
      ws.send(JSON.stringify(handshake));
    });

    ws.on("message", (data) => {
      const msg: SSAPMessage = JSON.parse(data.toString());

      // Handle registration response
      if (msg.id === "register_0") {
        if (msg.type === "registered") {
          const clientKey = msg.payload?.["client-key"] as string;
          if (clientKey) saveClientKey(clientKey);

          const connection: TVConnection = {
            ws,
            send(uri, payload) {
              return new Promise((res, rej) => {
                const id = `req_${msgId++}`;
                pending.set(id, { resolve: res, reject: rej });
                ws.send(JSON.stringify({
                  id,
                  type: "request",
                  uri,
                  payload: payload || {},
                }));
                // Timeout after 10s
                setTimeout(() => {
                  if (pending.has(id)) {
                    pending.delete(id);
                    rej(new Error(`Request timed out: ${uri}`));
                  }
                }, 10_000);
              });
            },
            close() {
              ws.close();
            },
          };
          resolve(connection);
        } else if (msg.type === "error") {
          reject(new Error(`TV pairing failed: ${msg.error || "rejected"}`));
        }
        // type === "response" with prompt means waiting for user to accept on TV
        return;
      }

      // Route responses to pending requests
      const handler = pending.get(msg.id);
      if (handler) {
        pending.delete(msg.id);
        if (msg.type === "error") {
          handler.reject(new Error(msg.error || "Request failed"));
        } else {
          handler.resolve(msg);
        }
      }
    });

    ws.on("close", () => {
      for (const [, handler] of pending) {
        handler.reject(new Error("Connection closed"));
      }
      pending.clear();
    });

    // Overall connection timeout
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        reject(new Error("TV connection timed out. Is the TV on?"));
      }
    }, 30_000);
  });
}

/** Launch an app on the TV by app ID. */
export async function launchApp(tv: TVConnection, appId: string): Promise<void> {
  await tv.send("ssap://system/launcher/launch", { id: appId });
}

/** Get list of installed apps. */
export async function getApps(tv: TVConnection): Promise<Array<{ id: string; title: string }>> {
  const res = await tv.send("ssap://com.webos.applicationManager/listApps");
  return (res.payload?.apps as Array<{ id: string; title: string }>) || [];
}

/** Get TV system info. */
export async function getSystemInfo(tv: TVConnection): Promise<Record<string, unknown>> {
  const res = await tv.send("ssap://system/getSystemInfo");
  return res.payload || {};
}

/** Turn on the TV (Wake-on-LAN must be enabled). */
export async function powerOn(tv: TVConnection): Promise<void> {
  await tv.send("ssap://system/turnOn");
}

/** Show a toast notification on the TV. */
export async function showToast(tv: TVConnection, message: string): Promise<void> {
  await tv.send("ssap://system.notifications/createToast", { message });
}

/** Simulate a remote control key press. */
export async function sendKey(tv: TVConnection, key: string): Promise<void> {
  // Uses the input socket for key simulation
  const res = await tv.send("ssap://com.webos.service.networkinput/getPointerInputSocket");
  const socketPath = res.payload?.socketPath as string;
  if (!socketPath) throw new Error("Could not get input socket");

  const inputWs = new WebSocket(socketPath);
  await new Promise<void>((resolve, reject) => {
    inputWs.on("open", () => {
      inputWs.send(`type:button\nname:${key}\n\n`);
      setTimeout(() => {
        inputWs.close();
        resolve();
      }, 200);
    });
    inputWs.on("error", reject);
  });
}
