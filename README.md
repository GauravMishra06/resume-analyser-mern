<div align="center">
  <h1>🚀 AI Resume Analyzer</h1>
  <p>An intelligent, modern, and high-performance full-stack application that leverages the power of Generative AI (Google Gemini & Groq) to analyze resumes, provide actionable optimization suggestions, and score compatibility against specific job descriptions.</p>
</div>

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#️-architecture--tech-stack)
  - [Frontend (Client)](#frontend-client)
  - [Backend (Server)](#backend-server)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Documentation](#-api-documentation)
  - [Authentication](#authentication)
  - [Resume Analysis](#resume-analysis)
  - [Job Matching](#job-matching)

---

## 🌟 About the Project

In today's competitive job market, an optimized resume is vital. The **AI Resume Analyzer** solves this by acting as an automated career coach. Users can upload their resumes in PDF or DOCX formats, which are parsed locally on the server. The extracted text is then passed to cutting-edge AI Large Language Models (LLMs) to generate an ATS-friendly compatibility score, identify missing keywords, and suggest granular improvements for specific software engineering or general roles.

## ✨ Key Features

1. **Intelligent Document Parsing**: Extracts structural text precisely from complex formats (PDFs using `pdf-parse`, and DOCX using `mammoth`).
2. **Deep Generative AI Analysis**: Integrates `@google/generative-ai` (Gemini) and `groq-sdk` for blazing-fast, accurate resume evaluations and rewording suggestions.
3. **Secure Authentication Flow**: Full JWT-based user authentication system with password hashing (`bcryptjs`) to keep user data strictly private.
4. **Job Compatibility Matching**: Compare resumes to target job descriptions to produce percentage-based matches.
5. **Modern, Animated UI**: Built on React 19, enhanced with interactive `framer-motion` animations, crisp `lucide-react` iconography, and utility-first styling with TailwindCSS.
6. **Robust Error Handling**: Centralized server logging and middleware for stable deployments.

---

## 🏗️ Architecture & Tech Stack

This repository is constructed as a **Monorepo** ensuring separated concerns between the frontend client and the backend API while keeping development centralized.

### Frontend (Client)
- **React 19 & Vite**: Provides lightning-fast HMR and the latest React concurrency features.
- **TailwindCSS**: Core styling mechanism enforcing a strictly responsive and utility-first design library.
- **Framer Motion**: Delivers sophisticated UI transitions, staggered list animations, and delightful micro-interactions across various components.
- **React Router DOM v7**: Declarative routing for navigating between `LandingPage`, `HomePage` (Dashboard), `InsightsPage` (Results), and Auth pages.
- **Lucide React**: Premium SVG icons.

### Backend (Server)
- **Node.js & Express**: Provides the lightweight and unopinionated server architecture.
- **JavaScript**: Fast, flexible, and robust backend logic built with Node.js and Express.
- **MongoDB (Mongoose)**: A NoSQL data layer used to persistently store user profiles, credentials, and potentially resume analysis history.
- **Multer**: Middleware handles `multipart/form-data`, ensuring safe and configurable resume file uploads.
- **AI SDKs (`@google/generative-ai`, `groq-sdk`)**: Offloads the heavy natural language processing tasks to cloud LLMs.

---

## 📂 Project Structure

```text
AIRESUMEANALYZER/
├── client/                     # Vite React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI parts (layout, buttons, cards)
│   │   ├── pages/              # Primary Views (LandingPage, HomePage, InsightsPage, Login, Register)
│   │   └── index.css           # Global Tailwind entries
│   └── package.json
│
├── server/                     # Express API Backend
│   ├── src/
│   │   ├── config/             # DB connection hooks & Env configs
│   │   ├── controllers/        # Route controllers (e.g., authController.js)
│   │   ├── middleware/         # Custom pipeline tools (Auth guards, Rate limiting)
│   │   ├── models/             # Mongoose DB schemas (Users, Resumes)
│   │   ├── routes/             # API routing (auth.js, resume.js, jobs.js)
│   │   └── services/           # Core business logic (fileService.js, resumeLLMService.js)
│   └── package.json
│
└── package.json                # Root package manager & workspace definitions
```

---

## 🚀 Getting Started

Follow these steps to set up the environment and run the application locally.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running locally or an Atlas connection URI)
- API Keys for Google Gemini AND/OR Groq

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AIRESUMEANALYZER
   ```

2. **Install all dependencies** via the root workspace script:
   ```bash
   npm install
   ```
   *(Alternatively, navigate to `client/` and `server/` individually and run `npm install`)*

### Environment Variables

Before starting the server, you need to configure your secrets. Navigate to the `server/` directory and create a `.env` file manually:

```env
# server/.env

PORT=3000
MONGODB_URI=mongodb://localhost:27017/ai_resume_analyzer
JWT_SECRET=a_very_secure_random_string_here
CLIENT_URL=http://localhost:5173

# Generative AI Tokens
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### Running Locally

To efficiently run the project in development mode, open two separate terminal sessions from the root directory.

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Starts the server on http://localhost:3000 using tsx watch for hot-reloading
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Starts the Vite development server on http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

## 📡 API Documentation

Below is a brief overview of the core endpoints exposed by the Node server.

### Authentication
- `POST /api/auth/register`
  Registers a new account. Expects `{ email, password, name }`.
- `POST /api/auth/login`
  Authenticates an existing user and returns a signed JSON Web Token (JWT).

### Resume Analysis
- `POST /api/resume/analyze`
  **Requires Authentication.**
   Accepts a `multipart/form-data` payload containing the file under the key `resume`. The backend parses it, queries the LLM service (`resumeLLMService.js`), and returns the detailed JSON analysis.

### Job Matching
- `GET /api/jobs`
  Fetches saved jobs or available roles.
- `POST /api/jobs/match`
  Compares the previously uploaded resume context against a newly provided job description text to gauge real-time ATS scoring compatibility.

---
If you find this project helpful, please give it a ⭐!
