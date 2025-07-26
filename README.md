# OKX Dashboard

This is a simple dashboard for OKX accounts. It allows you to view your account balance and positions, and to place market orders.

## How to Run

### Prerequisites

- Python 3.9+
- Node.js 14+
- An OKX account and API key

### Backend

1.  Navigate to the `backend` directory.
2.  Create a virtual environment: `python -m venv venv`
3.  Activate the virtual environment: `source venv/bin/activate`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Create a `.env` file and add your OKX API key, secret, and passphrase. You can use `backend/.env.example` as a template.
    - You can add multiple accounts by creating `OKX_API_KEY_1`, `OKX_API_SECRET_1`, `OKX_API_PASSPHRASE_1`, `OKX_API_KEY_2`, etc.
6.  Run the backend server: `uvicorn main:app --reload`

### Frontend

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Start the frontend development server: `npm start`

The application will be available at `http://localhost:3001`.

## Features

- List accounts with balances and positions.
- Place market buy/sell orders.
- Close positions.
- Real-time updates of account information.

## Project Structure

- `backend/`: FastAPI application for the backend.
  - `main.py`: The main FastAPI application.
  - `requirements.txt`: Python dependencies.
  - `.env.example`: Example environment variables file.
- `frontend/`: React application for the frontend.
  - `src/`: Source code for the React application.
    - `src/App.tsx`: The main application component.
  - `package.json`: Node.js dependencies.