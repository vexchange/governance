const config = require("./config/deploymentConfig");
const setSwapFeeConfig = require("./config/setSwapFee");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Timelock = require(config.pathToTimelockJson);
const Pair = require(config.pathToV2PairJson);
const assert = require('assert');
const readlineSync = require("readline-sync");

let network = null;

if (process.argv.length !== 3) 
{
    console.error("Please specify network, either mainnet or testnet");
    process.exit(1);
}
else
{
    network = config.network[process.argv[2]];
    if (network === undefined) {
        console.error("Invalid network specified");
        process.exit(1);
    }
}

const web3 = thorify(new Web3(), network.rpcUrl);
web3.eth.accounts.wallet.add(config.deployerPrivateKey);

executeTimelockTransfer = async() =>
{
    const walletAddress = web3.eth.accounts.wallet[0].address

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    try 
    {
        console.log("\n==============================================================================\n");
        console.log("Attempting executeTransaction on Timelock");

        if (network.name == "mainnet")
        {
            let input = readlineSync.question("Confirm you want to deploy this on the MAINNET? (y/n) ");
            if (input != 'y') process.exit(1);
        }

        const timelockContract = new web3.eth.Contract(Timelock.abi, setSwapFeeConfig.timelockAddress);
        const pairContract = new web3.eth.Contract(Pair.abi, setSwapFeeConfig.pairAddress);

        await timelockContract.methods    
                .executeTransaction(
                    config.v2FactoryAddress, setSwapFeeConfig.value,
                    setSwapFeeConfig.signature, setSwapFeeConfig.data, setSwapFeeConfig.eta)
                .send({ from: walletAddress })
                .on("receipt", (receipt) => {
                    transactionReceipt = receipt;
                });

        console.log("Timelock executeTransaction was successful. Transaction hash: ", transactionReceipt.transactionHash);
        console.log("Now the swap fee is:", await pairContract.methods.swapFee().call());
    }
    catch(error)
    {
        console.log("Deployment failed with:", error)
    }
}

executeTimelockTransfer();
