/**
 * Shaka Player configuration optimized for LG webOS TVs.
 * These settings come from LG's own recommendations and Shaka's webOS defaults.
 */
export function getWebOSShakaConfig(): Record<string, unknown> {
  return {
    streaming: {
      // webOS stall handling — don't skip on stall, let the buffer recover
      stallEnabled: true,
      stallSkip: 0,
      // Buffer goals tuned for live IPTV
      bufferingGoal: 30,
      rebufferingGoal: 5,
      bufferBehind: 30,
      // Retry on network errors
      retryParameters: {
        maxAttempts: 5,
        baseDelay: 1000,
        backoffFactor: 2,
        fuzzFactor: 0.5,
      },
      // Limit gap-jumping to avoid decoder issues
      smallGapLimit: 0.5,
      jumpLargeGaps: true,
    },
    manifest: {
      dash: {
        ignoreMinBufferTime: true,
      },
      hls: {
        // Required for stable playback on webOS
        sequenceMode: true,
        ignoreManifestProgramDateTime: true,
      },
      retryParameters: {
        maxAttempts: 5,
        baseDelay: 1000,
        backoffFactor: 2,
      },
    },
    abr: {
      // Start with a reasonable estimate for Indian broadband
      defaultBandwidthEstimate: 5_000_000,
      switchInterval: 8,
      bandwidthUpgradeTarget: 0.85,
      bandwidthDowngradeTarget: 0.95,
    },
    drm: {
      retryParameters: {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffFactor: 2,
      },
    },
  };
}
