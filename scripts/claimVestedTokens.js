// ES5 style
const config = require("./vesterConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const TreasuryVester = require(config.pathToTreasuryVesterJson);
const Vex = require(config.pathToVEXJson);
const assert = require('assert');

let rpcUrl = null;
let vexAddress = null;
let vesterAddress = null;

if (process.argv.length < 4) 
{
    console.error("Usage: node claimVestedTokens.js [mainnet|testnet] [address of Vester contract]");
    process.exit(1);
} 
else
{
    if (process.argv[2] == "mainnet") 
    {
        rpcUrl = config.mainnetRpcUrl;
        vexAddress = config.mainnetVexAddress;
    }
    else if (process.argv[2] == "testnet") 
    {
        rpcUrl = config.testnetRpcUrl;
        vexAddress = config.testnetVexAddress;
    }
    else 
    {
        console.error("Invalid network specified");
        process.exit(1);
    }

    if(!Web3.utils.isAddress(process.argv[3]))
    {
        console.error("Invalid address for vester contract");
        process.exit(1);
    }

    vesterAddress = process.argv[3];
}

const web3 = thorify(new Web3(), rpcUrl);
web3.eth.accounts.wallet.add(config.privateKey);

claimVestedTokens = async() =>
{
    try
    {
        // This is the address associated with the private key
        const walletAddress = web3.eth.accounts.wallet[0].address;
        const vexContract = new web3.eth.Contract(Vex.abi, vexAddress);

        console.log("Using wallet address:", walletAddress);
        console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

        const vesterContract = new web3.eth.Contract(TreasuryVester.abi, 
                                                     vesterAddress);

        const recipientAddress = await vesterContract.methods
                                       .recipient()
                                       .call();

        console.log("Recipient is:", recipientAddress);

        const tokensBeforeClaiming = web3.utils.fromWei(
                                        await vexContract.methods
                                               .balanceOf(recipientAddress)
                                               .call()
                                     );

        console.log("VEX balance before claiming:", 
                    tokensBeforeClaiming,
                    "VEX");

        await vesterContract.methods
                            .claim()
                            .send({ from: walletAddress });
        
        const tokensAfterClaiming = web3.utils.fromWei(
                                        await vexContract.methods
                                               .balanceOf(recipientAddress)
                                               .call()
                                    );

        console.log("VEX balance after claiming",
                    tokensAfterClaiming,
                    "VEX");
    }
    catch(error)
    {
        console.log("Deployment failed with:", error);
    }    
}

claimVestedTokens();
