// ES5 style
const config = require("./deploymentConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Vex = require(config.pathToVEXJson);
const Timelock = require(config.pathToTimelockJson);
const GovernorAlpha = require(config.pathToGovernorAlphaJson);
const assert = require('assert');
const fs = require('fs');

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

deployGovernance = async() =>
{
    // This is the address associated with the private key
    const walletAddress = web3.eth.accounts.wallet[0].address

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    try
    {
        let transactionReceipt = null;

        // Deploy Timelock
        console.log("Attempting to deploy contract:", config.pathToTimelockJson);

        const timelockContract = new web3.eth.Contract(Timelock.abi);
        await timelockContract.deploy({ 
            data: Timelock.bytecode,
            arguments: [walletAddress, config.timelockDelay]
        })
        .send({ from: walletAddress })
        .on("receipt", (receipt) => {
            transactionReceipt = receipt;
        });

        console.log("Transaction Hash:", transactionReceipt.transactionHash);
        console.log("Contract Successfully deployed at address:", transactionReceipt.contractAddress);

        const timelockAddress = transactionReceipt.contractAddress;
        timelockContract.options.address = timelockAddress;

        console.log("\n==============================================================================\n");
        console.log("Attempting to deploy contract:", config.pathToVEXJson);

        const vexContract = new web3.eth.Contract(Vex.abi);
        await vexContract.deploy({ 
            data: Vex.bytecode,
            arguments: [config.tokenBeneficiaryAddress, timelockAddress]
        })
        .send({ from: walletAddress })
        .on("receipt", (receipt) => {
            transactionReceipt = receipt;
        });
        
        console.log("Transaction Hash:", transactionReceipt.transactionHash);
        console.log("Contract Successfully deployed at address:", transactionReceipt.contractAddress);

        const vexAddress = transactionReceipt.contractAddress;
        
        vexContract.options.address = vexAddress;

        console.log("\n==============================================================================\n");
        console.log("Attempting to deploy contract:", config.pathToGovernorAlphaJson);

        const governorAlphaContract = new web3.eth.Contract(GovernorAlpha.abi);
        await governorAlphaContract.deploy({ 
            data: GovernorAlpha.bytecode,
            arguments: [timelockAddress, vexAddress]
        })
        .send({ from: walletAddress })
        .on("receipt", (receipt) => {
            transactionReceipt = receipt;
        });

        console.log("Transaction Hash:", transactionReceipt.transactionHash);
        console.log("Contract Successfully deployed at address:", transactionReceipt.contractAddress);

        const governorAlphaAddress = transactionReceipt.contractAddress;
        governorAlphaContract.options.address = governorAlphaAddress;
        
        console.log("\n==============================================================================\n");
        console.log("Nominating GovernorAlpha to be the pendingAdmin of Timelock");

        const blockNumber = await web3.eth.getBlockNumber();
        const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

        const value = 0;
        const signature = "setPendingAdmin(address)";
        const data = web3.eth.abi.encodeParameter('address', governorAlphaAddress);

        // Add some buffer to the delay 
        const eta = parseInt(timestamp + config.timelockDelay * 1.05);

        await timelockContract.methods
            .queueTransaction(timelockAddress, value, 
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
                    timelockAddress,
                    "value=", value, "signature=", signature,
                    "data=", data,
                    "eta=", eta,
                    "after the eta");

        const output = {
            timelockAddress: timelockAddress,
            governorAlphaAddress: governorAlphaAddress,
            signature: signature,
            value: value,
            data: data,
            eta: eta,
        }
        fs.writeFileSync('./scripts/changeAdminConfig.json', JSON.stringify(output, null, 2));
    } 
    catch(error)
    {
        console.log("Deployment failed with:", error)
    }
}

deployGovernance();
