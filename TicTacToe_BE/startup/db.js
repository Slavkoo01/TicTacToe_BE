const { Pool } = require('pg');
const config = require('config');

const host = config.get('DBHost');
const user = config.get('DBUser');
const port = config.get('DBPort');
const password = config.get('DBPassword');
const database = config.get('DBName');


const pool = new Pool({
    host: host,
    user: user,
    port: port,
    password: password,
    database: database
});


pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = pool;
