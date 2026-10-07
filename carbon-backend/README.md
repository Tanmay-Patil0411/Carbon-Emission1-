# CarbonTrack Backend API & PostgreSQL Database

Node.js + Express + TypeScript + PostgreSQL REST API backend for the **CarbonTrack** Enterprise ESG & Carbon Accounting Platform.

> **IMPORTANT NOTE**: PostgreSQL is **NOT** installed automatically. You will need to install PostgreSQL manually on your computer and execute the provided database SQL scripts before connecting the backend to a live database instance.

---

## 📋 Table of Contents
1. [Backend Overview](#backend-overview)
2. [PostgreSQL Manual Installation Guide (Windows)](#postgresql-manual-installation-guide-windows)
3. [Database Setup & Execution (schema.sql & seed.sql)](#database-setup--execution)
4. [Environment Configuration (.env)](#environment-configuration-env)
5. [Backend Installation & Running](#backend-installation--running)
6. [Frontend API Connection Setup](#frontend-api-connection-setup)
7. [API Endpoint Documentation](#api-endpoint-documentation)

---

## 🚀 Backend Overview

- **Runtime**: Node.js v18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (`pg` Connection Pool)
- **Authentication**: JWT (JSON Web Tokens) with `bcrypt` Password Hashing
- **CORS**: Configured for `http://localhost:5173` (Vite React Frontend)
- **Base URL**: `http://localhost:5000/api`

---

## 🛠️ PostgreSQL Manual Installation Guide (Windows)

Follow these exact steps to install PostgreSQL on Windows:

### Step 1: Download PostgreSQL Installer
1. Visit the official PostgreSQL download page:
   [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Click **"Download the installer"** (by EDB).
3. Download **PostgreSQL 16** (or version 15+) for Windows x86-64.

### Step 2: Run the Installer
1. Double-click the downloaded `.exe` installer.
2. Select installation directory (Default: `C:\Program Files\PostgreSQL\16`).
3. Select Components: Ensure **PostgreSQL Server**, **pgAdmin 4**, and **Command Line Tools** are selected.
4. Set Password for `postgres` user:
   - Type a password (e.g., `postgres` or `admin123`).
   - **Remember this password** — you will put it into your `.env` file!
5. Port: Leave default `5432`.
6. Click **Next** until installation finishes.

### Step 3: Verify PostgreSQL is Running
Open PowerShell or Command Prompt and test PostgreSQL service:
```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*
```
Or open **Services** (`services.msc`) in Windows and verify **postgresql-x64-16** status is **Running**.

---

## 🗄️ Database Setup & Execution

Once PostgreSQL is installed and running:

### Step 1: Create the `carbontrack` Database
Open **SQL Shell (psql)** from Windows Start Menu, press Enter for defaults (localhost, port 5432, postgres user), enter your postgres password, then run:

```sql
CREATE DATABASE carbontrack;
```
Or in PowerShell:
```powershell
psql -U postgres -c "CREATE DATABASE carbontrack;"
```

### Step 2: Execute `schema.sql` (Tables & Indexes)
In PowerShell from the `carbon-backend` directory:
```powershell
psql -U postgres -d carbontrack -f database/schema.sql
```

### Step 3: Execute `seed.sql` (Initial Test Data)
```powershell
psql -U postgres -d carbontrack -f database/seed.sql
```

*(Alternatively, you can open **pgAdmin 4**, open the Query Tool for `carbontrack` database, copy-paste the contents of `database/schema.sql` and run it, then run `database/seed.sql`)*.

---

## ⚙️ Environment Configuration (.env)

Copy `.env.example` to `.env` inside `carbon-backend`:

```powershell
cd "D:\Carbon emission\carbon-backend"
copy .env.example .env
```

Edit `.env` to match your local PostgreSQL password:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=carbontrack
DATABASE_USER=postgres
DATABASE_PASSWORD=your_actual_postgres_password
PORT=5000
JWT_SECRET=super_secret_jwt_key_carbontrack_2026
FRONTEND_URL=http://localhost:5173
```

---

## 💻 Backend Installation & Running

1. **Install Node.js Dependencies**:
   ```powershell
   cd "D:\Carbon emission\carbon-backend"
   npm install
   ```

2. **Start Backend in Development Mode**:
   ```powershell
   npm run dev
   ```
   *Console Output when PostgreSQL is running:*
   ```text
   ==================================================
   PostgreSQL connected successfully
   Host: localhost:5432
   Database: carbontrack
   ==================================================
   CarbonTrack Server running on http://localhost:5000
   API Base URL: http://localhost:5000/api
   ==================================================
   ```

3. **Build for Production**:
   ```powershell
   npm run build
   npm start
   ```

---

## 🌐 Frontend API Connection Setup

1. Go to `carbon-frontend` directory:
   ```powershell
   cd "D:\Carbon emission\carbon-frontend"
   copy .env.example .env
   ```
2. `.env` in `carbon-frontend` contains:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
3. Start the frontend:
   ```powershell
   npm run dev
   ```

---

## 📡 API Endpoint Documentation

All endpoints return standardized JSON:
- **Success**: `{ "success": true, "data": { ... } }`
- **Error**: `{ "success": false, "message": "Description" }`

### 1. Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user & IT organization | No |
| `POST` | `/api/auth/login` | Login user with email & password | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer JWT) |

### 2. Emissions CRUD Endpoints (`/api/emissions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/emissions` | Create a new emission activity record | Yes (Bearer JWT) |
| `GET` | `/api/emissions` | Get all emission records for user organization | Yes (Bearer JWT) |
| `GET` | `/api/emissions/:id` | Get single emission record by ID | Yes (Bearer JWT) |
| `PUT` | `/api/emissions/:id` | Update an existing emission record | Yes (Bearer JWT) |
| `DELETE` | `/api/emissions/:id` | Delete an emission record | Yes (Bearer JWT) |

### 3. Activities Registry Endpoints (`/api/activities`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/activities` | Filtered list (`?scope=`, `?category=`, `?q=`) | Yes (Bearer JWT) |
| `GET` | `/api/activities/:id` | Single activity detail view | Yes (Bearer JWT) |

### 4. Dashboard Analytics Endpoints (`/api/dashboard`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | Aggregated totals, monthly trends & hotspots | Yes (Bearer JWT) |
