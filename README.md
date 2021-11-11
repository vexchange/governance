# @vexchange/governance

## Docs 

Documentation taken from https://github.com/withtally/Tutorial-Deploy-Governance. Refer to link for even more detailed description of all parameters and functions.

### **VEX**

The VEX contract is what creates the VEX token. It is a VIP180 compatible token with support for checkpoints. Checkpointing is a system by which you can check the token balance of any user at any particular point in history. This is important because when a vote comes up that users need to vote on, you don't want individuals buying or selling tokens specifically to change the outcome of the vote and then dumping straight after a vote closes. To avoid this, checkpoints are used. By the time someone creates a proposal and puts it up for a vote in the Vexchange ecosystem, the voting power of all token holders is already known, and fixed, at a point in the past. This way users can still buy or sell tokens, but their balances won't affect their voting power. 

### **GovernorAlpha**

The GovernorAlpha contract is the contract that does the actual "governance" part of the ecosystem. There are a number of hard-coded parameters that decide the functionality of governance, and the contract itself is the tool by which proposals are proposed, voted upon, and transferred to a timelock to be executed. The logic for secure voting is handled here. 

### **Timelock**

The final component of the system is a Timelock. Timelock contracts essentially "delay" the execution of transactions to give the community a chance for a "sanity check" to be run over the outcome of a vote. It's important if a last minute bug is found in the system and it needs to be caught before a transaction is implemented.

All three of these components work together with their own sphere of influence. The VEX token essentially functions as a voter registration tool (and as a tradable VIP180 token), the GovernorAlpha acts as a polling location- the place where voting happens, and the Timelock acts as a loading bay that holds decision for a set amount of time before executing them on the network. 

Collected fees from Vexchange V2 will also be held in this smart contract. 

### Parameters set for Vexchange

- `VEX::totalSupply`: set at 100 million
- `GovernorAlpha::quorumVotes`: set at 3% of configured total supply of VEX
- `GovernorAlpha::proposalThreshold`: set at 0.1% of configured total supply of VEX
- `GovernorAlpha::votingPeriod`: set at 7 days
- `Timelock::delay`: set at 2 days

### Functions added 

- `GovernorAlpha::acceptTimelockPendingAdmin()`
- `VEX::burn()`

## Deployment

Place `.env` with the private key in the root directory under the variable `PRIVATE_KEY=0x000...abc`

### Multi-stage deployment

Since we cannot calculate the address of GovernorAlpha beforehand on VeChain, we have to change the Timelock admin after deployment. 

To do that, we first do 
```
npm run deployGovernance [mainnet|testnet]
```
If the deployment is successful, it will create `deployedAddresses.json` which stores the arguments for the queued transaction in Timelock. This script also changes the owner and platformFeeTo of `VexchangeV2Factory`. Therefore, configure the V2Factory in `deploymentConfig.js` before running this script.

When ready to handover the admin of the `Timelock` to `GovernorAlpha`, we run:

```
npm run queueTimelockTransfer [mainnet|testnet]
```
If the transaction is queued successfully, it will create `changeAdminConfig.json` which stores the parameters for execution after the Timelock delay. 


After the Timelock delay (currently 2 days), do 
```
npm run executeTimelockTransfer [mainnet|testnet]
```
This script will read the config from `changeAdminConfig.json` to execute the transaction on Timelock. The GovernorAlpha contract will also accept the role of admin by calling `acceptAdmin()` in Timelock. 

### TreasuryVester deployment
```
npm run deployVester [mainnet|testnet]
```

Modify recipient addresses and VEX addresses in `vesterConfig.js`.


### Claiming vested tokens
```
npm run claimVestedTokens [mainnet|testnet] [address of Vester contract]
```

Be sure to input the VEX token address in `vesterConfig.js`

### Deployed contract addresses 

**Mainnet**
| Contract       | Address                             |
| ---            | ---                                 |
| VEX            | 0x0BD802635eb9cEB3fCBe60470D2857B86841aab6 |
| Timelock       | 0x41D293Ee2924FF67Bd934fC092Be408162448f86 |
| GovernorAlpha  | 0xAE6d4be61A36984dfbE7399A73B59c92b994E9F7 |


**Testnet**
| Contract       | Address                             |
| ---            | ---                                 |
| VEX            | 0x10bf15c804AB02cEBb9E82CB61B200bba46C7CDE |
| Timelock       | 0xFd883d0947848eeA79bA1425fcE38b6f00dF3ea0 |
| GovernorAlpha  | 0x40b4F819bB35D07159AADDd415670328ecf301b5 |

## Attribution

Forked from Uniswap governance which is a fork of compound's governance protocol
[https://github.com/compound-finance/compound-protocol/tree/v2.8.1](https://github.com/compound-finance/compound-protocol/tree/v2.8.1)
