import mysql, { Connection } from 'mysql2/promise';

interface DbConfig {
  host: string;
  user: string;
  password: string;
  database: string;
}

const dbConfig: DbConfig = {
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'your_database'
};

export const connectDb = async (): Promise<Connection> => {
  return mysql.createConnection(dbConfig);
};
