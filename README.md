# Planout

Planout is an AI-driven planning assistant designed to help users break down complex goals into actionable tasks ("chunks") and schedule them effectively. By leveraging Google's Gemini AI, Planout transforms high-level descriptions into structured plans, making productivity smarter and more manageable.

## Features

- **AI-Powered Planning**: Automatically breaks down vague plan descriptions into specific, actionable chunks using Gemini AI.
- **Smart Scheduling**: Suggests realistic schedules for tasks based on duration and user preferences.
- **Plan Management**: Create, read, update, and delete detailed plans.
- **Progress Tracking**: Track the status of individual chunks (TODO, IN_PROGRESS, DONE).
- **Interactive UI**: Modern, responsive frontend built with Next.js and React.
- **Persistence**: robust SQLite database with SQLModel ORM.

## Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database**: SQLite with [SQLModel](https://sqlmodel.tiangolo.com/)
- **AI Integration**: Google Generative AI (Gemini)
- **Testing**: Pytest

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Styling**: CSS / Vanilla CSS

### DevOps & Tools
- **Containerization**: Docker & Docker Compose
- **Linting**: ESLint

## Getting Started

### Prerequisites
- **Docker** (Recommended for easiest setup)
- *Or for manual setup:*
  - Python 3.10+
  - Node.js 18+
  - Google Gemini API Key

### Option 1: Run with Docker (Recommended)

1. **Clone the repository** (if applicable) or navigate to the project root.
2. **Create a `.env` file** in the `backend/` directory:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
3. **Build and Run**:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend API Docs: `http://localhost:8000/docs`

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Environment:
   Create a `.env` file in the `backend` directory with your API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   ```
5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will run at `http://localhost:8000`.

#### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:3000`.

## Running Tests

### Backend Tests
To run the integration and unit tests for the backend:

```bash
cd backend
pytest
```

There is also a standalone integration script in the root:
```bash
python test_integration_v2.py
```

## Project Structure

```
planout/
├── backend/            # FastAPI application
│   ├── app/            # Application source code
│   │   ├── models.py   # SQLModel database models
│   │   ├── main.py     # API entry point & endpoints
│   │   └── gemini.py   # AI integration logic
│   └── tests/          # Pytest suite
├── frontend/           # Next.js application
│   ├── app/            # App Router pages & layouts
│   └── components/     # React components
└── docker-compose.yml  # Container orchestration
```

## Deployment

We have a detailed [Deployment Guide](deployment_guide.md) for deploying to Railway or other cloud providers.

## Key Features

### "Bring Your Own Key" (BYOK) AI
Planout facilitates public demos by allowing individual users to provide their own **Google Gemini API Key**.
- Keys are stored securely in the browser's `localStorage`.
- The backend accepts these keys via headers to perform AI operations on behalf of the user.

## License
[MIT](LICENSE)
