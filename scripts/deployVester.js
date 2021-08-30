// ES5 style
const config = require("./vesterConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const TreasuryVester = require(config.pathToTreasuryVesterJson);
const Vex = require(config.pathToVEXJson);
const assert = require('assert');

let rpcUrl = null;
let vexAddress = null;
let recipientAddress = null;
let cliffDelay = null;
let amount = null;

if (process.argv.length < 3) 
{
    console.error("Usage: node deployVester.js [mainnet|testnet]");
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
}

const web3 = thorify(new Web3(), rpcUrl);
web3.eth.accounts.wallet.add(config.privateKey);

checkValidAddresses = (allocations) => {
    console.log("Checking if addresses are valid");

    for (const recipient in allocations) 
    {
        if(!web3.utils.isAddress(allocations[recipient].address)) 
        {
            console.log("Invalid recipient address specified", allocations[recipient].address);
            process.exit(1);        
        }
    }
    console.log("All addresses are valid");
}

deployVester = async() =>
{
    try
    {
        // This is the address associated with the private key
        const walletAddress = web3.eth.accounts.wallet[0].address
        const vexContract = new web3.eth.Contract(Vex.abi, vexAddress);

        console.log("Using wallet address:", walletAddress);
        console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

        checkValidAddresses(config.allocations);

        for (const recipient in config.allocations) 
        {
            const blockNumber = await web3.eth.getBlockNumber();
            const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;
            const amount = web3.utils.toWei(web3.utils.toBN(config.allocations[recipient].tokens));
            const vestingBegin = timestamp + 60; // 1 minute after current block timestamp

            const cliffDelay = recipient == "dao" ? config.daoCliffDelay : config.eoaCliffDelay;

            const vestingCliff = vestingBegin + cliffDelay;
            const vestingEnd = vestingBegin + config.vestingEndDelay;

            console.log("\n==============================================================================\n");
            console.log("Deploying TreasuryVester with parameters:");
            console.log("Recipient", recipient, " ", config.allocations[recipient].address);
            console.log("Amount:", amount.toString());
            console.log("Vesting Begins: ", vestingBegin);
            console.log("Vesting Cliff: ", vestingCliff);
            console.log("Vesting Ends: ", vestingEnd);

            const vesterContract = new web3.eth.Contract(TreasuryVester.abi);
            await vesterContract.deploy({ 
                    data: TreasuryVester.bytecode,
                    arguments: [vexAddress, 
                                config.allocations[recipient].address,
                                amount,
                                vestingBegin,
                                vestingCliff,
                                vestingEnd]
                  })
                  .send({ from: walletAddress })
                  .on("receipt", (receipt) => {
                    transactionReceipt = receipt;
                  });    

            vesterContract.options.address = transactionReceipt.contractAddress;        

            assert(await vesterContract.methods
                          .recipient()
                          .call() == config.allocations[recipient].address);
            
            assert(await vesterContract.methods
                          .vestingAmount()
                          .call() == amount);

            assert(await vesterContract.methods
                          .vestingBegin()
                          .call() == vestingBegin);

            assert(await vesterContract.methods
                          .vestingCliff()
                          .call() == vestingCliff);

            assert(await vesterContract.methods
                          .vestingEnd()
                          .call() == vestingEnd);

            console.log("\nTreasuryVester successfully deployed at address:", transactionReceipt.contractAddress);
            console.log("For recipient: ", config.allocations[recipient].address);

            console.log("Transfering VEX to TreasuryVester contract");

            await vexContract.methods
                    .transfer(vesterContract.options.address,
                              amount)
                    .send({ from: walletAddress })
                    .on("receipt", (receipt) => {
                        console.log("Successfully transferred VEX tokens to Vester address");
                    });

            assert(await vexContract.methods
                            .balanceOf(vesterContract.options.address)
                            .call() == amount);
        }

        console.log("Happy waiting!");
    }
    catch(error)
    {
        console.log("Deployment failed with:", error);
    }    
}

deployVester();
