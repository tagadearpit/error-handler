# 🤖 AI Helpdesk — Smart College/Business Assistant

A production-ready, RAG-powered helpdesk application with a FastAPI backend, Next.js 15 frontend, and PostgreSQL + pgvector.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

---

## ✨ Features

- **RAG-Powered QA** — Answers grounded in uploaded documents with inline citations
- **SSE Streaming** — Real-time token-by-token response streaming
- **RBAC** — Role-based document access (student, faculty, admin, support)
- **Auto-Escalation** — Automatically creates support tickets when the AI can't answer
- **Document Management** — Upload PDF, DOCX, TXT, Markdown with background indexing
- **Conversational Memory** — Multi-turn chat with session history
- **Dark Theme UI** — Glassmorphism design with smooth animations

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js 15     │────▶│   FastAPI         │────▶│ PostgreSQL       │
│   (Vercel)       │ SSE │   (Backend)       │     │ + pgvector       │
│   TypeScript     │◀────│   Python 3.11+    │◀────│ Vector Store     │
│   Tailwind CSS   │     │   Gemini API      │     │ HNSW Index       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # Auth, Chat, Documents, Tickets endpoints
│   │   ├── core/         # Config, Database, Security (JWT/RBAC)
│   │   ├── models/       # SQLAlchemy ORM models (6 tables)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # RAG pipeline, embeddings, chunking, LLM
│   │   └── main.py       # FastAPI application entry
│   ├── alembic/          # Database migrations
│   ├── seed.py           # Demo data seeder
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # Chat, Admin, UI components
│   │   ├── hooks/        # useAuth, useChat, useDocuments, useTickets
│   │   └── lib/          # API client, types, utilities
│   ├── package.json
│   └── vercel.json
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Quick Start

### 1. Clone & Configure

```bash
git clone <repo-url>
cd error-handlers
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and JWT_SECRET
```

### 2. Docker (Recommended)

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** (pgvector) on `localhost:5432`
- **FastAPI** backend on `localhost:8000`
- **Next.js** frontend on `localhost:3000`

### 3. Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 4. Seed Demo Data

```bash
cd backend
python seed.py
```

This creates 4 demo accounts:

| Role    | Email                  | Password     |
|---------|------------------------|--------------|
| Admin   | admin@helpdesk.edu     | admin1234    |
| Student | student@helpdesk.edu   | student1234  |
| Faculty | faculty@helpdesk.edu   | faculty1234  |
| Support | support@helpdesk.edu   | support1234  |

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login & get JWT |
| GET | `/api/v1/auth/me` | Current user profile |
| POST | `/api/v1/chat/completions` | Chat (SSE streaming) |
| GET | `/api/v1/sessions` | List chat sessions |
| GET | `/api/v1/sessions/{id}` | Get session messages |
| DELETE | `/api/v1/sessions/{id}` | Delete session |
| POST | `/api/v1/admin/documents/upload` | Upload document |
| GET | `/api/v1/admin/documents` | List documents |
| DELETE | `/api/v1/admin/documents/{id}` | Delete document |
| POST | `/api/v1/admin/documents/{id}/reindex` | Re-index document |
| GET | `/api/v1/admin/tickets` | List tickets |
| PATCH | `/api/v1/admin/tickets/{id}` | Update ticket |

---

## 🚢 Deployment

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.com/api/v1`

### Backend (Railway / Render / Fly.io)
1. Deploy the `backend/` directory
2. Set environment variables from `.env.example`
3. Ensure PostgreSQL with pgvector is provisioned

---

## 📄 License

MIT