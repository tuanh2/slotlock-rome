import "dotenv/config";
import { ethers } from "ethers";
import { requestQuote, settleTypedDataWithBurn, registerTransfer } from "@rome-protocol/sdk/bridge";

const PRIVATE_KEY = process.env.ROME_EVM_KEY;
if (!PRIVATE_KEY) throw new Error("ROME_EVM_KEY missing in .env");

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const BRIDGE_API = "https://bridge-api.devnet.romeprotocol.xyz";

async function main() {
  console.log(`Using wallet: ${wallet.address}`);
  const ethBal = await provider.getBalance(wallet.address);
  console.log(`Sepolia ETH balance: ${ethers.formatEther(ethBal)}`);

  console.log(`Requesting quote for 10 USDC from Sepolia (11155111) to Rome Hadrian (200010)...`);
  const quote = await requestQuote(
    {
      direction: "to-rome",
      asset: "USDC",
      sourceChain: "eip155:11155111",
      romeChainId: "200010",
      amount: "10000000", // 10 USDC (6 decimals)
      recipient: wallet.address,
      sender: { ethereum: wallet.address } as any,
    },
    { base: BRIDGE_API }
  );

  console.log(`Quote received! QuoteId: ${quote.quoteId}`);

  // Step 1: Execute unsigned transactions from quote.steps[0].unsignedTxs
  const step1 = quote.steps.find((s: any) => s.n === 1);
  const unsignedTxs = step1?.unsignedTxs || [];
  console.log(`Step 1 has ${unsignedTxs.length} transactions.`);

  // Also approve localMinter just in case (CCTP v2 requirement)
  const USDC_ADDR = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const LOCAL_MINTER = "0xb43db544E2c27092c107639Ad201b3dEfAbcF192";
  const erc20Abi = [
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
  ];
  const usdcContract = new ethers.Contract(USDC_ADDR, erc20Abi, wallet);
  const minterAllowance = await usdcContract.allowance(wallet.address, LOCAL_MINTER);
  if (minterAllowance < 10000000n) {
    console.log(`Approving localMinter (${LOCAL_MINTER}) for 10 USDC...`);
    const appTx = await usdcContract.approve(LOCAL_MINTER, ethers.MaxUint256);
    await appTx.wait(1);
    console.log(`Approved localMinter!`);
  }

  let burnTxHash = "";
  for (let i = 0; i < unsignedTxs.length; i++) {
    const unsignedTx = unsignedTxs[i];
    console.log(`Executing step 1 [${i + 1}/${unsignedTxs.length}]: ${unsignedTx.description || unsignedTx.to}`);
    const tx = await wallet.sendTransaction({
      to: unsignedTx.to,
      data: unsignedTx.data,
      value: unsignedTx.value ? BigInt(unsignedTx.value) : 0n,
      gasLimit: 300000n,
    });
    console.log(`Tx submitted: ${tx.hash}, waiting for confirmation...`);
    const receipt = await tx.wait(1);
    console.log(`Confirmed in block ${receipt?.blockNumber}`);
    burnTxHash = tx.hash;
  }

  // Step 2: Sign settle authorization if required
  let userSettleSig: string | undefined;
  const typedData = settleTypedDataWithBurn(quote, burnTxHash);
  if (typedData) {
    console.log("Signing EIP-712 SettleAuthorization...");
    const { domain, types, message } = typedData;
    // Remove EIP712Domain from types if present, ethers handles it via domain object
    const cleanTypes = { ...types };
    delete (cleanTypes as any).EIP712Domain;
    userSettleSig = await wallet.signTypedData(domain, cleanTypes, message);
    console.log("Settle authorization signed!");
  }

  // Step 3: Register transfer with Rome Bridge API
  console.log("Registering transfer with Rome Bridge API...");
  const registered = await registerTransfer(
    {
      quote,
      step1TxHash: burnTxHash,
      userSettleSig,
    } as any,
    { base: BRIDGE_API }
  );

  console.log("Transfer registered successfully!");
  console.log(`Transfer ID: ${registered.id}`);
  console.log(`Status: ${registered.outcome}`);
  console.log(`\nAll done! Bridged 10 USDC to Rome Hadrian.`);
}

main().catch((err) => {
  console.error("Bridge failed:", err);
  process.exit(1);
});
