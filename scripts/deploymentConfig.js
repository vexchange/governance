require("dotenv").config({ path: "./.env" })

module.exports = {
	privateKey: process.env.PRIVATE_KEY,
	mainnetRpcUrl: "https://mainnet.veblocks.net/",
	testnetRpcUrl: "https://testnet.veblocks.net/",
	tokenBeneficiaryAddress: "0x57e977Ff64FDD6b352FE0adA9D7a2f759F2cAb4a",
	timelockDelay: 172800, // 2 days, in seconds
	pathToVEXJson: "../build/VEX.json",
	pathToGovernorAlphaJson: "../build/GovernorAlpha.json",
	pathToTimelockJson: "../build/Timelock.json",
};
