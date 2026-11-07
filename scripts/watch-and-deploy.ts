import "dotenv/config";
import https from "node:https";
import { createPublicClient, http, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadConfig } from "../lib/config.js";
import { deploySlotLock } from "./deploy-slotlock.js";

const TRANSFER_ID = "txf_ac6b45d465df47718da30ab2386c1a7b";
const PRIV_KEY = "0x243b02a1bfbaf621eb0dc47e861522f466408d61f638d6a8f34ae3d5952cce93";
const account = privateKeyToAccount(PRIV_KEY);

function fetchTransferStatus(): Promise<any> {
  return new Promise((resolve) => {
    https.get(`https://bridge-api.devnet.romeprotocol.xyz/v1/transfers/${TRANSFER_ID}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

async function main() {
  const cfg = loadConfig({
    chainId: 200010,
    proxyUrl: "https://hadrian.testnet.romeprotocol.xyz/",
    solanaRpc: "https://api.devnet.solana.com",
    solanaCluster: "devnet",
  });

  const pub = createPublicClient({ transport: http(cfg.proxyUrl) });

  console.log(`Watching CCTP bridge transfer ${TRANSFER_ID}...`);
  console.log(`Deployer address: ${account.address}`);
  console.log(`Target chain: Rome Hadrian (${cfg.chainId})\n`);

  let count = 0;
  while (true) {
    count++;
    const [bal, transfer] = await Promise.all([
      pub.getBalance({ address: account.address }),
      fetchTransferStatus(),
    ]);

    const usdcBal = formatUnits(bal, 18);
    const outcome = transfer?.outcome || "unknown";
    const step3 = transfer?.steps?.[2]?.status;
    const step4 = transfer?.steps?.[3]?.status;

    console.log(
      `[${new Date().toLocaleTimeString()}] Check #${count} — Hadrian USDC: ${usdcBal} | CCTP Status: ${outcome} (Step3: ${step3}, Step4: ${step4})`
    );

    if (bal >= 14_000_000_000_000_000_000n) {
      console.log(`\n🎉 15 USDC gas arrived on Rome Hadrian! Current balance: ${usdcBal} USDC.`);
      console.log(`Starting automated deployment of SlotLock contract...\n`);

      const contractAddr = await deploySlotLock(cfg, account);
      console.log(`\n======================================================`);
      console.log(`SUCCESSFULLY DEPLOYED ON ROME HADRIAN!`);
      console.log(`Contract Address: ${contractAddr}`);
      console.log(`Explorer: ${cfg.explorerUrl}/address/${contractAddr}`);
      console.log(`======================================================\n`);

      // Update config and frontend
      console.log("Regenerating config and building frontend...");
      const { execSync } = await import("node:child_process");
      execSync("npm run gen-config", { stdio: "inherit" });
      execSync("git add .", { stdio: "inherit" });
      execSync(`git commit -m "chore: record deployed SlotLock contract ${contractAddr}"`, { stdio: "inherit" });
      execSync("git push origin master", { stdio: "inherit" });

      console.log("\n🚀 Pushed to GitHub -> Vercel auto-deploying!");
      process.exit(0);
    }

    // Wait 15 seconds before next check
    await new Promise((r) => setTimeout(r, 15000));
  }
}

main().catch((err) => {
  console.error("Watch error:", err);
  process.exit(1);
});
