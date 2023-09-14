const result = require('dotenv').config();

if (result.error) {
    throw result.error
}
const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 5,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    charset:'utf8mb4_unicode_ci'
});

pool.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
    if (error) {
        pool.end(function (errnoError) {
            console.trace(errnoError);
        });
        throw error;
    }
    console.log('The solution is: ', results[0].solution);
});

module.exports = pool;
