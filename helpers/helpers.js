var express = require('express');
var app = express();

var SendEmail = async (slug, user) => {
    // console.log(requestedData)
    var response = require("../app");
    await response.sendEmail(slug, user)
    // res = app;
    return 1;
}

// Format Email
var formatEmail = async (emailContent, data) => {
    let rex = /{{([^}]+)}}/g;
    let key;
    // console.log("data", JSON.stringify(data));
    if ("object" in data) {
        data = data.object;
    }
    var tempEmailContent = emailContent;
    while (key = rex.exec(emailContent)) {
        // emailContent = emailContent.replace(key[0], data[key[1]] ? data[key[1]] : '');  
        var temp_var = '';
        if (Array.isArray(data[key[1]])) {
            temp_var = ''
            data[key[1]].forEach(function (each, index) {
                temp_var += JSON.stringify(each) + '<br>'
            })
        } else {
            temp_var = data[key[1]];
        }
        // tempEmailContent = tempEmailContent.replace(key[0], data[key[1]] ? data[key[1]] : '');
        tempEmailContent = tempEmailContent.replace(key[0], data[key[1]] ? temp_var : '');
    }
    // console.log("tempEmailContent", tempEmailContent)
    return tempEmailContent;
}

// SMS Sending Function

var sendSMS = async (slug, user) => {
    // console.log("INSIDE SMS", requestedData);
    var SmsTemplate = require("../models/SmsTemplate");
    var twilio = require('twilio');
    // var email = user.email;
    // var user_detail = requestedData.user_detail;
    // var format_data = requestedData.formatData;
    let template = await SmsTemplate.getSingleData({
        slug: slug
    });
    var template_name = template.template;

    let language_content = template.content;
    var value = {};
    value.recipientName = user.first_name
    if (user.reason && user.reason != undefined && user.reason != null) {
        object.reason = user.reason
    }

    if (user.limitType && user.limitType != undefined && user.limitType != null)
        object.limit = user.limitType

    if (user.amountReceived && user.amountReceived != undefined && user.amountReceived != "") {
        object.amountReceived = user.amountReceived
    }

    if (user.firstCoin && user.firstCoin != undefined && user.firstCoin != "") {
        object.firstCoin = user.firstCoin
    }

    if (user.secondCoin && user.secondCoin != undefined && user.secondCoin != "") {
        object.secondCoin = user.secondCoin
    }

    if (user.firstAmount && user.firstAmount != undefined && user.firstAmount != "") {
        object.firstAmount = user.firstAmount
    }

    if (user.secondAmount && user.secondAmount != undefined && user.secondAmount != "") {
        object.secondAmount = user.secondAmount
    }

    if (user.coinName && user.coinName != undefined && user.coinName != null) {
        object.coin = user.coinName
    }
    language_content = await module.exports.formatEmail(language_content, object);
    // console.log("language_content", language_content)
    // console.log("process.env.TWILLIO_ACCOUNT_SID", process.env.TWILLIO_ACCOUNT_SID)
    var account_sid = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_SID);
    var accountSid = account_sid; // Your Account SID from www.twilio.com/console
    // console.log("accountSid", accountSid)
    var authToken = await module.exports.getDecryptData(process.env.TWILLIO_ACCOUNT_AUTH_TOKEN); // Your Auth Token from www.twilio.com/console
    // console.log("authToken", authToken)
    var accountNumber = process.env.TWILLIO_ACCOUNT_FROM_NUMBER
    var user_id = user_detail.id;

    // console.log("language_content", language_content)

    //Twilio Integration
    var client = new twilio(accountSid, authToken);
    //Sending SMS to users 
    client.messages.create({
        body: language_content,
        to: user.phone_number, // Text this number
        from: accountNumber // From a valid Twilio number
    }).then((message) => {
        // console.log("message", message)
        return (1);
    })
        .catch((err) => {
            console.log("ERROR >>>>>>>>>>>", err)
        })
}

var getDecryptData = (value) => {
    try {
        var aesjs = require('aes-js');
        var decryptData;
        var key = JSON.parse(process.env.SECRET_KEY);
        var iv = JSON.parse(process.env.SECRET_IV);
        // console.log("value", value);
        console.log()
        // When ready to decrypt the hex string, convert it back to bytes
        var encryptedBytes = aesjs.utils.hex.toBytes(value);
        // The output feedback mode of operation maintains internal state,
        // so to decrypt a new instance must be instantiated.
        var aesOfb = new aesjs.ModeOfOperation.ofb(key, iv);
        var decryptedBytes = aesOfb.decrypt(encryptedBytes);

        // Convert our bytes back into text
        var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
        return (decryptedText);
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    formatEmail,
    SendEmail,
    getDecryptData,
    sendSMS
}