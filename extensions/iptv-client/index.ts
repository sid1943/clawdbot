import { iptvConfigSchema, parseIptvConfig } from "./src/config.js";
import { registerIptvCli } from "./src/cli.js";

const iptvClientPlugin = {
  id: "iptv-client",
  name: "IPTV Client",
  description: "IPTV client for LG webOS TVs — Indian channels + world sports",
  configSchema: iptvConfigSchema,

  register(api: {
    pluginConfig: unknown;
    logger: { info(msg: string): void; error(msg: string): void; warn(msg: string): void };
    registerCli(
      fn: (opts: { program: unknown }) => void,
      opts: { commands: string[] },
    ): void;
  }) {
    const config = parseIptvConfig(api.pluginConfig);

    api.registerCli(
      ({ program }) =>
        registerIptvCli({
          program: program as Parameters<typeof registerIptvCli>[0]["program"],
          config,
          logger: api.logger,
        }),
      { commands: ["iptv"] },
    );
  },
};

export default iptvClientPlugin;
