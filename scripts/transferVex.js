// ES5 style
const config = require("./config/vesterConfig");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Vex = require(config.pathToVEXJson);

let network = null;

if (process.argv.length < 4)
{
  console.error("Usage: node transferVex.js [mainnet|testnet] [recipient address]");
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

transferVex = async(recipient) =>
{
  try
  {
    // This is the address associated with the private key
    const walletAddress = web3.eth.accounts.wallet[0].address;
    const vexContract = new web3.eth.Contract(Vex.abi, network.vexAddress);

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

    if (network.name == "mainnet")
    {
          let input = readlineSync.question("Confirm you want to deploy this on the MAINNET? (y/n) ");
      if (input != 'y') process.exit(1);
    }

    await vexContract.methods
          .transfer(recipient, "123019103928103928103948")
          .send({ from: walletAddress })
          .on("receipt", (receipt) => {
            console.log("Successfully transferred");
          });
  }
  catch(error)
  {
    console.log("Deployment failed with:", error);
  }
}

transferVex(process.argv[3]);
