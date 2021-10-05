const config = require("./config/deploymentConfig");
const changeAdminConfig = require("./config/changeAdminConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Timelock = require(config.pathToTimelockJson);
const GovernorAlpha = require(config.pathToGovernorAlphaJson);
const V2Factory = require(config.pathToV2FactoryJson);
const assert = require('assert');
const readlineSync = require("readline-sync");

let network = null;

if (process.argv.length < 3) 
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
web3.eth.accounts.wallet.add(config.privateKey);

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

        const timelockContract = new web3.eth.Contract(Timelock.abi, changeAdminConfig.timelockAddress);

        await timelockContract.methods    
                .executeTransaction(
                    changeAdminConfig.timelockAddress, changeAdminConfig.value,
                    changeAdminConfig.signature, changeAdminConfig.data, changeAdminConfig.eta)
                .send({ from: walletAddress })
                .on("receipt", (receipt) => {
                    transactionReceipt = receipt;
                });

        assert(await timelockContract.methods
                    .pendingAdmin()
                    .call() == changeAdminConfig.governorAlphaAddress);

        console.log("Timelock executeTransaction was successful. Transaction hash: ", transactionReceipt.transactionHash);
        
        console.log("\n==============================================================================\n");
        console.log("Attemping acceptTimelockPendingAdmin on GovernorAlpha");

        const governorAlphaContract = new web3.eth.Contract(GovernorAlpha.abi, changeAdminConfig.governorAlphaAddress);

        await governorAlphaContract.methods
                .acceptTimelockPendingAdmin()
                .send({ from: walletAddress });

        assert(await timelockContract.methods
                        .admin().call() == changeAdminConfig.governorAlphaAddress);

        console.log("GovernorAlpha successfully accepted admin for Timelock");
    }
    catch(error)
    {
        console.log("Deployment failed with:", error)
    }
}

executeTimelockTransfer();