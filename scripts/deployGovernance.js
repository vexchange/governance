// ES5 style
const config = require("./config/deploymentConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Vex = require(config.pathToVEXJson);
const Timelock = require(config.pathToTimelockJson);
const GovernorAlpha = require(config.pathToGovernorAlphaJson);
const V2Factory = require(config.pathToV2FactoryJson);
const assert = require("assert");
const fs = require("fs");
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


renounceMastership = async(contractAddress) => {
    console.log("Renouncing Mastership");

    const SET_MASTER_SELECTOR = web3.eth.abi.encodeFunctionSignature("setMaster(address,address)");

    // This address is the same for both mainnet and testnet
    const PROTOTYPE_CONTRACT_ADDRESS = "0x000000000000000000000050726f746f74797065";

    const data = web3.eth.abi.encodeParameters(
       ["address", "address"],
       [contractAddress, "0x0000000000000000000000000000000000000000"],
    ).slice(2); // slicing to get rid of the '0x' in the beginning

    await web3.eth.sendTransaction({
        to: PROTOTYPE_CONTRACT_ADDRESS,
        data: SET_MASTER_SELECTOR + data,
        from: web3.eth.accounts.wallet[0].address
    }).on("receipt", (receipt) => {
        console.log("Mastership successfully renounced, txid: ", receipt.transactionHash);
    });
}


deployGovernance = async() =>
{
    // This is the address associated with the private key
    const walletAddress = web3.eth.accounts.wallet[0].address;

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    try
    {
        let transactionReceipt = null;
        if (network.name == "mainnet")
        {
            let input = readlineSync.question("Confirm you want to deploy this on the MAINNET? (y/n) ");
            if (input != 'y') process.exit(1);
        }

        console.log("\n==============================================================================\n");
        console.log("Attempting to deploy contract:", config.pathToGovernorAlphaJson);

        const governorAlphaContract = new web3.eth.Contract(GovernorAlpha.abi);
        await governorAlphaContract.deploy({ 
            data: GovernorAlpha.bytecode,
            arguments: ["0x62C803633AffaA15c58681bF5251a2753486B2b7", "0x696B30691c767df0Cf6d49a049849FFad54a7EBE"]
        })
        .send({ from: walletAddress })
        .on("receipt", (receipt) => {
            transactionReceipt = receipt;
        });

        console.log("Transaction Hash:", transactionReceipt.transactionHash);
        console.log("Contract Successfully deployed at address:", transactionReceipt.contractAddress);

        const governorAlphaAddress = transactionReceipt.contractAddress;
        governorAlphaContract.options.address = governorAlphaAddress;
    } 
    catch(error)
    {
        console.log("Deployment failed with:", error)
    }
}

deployGovernance();
