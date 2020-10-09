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
var bodyParser = require('body-parser');

app.use(bodyParser.json({
  limit: "2.7mb",
  extended: false
}));


app.post('/api/v1/ripple-transaction', cronController.executeRippleTransaction);
app.post('/api/v1/ripple-transaction-from', cronController.fromexecuteRippleTransaction);
app.get('/api/v1/ripple-balance', cronController.getBalance);
app.get('/api/v1/ripple-get-new-address', cronController.getnewaddress);
app.get('/api/v1/ripple', cronController.getsub);
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

// Start the server
app.set('port', 3012);
server.listen(app.get('port'), function () {
  console.log(process.env.PROJECT_NAME + " Application is running on " + 3012 + " port....");
});

// app.get('/api/v1/call-cron-route', cronController.executeDataBackup);

// var cronjobFile = require("./services/cronJobs");