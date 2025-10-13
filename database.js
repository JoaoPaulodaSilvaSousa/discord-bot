import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const db = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'MySQLDBDedicado321@',
  database: 'bank'
});

export default db;