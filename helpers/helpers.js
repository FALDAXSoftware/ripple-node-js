var express = require('express');
var app = express();

var SendEmail = async (slug, user) => {
    // console.log(requestedData)
    var express = require('express');
    var app = express();
    var response = require("../app");
    await response.sendEmal(slug, user)
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

module.exports = {
    formatEmail,
    SendEmail
}