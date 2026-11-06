import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

export default {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 200010,
    },
    hadrian: {
      type: "http",
      chainType: "l1",
      chainId: 200010,
      url: "https://hadrian.testnet.romeprotocol.xyz/",
    },
  },
};
