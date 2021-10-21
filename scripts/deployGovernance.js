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

        // Deploy Timelock
        console.log("Attempting to deploy contract:", config.pathToTimelockJson);

        if (network.name == "mainnet")
        {
            let input = readlineSync.question("Confirm you want to deploy this on the MAINNET? (y/n) ");
            if (input != 'y') process.exit(1);
        }

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

        await renounceMastership(timelockAddress);

        console.log("\n==============================================================================\n");
        console.log("Attempting to deploy contract:", config.pathToVEXJson);

        const vexContract = new web3.eth.Contract(Vex.abi);
        await vexContract.deploy({ 
            data: Vex.bytecode,
            arguments: [walletAddress, timelockAddress]
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

        await renounceMastership(governorAlphaAddress);

        console.log("\n==============================================================================\n");
        console.log("Changing platformFeeTo and ownership of V2 factory to the timelock address");

        const output = {
            timelockAddress: timelockAddress,
            governorAlphaAddress: governorAlphaAddress,
            vexAddress: vexAddress,
            network: network.name, 
        }
        fs.writeFileSync('./scripts/config/deployedAddresses.json', JSON.stringify(output, null, 2));

        const factoryContract = new web3.eth.Contract(V2Factory.abi, config.v2FactoryAddress);

        await factoryContract.methods
                .setPlatformFeeTo(timelockAddress)
                .send({ from: walletAddress })
                .on("receipt", (receipt) => {
                    transactionReceipt = receipt;
                });

        assert(await factoryContract.methods
                      .platformFeeTo()
                      .call() == timelockAddress);

        console.log("setPlatformFeeTo succeeded. Txid:", transactionReceipt.transactionHash);

        await factoryContract.methods
                .transferOwnership(timelockAddress)
                .send({ from: walletAddress })
                .on("receipt", (receipt) => {
                    transactionReceipt = receipt;
                });
        
        assert(await factoryContract.methods
                      .owner()
                      .call() == timelockAddress);

        console.log("Ownership successfully transferred. Txid:", transactionReceipt.transactionHash);

    } 
    catch(error)
    {
        console.log("Deployment failed with:", error)
    }
}

deployGovernance();
