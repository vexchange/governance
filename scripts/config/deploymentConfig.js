require("dotenv").config({ path: "./.env" })

module.exports = {
	privateKey: process.env.PRIVATE_KEY,
	network: {
        mainnet: {
            name: "mainnet",
            rpcUrl: "https://mainnet.veblocks.net/",
        },
        testnet: {
            name: "testnet",
            rpcUrl: "https://testnet.veblocks.net/",
        }
    },
	timelockDelay: 172800, // 2 days, in seconds, as agreed within the team
	pathToVEXJson: "../build/VEX.json",
	pathToGovernorAlphaJson: "../build/GovernorAlpha.json",
	pathToTimelockJson: "../build/Timelock.json",
	pathToV2FactoryJson: "./v2json/VexchangeV2Factory.json",
	v2FactoryAddress: "0xb312582c023cc4938cf0faea2fd609b46d7509a2" // This is the mainnet factory address
};
