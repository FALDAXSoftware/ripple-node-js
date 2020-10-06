var dotenv = require('dotenv');

dotenv.load(); // Configuration load (ENV file)

var express = require('express');
var fs = require('fs')
var path = require('path');
var app = express();
var https = require('https');
var http = require('http');
var server = http.createServer(app);
var cronController = require("./controllers/v1/CronController")
var getRippleTransaction = require("./controllers/v1/CronController");
const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
});

api.connect().then(() => {
  console.log('connected');
  return api.getServerInfo().then(result => {
    console.log(JSON.stringify(result, null, 2));
  })
}).catch(console.error);

// api.connection._config.connectionTimeout = 3e4;

app.get('/api/v1/ripple-transaction', getRippleTransaction.executeRippleTransaction);
// getRippleTransaction.executeRippleTransaction();
//   .then(() => {
//   /* begin custom code ------------------------------------ */
//   const myAddress = 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn';

//   console.log('getting account info for', myAddress);
//   return api.getAccountInfo(myAddress);

// }).then(info => {
//   console.log(info);
//   console.log('getAccountInfo done');

//   /* end custom code -------------------------------------- */
// }).then(() => {
//   return api.disconnect();
// }).then(() => {
//   console.log('done and disconnected.');
// }).catch(console.error);

// async function doPrepare() {
//   const sender = "rpnfRMjA5vmQyYkYdhmV8RKeEEho6LNjQr"
//   const preparedTx = await api.prepareTransaction({
//     "TransactionType": "Payment",
//     "Account": sender,
//     "Amount": api.xrpToDrops("22"), // Same as "Amount": "22000000"
//     "Destination": "rK5FivAcBmJei41jyhwzwnb5bDwhz5gU1P"
//   }, {
//     // Expire this transaction if it doesn't execute within ~5 minutes:
//     "maxLedgerVersionOffset": 75
//   })
//   const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion
//   console.log("Prepared transaction instructions:", preparedTx.txJSON)
//   console.log("Transaction cost:", preparedTx.instructions.fee, "XRP")
//   console.log("Transaction expires after ledger:", maxLedgerVersion)
//   return preparedTx.txJSON
// }
// txJSON = JSON.stringify(doPrepare())

// // Continuing from the previous step...
// const response = api.sign(txJSON, "saBeukJoNi6DMvY3e9jzaXeK3Txbi")
// const txID = response.id
// console.log("Identifying hash:", txID)
// const txBlob = response.signedTransaction
// console.log("Signed blob:", txBlob)

// async function doSubmit(txBlob) {
//   const latestLedgerVersion = await api.getLedgerVersion()

//   const result = await api.submit(txBlob)

//   console.log("Tentative result code:", result.resultCode)
//   console.log("Tentative result message:", result.resultMessage)

//   // Return the earliest ledger index this transaction could appear in
//   // as a result of this submission, which is the first one after the
//   // validated ledger at time of submission.
//   return latestLedgerVersion + 1
// }
// const earliestLedgerVersion = doSubmit(txBlob)
// console.log("earliestLedgerVersion", earliestLedgerVersion)

// api.on('ledger', ledger => {
//   console.log("Ledger version", ledger.ledgerVersion, "was validated.")
//   if (ledger.ledgerVersion > maxLedgerVersion) {
//     console.log("If the transaction hasn't succeeded by now, it's expired")
//   }
// });

// tx = await api.getTransaction(txID, { minLedgerVersion: earliestLedgerVersion })
// console.log("Transaction result:", tx.outcome.result)
// console.log("Balance changes:", JSON.stringify(tx.outcome.balanceChanges))

// Start the server
app.set('port', process.env.PORT);
server.listen(app.get('port'), function () {
  console.log(process.env.PROJECT_NAME + " Application is running on " + 3013 + " port....");
});

// app.get('/api/v1/call-cron-route', cronController.executeDataBackup);

// var cronjobFile = require("./services/cronJobs");