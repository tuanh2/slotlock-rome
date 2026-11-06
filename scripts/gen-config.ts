// Project the registry config to a static JSON the browser bundle can import
// (@rome-protocol/registry reads the filesystem, so it can't run in the browser).
// Runs before `dev` / `build`. Reads .env overrides + the deployed SLOTLOCK_ADDRESS.
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { loadConfig } from "../lib/config.js";

const cfg = loadConfig({
  chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined,
  proxyUrl: process.env.PROXY_URL,
  solanaRpc: process.env.SOLANA_RPC,
});

const out = {
  ...cfg,
  slotlock: (process.env.SLOTLOCK_ADDRESS || null) as string | null,
};

writeFileSync(new URL("../src/config.generated.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(
  "wrote src/config.generated.json —",
  `chain ${out.chainId}`,
  out.slotlock ? `slotlock ${out.slotlock}` : "(deploy SlotLock, then set SLOTLOCK_ADDRESS)"
);
