require("@nomicfoundation/hardhat-toolbox-viem");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
      chainId: 200010,
    },
    hadrian: {
      url: "https://hadrian.testnet.romeprotocol.xyz/",
      chainId: 200010,
    },
  },
};
