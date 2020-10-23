var dotenv = require('dotenv');

dotenv.load(); // Configuration load (ENV file)

var express = require('express');
var fs = require('fs')
var path = require('path');
var app = express();
var https = require('https');
var http = require('http');
var server = http.createServer(app);
var mailer = require('express-mailer');
var cronController = require("./controllers/v1/CronController")
var getRippleTransaction = require("./controllers/v1/CronController");
var bodyParser = require('body-parser');

app.use(bodyParser.json({
  limit: "2.7mb",
  extended: false
}));

// Set views folder for emails
app.set('views', __dirname + '/views');
// Set template engin for view files
app.set('view engine', 'ejs');
// SMTP setting

mailer.extend(app, {
  from: process.env.EMAIL_DEFAULT_SENDING,
  host: process.env.EMAIL_HOST, // hostname
  secureConnection: true, // use SSL
  port: 465, // port forSMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  transportMethod: process.env.EMAIL_TRANSPORT_METHOD
});

app.all('/*', function (req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,Client-Key,x-token');
  if (req.headers.language) { // If header send language, then set to that language
    i18n.setLocale(req.headers.language);
  }
  console.log(req.headers["x-token"]);
  if (req.headers["x-token"] != "faldax-ripple-node") {
    res
      .status(403)
      .json({ status: 403, message: ("Unauthorized access") });
  }
  if (req.method == 'OPTIONS') {
    res
      .status(200)
      .end();
  } else {
    next();
  }
});

app.post('/api/v1/ripple-transaction', cronController.executeRippleTransaction);
app.post('/api/v1/ripple-transaction-from', cronController.fromexecuteRippleTransaction);
app.post('/api/v1/ripple-balance', cronController.getBalance);
app.post('/api/v1/ripple-get-new-address', cronController.getnewaddress);
app.get('/api/v1/ripple-fees', cronController.getFees);
app.get('/api/v1/get-transaction-list', cronController.getAllTransactionList);
app.get('/api/v1/health-check', cronController.healthCheck)

// Start the server
app.set('port', 3013);
server.listen(app.get('port'), function () {
  console.log(process.env.PROJECT_NAME + " Application is running on " + 3013 + " port....");
});

sendEmail = async (slug, user) => {
  var EmailTemplate = require("./models/EmailTemplateModel");
  var helpers = require("./helpers/helpers")
  let template = await EmailTemplate
    .query()
    .first()
    .select()
    .where("slug", slug);

  let user_language = (user.default_language ? user.default_language : 'en');
  console.log("user_language", user_language)
  let language_content = template.all_content[user_language].content;
  console.log("language_content", language_content)
  let language_subject = template.all_content[user_language].subject;
  var object = {};
  object.recipientName = user.first_name;
  console.log("object", object)
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
  language_content = await helpers.formatEmail(language_content, object);

  console.log(language_content)

  try {
    console.log("user.email", user.email)
    await app.mailer
      .send('emails/general_mail.ejs', {
        to: user.email,
        subject: language_subject,
        content: (language_content),
        PROJECT_NAME: process.env.PROJECT_NAME,
        SITE_URL: process.env.SITE_URL,
        homelink: process.env.SITE_URL
      }, function (err, body) {
        console.log("err", err);
        console.log("body", body)
        if (err) {
          return 0;
        } else {
          return 1;
        }
      });
  } catch (err) {
    console.log("EMail err:", (err));
    return 0;
  }
}

module.exports = {
  sendEmail: sendEmail
}
// app.get('/api/v1/call-cron-route', cronController.executeDataBackup);

// var cronjobFile = require("./services/cronJobs");