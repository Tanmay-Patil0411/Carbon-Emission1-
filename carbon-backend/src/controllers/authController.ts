import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

/**
 * POST /api/auth/register
 * Register a new user and ALWAYS create a NEW isolated organization
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, organization_name } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({
        success: false,
        message: "Email, password, and full_name are required.",
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user email already exists
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
      return;
    }

    // 1. ALWAYS Create a NEW Organization for newly registered user
    const orgName = organization_name && organization_name.trim()
      ? organization_name.trim()
      : `${full_name.trim()}'s Organization`;

    const newOrg = await pool.query(
      "INSERT INTO organizations (name, industry_vertical, headcount, ef_standard) VALUES ($1, $2, $3, $4) RETURNING id, name",
      [orgName, "Information Technology & Software Services", "100-500 Employees", "DEFRA 2024"]
    );
    const orgId = newOrg.rows[0].id;

    // 2. Hash Password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insert User linked to newly created organization_id
    const newUser = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, organization_id, email, full_name, role, created_at",
      [orgId, cleanEmail, hashedPassword, full_name.trim(), "admin"]
    );

    const user = newUser.rows[0];

    // 4. Generate JWT containing userId and organizationId
    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organization_id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User and new organization registered successfully.",
      data: {
        access_token: token,
        token_type: "bearer",
        user,
      },
    });
  } catch (err: any) {
    console.error("Register Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration.",
    });
  }
};

/**
 * POST /api/auth/login
 * Log in an existing user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Fetch user from PostgreSQL
    const result = await pool.query(
      "SELECT id, organization_id, email, password_hash, full_name, role FROM users WHERE email = $1",
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid email address or password.",
      });
      return;
    }

    const user = result.rows[0];

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email address or password.",
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organization_id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Omit password_hash in response
    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      data: {
        access_token: token,
        token_type: "bearer",
        user: userResponse,
      },
    });
  } catch (err: any) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error during login.",
    });
  }
};

/**
 * GET /api/auth/me
 * Get currently authenticated user profile
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const result = await pool.query(
      "SELECT id, organization_id, email, full_name, role, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error("Auth Me Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error fetching user profile.",
    });
  }
};
