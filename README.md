# @vexchange/governance



## Docs 

Documentation taken from https://github.com/withtally/Tutorial-Deploy-Governance. Refer to link for even more detailed description of all parameters and functions.

### **VEX**

The VEX contract is what creates the VEX token. It is an VIP180 compatible token with support for checkpoints. Checkpointing is a system by which you can check the token balance of any user at any particular point in history. This is important because when a vote comes up that users need to vote on, you don't want individuals buying or selling tokens specifically to change the outcome of the vote and then dumping straight after a vote closes. To avoid this, checkpoints are used. By the time someone creates a proposal and puts it up for a vote in the Vexchange ecosystem, the voting power of all token holders is already known, and fixed, at a point in the past. This way users can still buy or sell tokens, but their balances won't affect their voting power. 

### **GovernorAlpha**

The GovernorAlpha contract is the contract that does the actual "governance" part of the ecosystem. There are a number of hard-coded parameters that decide the functionality of governance, and the contract itself is the tool by which proposals are proposed, voted upon, and transferred to a timelock to be executed. The logic for secure voting is handled here. 

### **Timelock**

The final component of the system is a Timelock. Timelock contracts essentially "delay" the execution of transactions to give the community a chance for a "sanity check" to be  run over the outcome of a vote. It's important if a last minute bug is found in the system and it needs to be caught before a transaction is implemented.

All three of these components work together with their own sphere of influence. The VEX token essentially functions as a voter registration tool (and as a tradable VIP180 token), the GovernorAlpha acts as a polling location- the place where voting happens, and the Timelock acts as a loading bay that holds decision for a set amount of time before executing them on the network. 

Collected fees from Vexchange V2 will also be held in this smart contract. 

### Parameters set for Vexchange

- `VEX::totalSupply`: set at 100 million
- `GovernorAlpha::quorumVotes`: set at 3% of initial supply of VEX
- `GovernorAlpha::proposalThreshold`: set at 0.1% of initial supply of VEX
- `GovernorAlpha::votingPeriod`: set at 7 days
- `Timelock::delay`: set at 2 days

### Functions added 

- `GovernorAlpha::acceptTimelockPendingAdmin()`

## Deployment

Place `.env` with the private key in the root directory under the variable `PRIVATE_KEY=0x000...abc`

### 2 stage deployment

Since we cannot calculate the address of GovernorAlpha beforehand on VeChain, we have to change the Timelock admin after deployment. 

To do that, we first do `npm run deployGovernance [mainnet|testnet]`. If the deployment is successful, it will create a file `changeAdminConfig.json` which stores the arguments for the queued transaction in Timelock. 

After the Timelock delay (currently 2 days), do `npm run timelockChangeAdminAndGovernorAcceptAdmin [mainnet|testnet]`. This script will read the config from `changeAdminConfig.json` to execute the transaction on Timelock. The GovernorAlpha contract will also accept the role of admin by calling `acceptAdmin()` in Timelock.


### Deployed contract addresses 

**Mainnet**
| Contract       | Address                                    |
| ---            | ---                                        |
| VEX            |                                          |
| Timelock       |                                          |
| GovernorAlpha  |                                          |


**Testnet**
| Contract  | Address                                    |
| ---       | ---                                        |
| VEX      |  |
| Timelock |  |
| GovernorAlpha  |  |

## Attribution

Forked from Uniswap governance which is a fork of compound's governance protocol
[https://github.com/compound-finance/compound-protocol/tree/v2.8.1](https://github.com/compound-finance/compound-protocol/tree/v2.8.1)
