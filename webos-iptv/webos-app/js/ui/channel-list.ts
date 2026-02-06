import type { IptvChannel } from "../../src/playlist/types.js";

let activeGroup = "all";
let focusedIndex = 0;
let onSelectCallback: ((channel: IptvChannel) => void) | null = null;
let filteredChannels: IptvChannel[] = [];
let allChannels: IptvChannel[] = [];
let favoriteUrls: Set<string> = new Set();

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/** Initialize the channel list with data and callbacks. */
export function initChannelList(
  channels: IptvChannel[],
  groups: string[],
  favorites: Set<string>,
  onSelect: (channel: IptvChannel) => void,
): void {
  allChannels = channels;
  favoriteUrls = favorites;
  onSelectCallback = onSelect;
  renderGroups(groups);
  filterByGroup("all");
}

/** Update the favorites set and re-render current channel if needed. */
export function updateFavorites(favorites: Set<string>): void {
  favoriteUrls = favorites;
  renderChannelItems();
}

/** Show the channel sidebar. */
export function showChannelList(): void {
  const sidebar = $("channel-sidebar");
  if (sidebar) sidebar.classList.remove("hidden");
  focusCurrentItem();
}

/** Hide the channel sidebar. */
export function hideChannelList(): void {
  const sidebar = $("channel-sidebar");
  if (sidebar) sidebar.classList.add("hidden");
}

/** Navigate channel list up/down. */
export function navigateChannelList(direction: "up" | "down"): void {
  if (filteredChannels.length === 0) return;
  if (direction === "up") {
    focusedIndex = Math.max(0, focusedIndex - 1);
  } else {
    focusedIndex = Math.min(filteredChannels.length - 1, focusedIndex + 1);
  }
  focusCurrentItem();
}

/** Select the currently focused channel. */
export function selectFocusedChannel(): void {
  if (filteredChannels[focusedIndex] && onSelectCallback) {
    onSelectCallback(filteredChannels[focusedIndex]);
  }
}

/** Highlight a channel as currently playing. */
export function setActiveChannel(url: string): void {
  const list = $("channel-list");
  if (!list) return;
  for (const item of list.querySelectorAll(".channel-item")) {
    const el = item as HTMLElement;
    el.classList.toggle("active", el.dataset.url === url);
  }
}

/** Set the current channel as the focused one. */
export function setFocusedToChannel(url: string): void {
  const idx = filteredChannels.findIndex((ch) => ch.url === url);
  if (idx >= 0) {
    focusedIndex = idx;
    focusCurrentItem();
  }
}

function renderGroups(groups: string[]): void {
  const container = $("channel-groups");
  if (!container) return;

  container.innerHTML = "";
  const allGroups = ["all", "favorites", ...groups];

  for (const group of allGroups) {
    const btn = document.createElement("button");
    btn.className = `group-btn focusable${group === activeGroup ? " active" : ""}`;
    btn.dataset.group = group;
    btn.textContent = group === "all" ? "All" : group === "favorites" ? "Favorites" : group;
    btn.addEventListener("click", () => filterByGroup(group));
    btn.addEventListener("focus", () => filterByGroup(group));
    container.appendChild(btn);
  }
}

function filterByGroup(group: string): void {
  activeGroup = group;
  focusedIndex = 0;

  // Update group button styles
  const container = $("channel-groups");
  if (container) {
    for (const btn of container.querySelectorAll(".group-btn")) {
      const el = btn as HTMLElement;
      el.classList.toggle("active", el.dataset.group === group);
    }
  }

  // Filter channels
  if (group === "all") {
    filteredChannels = allChannels;
  } else if (group === "favorites") {
    filteredChannels = allChannels.filter((ch) => favoriteUrls.has(ch.url));
  } else {
    filteredChannels = allChannels.filter((ch) => ch.group === group);
  }

  renderChannelItems();
}

function renderChannelItems(): void {
  const list = $("channel-list");
  if (!list) return;

  list.innerHTML = "";

  for (const ch of filteredChannels) {
    const item = document.createElement("div");
    item.className = "channel-item focusable";
    item.tabIndex = 0;
    item.dataset.url = ch.url;
    item.dataset.index = String(ch.index);

    item.innerHTML = `
      <div class="channel-item-logo" style="background-image: ${ch.logo ? `url(${ch.logo})` : "none"}"></div>
      <div class="channel-item-info">
        <div class="channel-item-name">${escapeHtml(ch.name)}</div>
        <div class="channel-item-now"></div>
      </div>
      <div class="channel-item-fav${favoriteUrls.has(ch.url) ? " is-fav" : ""}">&#9733;</div>
      <div class="channel-item-number">${ch.index}</div>
    `;

    item.addEventListener("click", () => {
      onSelectCallback?.(ch);
    });
    item.addEventListener("keydown", (e) => {
      if (e.keyCode === 13) {
        onSelectCallback?.(ch);
      }
    });

    list.appendChild(item);
  }
}

function focusCurrentItem(): void {
  const list = $("channel-list");
  if (!list) return;

  const items = list.querySelectorAll(".channel-item");
  const item = items[focusedIndex] as HTMLElement | undefined;
  if (item) {
    item.focus();
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/** Update the "now playing" text for a channel in the list. */
export function updateChannelNowPlaying(url: string, text: string): void {
  const list = $("channel-list");
  if (!list) return;
  const item = list.querySelector(`.channel-item[data-url="${CSS.escape(url)}"]`);
  if (item) {
    const nowEl = item.querySelector(".channel-item-now");
    if (nowEl) nowEl.textContent = text;
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
