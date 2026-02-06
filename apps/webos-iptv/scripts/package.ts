#!/usr/bin/env bun
import { bundleWebOSApp } from "../src/build/bundler.js";
import { packageWebOSApp } from "../src/build/packager.js";

console.log("Building webOS IPTV app...");
const dist = await bundleWebOSApp();
console.log(`Built to: ${dist}`);

console.log("Packaging...");
const ipk = packageWebOSApp(dist);
console.log(`Package created: ${ipk}`);
