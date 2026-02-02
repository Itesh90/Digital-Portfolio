# Resume-Anchored AI Portfolio Builder

Transform your resume into a stunning, professional portfolio website with AI-powered generation.

## 🚀 Features

- **AI-Powered Resume Parsing**: Upload PDF, DOCX, or TXT resumes
- **Intelligent Portfolio Generation**: AI creates structured content based on your experience
- **Design System**: Choose from curated design primitives (no custom CSS needed)
- **ATS Optimization**: Built-in checks for applicant tracking system compatibility
- **Instant Publishing**: Get a live portfolio with your own subdomain
- **Version History**: Track changes and restore previous versions

## 📋 Architecture

```
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── ai/       # AI prompts & handlers
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic
│   └── requirements.txt
│
├── frontend/         # Next.js frontend
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities & API client
│   └── types/        # TypeScript definitions
│
└── docker-compose.yml
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL |
| AI | Google Gemini API |
| Auth | JWT with bcrypt |

## 🏁 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Gemini API key

### Using Docker (Recommended)

1. Clone the repository
2. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
3. Add your Gemini API key to `backend/.env`
4. Start services:
   ```bash
   docker-compose up -d
   ```
5. Open http://localhost:3000

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run development server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔐 Core Principles

1. **Truth Enforced**: Resume is the single source of truth
2. **AI is Constrained**: AI translates, never invents
3. **Design is Controlled**: Select from predefined primitives only
4. **User Remains in Control**: No auto-apply, always preview first

## 📦 Deployment

### Backend (Fly.io)

```bash
cd backend
fly launch
fly secrets set DATABASE_URL=your_db_url
fly secrets set GEMINI_API_KEY=your_key
fly deploy
```

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

## 🧪 Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run test
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.
