// ES5 style
const config = require("./config/deploymentConfig");
const deployedAddresses = require("./config/deployedAddresses");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const GovernorAlpha = require(config.pathToGovernorAlphaJson);
const readlineSync = require("readline-sync");
const assert = require("assert");

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

web3.eth.accounts.wallet.add(config.deployerPrivateKey);
const deployerAddress = web3.eth.accounts.wallet[0].address;

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
    from: deployerAddress
  }).on("receipt", (receipt) => {
    console.log("Mastership successfully renounced, txid: ", receipt.transactionHash);
  });
}

deployGovernance = async() =>
{
  console.log("Deployer Address:", deployerAddress);
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
      arguments: [deployedAddresses.timelockAddress, deployedAddresses.vexAddress]
    })
      .send({ from: deployerAddress })
      .on("receipt", (receipt) => {
        transactionReceipt = receipt;
      });

    console.log("Transaction Hash:", transactionReceipt.transactionHash);
    console.log("Contract Successfully deployed at address:", transactionReceipt.contractAddress);

    const governorAlphaAddress = transactionReceipt.contractAddress;
    governorAlphaContract.options.address = governorAlphaAddress;

    await renounceMastership(governorAlphaAddress);
    assert(await governorAlphaContract.methods.quorumVotes().call() === "1000000000000000000000000");
  }
  catch(error)
  {
    console.log("Deployment failed with:", error)
  }
}

deployGovernance();
