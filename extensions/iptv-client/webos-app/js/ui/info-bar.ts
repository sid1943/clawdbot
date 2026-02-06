import type { IptvChannel } from "../../src/playlist/types.js";
import type { EpgProgramme } from "../../src/epg/types.js";

let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/** Show the info bar for a channel with optional EPG data. */
export function showInfoBar(
  channel: IptvChannel,
  nowPlaying?: EpgProgramme,
  upNext?: EpgProgramme,
  autoHideMs = 5000,
): void {
  const bar = $("info-bar");
  if (!bar) return;

  // Channel logo
  const logo = $("info-bar-logo");
  if (logo) {
    logo.style.backgroundImage = channel.logo ? `url(${channel.logo})` : "none";
  }

  // Channel number + name
  const numEl = $("info-bar-number");
  if (numEl) numEl.textContent = `CH ${channel.index}`;

  const nameEl = $("info-bar-name");
  if (nameEl) nameEl.textContent = channel.name;

  // Now playing
  const nowTitle = $("info-now-title");
  const nowTime = $("info-now-time");
  if (nowTitle) nowTitle.textContent = nowPlaying?.title || "No info";
  if (nowTime) {
    nowTime.textContent = nowPlaying
      ? `${formatTime(nowPlaying.start)} - ${formatTime(nowPlaying.stop)}`
      : "";
  }

  // Up next
  const nextTitle = $("info-next-title");
  const nextTime = $("info-next-time");
  if (nextTitle) nextTitle.textContent = upNext?.title || "";
  if (nextTime) {
    nextTime.textContent = upNext
      ? `${formatTime(upNext.start)} - ${formatTime(upNext.stop)}`
      : "";
  }

  // Progress bar for current programme
  if (nowPlaying) {
    const fill = $("info-bar-progress-fill");
    if (fill) {
      const now = Date.now();
      const total = nowPlaying.stop.getTime() - nowPlaying.start.getTime();
      const elapsed = now - nowPlaying.start.getTime();
      const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
      fill.style.width = `${pct}%`;
    }
  }

  // Show
  bar.classList.remove("hidden");

  // Auto-hide
  if (hideTimeout) clearTimeout(hideTimeout);
  if (autoHideMs > 0) {
    hideTimeout = setTimeout(() => hideInfoBar(), autoHideMs);
  }
}

/** Hide the info bar. */
export function hideInfoBar(): void {
  const bar = $("info-bar");
  if (bar) bar.classList.add("hidden");
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
