/* Used to store CronJobs  */
var cron = require('node-cron');
var cronData = require("../controllers/v1/CronController");

// On Every Minute
cron.schedule('0 * * * *', async (req, res, next) => {
    console.log("Started cron....");
    await cronData.executeDataBackup();
});