// ES5 style
const config = require("./config/deploymentConfig");
const deployedAddresses = require("./config/deployedAddresses");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Factory = require(config.pathToV2FactoryJson);
const Pair = require(config.pathToV2PairJson);
const Timelock = require(config.pathToTimelockJson);
const assert = require('assert');
const readlineSync = require("readline-sync");

let network = null;
let pairAddress = null;
let swapFee = null;

if (process.argv.length !== 5) 
{
    console.error("Usage: node queueSetSwapFee.js [mainnet|testnet] [pair address] [swapFee in basis points (100 means 1%)]");
    process.exit(1);
} 
else
{
    network = config.network[process.argv[2]];
    if (network === undefined) {
        console.error("Invalid network specified");
        process.exit(1);
    }

    if(!Web3.utils.isAddress(process.argv[3]))
    {
        console.error("Invalid address for pair contract");
        process.exit(1);
    }

    pairAddress = process.argv[3];
    swapFee = process.argv[4];
}

const web3 = thorify(new Web3(), network.rpcUrl);
web3.eth.accounts.wallet.add(config.deployerPrivateKey);

queueSetSwapFee = async(pairAddress, newSwapFee) =>
{
    try
    {
        const walletAddress = web3.eth.accounts.wallet[0].address;
        const factoryContract = new web3.eth.Contract(Factory.abi, config.v2FactoryAddress);
        const pairContract = new web3.eth.Contract(Pair.abi, pairAddress);
        const timelockContract = new web3.eth.Contract(Timelock.abi, deployedAddresses.timelockAddress);

        console.log("Using wallet address:", walletAddress);
        console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

        if (network.name == "mainnet")
        {
            let input = readlineSync.question("Confirm you want to call this on the MAINNET? (y/n) ");
            if (input != 'y') process.exit(1);
        }

        const value = 0;
        const signature = "setSwapFeeForPair(address,uint256)";
        const data = web3.eth.abi.encodeParameters(["address","uint256"], [pairAddress,swapFee]);

        // Add some buffer to the delay 
        const eta = parseInt(timestamp + config.timelockDelay * 1.05);

        console.log("Adjusting swapFee for pair at address", pairAddress);
        console.log("Old swap fee was", await pairContract.methods.swapFee().call());
        console.log("Changing swap fee to:", newSwapFee);

        await timelockContract.methods
            .queueTransaction(config.v2FactoryAddress, value,
                                signature, data, eta)
            .send({ from: walletAddress })
            .on("receipt", (receipt) => {
                transactionReceipt = receipt;
            });

        const transactionHashQueued = transactionReceipt.   outputs[0].events[0].topics[1];
        console.log("Transaction Hash of queued proposal:", transactionHashQueued);
        
        // Ensure that transaction is indeed queued
        assert(await timelockContract.methods
                        .queuedTransactions(transactionHashQueued)
                        .call());

        const output = {
            timelockAddress: deployedAddresses.timelockAddress,
            pairAddress: pairAddress,
            signature: signature,
            value: value,
            data: data,
            eta: eta,
        }
        fs.writeFileSync('./scripts/config/setSwapFee.json', JSON.stringify(output, null, 2));
    }
    catch(error)
    {
        console.log("Failed with:", error);
    }
}

queueSetSwapFee(pairAddress, swapFee);
