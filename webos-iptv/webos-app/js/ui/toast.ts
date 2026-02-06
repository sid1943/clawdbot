/** Show a brief toast notification. Auto-dismisses after duration. */
export function showToast(
  message: string,
  type: "info" | "success" | "error" = "info",
  durationMs = 3000,
): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add("toast-out");
    el.addEventListener("animationend", () => el.remove());
  }, durationMs);
}
