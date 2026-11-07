import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function compileSlotLock() {
  const contractPath = resolve(__dirname, "../contracts/SlotLock.sol");
  const source = readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "SlotLock.sol": {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e: any) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:", errors);
      throw new Error("solc compilation failed");
    }
  }

  const contract = output.contracts["SlotLock.sol"].SlotLock;
  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}` as `0x${string}`;

  const artifactsDir = resolve(__dirname, "../artifacts");
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }

  writeFileSync(
    resolve(artifactsDir, "SlotLock.json"),
    JSON.stringify({ abi, bytecode }, null, 2)
  );

  const libDir = resolve(__dirname, "../lib");
  writeFileSync(
    resolve(libDir, "slotlockAbi.ts"),
    "export const SLOTLOCK_ABI = " + JSON.stringify(abi, null, 2) + " as const;\n"
  );

  console.log("SlotLock.sol compiled successfully!");
  console.log(`Bytecode size: ${bytecode.length / 2 - 1} bytes`);
  return { abi, bytecode };
}

compileSlotLock();

