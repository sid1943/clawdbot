import type { EpgData, EpgProgramme } from "./types.js";

/**
 * In-memory EPG store with fast channel-based lookups.
 * Programmes are sorted by start time per channel.
 */
export class EpgStore {
  private byChannel = new Map<string, EpgProgramme[]>();

  load(data: EpgData): void {
    this.byChannel.clear();
    for (const prog of data.programmes) {
      let list = this.byChannel.get(prog.channelId);
      if (!list) {
        list = [];
        this.byChannel.set(prog.channelId, list);
      }
      list.push(prog);
    }
    // Sort each channel's programmes by start time
    for (const list of this.byChannel.values()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
  }

  /** Get the currently airing programme for a channel. */
  getNowPlaying(channelId: string, now = new Date()): EpgProgramme | undefined {
    const list = this.byChannel.get(channelId);
    if (!list) return undefined;
    const ts = now.getTime();
    return list.find((p) => p.start.getTime() <= ts && p.stop.getTime() > ts);
  }

  /** Get the next programme after the current one. */
  getUpNext(channelId: string, now = new Date()): EpgProgramme | undefined {
    const list = this.byChannel.get(channelId);
    if (!list) return undefined;
    const ts = now.getTime();
    return list.find((p) => p.start.getTime() > ts);
  }

  /** Get all programmes for a channel within a time range. */
  getProgrammes(
    channelId: string,
    start: Date,
    end: Date,
  ): EpgProgramme[] {
    const list = this.byChannel.get(channelId);
    if (!list) return [];
    const startTs = start.getTime();
    const endTs = end.getTime();
    return list.filter(
      (p) => p.stop.getTime() > startTs && p.start.getTime() < endTs,
    );
  }

  /** Get all channel IDs that have EPG data. */
  getChannelIds(): string[] {
    return [...this.byChannel.keys()];
  }

  /** Check if a channel has any EPG data. */
  hasChannel(channelId: string): boolean {
    return this.byChannel.has(channelId);
  }

  clear(): void {
    this.byChannel.clear();
  }
}
