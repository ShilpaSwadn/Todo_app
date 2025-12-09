# Profile App - Full Stack Application

A modern, full-stack user profile management application with authentication, built entirely with Next.js 14 (App Router) and PostgreSQL. The backend is integrated as Next.js API routes, making it a single unified application that can be easily deployed to Vercel.

## Overview

This is a complete user profile management application that allows users to:
- Register with email and password
- Login with OTP (One-Time Password) via email
- View their profile information
- Edit profile details (name, email, mobile number)
- Update password with old password verification
- Automatic logout on password or email change (for security)
- Clean, modern UI with responsive design

## Tech Stack

### Full Stack ( Next.js Application)
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **State Management**: React Hooks (useState, useEffect)

### Backend (Next.js API Routes)
- **Runtime**: Node.js (ES Modules)
- **API**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL (Supabase or localhost)
- **Authentication**: JWT (JSON Web Tokens) + OTP (One-Time Password)
- **Password Hashing**: bcryptjs
- **Email Service**: Nodemailer (for OTP delivery)

## Project Structure

```
Todo_app/
├── frontend/                    # Next.js unified application
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API Routes (Backend)
│   │   │   └── auth/
│   │   │       ├── register/    # POST /api/auth/register
│   │   │       ├── login/       # POST /api/auth/login
│   │   │       ├── me/          # GET /api/auth/me
│   │   │       ├── profile/     # PUT /api/auth/profile
│   │   │       └── otp/         # OTP endpoints
│   │   │           ├── send/    # POST /api/auth/otp/send
│   │   │           └── verify/   # POST /api/auth/otp/verify
│   │   ├── dashboard/           # Dashboard pages
│   │   │   ├── edit/           # Edit profile page
│   │   │   └── page.jsx        # Profile display page
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── layout.jsx          # Root layout
│   │   └── page.jsx            # Home page
│   │
│   ├── lib/                     # Shared libraries
│   │   ├── api/                 # API client
│   │   │   └── client.js       # HTTP client for API requests
│   │   ├── auth/                # Authentication utilities
│   │   │   └── client.js       # Client-side auth helpers
│   │   ├── services/            # Client-side services
│   │   │   └── auth.js         # Auth service (API calls)
│   │   ├── utils/               # Utility functions
│   │   │   └── validation.js   # Form validation
│   │   └── server/              # Server-side code (API routes)
│   │       ├── config/          # Database configuration
│   │       │   ├── database.js # Database connection
│   │       │   └── dbInit.js   # Database initialization
│   │       ├── middleware/      # Server middleware
│   │       │   ├── authMiddleware.js
│   │       │   └── dbInit.js
│   │       ├── models/          # Data models
│   │       │   └── User.js
│   │       └── services/        # Server-side services
│   │           └── authService.js
│   │
│   ├── .env.local               # Environment variables
│   ├── package.json             # Dependencies
│   ├── next.config.js           # Next.js configuration (with webpack aliases)
│   ├── jsconfig.json            # Path alias configuration (@lib)
│   └── vercel.json              # Vercel deployment config
│
└── README.md                    # This file
```

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher) - or use Supabase
- **Git**

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Todo_app
```

#### 2. Navigate to Frontend Directory

```bash
cd frontend
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory:

**For Supabase (Recommended):**
```env
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**For Local PostgreSQL:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_app
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Note:** For Gmail, you'll need to generate an [App Password](https://support.google.com/accounts/answer/185833) instead of using your regular password.

## Running the Application

### Development Mode

```bash
cd frontend
npm run dev
```

The application will run on `http://localhost:3000`
- Frontend: `http://localhost:3000`
- API Routes: `http://localhost:3000/api/auth/*`

### Production Mode

```bash
cd frontend
npm run build
npm start
```

## API Endpoints

All API endpoints are available at `/api/auth/*`

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user (legacy, not used) | No |
| POST | `/api/auth/otp/send` | Send OTP to email | No |
| POST | `/api/auth/otp/verify` | Verify OTP and login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/profile` | Update user profile | Yes |
