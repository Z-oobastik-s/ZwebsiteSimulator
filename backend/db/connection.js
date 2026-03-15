const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    server: process.env.DB_SERVER,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getPool() {
    if (pool) return pool;
    pool = await sql.connect(config);
    return pool;
}

async function query(sqlQuery, params = {}) {
    const p = await getPool();
    const request = p.request();
    Object.keys(params).forEach(key => {
        const value = params[key];
        request.input(key, value === undefined ? null : value);
    });
    return request.query(sqlQuery);
}

async function close() {
    if (pool) {
        await pool.close();
        pool = null;
    }
}

module.exports = { getPool, query, sql, close };

