import { detectStreamType, needsShaka } from "./stream-detector.js";
import { getWebOSShakaConfig } from "./shaka-config.js";

declare const shaka: {
  Player: new (video: HTMLVideoElement) => ShakaPlayer;
  polyfill: { installAll(): void };
  Player: { isBrowserSupported(): boolean } & (new (video: HTMLVideoElement) => ShakaPlayer);
};

type ShakaPlayer = {
  configure(config: Record<string, unknown>): void;
  load(uri: string): Promise<void>;
  unload(): Promise<void>;
  destroy(): Promise<void>;
  addEventListener(event: string, handler: (e: unknown) => void): void;
  getMediaElement(): HTMLVideoElement | null;
  isLive(): boolean;
};

export type PlayerEventCallback = (event: PlayerEvent) => void;

export type PlayerEvent =
  | { type: "loading"; url: string }
  | { type: "playing"; url: string }
  | { type: "error"; message: string; url: string }
  | { type: "buffering"; buffering: boolean }
  | { type: "ended" };

/**
 * Video player controller wrapping Shaka Player for MSE-based streams
 * and native <video> for direct TS/MP4 streams.
 */
export class PlayerController {
  private videoEl: HTMLVideoElement;
  private shakaPlayer: ShakaPlayer | null = null;
  private currentUrl = "";
  private listener: PlayerEventCallback | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(videoElementId = "video-player") {
    this.videoEl = document.getElementById(videoElementId) as HTMLVideoElement;
    this.initShaka();
    this.setupVideoEvents();
  }

  private initShaka(): void {
    if (typeof shaka === "undefined") return;
    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      console.warn("[PlayerController] Shaka Player not supported on this browser");
    }
  }

  private setupVideoEvents(): void {
    this.videoEl.addEventListener("playing", () => {
      this.retryCount = 0;
      this.emit({ type: "playing", url: this.currentUrl });
    });

    this.videoEl.addEventListener("waiting", () => {
      this.emit({ type: "buffering", buffering: true });
    });

    this.videoEl.addEventListener("ended", () => {
      this.emit({ type: "ended" });
    });

    this.videoEl.addEventListener("error", () => {
      const mediaError = this.videoEl.error;
      const msg = mediaError
        ? `Video error: code ${mediaError.code} - ${mediaError.message}`
        : "Unknown video error";
      this.handleError(msg);
    });
  }

  onEvent(callback: PlayerEventCallback): void {
    this.listener = callback;
  }

  private emit(event: PlayerEvent): void {
    this.listener?.(event);
  }

  /** Load and play a stream URL. Automatically detects stream type. */
  async play(url: string): Promise<void> {
    this.clearRetryTimeout();
    this.currentUrl = url;
    this.retryCount = 0;
    this.emit({ type: "loading", url });

    // Destroy existing Shaka instance to avoid decoder issues on webOS
    await this.destroyShaka();

    const streamType = detectStreamType(url);

    if (needsShaka(streamType) && typeof shaka !== "undefined" && shaka.Player.isBrowserSupported()) {
      await this.playWithShaka(url);
    } else {
      this.playNative(url);
    }
  }

  private async playWithShaka(url: string): Promise<void> {
    try {
      this.shakaPlayer = new shaka.Player(this.videoEl);
      this.shakaPlayer.configure(getWebOSShakaConfig());

      this.shakaPlayer.addEventListener("error", (e: unknown) => {
        const detail = (e as { detail?: { message?: string } })?.detail;
        this.handleError(detail?.message || "Shaka playback error");
      });

      this.shakaPlayer.addEventListener("buffering", (e: unknown) => {
        const buffering = (e as { buffering?: boolean })?.buffering ?? false;
        this.emit({ type: "buffering", buffering });
      });

      await this.shakaPlayer.load(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Fall back to native playback
      console.warn(`[PlayerController] Shaka failed, trying native: ${msg}`);
      await this.destroyShaka();
      this.playNative(url);
    }
  }

  private playNative(url: string): void {
    this.videoEl.src = url;
    this.videoEl.load();
    this.videoEl.play().catch((err) => {
      this.handleError(err instanceof Error ? err.message : String(err));
    });
  }

  private handleError(message: string): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = 1000 * 2 ** this.retryCount;
      console.warn(
        `[PlayerController] Retry ${this.retryCount}/${this.maxRetries} in ${delay}ms: ${message}`,
      );
      this.retryTimeout = setTimeout(() => {
        this.play(this.currentUrl);
      }, delay);
    } else {
      this.emit({ type: "error", message, url: this.currentUrl });
    }
  }

  private async destroyShaka(): Promise<void> {
    if (this.shakaPlayer) {
      try {
        await this.shakaPlayer.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.shakaPlayer = null;
    }
  }

  /** Stop playback and clean up. */
  async stop(): Promise<void> {
    this.clearRetryTimeout();
    await this.destroyShaka();
    this.videoEl.removeAttribute("src");
    this.videoEl.load();
    this.currentUrl = "";
  }

  /** Toggle play/pause. */
  togglePlayPause(): void {
    if (this.videoEl.paused) {
      this.videoEl.play().catch(() => {});
    } else {
      this.videoEl.pause();
    }
  }

  /** Check if currently playing. */
  isPlaying(): boolean {
    return !this.videoEl.paused && !this.videoEl.ended;
  }

  /** Get the current stream URL. */
  getCurrentUrl(): string {
    return this.currentUrl;
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}
