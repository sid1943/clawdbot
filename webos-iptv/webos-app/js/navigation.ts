import { Key, isNumberKey, keyToDigit } from "./keycodes.js";

/**
 * Application states for the key handler state machine.
 * Only one state is active at a time.
 */
export type AppState =
  | "loading"
  | "viewing"
  | "channel-list"
  | "epg"
  | "settings"
  | "number-input";

export type NavigationCallbacks = {
  onChannelUp(): void;
  onChannelDown(): void;
  onShowChannelList(): void;
  onHideChannelList(): void;
  onShowEpg(): void;
  onHideEpg(): void;
  onShowSettings(): void;
  onHideSettings(): void;
  onToggleFavorite(): void;
  onTogglePlayPause(): void;
  onNumberInput(digit: number): void;
  onNumberConfirm(): void;
  onNumberCancel(): void;
  onBack(): void;
  onSelectChannel(index: number): void;
  onChannelListNavigate(direction: "up" | "down"): void;
  onEpgNavigate(direction: "up" | "down" | "left" | "right"): void;
  onEpgSelect(): void;
  onSettingsNavigate(direction: "up" | "down"): void;
  onSettingsSelect(): void;
  onShowInfo(): void;
};

let currentState: AppState = "loading";
let callbacks: NavigationCallbacks | null = null;
let numberTimeout: ReturnType<typeof setTimeout> | null = null;

export function getAppState(): AppState {
  return currentState;
}

export function setAppState(state: AppState): void {
  currentState = state;
}

export function initNavigation(cb: NavigationCallbacks): void {
  callbacks = cb;
  document.addEventListener("keydown", handleKeyDown);
}

/** Initialize js-spatial-navigation for focusable elements. */
export function initSpatialNavigation(): void {
  const SN = (window as unknown as Record<string, unknown>).SpatialNavigation as {
    init(): void;
    add(id: string, config: Record<string, unknown>): void;
    makeFocusable(): void;
    focus(section?: string): void;
  } | undefined;

  if (!SN) return;

  SN.init();
  SN.add("channel-list", {
    selector: "#channel-list .channel-item",
    defaultElement: "#channel-list .channel-item:first-child",
    enterTo: "last-focused",
  });
  SN.add("channel-groups", {
    selector: "#channel-groups .group-btn",
    defaultElement: "#channel-groups .group-btn:first-child",
  });
  SN.add("epg-grid", {
    selector: "#epg-grid .epg-programme",
    enterTo: "last-focused",
  });
  SN.add("settings", {
    selector: "#settings-panel .focusable",
    enterTo: "last-focused",
  });
  SN.makeFocusable();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!callbacks) return;
  const key = e.keyCode;

  switch (currentState) {
    case "loading":
      // Ignore all input while loading
      break;

    case "viewing":
      handleViewingKeys(key);
      break;

    case "channel-list":
      handleChannelListKeys(key);
      break;

    case "epg":
      handleEpgKeys(key);
      break;

    case "settings":
      handleSettingsKeys(key);
      break;

    case "number-input":
      handleNumberInputKeys(key);
      break;
  }

  // Prevent default for all handled keys to avoid webOS browser behavior
  if (key !== Key.BACK || currentState !== "viewing") {
    e.preventDefault();
  }
}

function handleViewingKeys(key: number): void {
  if (!callbacks) return;

  if (isNumberKey(key)) {
    setAppState("number-input");
    callbacks.onNumberInput(keyToDigit(key));
    startNumberTimeout();
    return;
  }

  switch (key) {
    case Key.UP:
    case Key.CHANNEL_UP:
      callbacks.onChannelUp();
      break;
    case Key.DOWN:
    case Key.CHANNEL_DOWN:
      callbacks.onChannelDown();
      break;
    case Key.ENTER:
      callbacks.onShowChannelList();
      break;
    case Key.RED:
      callbacks.onToggleFavorite();
      break;
    case Key.GREEN:
      callbacks.onShowEpg();
      break;
    case Key.YELLOW:
      callbacks.onShowInfo();
      break;
    case Key.BLUE:
      callbacks.onShowSettings();
      break;
    case Key.PLAY:
    case Key.PAUSE:
      callbacks.onTogglePlayPause();
      break;
    case Key.BACK:
      callbacks.onBack();
      break;
  }
}

function handleChannelListKeys(key: number): void {
  if (!callbacks) return;

  switch (key) {
    case Key.UP:
      callbacks.onChannelListNavigate("up");
      break;
    case Key.DOWN:
      callbacks.onChannelListNavigate("down");
      break;
    case Key.ENTER:
      // Selection handled by spatial navigation focus + enter
      callbacks.onSelectChannel(-1); // -1 = use currently focused
      break;
    case Key.BACK:
    case Key.LEFT:
      callbacks.onHideChannelList();
      break;
    case Key.RIGHT:
      callbacks.onShowEpg();
      break;
  }
}

function handleEpgKeys(key: number): void {
  if (!callbacks) return;

  switch (key) {
    case Key.UP:
      callbacks.onEpgNavigate("up");
      break;
    case Key.DOWN:
      callbacks.onEpgNavigate("down");
      break;
    case Key.LEFT:
      callbacks.onEpgNavigate("left");
      break;
    case Key.RIGHT:
      callbacks.onEpgNavigate("right");
      break;
    case Key.ENTER:
      callbacks.onEpgSelect();
      break;
    case Key.BACK:
      callbacks.onHideEpg();
      break;
  }
}

function handleSettingsKeys(key: number): void {
  if (!callbacks) return;

  switch (key) {
    case Key.UP:
      callbacks.onSettingsNavigate("up");
      break;
    case Key.DOWN:
      callbacks.onSettingsNavigate("down");
      break;
    case Key.ENTER:
      callbacks.onSettingsSelect();
      break;
    case Key.BACK:
      callbacks.onHideSettings();
      break;
  }
}

function handleNumberInputKeys(key: number): void {
  if (!callbacks) return;

  if (isNumberKey(key)) {
    callbacks.onNumberInput(keyToDigit(key));
    startNumberTimeout();
    return;
  }

  switch (key) {
    case Key.ENTER:
      clearNumberTimeout();
      callbacks.onNumberConfirm();
      break;
    case Key.BACK:
      clearNumberTimeout();
      callbacks.onNumberCancel();
      break;
  }
}

/** Auto-confirm number input after 3 seconds of no key presses. */
function startNumberTimeout(): void {
  clearNumberTimeout();
  numberTimeout = setTimeout(() => {
    if (callbacks && currentState === "number-input") {
      callbacks.onNumberConfirm();
    }
  }, 3000);
}

function clearNumberTimeout(): void {
  if (numberTimeout !== null) {
    clearTimeout(numberTimeout);
    numberTimeout = null;
  }
}
