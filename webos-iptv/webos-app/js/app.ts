/**
 * Clawdbot IPTV — Main application entry point.
 * LG webOS TV app for Indian channels + world sports.
 */

import type { IptvChannel, IptvPlaylist } from "../src/playlist/types.js";
import { PlayerController } from "./player/player-controller.js";
import {
  initNavigation,
  initSpatialNavigation,
  setAppState,
  type NavigationCallbacks,
} from "./navigation.js";
import { checkNetwork, platformBack } from "./webos-api.js";
import { loadSettings, saveSettings, getSettings, showSettings, hideSettings } from "./ui/settings-panel.js";
import { showInfoBar, hideInfoBar } from "./ui/info-bar.js";
import {
  initChannelList,
  showChannelList,
  hideChannelList,
  navigateChannelList,
  selectFocusedChannel,
  setActiveChannel,
  setFocusedToChannel,
  updateFavorites,
  updateChannelNowPlaying,
} from "./ui/channel-list.js";
import { showEpg, hideEpg, renderEpg } from "./ui/epg-grid.js";
import {
  showNumberInput,
  hideNumberInput,
  getEnteredNumber,
  updateNumberPreview,
} from "./ui/number-input.js";
import { showToast } from "./ui/toast.js";
import { loadPlaylists } from "./data/playlist-manager.js";
import { loadEpg, getEpgStore, startEpgRefresh } from "./data/epg-manager.js";
import { loadFavorites, toggleFavorite, getFavorites } from "./data/favorites.js";
import {
  loadHistory,
  recordChannel,
  getLastChannel,
  getPreviousChannel,
} from "./data/channel-history.js";

// --- App State ---
let player: PlayerController;
let playlist: IptvPlaylist = { channels: [], groups: [], attributes: {} };
let currentChannel: IptvChannel | null = null;

// --- Initialization ---
async function init(): Promise<void> {
  // Load persisted data
  const settings = loadSettings();
  loadFavorites();
  loadHistory();

  // Initialize player
  player = new PlayerController();
  player.onEvent((event) => {
    switch (event.type) {
      case "playing":
        hideLoading();
        break;
      case "loading":
        showLoading("Connecting to stream...");
        break;
      case "error":
        showToast(`Stream error: ${event.message}`, "error", 5000);
        hideLoading();
        break;
      case "buffering":
        if (event.buffering) showLoading("Buffering...");
        else hideLoading();
        break;
    }
  });

  // Initialize navigation
  const callbacks = createNavigationCallbacks();
  initNavigation(callbacks);

  // Check network
  const online = await checkNetwork();
  if (!online) {
    showToast("No network connection — using cached data", "error", 5000);
  }

  // Load playlists
  showLoading("Loading channels...");
  try {
    playlist = await loadPlaylists(
      settings.playlists,
      settings.refreshIntervalMinutes,
    );

    if (playlist.channels.length === 0) {
      showLoading("No channels found. Press Blue for settings.");
      setAppState("viewing");
      return;
    }

    showToast(
      `Loaded ${playlist.channels.length} channels`,
      "success",
      3000,
    );
  } catch (err) {
    showToast("Failed to load playlists", "error", 5000);
    console.error("[App] Playlist load error:", err);
    setAppState("viewing");
    hideLoading();
    return;
  }

  // Initialize channel list UI
  initChannelList(
    playlist.channels,
    playlist.groups,
    getFavorites(),
    (channel) => tuneToChannel(channel),
  );

  // Init spatial navigation for focusable elements
  initSpatialNavigation();

  // Load EPG in background (non-blocking)
  loadEpg(settings.playlists)
    .then((store) => {
      // Update channel list with now-playing info
      for (const ch of playlist.channels) {
        const tvgId = ch.tvgId || ch.tvgName || "";
        if (tvgId) {
          const now = store.getNowPlaying(tvgId);
          if (now) updateChannelNowPlaying(ch.url, now.title);
        }
      }
      // Start periodic refresh
      startEpgRefresh(settings.playlists);
    })
    .catch((err) => {
      console.warn("[App] EPG load failed:", err);
    });

  // Auto-tune to last channel or show channel list
  const lastUrl = getLastChannel();
  const lastChannel = lastUrl
    ? playlist.channels.find((ch) => ch.url === lastUrl)
    : undefined;

  if (lastChannel) {
    tuneToChannel(lastChannel);
  } else {
    hideLoading();
    setAppState("channel-list");
    showChannelList();
  }
}

