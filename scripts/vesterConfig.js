require("dotenv").config({ path: "./.env" })

module.exports = {
	privateKey: process.env.PRIVATE_KEY,
	mainnetRpcUrl: "https://mainnet.veblocks.net/",
	testnetRpcUrl: "https://testnet.veblocks.net/",
	mainnetVexAddress: "", 
	testnetVexAddress: "",
	pathToTreasuryVesterJson: "../build/TreasuryVester.json",
	daoCliffDelay: 7776000, // 90 days in seconds
	eoaCliffDelay: 0,
	vestingEndDelay: 63072000 // 2 years in seconds
};
