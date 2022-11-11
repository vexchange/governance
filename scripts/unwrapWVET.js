// ES5 style
const config = require("./config/deploymentConfig");
const deployedAddresses = require("./config/deployedAddresses");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const WVET = require("../abi/WVET.json");
const assert = require('assert');
const readlineSync = require("readline-sync");

let network = null;

if (process.argv.length !== 3)
{
  console.error("Usage: node unwrapWVET.js [mainnet|testnet]");
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

unwrapWVET = async() =>
{
  try
  {
    const walletAddress = web3.eth.accounts.wallet[0].address;
    const wvetContract = new web3.eth.Contract(WVET.abi, deployedAddresses.wvetAddress);

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    if (network.name == "mainnet")
    {
      let input = readlineSync.question("Confirm you want to call this on the MAINNET? (y/n) ");
      if (input != "y") process.exit(1);
    }

    const wvetBalance = web3.utils.fromWei(await wvetContract.methods.balanceOf(walletAddress).call());

    console.log("WVET Balance for wallet", wvetBalance);

    await wvetContract.methods
      .withdraw(wvetBalance)
      .send({ from: walletAddress })
      .on("receipt", (receipt) => {
        transactionReceipt = receipt;
      });

    console.log("New WVET balance for wallet", web3.utils.fromWei(await wvetContract.methods.balanceOf(walletAddress).call()));
  }
  catch(error)
  {
    console.log("Failed with:", error);
  }
}

unwrapWVET();
