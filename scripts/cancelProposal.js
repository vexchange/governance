// ES5 style
const config = require("./config/vesterConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const TreasuryVester = require(config.pathToTreasuryVesterJson);
const GovernorAlpha = require("../build/GovernorAlpha.json");
const assert = require('assert');

let network = null;

if (process.argv.length < 5) 
{
    console.error("Usage: node cancelProposal.js [mainnet|testnet] [governor address] [proposalId] ");
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

cancelProposal = async(governorAlphaAddress, proposalId) =>
{
    try
    {
        // This is the address associated with the private key
        const walletAddress = web3.eth.accounts.wallet[0].address;
        const govContract = new web3.eth.Contract(GovernorAlpha.abi, governorAlphaAddress);

        console.log("Using wallet address:", walletAddress);
        console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

        if (network.name == "mainnet")
        {
            let input = readlineSync.question("Confirm you want to deploy this on the MAINNET? (y/n) ");
            if (input != 'y') process.exit(1);
        }
        
        await govContract.methods
                         .cancel(proposalId)
                         .send({ from: walletAddress })
                         .on("receipt", (receipt) => {
                            console.log("Successfully delegated");
                         });
    }
    catch(error)
    {
        console.log("Deployment failed with:", error);
    }    
}

cancelProposal(process.argv[3], process.argv[4]);
