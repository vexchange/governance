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
	pathToTreasuryVesterJson: "../build/TreasuryVester.json",
	pathToVEXJson: "../build/VEX.json",
	daoCliffDelay: 7776000, // 90 days in seconds
	eoaCliffDelay: 0,
	vestingEndDelay: 63072000, // 2 years in seconds

	// Token amount not in 18 decimal form
	allocations: {
		dao: {
			address: "",
			tokens: 50_000_000,
		},
		oliver: {
			address: "",
			tokens: 10_000_000,
		},
		kenneth: {
			address: "",
			tokens: 10_000_000,
		},
		proxima: {
			address: "",
			tokens: 10_000_000,
		},
		team: {
			address: "",
			tokens: 10_000_000,
		}
	}
};
