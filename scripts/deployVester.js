// ES5 style
const config = require("./vesterConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const TreasuryVester = require(config.pathToTreasuryVesterJson);
const assert = require('assert');

let rpcUrl = null;
let vexAddress = null;
let recipientAddress = null;
let cliffDelay = null;
let amount = null;

if (process.argv.length < 6) 
{
    console.error("Usage: node deployVester.js [mainnet|testnet] [DAO|EOA] [<address>] [<amount excluding 18 decimals>]");
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

    if (process.argv[3] == "DAO") cliffDelay =  config.daoCliffDelay; 
    else if (process.argv[3] == "EOA") cliffDelay = config.eoaCliffDelay;   
    else 
    {
        console.log("Invalid recipient type specified");
        process.exit(1);
    }

    recipientAddress = process.argv[4];

    if (!Web3.utils.isAddress(recipientAddress)) 
    {
        console.error("Invalid address provided");
        process.exit(1);
    }
        
    amount = Web3.utils.toWei(Web3.utils.toBN(process.argv[5]));
}

const web3 = thorify(new Web3(), rpcUrl);

web3.eth.accounts.wallet.add(config.privateKey);

deployVester = async() =>
{
    try
    {
        // This is the address associated with the private key
        const walletAddress = web3.eth.accounts.wallet[0].address

        console.log("Using wallet address:", walletAddress);
        console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

        const blockNumber = await web3.eth.getBlockNumber();
        const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

        console.log(timestamp);

        const vestingBegin = timestamp + 60; // 1 minute after current block timestamp
        const vestingCliff = vestingBegin + cliffDelay;
        const vestingEnd = vestingBegin + config.vestingEndDelay; // 2 years (730 days) in seconds

        console.log("Deploying TreasuryVester with parameters:");
        console.log("Recipient", recipientAddress);
        console.log("Amount:", amount.toString());
        console.log("Vesting Begins: ", vestingBegin);
        console.log("Vesting Cliff: ", vestingCliff);
        console.log("Vesting Ends: ", vestingEnd);

        const vesterContract = new web3.eth.Contract(TreasuryVester.abi);
        await vesterContract.deploy({ 
                data: TreasuryVester.bytecode,
                arguments: [vexAddress, 
                            recipientAddress,
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
                      .call() == recipientAddress);
        
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

        console.log("TreasuryVester successfully deployed at address:", transactionReceipt.contractAddress);
        console.log("For recipient: ", recipientAddress);
        console.log("Happy waiting!");
    }
    catch(error)
    {
        console.log("Deployment failed with:", error);
    }    
}

deployVester();
