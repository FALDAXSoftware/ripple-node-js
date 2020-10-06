var bunyan = require('bunyan')
const name = 'faldax-backend'

const configs = {
    src: true,
    name,
    streams: []
}

const stream = require('gelf-stream').forBunyan(
    process.env.LOG_URL,
    12201
)
configs.streams.push({
    type: 'raw',
    stream: stream,
    level: 'info'
    // level: 61 // To disable logs
})
configs.streams.push({
    type: 'stream',
    stream: process.stderr,
    level: 'error'
    // level: 61 // To disable logs
})

const logger = bunyan.createLogger(configs)

module.exports = logger