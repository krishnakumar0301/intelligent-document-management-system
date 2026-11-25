# FileOracle — Complete Folder Structure

```
final_pro/
├── docker-compose.yml          # Run backend + frontend together
├── .gitignore
├── FOLDER_STRUCTURE.md         # This file
├── README.md                   # Setup & run guide
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env                    # Copy from .env.example (not committed)
│   ├── data/                   # SQLite database (auto-created)
│   ├── logs/                   # Application logs
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── core/
│       │   ├── config.py       # Settings from env
│       │   ├── security.py     # JWT & passwords
│       │   └── logging_config.py
│       ├── database/
│       │   ├── base.py
│       │   └── session.py      # Async SQLAlchemy
│       ├── models/
│       │   ├── user.py
│       │   ├── file_record.py
│       │   ├── chat.py
│       │   ├── activity.py
│       │   ├── settings_model.py
│       │   └── organization_rule.py
│       ├── schemas/
│       │   ├── auth.py
│       │   ├── file.py
│       │   ├── analytics.py
│       │   └── settings.py
│       ├── api/
│       │   ├── deps.py         # Auth dependency
│       │   └── v1/
│       │       ├── router.py
│       │       ├── auth.py
│       │       ├── users.py
│       │       ├── files.py
│       │       ├── scan.py
│       │       ├── duplicates.py
│       │       ├── search.py
│       │       ├── chat.py
│       │       ├── analytics.py
│       │       ├── recycle.py
│       │       ├── settings.py
│       │       └── activity.py
│       ├── services/
│       │   ├── file_scanner.py
│       │   ├── categorizer.py
│       │   ├── duplicate_detector.py
│       │   ├── semantic_search.py
│       │   ├── ai_chat.py
│       │   ├── ocr_service.py
│       │   ├── watcher.py
│       │   ├── analytics_service.py
│       │   └── activity_service.py
│       └── utils/
│           └── file_utils.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/
        │   └── client.js       # Axios API client
        ├── context/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── hooks/
        │   └── useKeyboardShortcuts.js
        ├── utils/
        │   └── format.js
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx
        │   │   └── Layout.jsx
        │   ├── ui/
        │   │   ├── LoadingSpinner.jsx
        │   │   └── StatCard.jsx
        │   ├── charts/
        │   │   ├── CategoryChart.jsx
        │   │   └── StorageChart.jsx
        │   └── files/
        │       ├── FilePreview.jsx
        │       └── DropZone.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── Organizer.jsx
            ├── Duplicates.jsx
            ├── Search.jsx
            ├── Chat.jsx
            ├── Files.jsx
            ├── Analytics.jsx
            ├── RecycleBin.jsx
            ├── Settings.jsx
            └── Profile.jsx
```
