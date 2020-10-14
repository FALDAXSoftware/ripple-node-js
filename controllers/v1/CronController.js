var { AppController } = require('./AppController');
var moment = require('moment');
var cmd = require('node-cmd');
var ActivityModel = require("../../models/Activity");
var WalletModel = require("../../models/WalletModel");
var CoinModel = require("../../models/CoinModel");
var WalletHistoryModel = require("../../models/WalletHistoryModel");
var TransactionTableModel = require("../../models/TransactionTableModel");
var getFiatValuHelper = require("../../helpers/get-fiat-value")
var fs = require('fs');

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
            // let req_body = req.body;
            var user_id = req.body.user_id;
            var amount = req.body.amount;
            var destination_address = req.body.destination_address;
            var faldax_fee = req.body.faldax_fee;
            var network_fee = req.body.network_fee;
            var is_admin = (req.body.is_admin) ? (req.body.is_admin) : false;

            var getCoinData = await CoinModel
                .query()
                .first()
                .select("is_active", "coin_code", "id")
                .where("is_active", true)
                .andWhere("deleted_at", null)
                .andWhere("coin", process.env.COIN)
                .orderBy("id", "DESC");

            if (getCoinData != undefined) {

                console.log("getCoinData.id", getCoinData.id);
                console.log("user_id", user_id);
                console.log("is_admin", is_admin)

                var getUserWalletData = await WalletModel
                    .query()
                    .first()
                    .select("balance", "placed_balance", "receive_address", "id")
                    .where("user_id", user_id)
                    .andWhere("coin_id", getCoinData.id)
                    .andWhere("is_admin", is_admin)
                    .andWhere("deleted_at", null);

                console.log("getUserWalletData", getUserWalletData)

                if (getUserWalletData != undefined) {

                    var balanceChecking = parseFloat(amount) + parseFloat(faldax_fee) + parseFloat(network_fee);
                    var data = {};
                    if (req.body.DestinationTag) {
                        data = {
                            "TransactionType": "Payment",
                            "Account": process.env.ACCOUNT_ADDRESS,
                            "Amount": api.xrpToDrops(amount),
                            "Destination": destination_address,
                            "DestinationTag": req.body.DestinationTag
                        }
                    } else {
                        data = {
                            "TransactionType": "Payment",
                            "Account": process.env.ACCOUNT_ADDRESS,
                            "Amount": api.xrpToDrops(amount),
                            "Destination": destination_address,
                            // "DestinationTag": req.body.DestinationTag
                        }
                    }

                    if (getUserWalletData.placed_balance >= balanceChecking) {
                        const preparedTx = await api.prepareTransaction(data, {
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
                        console.log("Status", status);
                        if (status.resultCode === 'tesSUCCESS') {
                            console.log("preparedTx", preparedTx)
                            console.log("preparedTx.txJSON", preparedTx.txJSON)
                            let data = {
                                'fees': preparedTx.instructions.fee,
                                'txID': txID
                            }

                            var userBalanceUpdateValue = parseFloat(faldax_fee) + parseFloat(data.fees);
                            userBalanceUpdateValue = parseFloat(amount) + parseFloat(userBalanceUpdateValue);

                            var amountToBeDeductedBalance = parseFloat(getUserWalletData.balance) - parseFloat(userBalanceUpdateValue);
                            var amountToBeDeductedPlacedBalance = parseFloat(getUserWalletData.placed_balance) - parseFloat(userBalanceUpdateValue);

                            var updateUserData = await WalletModel
                                .query()
                                .where("user_id", user_id)
                                .andWhere("coin_id", getCoinData.id)
                                .andWhere("is_admin", is_admin)
                                .patch({
                                    "balance": amountToBeDeductedBalance,
                                    "placed_balance": amountToBeDeductedPlacedBalance
                                });

                            var getFiatValues = await getFiatValuHelper.getFiatValue(process.env.COIN);

                            var transactionData = await WalletHistoryModel
                                .query()
                                .insert({
                                    "source_address": getUserWalletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": userBalanceUpdateValue,
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": getCoinData.id,
                                    "transaction_id": data.txID,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": data.fees,
                                    "estimated_network_fees": network_fee,
                                    "user_id": getUserWalletData.user_id,
                                    "is_admin": is_admin,
                                    "fiat_values": getFiatValues
                                });

                            var transactionValue = await TransactionTableModel
                                .query()
                                .insert({
                                    "source_address": getUserWalletData.receive_address,
                                    "destination_address": destination_address,
                                    "amount": userBalanceUpdateValue,
                                    "actual_amount": amount,
                                    "transaction_type": "send",
                                    "created_at": new Date(),
                                    "coin_id": getCoinData.id,
                                    "transaction_id": data.txID,
                                    "faldax_fee": faldax_fee,
                                    "actual_network_fees": data.fees,
                                    "estimated_network_fees": network_fee,
                                    "transaction_from": "Send to Destination",
                                    "user_id": getUserWalletData.user_id,
                                    "is_admin": is_admin
                                });


                            var adminBalance = await WalletModel
                                .query()
                                .first()
                                .select("balance", "placed_balance", "receive_address", "id")
                                .where("user_id", process.env.ADMIN_ID)
                                .andWhere("coin_id", getCoinData.id)
                                .andWhere("is_admin", is_admin)
                                .andWhere("deleted_at", null)
                                .orderBy("id", "DESC");

                            if (adminBalance != undefined) {
                                var amountToBeAdded = 0.0
                                amountToBeAdded = parseFloat(faldax_fee)
                                console.log("amountToBeAdded", amountToBeAdded)
                                console.log("walletBalance.balance", walletBalance.balance)
                                var updateWalletBalance = await WalletModel
                                    .query()
                                    .where("deleted_at", null)
                                    .andWhere("coin_id", getCoinData.id)
                                    .andWhere("is_admin", true)
                                    .andWhere("user_id", process.env.ADMIN_ID)
                                    .patch({
                                        "balance": parseFloat(adminBalance.balance) + parseFloat(amountToBeAdded),
                                        "placed_balance": parseFloat(adminBalance.placed_balance) + parseFloat(amountToBeAdded)
                                    });

                                var walletHistoryValue = await WalletHistoryModel
                                    .query()
                                    .insert({
                                        "source_address": getUserWalletData.receive_address,
                                        "destination_address": adminBalance.receive_address,
                                        "amount": parseFloat(amountToBeAdded).toFixed(8),
                                        "actual_amount": amount,
                                        "transaction_type": "send",
                                        "created_at": new Date(),
                                        "coin_id": getCoinData.id,
                                        "transaction_id": data.txID,
                                        "faldax_fee": faldax_fee,
                                        "actual_network_fees": 0.0,
                                        "estimated_network_fees": 0.0,
                                        "user_id": process.env.ADMIN_ID,
                                        "is_admin": is_admin,
                                        "fiat_values": getFiatValues
                                    })
                            }

                            res.status(200).json({ 'status': 1, 'message': 'Transaction is submited on chain.', userBalanceUpdateValue });
                        } else {
                            res.status(400).json({ 'status': 0, 'message': status });
                        }
                    } else {
                        return res
                            .status(201)
                            .json({
                                "status": 201,
                                "message": "Insufficient Balance in the wallet"
                            })
                    }

                } else {
                    return res
                        .status(400)
                        .json({
                            "status": 400,
                            "message": "Wallet Data Not Found"
                        })
                }

            } else {
                return res
                    .status(500)
                    .json({
                        "status": 500,
                        "message": "Coin Not Found"
                    })
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