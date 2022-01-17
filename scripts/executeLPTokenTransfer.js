const config = require("./config/deploymentConfig");
const transferLPConfig = require("./config/transferLpTokens");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Timelock = require(config.pathToTimelockJson);
const Pair = require(config.pathToV2PairJson);
const assert = require("assert");
const readlineSync = require("readline-sync");

if (process.argv.length !== 2)
{
  console.error("Usage: node executeLPTokenTransfer.js");
  process.exit(1);
}

const web3 = thorify(new Web3(), config.network.mainnet.rpcUrl);
web3.eth.accounts.wallet.add(config.deployerPrivateKey);

executeTimelockTransfer = async() =>
{
  const walletAddress = web3.eth.accounts.wallet[0].address

  console.log("Using wallet address:", walletAddress);
  console.log("Using RPC:", web3.eth.currentProvider.RESTHost);

  try
  {
    console.log("\n==============================================================================\n");
    console.log("Attempting executeTransaction on Timelock");

    const timelockContract = new web3.eth.Contract(Timelock.abi, transferLPConfig[0].timelockAddress);

    let transactionReceipt;
    for (const tx of transferLPConfig)
    {
      console.log("Attempting execution for pair", tx.pairAddress);
      await timelockContract.methods
        .executeTransaction(
          tx.pairAddress, tx.value,
          tx.signature, tx.data, tx.eta)
        .send({ from: walletAddress })
        .on("receipt", (receipt) => {
          transactionReceipt = receipt;
        });

      console.log("Timelock executeTransaction was successful. Transaction hash: ", transactionReceipt.transactionHash);
    }
    console.log("All transactions executed");
  }
  catch(error)
  {
    console.log("Execution failed with:", error)
  }
}

executeTimelockTransfer();
