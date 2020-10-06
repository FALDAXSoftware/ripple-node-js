const { Model } = require('objection');
const Knex = require('knex');
// Initialize knex.

const knex = Knex({
    client: process.env.DB_CONNECTION,
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    },
    pool: { min: 1, max: 2 }
});

// Give the knex object to objection.
Model.knex(knex);
module.exports = Model;