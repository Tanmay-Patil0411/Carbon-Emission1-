import app from "./app";
import { connectDB } from "./config/db";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "5000", 10);

const startServer = async () => {
  // Test PostgreSQL database connection
  await connectDB();

  // Start Express HTTP Server
  app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`CarbonTrack Server running on http://localhost:${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("==================================================");
  });
};

startServer();
