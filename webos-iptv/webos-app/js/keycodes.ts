/** LG webOS TV remote control key codes. */
export const Key = {
  // Directional
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  ENTER: 13,

  // webOS-specific
  BACK: 461,

  // Color buttons
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,

  // Media controls
  PLAY: 415,
  PAUSE: 19,
  STOP: 413,
  REWIND: 412,
  FAST_FORWARD: 417,

  // Channel controls
  CHANNEL_UP: 33,
  CHANNEL_DOWN: 34,

  // Number keys
  NUM_0: 48,
  NUM_1: 49,
  NUM_2: 50,
  NUM_3: 51,
  NUM_4: 52,
  NUM_5: 53,
  NUM_6: 54,
  NUM_7: 55,
  NUM_8: 56,
  NUM_9: 57,
} as const;

/** Check if a keyCode corresponds to a number key (0-9). */
export function isNumberKey(keyCode: number): boolean {
  return keyCode >= Key.NUM_0 && keyCode <= Key.NUM_9;
}

/** Convert a number keyCode to its digit value. */
export function keyToDigit(keyCode: number): number {
  return keyCode - Key.NUM_0;
}
