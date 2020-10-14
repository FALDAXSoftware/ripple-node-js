var { AppController } = require('./AppController');

var request = require('request');
var ActivityModel = require("../../models/Activity");
var WalletModel = require("../../models/WalletModel");
var CoinModel = require("../../models/CoinModel");
var WalletHistoryModel = require("../../models/WalletHistoryModel");
var TransactionTableModel = require("../../models/TransactionTableModel");
var getFiatValuHelper = require("../../helpers/get-fiat-value")
var emailSendHelper = require("../../helpers/helpers");
var UserNotificationModel = require("../../models/UserNotifcationModel");
var EmailTemplateModel = require("../../models/EmailTemplateModel");
var UsersModel = require("../../models/UsersModel");
var fs = require('fs');

const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({
    server: 'wss://s.altnet.rippletest.net:51233' // Public rippled server
});
api.connection._config.connectionTimeout = 3e4;
api.connect().then(() => {
    console.log('connected');
    return api.getServerInfo().then(result => {
        console.log(JSON.stringify(result, null, 2));
    })
}).then(() => {
    api.connection.on('transaction', async ev => {
        // console.log(JSON.stringify(ev, null, 2))
        console.log("ev", ev.engine_result);
        console.log("transaction", ev.transaction)
        if (ev.engine_result == "tesSUCCESS") {
            if (ev.transaction.Account != 'rK5FivAcBmJei41jyhwzwnb5bDwhz5gU1P') {
                var coinData = await CoinModel
                    .query()
                    .first()
                    .select("id", "coin", "coin_precision")
                    .where("deleted_at", null)
                    .andWhere("is_active", true)
                    .andWhere("coin", process.env.COIN)
                    .orderBy("id", "DESC");
                if (coinData != undefined) {
                    var userAddress = "";
                    if (ev.transaction.DestinationTag) {
                        userAddress = ev.transaction.Destination + "?dt=" + ev.transaction.DestinationTag;
                    } else {
                        userAddress = ev.transaction.Destination;
                    }
                    var userWalletData = await WalletModel
                        .query()
                        .first()
                        .select()
                        .where("deleted_at", null)
                        .andWhere("coin_id", coinData.id)
                        .andWhere("receive_address", userAddress)
                        .orderBy("id", "DESC");

                    console.log("userWalletData", userWalletData);
                    console.log("userWalletData.user_id", userWalletData.user_id)
                    var user_id = userWalletData.user_id;
                    var coin_id = userWalletData.coin_id

                    if (userWalletData != undefined) {
                        userWalletData.balance = isNaN(userWalletData.balance) ? (0.0) : (userWalletData.balance);
                        userWalletData.placed_balance = isNaN(userWalletData.placed_balance) ? (0.0) : (userWalletData.placed_balance)
                        var valueToBeAdded = parseFloat((ev.transaction.Amount) / coinData.coin_precision)
                        console.log("valueToBeAdded", valueToBeAdded)
                        var addUserBalance = parseFloat(userWalletData.balance) + parseFloat(valueToBeAdded);
                        var addUserPlacedBalance = parseFloat(userWalletData.placed_balance) + parseFloat((ev.transaction.Amount) / coinData.coin_precision)
                        var userWalletData = await WalletModel
                            .query()
                            .where("deleted_at", null)
                            .andWhere("coin_id", coinData.id)
                            .andWhere("user_id", user_id)
                            .patch({
                                "balance": addUserBalance,
                                "placed_balance": addUserPlacedBalance
                            })

                        var userWalletHistory = await WalletHistoryModel
                            .query()
                            .insert({
                                coin_id: coinData.id,
                                source_address: ev.transaction.Account,
                                destination_address: userAddress,
                                user_id: user_id,
                                amount: parseFloat(valueToBeAdded).toFixed(8),
                                transaction_type: 'receive',
                                transaction_id: ev.transaction.hash,
                                faldax_fee: 0.0,
                                // network_fee: Number(parseFloat(ev.transaction.Fee / coinData.coin_precision).toFixed(8)),
                                actual_amount: parseFloat(valueToBeAdded).toFixed(8),
                                is_admin: userWalletData.is_admin,
                                created_at: new Date()
                            })

                        var userWalletTransactionHistory = await TransactionTableModel
                            .query()
                            .insert({
                                coin_id: coinData.id,
                                source_address: ev.transaction.Account,
                                destination_address: userAddress,
                                user_id: user_id,
                                amount: parseFloat(valueToBeAdded).toFixed(8),
                                transaction_type: 'receive',
                                transaction_id: ev.transaction.hash,
                                faldax_fee: 0.0,
                                // network_fee: Number(parseFloat(ev.transaction.Fee / coinData.coin_precision).toFixed(8)),
                                actual_amount: parseFloat(valueToBeAdded).toFixed(8),
                                is_admin: userWalletData.is_admin,
                                created_at: new Date()
                            });

                        console.log("userWalletData.user_id", user_id)

                        var userData = await UsersModel
                            .query()
                            .first()
                            .select()
                            .where("deleted_at", null)
                            .andWhere("is_active", true)
                            .andWhere("id", user_id);

                        var userNotification = await UserNotificationModel
                            .query()
                            .first()
                            .select()
                            .where("deleted_at", null)
                            .andWhere("user_id", user_id)
                            .andWhere("slug", "receive");

                        var coin_data = await CoinModel
                            .query()
                            .first()
                            .select()
                            .where("id", coin_id);

                        if (coin_data != undefined) {
                            userData.coinName = coin_data.coin;
                        } else {
                            userData.coinName = "-";
                        }

                        userData.amountReceived = (valueToBeAdded).toFixed(8);

                        if (userNotification != undefined) {
                            if (userNotification.email == true || userNotification.email == "true") {
                                if (userData.email != undefined) {
                                    console.log(userData);
                                    await emailSendHelper.SendEmail("receive", userData)
                                }
                            }
                            if (userNotification.text == true || userNotification.text == "true") {
                                if (userData.phone_number != undefined && userData.phone_number != null && userData.phone_number != '') {
                                    await sails.helpers.notification.send.text("receive", userData)
                                }
                            }
                        }

                    }
                }
            }
        }
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
        try {
            console.log(req.body);
            var req_body = req.body;
            var coin_id = await CoinModel
                .query()
                .first()
                .where({ 'coin_code': 'txrp', 'is_active': 'true' });
            if (coin_id != undefined) {
                var userwallet = await WalletModel
                    .query()
                    .first()
                    .select('receive_address')
                    .where({ user_id: req_body.user_id, coin_id: coin_id.id, deleted_at: null })
                //Check wehther the accout is already generated or not
                if (userwallet != undefined) {
                    res.status(500).json({ status: 500, 'message': 'Address has already been created.', 'data': userwallet.receive_address })
                } else {
                    //get the last dt to generate new one
                    var ressult = await WalletModel
                        .query()
                        .first()
                        .select('receive_address')
                        .where({ 'coin_id': coin_id.id })
                        .orderBy('id', 'desc');
                    var id = ressult.receive_address.split('=')[1];
                    var newaddress = (process.env.ACCOUNT_ADDRESS + "?dt=" + (++id));

                    var tx = await WalletModel
                        .query()
                        .insert({
                            wallet_id: 'wallet',
                            coin_id: coin_id.id,
                            receive_address: newaddress,
                            is_active: true,
                            user_id: req_body.user_id,
                            balance: 0,
                            placed_balance: 0,
                            address_label: req_body.label,
                            is_admin: false
                        });

                    res.status(200).json({ status: 200, 'message': 'Address has been created successfully.', 'data': newaddress })
                }
            } else {
                res.status(400).json({ status: 400, 'message': 'Coin is in-active' })
            }
        } catch (err) {
            console.log(err);
            return res
                .status(500)
                .json({
                    "status": 500,
                    "message": "Server Error"
                })
        }
        /*
            req:
                Userid
                label

        */
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
                    if (req.body.destinationTag) {
                        data = {
                            "TransactionType": "Payment",
                            "Account": process.env.ACCOUNT_ADDRESS,
                            "Amount": api.xrpToDrops(amount),
                            "Destination": destination_address,
                            "DestinationTag": parseInt(req.body.destinationTag)
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

    async getFees(req, res) {
        var fees = await api.getFee();
        return res
            .status(200)
            .json({
                "status": 200,
                "fees": api.xrpToDrops(fees)
            })
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