// --- Channel Tuning ---
function tuneToChannel(channel: IptvChannel): void {
  currentChannel = channel;
  recordChannel(channel.url);

  // Update UI
  setActiveChannel(channel.url);
  hideChannelList();
  hideEpg();
  hideSettings();
  hideNumberInput();
  setAppState("viewing");

  // Show info bar
  const store = getEpgStore();
  const tvgId = channel.tvgId || channel.tvgName || "";
  const nowPlaying = tvgId ? store.getNowPlaying(tvgId) : undefined;
  const upNext = tvgId ? store.getUpNext(tvgId) : undefined;
  showInfoBar(channel, nowPlaying, upNext);

  // Play stream
  player.play(channel.url);
}

function tuneToIndex(index: number): void {
  const channel = playlist.channels.find((ch) => ch.index === index);
  if (channel) {
    tuneToChannel(channel);
  } else {
    showToast(`Channel ${index} not found`, "error");
  }
}

function tuneRelative(offset: number): void {
  if (!currentChannel || playlist.channels.length === 0) return;
  const currentIdx = playlist.channels.findIndex(
    (ch) => ch.url === currentChannel!.url,
  );
  let newIdx = currentIdx + offset;
  if (newIdx < 0) newIdx = playlist.channels.length - 1;
  if (newIdx >= playlist.channels.length) newIdx = 0;
  tuneToChannel(playlist.channels[newIdx]);
}

// --- Navigation Callbacks ---
function createNavigationCallbacks(): NavigationCallbacks {
  return {
    onChannelUp: () => tuneRelative(-1),
    onChannelDown: () => tuneRelative(1),

    onShowChannelList: () => {
      setAppState("channel-list");
      showChannelList();
      if (currentChannel) setFocusedToChannel(currentChannel.url);
    },
    onHideChannelList: () => {
      setAppState("viewing");
      hideChannelList();
    },

    onShowEpg: () => {
      setAppState("epg");
      renderEpg(playlist.channels, getEpgStore(), tuneToChannel);
      showEpg();
    },
    onHideEpg: () => {
      setAppState("viewing");
      hideEpg();
    },

    onShowSettings: () => {
      setAppState("settings");
      showSettings();
    },
    onHideSettings: () => {
      setAppState("viewing");
      hideSettings();
    },

    onToggleFavorite: () => {
      if (!currentChannel) return;
      const isFav = toggleFavorite(currentChannel.url);
      updateFavorites(getFavorites());
      showToast(
        isFav
          ? `Added ${currentChannel.name} to favorites`
          : `Removed ${currentChannel.name} from favorites`,
        "success",
        2000,
      );
    },

    onTogglePlayPause: () => {
      player.togglePlayPause();
    },

    onNumberInput: (digit) => {
      showNumberInput(digit);
      updateNumberPreview(playlist.channels);
    },
    onNumberConfirm: () => {
      const num = getEnteredNumber();
      hideNumberInput();
      setAppState("viewing");
      if (num > 0) tuneToIndex(num);
    },
    onNumberCancel: () => {
      hideNumberInput();
      setAppState("viewing");
    },

    onBack: () => {
      // If there's a previous channel, go back to it
      const prevUrl = getPreviousChannel();
      if (prevUrl && prevUrl !== currentChannel?.url) {
        const prevCh = playlist.channels.find((ch) => ch.url === prevUrl);
        if (prevCh) {
          tuneToChannel(prevCh);
          return;
        }
      }
      // Otherwise trigger webOS exit
      platformBack();
    },

    onSelectChannel: () => {
      selectFocusedChannel();
    },

    onChannelListNavigate: (direction) => {
      navigateChannelList(direction);
    },

    onEpgNavigate: () => {
      // Handled by spatial navigation
    },
    onEpgSelect: () => {
      // Handled by spatial navigation click handlers
    },

    onSettingsNavigate: () => {
      // Handled by spatial navigation
    },
    onSettingsSelect: () => {
      // Handled by spatial navigation click handlers
    },

    onShowInfo: () => {
      if (!currentChannel) return;
      const store = getEpgStore();
      const tvgId = currentChannel.tvgId || currentChannel.tvgName || "";
      const nowPlaying = tvgId ? store.getNowPlaying(tvgId) : undefined;
      const upNext = tvgId ? store.getUpNext(tvgId) : undefined;
      showInfoBar(currentChannel, nowPlaying, upNext, 8000);
    },
  };
}

// --- Loading Screen ---
function showLoading(text: string): void {
  const loading = document.getElementById("loading");
  const loadingText = document.getElementById("loading-text");
  if (loading) loading.classList.remove("hidden");
  if (loadingText) loadingText.textContent = text;
}

function hideLoading(): void {
  const loading = document.getElementById("loading");
  if (loading) loading.classList.add("hidden");
}

// --- Start ---
document.addEventListener("DOMContentLoaded", init);
