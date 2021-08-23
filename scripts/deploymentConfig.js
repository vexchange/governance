require("dotenv").config({ path: "./.env" })

module.exports = {
	privateKey: process.env.PRIVATE_KEY,
	mainnetRpcUrl: "https://mainnet.veblocks.net/",
	testnetRpcUrl: "https://testnet.veblocks.net/",
	timelockDelay: 172800, // 2 days, in seconds, as agreed within the team
	pathToVEXJson: "../build/VEX.json",
	pathToGovernorAlphaJson: "../build/GovernorAlpha.json",
	pathToTimelockJson: "../build/Timelock.json",
};
