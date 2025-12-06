# Todo App - Full Stack Application

A modern, full-stack Todo application with user authentication, built with Next.js (frontend) and Node.js with PostgreSQL (backend).

## Overview

This is a complete Todo application that allows users to:
- Register and login with secure authentication
- Create, edit, and delete todos
- View their personal todo list
- Manage tasks with a clean, modern UI

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **State Management**: React Hooks (useState, useEffect)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Project Structure

```
Todo_app/
├── frontend/          # Next.js frontend application
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility libraries (API, Auth, Validation)
│   └── services/     # API service layer
│
├── backend/           # Node.js backend API (ES Modules)
│   ├── config/        # Database configuration
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Authentication middleware
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   └── services/     # Business logic
│
└── README.md         # This file
```

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **Git**

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Todo_app
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create .env file
cp .env.example .env
```

Edit the `.env` file with your PostgreSQL credentials:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_app
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_jwt_secret_key_here_change_in_production
```

```bash
# Install dependencies
npm install
```

#### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

## Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

#### Start Frontend Server

Open a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

### Production Mode

#### Build Frontend

```bash
cd frontend
npm run build
npm start
```

#### Start Backend

```bash
cd backend
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |

