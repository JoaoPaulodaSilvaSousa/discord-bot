const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'MySQLDBDedicado321@',
  database: 'discord_bot'
});

module.exports = pool;
