const config = require("./config/deploymentConfig");
const deployedAddresses = require("./config/deployedAddresses");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Timelock = require(config.pathToTimelockJson);
const GovernorAlpha = require(config.pathToGovernorAlphaJson);
const fs = require('fs');
const assert = require('assert');

let rpcUrl = null;
if (process.argv.length < 3) 
{
    console.error("Please specify network, either mainnet or testnet");
    process.exit(1);
} 
else
{
    if (process.argv[2] == "mainnet") rpcUrl = config.mainnetRpcUrl;
    else if (process.argv[2] == "testnet") rpcUrl = config.testnetRpcUrl;
    else {
        console.error("Invalid network specified");
        process.exit(1);
    }
}

const web3 = thorify(new Web3(), rpcUrl);

web3.eth.accounts.wallet.add(config.privateKey);

queueTransaction = async() =>
{
    assert(deployedAddresses.network == process.argv[2], 
           "Network mismatch between deployedAddresses and command line argument");

    const walletAddress = web3.eth.accounts.wallet[0].address

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    try 
    {
        const timelockContract = new web3.eth.Contract(Timelock.abi, deployedAddresses.timelockAddress);

        console.log("\n==============================================================================\n");
        console.log("Nominating GovernorAlpha to be the pendingAdmin of Timelock");

        const blockNumber = await web3.eth.getBlockNumber();
        const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

        const value = 0;
        const signature = "setPendingAdmin(address)";
        const data = web3.eth.abi.encodeParameter('address', deployedAddresses.governorAlphaAddress);

        // Add some buffer to the delay 
        const eta = parseInt(timestamp + config.timelockDelay * 1.05);

        await timelockContract.methods
            .queueTransaction(deployedAddresses.timelockAddress, value, 
                signature, data, eta)
            .send({ from: walletAddress })
            .on("receipt", (receipt) => {
                transactionReceipt = receipt;
            });

        const transactionHashQueued = transactionReceipt.outputs[0].events[0].topics[1];
        console.log("Transaction Hash of queued proposal:", transactionHashQueued);
        
        // Ensure that transaction is indeed queued
        assert(await timelockContract.methods
                        .queuedTransactions(transactionHashQueued)
                        .call());

        console.log("Transaction successfully queued. Call executeTransaction with target=", 
                    deployedAddresses.timelockAddress,
                    "value=", value, "signature=", signature,
                    "data=", data,
                    "eta=", eta,
                    "after the eta");

        const output = {
            timelockAddress: deployedAddresses.timelockAddress,
            governorAlphaAddress: deployedAddresses.governorAlphaAddress,
            signature: signature,
            value: value,
            data: data,
            eta: eta,
        }
        fs.writeFileSync('./scripts/config/changeAdminConfig.json', JSON.stringify(output, null, 2));
    }
    catch(error)
    {
        console.log("Deployment failed with:", error)
    }
}

queueTransaction();