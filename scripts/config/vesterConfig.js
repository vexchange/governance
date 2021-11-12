require("dotenv").config({ path: "./.env" })

module.exports = {
	privateKey: process.env.DEPLOYER_PRIVATE_KEY,
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
			address: "0x41D293Ee2924FF67Bd934fC092Be408162448f86", // use the timelock address
			tokens: 49_764_357,
		},
		// oliver: {
		// 	address: "0x6aE0a6E33688d0f3dCe513713e73DC7D99C1A00c", // oliver personal
		// 	tokens: 10_000_000,
		// },
		// kenneth: {
		// 	address: "0x14Fe55c8f5F83900F280a41bA6EF31042D8808D9", // kenneth personal
		// 	tokens: 10_000_000,
		// },
		// proxima: {
		// 	address: "0xffF7f583Dc3a36e404A99BbacA84E867A38424e3", // proxima personal
		// 	tokens: 10_000_000,
		// },
		// team: {
		// 	address: "TBD", // oliver & kenneth shared
		// 	tokens: 10_000_000,
		// }
	}
};
