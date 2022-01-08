// ES5 style
const config = require("./config/deploymentConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Factory = require(config.pathToV2FactoryJson);
const Pair = require(config.pathToV2PairJson);
const assert = require('assert');
const readlineSync = require("readline-sync");

let network = null;
let pairAddress = null;
let swapFee = null;

if (process.argv.length !== 5) 
{
    console.error("Usage: node setSwapFee.js [mainnet|testnet] [pair address] [swapFee in basis points (100 means 1%)]");
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
web3.eth.accounts.wallet.add(config.ownerPrivateKey);

setSwapFee = async(pairAddress, newSwapFee) =>
{
    try
    {
        const walletAddress = web3.eth.accounts.wallet[0].address;
        const factoryContract = new web3.eth.Contract(Factory.abi, config.v2FactoryAddress);
        const pairContract = new web3.eth.Contract(Pair.abi, pairAddress);
        console.log("Using wallet address:", walletAddress);
        console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

        if (network.name == "mainnet")
        {
            let input = readlineSync.question("Confirm you want to call this on the MAINNET? (y/n) ");
            if (input != 'y') process.exit(1);
        }
        
        console.log("Adjusting swapFee for pair at address", pairAddress);
        console.log("Old swap fee was", await pairContract.methods.swapFee().call());
        console.log("Changing swap fee to:", newSwapFee);
        await factoryContract.methods
            .setSwapFeeForPair(pairAddress, newSwapFee)
            .send({ from: walletAddress })
            .on("receipt", (receipt) => 
            {
                transactionReceipt = receipt;
            });

        console.log("Transaction Hash:", transactionReceipt.transactionHash);;
        assert(pairContract.methods.swapFee() === newSwapFee);
    }
    catch(error)
    {
        console.log("Failed with:", error);
    }
}

setSwapFee(pairAddress, swapFee);
