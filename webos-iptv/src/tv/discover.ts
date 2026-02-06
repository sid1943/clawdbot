/**
 * LG TV network discovery via SSDP (Simple Service Discovery Protocol).
 * LG webOS TVs advertise themselves as UPnP devices on the local network.
 * Falls back to port scanning if SSDP fails.
 */

import { createSocket } from "node:dgram";
import { createConnection } from "node:net";

const SSDP_ADDR = "239.255.255.250";
const SSDP_PORT = 1900;
const SSDP_SEARCH = [
  "M-SEARCH * HTTP/1.1",
  `HOST: ${SSDP_ADDR}:${SSDP_PORT}`,
  'MAN: "ssdp:discover"',
  "MX: 3",
  "ST: urn:lge-com:service:webos-second-screen:1",
  "",
  "",
].join("\r\n");

export type DiscoveredTV = {
  ip: string;
  name?: string;
  model?: string;
};

/** Discover LG TVs on the local network via SSDP. */
export function discoverTVs(timeoutMs = 5000): Promise<DiscoveredTV[]> {
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredTV>();
    const socket = createSocket({ type: "udp4", reuseAddr: true });

    socket.on("message", (msg, rinfo) => {
      const text = msg.toString();
      // LG webOS TVs include "LG" or "webOS" in their SSDP responses
      if (text.includes("LG") || text.includes("webos") || text.includes("WebOS")) {
        const ip = rinfo.address;
        if (!found.has(ip)) {
          // Try to extract friendly name from headers
          const nameMatch = text.match(/DLNADeviceName\.lge\.com:\s*(.+)/i);
          const modelMatch = text.match(/modelName:\s*(.+)/i);
          found.set(ip, {
            ip,
            name: nameMatch?.[1]?.trim(),
            model: modelMatch?.[1]?.trim(),
          });
        }
      }
    });

    socket.on("error", () => {
      socket.close();
      resolve([]);
    });

    socket.bind(() => {
      socket.addMembership(SSDP_ADDR);
      socket.send(SSDP_SEARCH, 0, SSDP_SEARCH.length, SSDP_PORT, SSDP_ADDR);
      // Send twice for reliability
      setTimeout(() => {
        socket.send(SSDP_SEARCH, 0, SSDP_SEARCH.length, SSDP_PORT, SSDP_ADDR);
      }, 500);
    });

    setTimeout(() => {
      socket.close();
      resolve([...found.values()]);
    }, timeoutMs);
  });
}

/** Fallback: scan common ports to find webOS TVs. Port 3000 = SSAP WebSocket. */
export async function scanForTV(subnet: string, timeoutMs = 3000): Promise<string[]> {
  const base = subnet.replace(/\.\d+$/, "");
  const results: string[] = [];
  const checks: Promise<void>[] = [];

  for (let i = 1; i <= 254; i++) {
    const ip = `${base}.${i}`;
    checks.push(
      checkPort(ip, 3000, timeoutMs).then((open) => {
        if (open) results.push(ip);
      }),
    );
  }

  await Promise.all(checks);
  return results;
}

function checkPort(host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = createConnection({ host, port, timeout });
    sock.on("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.on("timeout", () => {
      sock.destroy();
      resolve(false);
    });
  });
}
