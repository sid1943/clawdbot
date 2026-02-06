import type { IptvClientConfig } from "./config.js";
import { bundleWebOSApp } from "./build/bundler.js";
import { packageWebOSApp } from "./build/packager.js";
import { deployToTV, inspectApp, listDevices } from "./build/deployer.js";

type CliProgram = {
  command(name: string): CliCommand;
};

type CliCommand = {
  description(desc: string): CliCommand;
  option(flags: string, desc: string, defaultVal?: unknown): CliCommand;
  action(fn: (...args: unknown[]) => void | Promise<void>): CliCommand;
};

type RegisterOpts = {
  program: CliProgram;
  config: IptvClientConfig;
  logger: { info(msg: string): void; error(msg: string): void };
};

export function registerIptvCli({ program, config, logger }: RegisterOpts): void {
  const iptv = program.command("iptv").description("IPTV client for LG webOS TVs");

  iptv
    .command("build")
    .description("Bundle the webOS IPTV app for deployment")
    .option("-o, --output <dir>", "Output directory")
    .action(async (opts: Record<string, unknown>) => {
      logger.info("Building webOS IPTV app...");
      const dist = await bundleWebOSApp(opts.output as string | undefined);
      logger.info(`Built to: ${dist}`);
    });

  iptv
    .command("package")
    .description("Package the built app into an .ipk file")
    .action(async () => {
      logger.info("Building...");
      const dist = await bundleWebOSApp();
      logger.info("Packaging...");
      const ipk = packageWebOSApp(dist);
      logger.info(`Package created: ${ipk}`);
    });

  iptv
    .command("deploy")
    .description("Build, package, and install on a webOS TV")
    .option("-d, --device <name>", "Target device name", config.defaultDevice)
    .action(async (opts: Record<string, unknown>) => {
      const device = (opts.device as string) || config.defaultDevice;
      if (!device) {
        logger.error("No device specified. Use --device or set defaultDevice in config.");
        logger.info("Registered devices:\n" + listDevices());
        return;
      }
      logger.info("Building...");
      const dist = await bundleWebOSApp();
      logger.info("Packaging...");
      const ipk = packageWebOSApp(dist);
      logger.info(`Deploying to ${device}...`);
      deployToTV(ipk, device);
    });

  iptv
    .command("dev")
    .description("Build, package, deploy, and open inspector")
    .option("-d, --device <name>", "Target device name", config.defaultDevice)
    .action(async (opts: Record<string, unknown>) => {
      const device = (opts.device as string) || config.defaultDevice;
      if (!device) {
        logger.error("No device specified. Use --device or set defaultDevice in config.");
        return;
      }
      logger.info("Building...");
      const dist = await bundleWebOSApp();
      logger.info("Packaging...");
      const ipk = packageWebOSApp(dist);
      logger.info(`Deploying to ${device}...`);
      deployToTV(ipk, device);
      logger.info("Opening inspector...");
      inspectApp(device);
    });

  iptv
    .command("inspect")
    .description("Open Chrome DevTools for the running app")
    .option("-d, --device <name>", "Target device name", config.defaultDevice)
    .action((opts: Record<string, unknown>) => {
      const device = (opts.device as string) || config.defaultDevice;
      if (!device) {
        logger.error("No device specified.");
        return;
      }
      inspectApp(device);
    });

  iptv
    .command("devices")
    .description("List registered webOS TV devices")
    .action(() => {
      logger.info(listDevices());
    });
}
