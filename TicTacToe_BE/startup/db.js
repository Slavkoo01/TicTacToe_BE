const { Client } = require('pg');
const config = require('config');

const host = config.get('DBHost');
const user = config.get('DBUser');
const port = config.get('DBPort');
const password = config.get('DBPassword');
const database = config.get('DBName');

const client = new Client({
    host: host,
    user: user,
    port: port,
    password: password,
    database: database
});
client.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Connection error', err.stack));



module.exports = client;
