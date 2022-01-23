// ES5 style
const config = require("./config/deploymentConfig");
const deployedAddresses = require("./config/deployedAddresses");
const thorify = require("thorify").thorify;
const Web3 = require("web3");
const Factory = require(config.pathToV2FactoryJson);
const Pair = require(config.pathToV2PairJson);
const Timelock = require(config.pathToTimelockJson);
const fs = require('fs');
const assert = require('assert');
const readlineSync = require("readline-sync");
const axios = require('axios')

if (process.argv.length !== 2)
{
  console.error("Usage: node queueLPTokenTransfer.js");
  process.exit(1);
}

const web3 = thorify(new Web3(), config.network.mainnet.rpcUrl);
web3.eth.accounts.wallet.add(config.deployerPrivateKey);

queueLPTokenTransfer = async() =>
{
  try
  {
    const pairs = new Map(Object.entries((await axios.get("https://api.vexchange.io/v1/pairs")).data));
    const walletAddress = web3.eth.accounts.wallet[0].address;
    const timelockContract = new web3.eth.Contract(Timelock.abi, deployedAddresses.timelockAddress);

    console.log("Using wallet address:", walletAddress);
    console.log("Using RPC:", web3.eth.currentProvider.RESTHost);
    //
    // let input = readlineSync.question("Confirm you want to call this on the MAINNET? (y/n) ");
    // if (input !== 'y') process.exit(1);

    // To store all the queued transaction info
    const output = [];
    const value = 0;
    const signature = "transfer(address,uint256)";

    console.log("Iterating through pairs to queue transfer of LP tokens having a balance");
    for (pairAddress of pairs.keys()) {
      const pairContract = new web3.eth.Contract(Pair.abi, pairAddress);
      const blockNumber = await web3.eth.getBlockNumber();
      const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

      const balance = await pairContract.methods.balanceOf(deployedAddresses.timelockAddress).call();

      if (balance === "0") { continue; }

      const data = web3.eth.abi.encodeParameters(["address","uint256"], [deployedAddresses.feeCollectorAddress, balance]);
      // Add some buffer to the delay
      const eta = parseInt(timestamp + config.timelockDelay + 30);

      await timelockContract.methods
        .queueTransaction(pairAddress, value,
          signature, data, eta)
        .send({ from: walletAddress })
        .on("receipt", (receipt) => {
          transactionReceipt = receipt;
        });
      const transactionHashQueued = transactionReceipt.   outputs[0].events[0].topics[1];
      console.log("Transaction Hash of queued proposal:", transactionHashQueued);

      // Ensure that transaction is indeed queued
      assert(await timelockContract.methods
        .queuedTransactions(transactionHashQueued)
        .call());

      const txInfo = {
        timelockAddress: deployedAddresses.timelockAddress,
        pairAddress: pairAddress,
        signature: signature,
        value: value,
        data: data,
        eta: eta,
      }
      output.push(txInfo);
    }

    fs.writeFileSync('./scripts/config/transferLpTokens.json', JSON.stringify(output, null, 2));
    console.log("All transfers successfully queued");
  }
  catch(error)
  {
    console.log("Failed with:", error);
  }
}

queueLPTokenTransfer();
