#!/usr/bin/env bun
import { bundleWebOSApp } from "../src/build/bundler.js";
import { packageWebOSApp } from "../src/build/packager.js";
import { deployToTV, listDevices } from "../src/build/deployer.js";

const device = process.argv[2];
if (!device) {
  console.error("Usage: bun run scripts/deploy.ts <device-name>");
  console.log("\nRegistered devices:");
  console.log(listDevices());
  process.exit(1);
}

console.log("Building...");
const dist = await bundleWebOSApp();
console.log("Packaging...");
const ipk = packageWebOSApp(dist);
console.log(`Deploying to ${device}...`);
deployToTV(ipk, device);
