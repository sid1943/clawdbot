import type { IptvChannel } from "../../src/playlist/types.js";

let digits = "";

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/** Show the number input overlay and add a digit. */
export function showNumberInput(digit: number): void {
  digits += String(digit);

  const overlay = $("number-input");
  if (overlay) overlay.classList.remove("hidden");

  const digitsEl = $("number-input-digits");
  if (digitsEl) digitsEl.textContent = digits;
}

/** Update the channel preview based on entered digits. */
export function updateNumberPreview(
  channels: IptvChannel[],
): IptvChannel | undefined {
  const num = Number.parseInt(digits, 10);
  const channel = channels.find((ch) => ch.index === num);

  const previewEl = $("number-input-channel");
  if (previewEl) {
    previewEl.textContent = channel ? channel.name : "---";
  }

  return channel;
}

/** Get the entered channel number and reset. */
export function getEnteredNumber(): number {
  const num = Number.parseInt(digits, 10);
  return Number.isNaN(num) ? -1 : num;
}

/** Hide the number input overlay and reset digits. */
export function hideNumberInput(): void {
  digits = "";
  const overlay = $("number-input");
  if (overlay) overlay.classList.add("hidden");

  const digitsEl = $("number-input-digits");
  if (digitsEl) digitsEl.textContent = "";

  const previewEl = $("number-input-channel");
  if (previewEl) previewEl.textContent = "";
}
