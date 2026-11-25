# FileOracle – Intelligent Document Management System

An AI-powered document management platform designed to simplify file organization, intelligent categorization, duplicate detection, and document retrieval through a modern web interface.

## 🚀 Project Overview

FileOracle is an intelligent file management application that helps users organize and manage their digital files efficiently. It combines AI-based classification, semantic search, file monitoring, and analytics to provide a smarter document management experience.

The system automatically scans folders, categorizes files, identifies duplicate documents, and makes file retrieval easier through intelligent search.

## ✨ Key Features

- **Smart File Organization** – Automatically scans and categorizes files.
- **AI-Based Classification** – Uses intelligent classification techniques to organize files.
- **Duplicate Detection** – Identifies duplicate files using hash-based comparison.
- **Semantic Search** – Finds files using meaningful search queries.
- **AI Chat Assistant** – Provides a local chat assistant for file-related queries.
- **OCR Support** – Extracts text from supported images and documents.
- **Analytics Dashboard** – Displays file statistics and category information.
- **Recycle Bin** – Supports file recovery and restoration.
- **Real-Time Monitoring** – Monitors folders for file changes.
- **Modern UI** – Responsive interface with dark theme support.

## 🛠️ Technology Stack

| Component       | Technologies           |
| --------------- | ---------------------- |
| Frontend        | React.js, Vite         |
| Styling         | Tailwind CSS           |
| Backend         | Python, FastAPI        |
| Database        | SQLite, SQLAlchemy     |
| Authentication  | JWT, bcrypt            |
| AI / ML         | Scikit-learn, TF-IDF   |
| OCR             | Tesseract, Pytesseract |
| File Monitoring | Watchdog               |
| Deployment      | Docker, Docker Compose |

## 🏗️ System Architecture

The application follows a frontend-backend architecture.

1. **Frontend:** Provides the user interface for uploading, searching, and managing files.
2. **Backend:** Handles API requests, authentication, file processing, and AI operations.
3. **Database:** Stores user information and file metadata.
4. **AI Processing:** Supports intelligent categorization, semantic search, and duplicate detection.

## 📂 Project Structure

```text
FileOracle/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
│
├── sample_output/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.11 or above
- Node.js 18 or above
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/krishnakumar0301/intelligent-document-management-system.git

cd intelligent-document-management-system
```

### 2. Backend Setup

```bash
cd backend

python -m venv .venv

.venv\Scripts\activate

pip install -r requirements.txt
```

Configure environment variables:

```bash
copy .env.example .env
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend API: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Frontend: `http://localhost:5173`

## 📸 Screenshots

Check the `sample_output` folder for application screenshots and interface previews.

## 🔐 Security

- JWT-based authentication.
- Password hashing.
- Environment-based configuration.
- Sensitive credentials excluded from version control.
- Local file access follows operating system permissions.

## 🎯 Project Objectives

- Reduce manual file organization.
- Improve document retrieval efficiency.
- Identify duplicate files.
- Provide intelligent document categorization.
- Simplify file management through AI-assisted features.

## 👨‍💻 Developed By

**Krishna Kumar**

MCA Student | Aspiring Software Developer

GitHub: [https://github.com/krishnakumar0301](https://github.com/krishnakumar0301)

---

*FileOracle – Making File Management Smarter with AI.*
