import type { IptvChannel } from "../../src/playlist/types.js";
import type { EpgProgramme } from "../../src/epg/types.js";
import type { EpgStore } from "../../src/epg/epg-store.js";

const SLOT_WIDTH = 280; // px per 30min slot
const ROW_HEIGHT = 80;
const HOURS_VISIBLE = 4;
let onTuneCallback: ((channel: IptvChannel) => void) | null = null;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/** Show the EPG grid overlay. */
export function showEpg(): void {
  const container = $("epg-container");
  if (container) container.classList.remove("hidden");
}

/** Hide the EPG grid overlay. */
export function hideEpg(): void {
  const container = $("epg-container");
  if (container) container.classList.add("hidden");
}

/** Render the EPG grid for the given channels and EPG store. */
export function renderEpg(
  channels: IptvChannel[],
  epgStore: EpgStore,
  onTune: (channel: IptvChannel) => void,
): void {
  onTuneCallback = onTune;

  const now = new Date();
  // Round down to nearest 30 minutes
  const startTime = new Date(now);
  startTime.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);

  const endTime = new Date(startTime.getTime() + HOURS_VISIBLE * 60 * 60_000);

  renderTimeline(startTime, endTime);
  renderGrid(channels, epgStore, startTime, endTime, now);
}

function renderTimeline(start: Date, end: Date): void {
  const timeline = $("epg-timeline");
  if (!timeline) return;

  timeline.innerHTML = "";
  const now = new Date();
  let time = new Date(start);

  while (time < end) {
    const slot = document.createElement("div");
    slot.className = "epg-time-slot";
    if (time <= now && new Date(time.getTime() + 30 * 60_000) > now) {
      slot.classList.add("now");
    }
    slot.textContent = time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    slot.style.width = `${SLOT_WIDTH}px`;
    timeline.appendChild(slot);
    time = new Date(time.getTime() + 30 * 60_000);
  }
}

function renderGrid(
  channels: IptvChannel[],
  epgStore: EpgStore,
  start: Date,
  end: Date,
  now: Date,
): void {
  const grid = $("epg-grid");
  if (!grid) return;

  grid.innerHTML = "";
  const totalMinutes = (end.getTime() - start.getTime()) / 60_000;
  const pxPerMinute = (SLOT_WIDTH * (totalMinutes / 30)) / totalMinutes;

  for (const channel of channels) {
    const row = document.createElement("div");
    row.className = "epg-row";
    row.style.height = `${ROW_HEIGHT}px`;

    // Channel info column (sticky left)
    const chCol = document.createElement("div");
    chCol.className = "epg-row-channel";
    chCol.innerHTML = `
      <div class="epg-row-channel-logo" style="background-image: ${channel.logo ? `url(${channel.logo})` : "none"}"></div>
      <div class="epg-row-channel-name">${escapeHtml(channel.name)}</div>
    `;
    row.appendChild(chCol);

    // Programmes
    const progsCol = document.createElement("div");
    progsCol.className = "epg-row-programmes";

    const tvgId = channel.tvgId || channel.tvgName || "";
    const programmes = tvgId
      ? epgStore.getProgrammes(tvgId, start, end)
      : [];

    if (programmes.length === 0) {
      // Empty row — no EPG data
      const empty = document.createElement("div");
      empty.className = "epg-programme focusable";
      empty.tabIndex = 0;
      empty.style.width = `${totalMinutes * pxPerMinute}px`;
      empty.innerHTML = `<div class="epg-programme-title">No programme info</div>`;
      empty.addEventListener("click", () => onTuneCallback?.(channel));
      progsCol.appendChild(empty);
    } else {
      for (const prog of programmes) {
        const progEl = createProgrammeCell(
          prog,
          channel,
          start,
          end,
          now,
          pxPerMinute,
        );
        progsCol.appendChild(progEl);
      }
    }

    row.appendChild(progsCol);
    grid.appendChild(row);
  }

  // Current time marker
  const nowOffset =
    ((now.getTime() - start.getTime()) / 60_000) * pxPerMinute;
  if (nowOffset >= 0 && nowOffset <= totalMinutes * pxPerMinute) {
    const marker = document.createElement("div");
    marker.className = "epg-now-marker";
    // Account for the channel column width (240px)
    marker.style.left = `${240 + nowOffset}px`;
    grid.appendChild(marker);
  }
}

function createProgrammeCell(
  prog: EpgProgramme,
  channel: IptvChannel,
  gridStart: Date,
  gridEnd: Date,
  now: Date,
  pxPerMinute: number,
): HTMLElement {
  const visibleStart = Math.max(prog.start.getTime(), gridStart.getTime());
  const visibleEnd = Math.min(prog.stop.getTime(), gridEnd.getTime());
  const durationMin = (visibleEnd - visibleStart) / 60_000;
  const width = durationMin * pxPerMinute;

  const el = document.createElement("div");
  el.className = "epg-programme focusable";
  el.tabIndex = 0;
  if (prog.category) el.dataset.category = prog.category;

  const isNow =
    prog.start.getTime() <= now.getTime() &&
    prog.stop.getTime() > now.getTime();
  if (isNow) el.classList.add("now-playing");

  el.style.width = `${Math.max(width, 40)}px`;

  const startStr = prog.start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endStr = prog.stop.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  el.innerHTML = `
    <div class="epg-programme-title">${escapeHtml(prog.title)}</div>
    <div class="epg-programme-time">${startStr} - ${endStr}</div>
  `;

  el.addEventListener("click", () => onTuneCallback?.(channel));

  return el;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
