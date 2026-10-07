import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  database: process.env.DATABASE_NAME || "carbontrack",
  user: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Test PostgreSQL database connection on server startup.
 * Logs success if connected, or a detailed error message if PostgreSQL is offline/not configured.
 */
export const connectDB = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("==================================================");
    console.log("PostgreSQL connected successfully");
    console.log(`Host: ${process.env.DATABASE_HOST || "localhost"}:${process.env.DATABASE_PORT || "5432"}`);
    console.log(`Database: ${process.env.DATABASE_NAME || "carbontrack"}`);
    console.log(`Timestamp: ${result.rows[0].now}`);
    console.log("==================================================");
    return true;
  } catch (err: any) {
    console.error("==================================================");
    console.error("PostgreSQL Connection Error:");
    console.error(`Message: ${err?.message || err}`);
    console.error("PostgreSQL is not connected or not running on localhost:5432.");
    console.error("Please refer to carbon-backend/README.md to setup PostgreSQL.");
    console.error("==================================================");
    return false;
  }
};

export default pool;
