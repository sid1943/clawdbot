/** A single programme entry from XMLTV EPG data. */
export type EpgProgramme = {
  channelId: string;
  title: string;
  description?: string;
  start: Date;
  stop: Date;
  category?: string;
  icon?: string;
};

/** A channel entry from XMLTV EPG data. */
export type EpgChannel = {
  id: string;
  displayName: string;
  icon?: string;
};

/** Complete parsed EPG dataset. */
export type EpgData = {
  channels: EpgChannel[];
  programmes: EpgProgramme[];
};
