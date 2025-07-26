# OKX Dashboard

This is a simple dashboard for OKX accounts. It allows you to view your account balance and positions, and to place market orders.

## How to Run

### Prerequisites

- Python 3.9+
- Node.js 14+
- An OKX account and API key

### Local Development

#### Backend

1.  Navigate to the `backend` directory.
2.  Create a virtual environment: `python -m venv venv`
3.  Activate the virtual environment: `source venv/bin/activate`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Create a `.env` file in the `backend/` directory and add your OKX API credentials. You can use `backend/.env.example` as a template.
    - You can add multiple accounts by creating `OKX_API_KEY_1`, `OKX_API_SECRET_1`, `OKX_API_PASSPHRASE_1`, `OKX_API_KEY_2`, etc.
6.  Run the backend server: `uvicorn main:app --reload`

#### Frontend

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Start the frontend development server: `npm start`

The application will be available at `http://localhost:3001`.

## Features

- List accounts with balances and positions.
- Place market buy/sell orders.
- Close positions.
- Real-time updates of account information.
- Configurable common trading pairs for batch orders.

## Project Structure

- `backend/`: FastAPI application for the backend.
  - `main.py`: The main FastAPI application.
  - `requirements.txt`: Python dependencies.
  - `.env.example`: Example environment variables file.
  - `config.json`: Stores configurable trading pairs.
- `frontend/`: React application for the frontend.
  - `src/`: Source code for the React application.
    - `src/App.tsx`: The main application component.
    - `src/Configuration.tsx`: Configuration page for managing trading pairs.
  - `package.json`: Node.js dependencies.

## Docker Deployment

This project can be easily deployed using Docker and Docker Compose.

### 1. Build Docker Images

Navigate to the project root directory and run the following commands to build the Docker images:

```bash
docker build -t willpan013/okx-dashboard-backend:latest -f ./backend/Dockerfile ./backend
docker build -t willpan013/okx-dashboard-frontend:latest -f ./frontend/Dockerfile ./frontend
```

Replace `willpan013` with your Docker Hub username if you plan to push the images to your own repository.

### 2. Run with Docker Compose

Docker Compose is used to orchestrate the backend and frontend services. Ensure you have Docker Desktop installed and running.

#### Environment Variables Configuration

Before running, you need to configure your OKX API credentials. There are two ways to do this:

##### a) Using a `.env` file (Recommended for local development)

Create a `.env` file in the **project root directory** (same level as `docker-compose.yml`) with your API credentials. This file will be automatically picked up by Docker Compose.

```
# .env file in project root
OKX_API_KEY_1=YOUR_API_KEY_1
OKX_API_SECRET_1=YOUR_SECRET_KEY_1
OKX_API_PASSPHRASE_1=YOUR_PASSPHRASE_1
OKX_FLAG_1=0 # 0 for real, 1 for demo
OKX_ACCOUNT_NAME_1=MyMainAccount

OKX_API_KEY_2=YOUR_API_KEY_2
OKX_API_SECRET_2=YOUR_SECRET_KEY_2
OKX_API_PASSPHRASE_2=YOUR_PASSPHRASE_2
OKX_FLAG_2=0
OKX_ACCOUNT_NAME_2=MySecondAccount
# ... add more accounts as needed
```

##### b) Passing Environment Variables Directly (Less Recommended for Sensitive Data)

You can also pass environment variables directly when running `docker run` or by modifying `docker-compose.yml` (though the `.env` file approach is cleaner for sensitive data).

For `docker-compose.yml`, you would add an `environment` section under the `backend` service:

```yaml
services:
  backend:
    # ... other configurations
    environment:
      - OKX_API_KEY_1=YOUR_API_KEY_1
      - OKX_API_SECRET_1=YOUR_SECRET_KEY_1
      - OKX_API_PASSPHRASE_1=YOUR_PASSPHRASE_1
      - OKX_FLAG_1=0
      - OKX_ACCOUNT_NAME_1=MyMainAccount
      # ... add more as needed
```

#### Running the Application

Once your `.env` file is set up (or environment variables are configured), run:

```bash
docker-compose up --build
```

This command will:
- Build the Docker images (if not already built or if changes are detected).
- Create and start the `backend` and `frontend` containers.
- Link the services as defined in `docker-compose.yml`.
- Mount the `backend` directory as a volume, allowing changes to `config.json` to persist.

The application will be accessible at `http://localhost:3000`.

### 3. Push Docker Images to Docker Hub (Optional)

If you want to share your images or deploy them to a remote server, you can push them to Docker Hub. First, ensure you are logged in to Docker Hub (`docker login`).

```bash
docker push willpan013/okx-dashboard-backend:latest
docker push willpan013/okx-dashboard-frontend:latest
```

Replace `willpan013` with your Docker Hub username.
