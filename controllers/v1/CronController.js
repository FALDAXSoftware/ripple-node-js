var { AppController } = require('./AppController');
var moment = require('moment');
var cmd = require('node-cmd');
var ActivityModel = require("../../models/Activity");
var WalletModel = require("../../models/WalletModel");
var CoinModel = require("../../models/CoinModel");
var WalletHistoryModel = require("../../models/WalletHistoryModel");
var TransactionTableModel = require("../../models/TransactionTableModel");
var fs = require('fs');

var Promise = require('bluebird');

const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({
    server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
});

api.connect().then(() => {
    console.log('connected');
    return api.getServerInfo().then(result => {
        console.log(JSON.stringify(result, null, 2));
    })
}).then(() => {
    api.connection.on('transaction', ev => {
        console.log(JSON.stringify(ev, null, 2))
    });
    api.connection.request({
        command: 'subscribe',
        accounts: ['rK5FivAcBmJei41jyhwzwnb5bDwhz5gU1P']
    });
}).catch(console.error);
var counter = 0;
class InfluxController extends AppController {

    constructor() {
        super();
    }

    async getnewaddress(req, res) {
        var coin_id = await CoinModel
            .query()
            .first()
            .where({ 'coin_code': 'txrp', 'is_active': 'true' });
        var ressult = await WalletModel
            .query()
            .first()
            .select('receive_address')
            .where({ 'coin_id': coin_id.id })
            .orderBy('id', 'desc');
        var id = ressult.receive_address.split('=')[1];
        console.log(id);
        res.status(200).json({ 'message': 'Your new Ripple Accout is created', 'account': (process.env.ACCOUNT_ADDRESS + "?dt=" + (++id)) })
    }

    async executeRippleTransaction(req, res) {
        try {
            let req_body = req.body;
            const preparedTx = await api.prepareTransaction({
                "TransactionType": "Payment",
                "Account": process.env.ACCOUNT_ADDRESS,
                "Amount": api.xrpToDrops(req_body.amount),
                "Destination": req_body.to_address,
                "DestinationTag": req_body.destination_tag
            }, {
                // Expire this transaction if it doesn't execute within ~5 minutes:
                "maxLedgerVersionOffset": 75
            })
            console.log("txJSON", preparedTx.txJSON);
            const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
            console.log(maxLedgerVersion);
            const response = api.sign(preparedTx.txJSON, process.env.SECRET_KEY);
            const txID = response.id;
            console.log("Identifying hash:", txID);
            const txBlob = response.signedTransaction;
            console.log("Signed blob:", txBlob);

            const status = await module.exports.doSubmit(txBlob);
            //console.log("Status", status);
            if (status.resultCode === 'tesSUCCESS') {
                console.log("preparedTx", preparedTx)
                console.log("preparedTx.txJSON", preparedTx.txJSON)
                let data = {
                    'fees': preparedTx.instructions.fee,
                    'txID': txID
                }

                

                res.status(200).json({ 'status': 1, 'message': 'Transaction is submited on chain.', data });
            } else {
                res.status(400).json({ 'status': 0, 'message': status });
            }
        } catch (error) {
            console.log(error);
        }
    }

    async getBalance(req, res) {
        try {
            var address = req.body.address;
            api.getAccountInfo(address).then(info => {
                console.log(info);
                res.status(200).json({ 'balance': info });
            });
        } catch (error) {
            console.log(error);
        }
    }

    async getsub(req, res) {
    }

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
        return result;
    }

    async fromexecuteRippleTransaction(req, res) {
        try {
            let req_body = req.body;
            const preparedTx = await api.prepareTransaction({
                "TransactionType": "Payment",
                "Account": req_body.from_address,
                "Amount": api.xrpToDrops(req_body.amount),
                "Destination": req_body.to_address,
                "DestinationTag": req_body.destination_tag
            }, {
                // Expire this transaction if it doesn't execute within ~5 minutes:
                "maxLedgerVersionOffset": 75
            })
            console.log("txJSON", preparedTx.txJSON);
            const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
            console.log(maxLedgerVersion);
            const response = api.sign(preparedTx.txJSON, req_body.secret);
            const txID = response.id;
            console.log("Identifying hash:", txID);
            const txBlob = response.signedTransaction;
            console.log("Signed blob:", txBlob);

            const status = await module.exports.doSubmit(txBlob);
            //console.log("Status", status);
            if (status.resultCode === 'tesSUCCESS') {
                res.status(200).json({ 'status': 1, 'message': 'Transaction is submited on chain.' });
            } else {
                res.status(400).json({ 'status': 0, 'message': status });
            }
        } catch (error) {
            console.log(error);
        }
    }
}
module.exports = new InfluxController();