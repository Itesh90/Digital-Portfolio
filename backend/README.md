# Resume Portfolio Builder - Backend

FastAPI-based backend for the AI-Powered Portfolio Builder.

## 🚀 Quick Start (Local Development)

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
uvicorn app.main:app --reload --port 8000
```

## 🌐 Deploy to Render.com

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create Render Web Service
1. Go to [render.com](https://render.com) and sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `portfolio-api` (or your choice)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Set Environment Variables
In Render dashboard → Environment:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./portfolio.db` |
| `SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |

### Step 4: Deploy
Click **Create Web Service** and wait for deployment.

Your API will be at: `https://your-app.onrender.com`

## 📚 API Documentation

Once deployed, visit:
- **Swagger UI:** `https://your-app.onrender.com/docs`
- **ReDoc:** `https://your-app.onrender.com/redoc`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `SECRET_KEY` | JWT signing key (min 32 chars) | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token lifetime | No (default: 30) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | No (default: 7) |

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/           # API route handlers
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   ├── config.py      # Settings
│   ├── database.py    # DB connection
│   └── main.py        # FastAPI app
├── uploads/           # Resume uploads (gitignored)
├── requirements.txt
├── Dockerfile
└── .env.example
```

## 🐳 Docker (Alternative)

```bash
# Build
docker build -t portfolio-api .

# Run
docker run -p 8000:8000 --env-file .env portfolio-api
```
