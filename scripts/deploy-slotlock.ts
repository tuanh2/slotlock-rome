import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, type Account, type Hex } from "viem";
import { loadConfig, type RomeConfig } from "../lib/config.js";
import { requireEvmKey } from "../lib/keys.js";
import { compileSlotLock } from "./compile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function romeChain(cfg: RomeConfig) {
  return {
    id: cfg.chainId,
    name: "Rome Hadrian",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [cfg.proxyUrl] } },
  } as const;
}

export async function deploySlotLock(cfg: RomeConfig, account: Account): Promise<`0x${string}`> {
  const { abi, bytecode } = compileSlotLock();
  const chain = romeChain(cfg);
  const pub = createPublicClient({ chain, transport: http(cfg.proxyUrl) });
  const wallet = createWalletClient({ account, chain, transport: http(cfg.proxyUrl) });

  console.log(`Deploying SlotLock from ${account.address} to chain ${cfg.chainId}...`);
  console.log(`wUSDC token address: ${cfg.wusdc}`);

  const gp = await pub.getGasPrice();
  console.log(`Current gas price: ${gp} wei`);

  const hash = await wallet.deployContract({
    abi,
    bytecode,
    args: [cfg.wusdc],
    gas: 90_000_000n,
    maxFeePerGas: (gp * 3n) / 2n,
    maxPriorityFeePerGas: 0n,
  });

  console.log(`Deployment transaction submitted: ${hash}`);
  console.log(`Waiting for receipt...`);

  const rcpt = await pub.waitForTransactionReceipt({ hash });
  if (rcpt.status !== "success" || !rcpt.contractAddress) {
    throw new Error(`SlotLock deployment failed with status: ${rcpt.status}`);
  }

  const addr = rcpt.contractAddress;
  console.log(`\n🎉 SlotLock successfully deployed at: ${addr}`);
  console.log(`Block: ${rcpt.blockNumber}, Gas Used: ${rcpt.gasUsed}`);
  console.log(`Explorer: ${cfg.explorerUrl}/address/${addr}`);

  // Update .env file
  const envPath = resolve(__dirname, "../.env");
  let envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (/^SLOTLOCK_ADDRESS=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^SLOTLOCK_ADDRESS=.*$/m, `SLOTLOCK_ADDRESS=${addr}`);
  } else {
    envContent += `\nSLOTLOCK_ADDRESS=${addr}\n`;
  }
  writeFileSync(envPath, envContent.trim() + "\n");
  console.log(`Updated .env with SLOTLOCK_ADDRESS=${addr}`);

  return addr;
}

async function main() {
  const cfg = loadConfig({
    chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined,
    proxyUrl: process.env.PROXY_URL,
    solanaRpc: process.env.SOLANA_RPC,
  });
  const account = requireEvmKey();
  const address = await deploySlotLock(cfg, account);
  console.log(`\nNext: run 'npm run gen-config' to update frontend build config.`);
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
