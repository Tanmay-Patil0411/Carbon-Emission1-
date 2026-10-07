import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import emissionRoutes from "./routes/emissionRoutes";
import activityRoutes from "./routes/activityRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import facilityRoutes from "./routes/facilityRoutes";
import reportRoutes from "./routes/reportRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";

dotenv.config();

const app = express();

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: [frontendUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

// Body Parser Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check API
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "CarbonTrack REST API is operational",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/emissions", emissionRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/recommendations", recommendationRoutes);

// 404 Route Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Centralized Error Handling Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Centralized Server Error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({
    success: false,
    message,
  });
});

export default app;
