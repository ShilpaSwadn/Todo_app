# SkyDining - Premium Pre-Flight Meal Booking Application

A high-end, full-stack application for pre-flight meal selection and dietary customization. Built with **Next.js 14 (App Router)**, **PostgreSQL**, and **Firebase**, it features a sophisticated multi-provider authentication system and a dynamic, interactive UI.

## 🚀 Overview

SkyDining redefines the in-flight experience by allowing passengers to configure their meals with surgical precision. It's not just a profile manager; it's a complete dietary configuration engine.

### Key Features
- **Dynamic Meal Configurator**: 3-step configuration flow (Dietary Type ➔ Dish Selection ➔ Ingredient Customization).
- **Rule-Based Filtering**: Automatic forbidden ingredient detection (e.g., Jain meals automatically exclude root vegetables).
- **Multi-Cloud Tech**: Powered by Next.js API routes, PostgreSQL for structured data, and Firebase for world-class authentication.
- **Enterprise-Grade Auth**: 
  - **Social Logins**: One-click sign-in with Google and Twitter.
  - **Phone Auth**: Secure SMS-based OTP verification.
  - **Email Security**: Mandatory account activation via emailed verification links.
  - **Password Management**: Robust forgot-password/reset flow.
  - **Two-Layer Storage**: "Pending" user system that promotions users only after successful verification.

## 🛠️ Tech Stack

### Frontend & Framework
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (with Glassmorphism & Premium Aesthetics)
- **Icons**: React Icons (Fi, Lu)
- **State Management**: React Hooks (useState, useMemo, useEffect)

### Backend & Database
- **Runtime**: Node.js (Next.js Serverless Functions)
- **Database**: PostgreSQL (Supabase or Local) via `pg` pool
- **Identity Provider**: Firebase Authentication
- **Security**: JWT (JSON Web Tokens) & Bcryptjs
- **Communication**: Nodemailer (for custom OTP/System emails)

## 📁 Project Structure

```
frontend/                        # Next.js Unified Application
│   ├── app/                     # Next.js App Router (Pages & API)
│   │   ├── api/                 # API Routes (The Backend)
│   │   │   └── auth/            # Auth Logic (Sync, OTP, temp-users)
│   │   ├── dashboard/           # Authenticated Dashboard (SkyDining App)
│   │   ├── forgot-password/     # Password Recovery
│   │   ├── login/               # Adaptive Login (Email/Phone/Social)
│   │   ├── register/            # Registration with Activation Logic
│   │   └── verify/              # Account Activation Entry Point
│   │
│   ├── components/              # React Components
│   │   └── MealSelector.jsx     # The Core "SkyDining Configurator"
│   │
│   ├── lib/                     # System Core
│   │   ├── firebase.js          # Firebase SDK Initialization
│   │   ├── auth/                # Client-side Auth Helpers
│   │   ├── services/            # API & Auth Services
│   │   └── server/              # Server-side Logic (Models, Config)
│   │       ├── config/          # Database & Pool Config
│   │       ├── models/          # PostgreSQL User Model
│   │       └── services/        # Backend Auth & Email Services
│   │
│   ├── public/                  # Static Assets
│   └── .env.local               # Environment Secrets
```

## 🚥 Getting Started

### 1. Environment Configuration
Create a `.env.local` file in the `frontend/` directory.

```env
# Database (Supabase Recommended)
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other firebase vars

# System Auth
JWT_SECRET=your_secret_key

# Email (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 2. Installation & Development

```bash
cd SwadnGUI/frontend
npm install
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000). You can visit this URL in your browser to start using Swadn.
