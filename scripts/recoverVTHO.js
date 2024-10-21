// ES5 style
const config = require("./config/deploymentConfig");
const deployedAddresses = require("./config/deployedAddresses");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const WVET = require("../abi/WVET.json");
const assert = require('assert');
const readlineSync = require("readline-sync");

let network = null;
let amount = null;
let recipient = null;

if (process.argv.length !== 5)
{
  console.error("Usage: node recoverVTHO.js [mainnet|testnet] [recipient address] [amount]");
  process.exit(1);
}
else
{
  network = config.network[process.argv[2]];
  if (network === undefined) {
    console.error("Invalid network specified");
    process.exit(1);
  }
  recipient = process.argv[3];
  amount = process.argv[4];
}

const web3 = thorify(new Web3(), network.rpcUrl);
web3.eth.accounts.wallet.add(config.privateKey);

recoverVTHO = async() =>
{
  try
  {
    const walletAddress = web3.eth.accounts.wallet[0].address;
    const wvetContract = new web3.eth.Contract(WVET.abi, deployedAddresses.wvetAddress);
    // using the WVET abi for convenience, as we only need the `balanceOf` function
    const vthoContract = new web3.eth.Contract(WVET.abi, deployedAddresses.vthoAddress);
    const wvetContractOwner = await wvetContract.methods.owner().call();

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    if (network.name == "mainnet")
    {
      let input = readlineSync.question("Confirm you want to call this on the MAINNET? (y/n) ");
      if (input != "y") process.exit(1);
    }

    const vthoBalance = await vthoContract.methods.balanceOf(wvetContract._address).call();

    console.log("VTHO balance in the WVET contract", vthoBalance);

    if (walletAddress !== wvetContractOwner) {
      console.error("Current wallet is not the owner of the WVET contract. Call will fail. Exiting");
      process.exit(1);
    }

    const success = await wvetContract.methods
      .recoverTokens(vthoContract._address, recipient, amount)
      .send({ from: walletAddress })
      .on("receipt", (receipt) => {
        transactionReceipt = receipt;
      });

    if (success) console.log("Recover succeeded");
  }
  catch(error)
  {
    console.log("Failed with:", error);
  }
}

recoverVTHO();
