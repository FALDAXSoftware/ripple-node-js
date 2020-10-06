var { AppController } = require('./AppController');
var moment = require('moment');
var cmd = require('node-cmd');

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
class InfluxController extends AppController {

    constructor() {
        super();
    }

    async executeRippleTransaction() {
        try {
            console.log("working");
            const sender = "rK5FivAcBmJei41jyhwzwnb5bDwhz5gU1P"
            const preparedTx = await api.prepareTransaction({
                "TransactionType": "Payment",
                "Account": sender,
                "Amount": api.xrpToDrops("22"), // Same as "Amount": "22000000"
                "Destination": "rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM"
            }, {
                // Expire this transaction if it doesn't execute within ~5 minutes:
                "maxLedgerVersionOffset": 75
            })
            console.log("txJSON", preparedTx.txJSON);
            const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
            console.log(maxLedgerVersion);
            const response = api.sign(preparedTx.txJSON, "snv45qU2tht2kY5cgVyVptnxjVi4V")
            const txID = response.id
            console.log("Identifying hash:", txID)
            const txBlob = response.signedTransaction
            console.log("Signed blob:", txBlob)

            const earliestLedgerVersion = await module.exports.doSubmit(txBlob)
            console.log("earliestLedgerVersion", earliestLedgerVersion)

            api.on('ledger', async ledger => {
                console.log("Ledger version", ledger.ledgerVersion, "was validated.")
                if (ledger.ledgerVersion > maxLedgerVersion) {
                    console.log("If the transaction hasn't succeeded by now, it's expired");
                    try {
                        var tx = await api.getTransaction(txID, { minLedgerVersion: earliestLedgerVersion })
                        console.log("Transaction result:", tx.outcome.result)
                        console.log("Balance changes:", JSON.stringify(tx.outcome.balanceChanges))
                    } catch (error) {
                        console.log("Couldn't get transaction outcome:", error)
                    }
                }
            });
        } catch (error) {
            console.log(error);
        }
    }

    // async doPrepare() {
    //   const sender = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
    //   const preparedTx = await api.prepareTransaction({
    //     "TransactionType": "Payment",
    //     "Account": sender,
    //     "Amount": api.xrpToDrops("22"), // Same as "Amount": "22000000"
    //     "Destination": "rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM"
    //   }, {
    //     // Expire this transaction if it doesn't execute within ~5 minutes:
    //     "maxLedgerVersionOffset": 75
    //   })
    //   const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
    //   console.log("Prepared transaction instructions:", preparedTx.txJSON);
    //   console.log("Transaction cost:", preparedTx.instructions.fee, "XRP");
    //   console.log("Transaction expires after ledger:", maxLedgerVersion);
    //   console.log("preparedTx" ,preparedTx.txJSON);
    //   return preparedTx.txJSON;
    // }

    async doSubmit(txBlob) {
        console.log("txBlob inside function", txBlob)
        // console.log("api", api)
        const latestLedgerVersion = await api.getLedgerVersion()

        console.log("latestLedgerVersion", latestLedgerVersion)

        const result = await api.submit(txBlob)

        console.log("Tentative result code:", result.resultCode)
        console.log("Tentative result message:", result.resultMessage)

        // Return the earliest ledger index this transaction could appear in
        // as a result of this submission, which is the first one after the
        // validated ledger at time of submission.
        return latestLedgerVersion + 1
    }
}
module.exports = new InfluxController();