# @vexchange/governance


## Deployment

Place `.env` with the private key in the root directory under the variable `PRIVATE_KEY=0x000...abc`

### 2 stage deployment

Since we cannot calculate the address of GovernorAlpha beforehand on VeChain, we have to change the Timelock admin after deployment. 

To do that, we first do `npm run deployGovernance [mainnet|testnet]`. If the deployment is successful, it will create a file `changeAdminConfig.json` which stores the arguments for the queued transaction in Timelock. 

After the Timelock delay (currently 2 days), do `npm run timelockChangeAdminAndGovernorAcceptAdmin [mainnet|testnet]`. This script will read the config from `changeAdminConfig.json` to execute the transaction on Timelock. The GovernorAlpha contract will also accept the role of admin by calling `acceptAdmin()` in Timelock.


## Attribution

Forked from Uniswap governance which is a fork of compound's governance protocol
[https://github.com/compound-finance/compound-protocol/tree/v2.8.1](https://github.com/compound-finance/compound-protocol/tree/v2.8.1)
