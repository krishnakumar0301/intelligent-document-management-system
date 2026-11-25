# FileOracle — AI-Powered File Organizer

FileOracle is an intelligent file management system that scans folders, categorizes files, detects duplicates, provides semantic AI search, analytics, and a local AI chat assistant.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| Auth | JWT (python-jose + bcrypt) |
| AI | scikit-learn TF-IDF (semantic search), rule-based chat |
| File I/O | watchdog, os, shutil, hashlib |
| OCR | Tesseract (optional, via pytesseract) |

## Quick Start (Local Development)

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- (Optional) **Tesseract OCR** for image text extraction

### 1. Backend

```powershell
cd d:\final_pro\backend

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env

# Run API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

### 2. Frontend

```powershell
cd d:\final_pro\frontend

npm install
npm run dev
```

App: http://localhost:5173

### 3. First Use

1. Open http://localhost:5173/register
2. Create an account
3. Go to **Organizer** → enter a folder path (e.g. `C:\Users\YourName\Documents`)
4. Click **Start Scan**
5. Explore Dashboard, Search, Duplicates, Chat, Analytics

## Docker

```powershell
cd d:\final_pro

copy backend\.env.example backend\.env

docker compose up --build
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:8000  

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login/json` | Login (JSON) |
| POST | `/api/v1/auth/login` | Login (OAuth2 form) |
| GET | `/api/v1/users/me` | Profile |
| GET | `/api/v1/files` | List files |
| POST | `/api/v1/files/upload` | Upload files |
| POST | `/api/v1/scan` | Scan folder |
| POST | `/api/v1/scan/organize` | Organize files |
| GET | `/api/v1/duplicates` | List duplicates |
| POST | `/api/v1/search` | Semantic search |
| POST | `/api/v1/chat` | AI chat |
| GET | `/api/v1/analytics/dashboard` | Dashboard stats |
| GET | `/api/v1/recycle` | Recycle bin |
| GET/PATCH | `/api/v1/settings` | User settings |

Full interactive docs: http://localhost:8000/docs

## Features

- JWT authentication & protected routes
- Dashboard with charts and analytics cards
- Auto file categorization (images, videos, documents, audio, archives, code)
- Hash-based duplicate detection
- Natural language / semantic search (TF-IDF)
- Local AI chat assistant (no external API)
- File preview (images, video, PDF)
- Recycle bin (soft delete / restore)
- Real-time folder watcher (watchdog)
- Drag & drop upload
- Tags, favorites, bulk rename
- Voice search (browser Web Speech API)
- PDF analytics export
- Dark glassmorphism UI
- Keyboard shortcuts (Ctrl+D, Ctrl+F, Ctrl+O, Ctrl+K)

## Testing

### Backend

```powershell
cd d:\final_pro\backend
.\.venv\Scripts\Activate.ps1

# Health check
curl http://localhost:8000/health

# Register & login (PowerShell)
$body = '{"email":"test@test.com","username":"testuser","password":"secret123"}'
Invoke-RestMethod -Uri http://localhost:8000/api/v1/auth/register -Method POST -Body $body -ContentType "application/json"

$login = '{"username":"testuser","password":"secret123"}'
$r = Invoke-RestMethod -Uri http://localhost:8000/api/v1/auth/login/json -Method POST -Body $login -ContentType "application/json"
$token = $r.access_token

# Dashboard (authenticated)
Invoke-RestMethod -Uri http://localhost:8000/api/v1/analytics/dashboard -Headers @{Authorization="Bearer $token"}
```

### Frontend

```powershell
cd d:\final_pro\frontend
npm run build
```

Build should complete without errors.

## Optional: Tesseract OCR

**Windows:** Install from https://github.com/UB-Mannheim/tesseract/wiki  
**Linux:** `sudo apt install tesseract-ocr`  
**macOS:** `brew install tesseract`

## Project Structure

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for the complete tree.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SECRET_KEY | (dev key) | JWT signing secret |
| DATABASE_URL | sqlite path | Async SQLite URL |
| CORS_ORIGINS | localhost:5173 | Allowed frontend origins |
| WATCHER_ENABLED | true | Background file watcher |

## Security Notes

- Change `SECRET_KEY` in production
- Scan only folders you trust
- File operations run with the server's OS permissions
- Use HTTPS in production

## License

MIT — for educational and personal use.
