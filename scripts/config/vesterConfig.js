require("dotenv").config({ path: "./.env" })

module.exports = {
	privateKey: process.env.PRIVATE_KEY,
	network: {
        mainnet: {
            name: "mainnet",
            rpcUrl: "http://mainnet02.vechain.fi.blockorder.net",
        },
        testnet: {
            name: "testnet",
            rpcUrl: "http://testnet02.vechain.fi.blockorder.net",
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
			address: "", // use the timelock address
			tokens: 50_000_000,
		},
		oliver: {
			address: "0x6aE0a6E33688d0f3dCe513713e73DC7D99C1A00c", // oliver personal
			tokens: 10_000_000,
		},
		kenneth: {
			address: "", // kenneth personal
			tokens: 10_000_000,
		},
		proxima: {
			address: "", // proxima personal
			tokens: 10_000_000,
		},
		team: {
			address: "", // oliver & kenneth shared
			tokens: 10_000_000,
		}
	}
};
