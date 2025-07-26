# OKX 看板

这是一个用于管理 OKX 账户的简单看板。它允许您查看账户余额和持仓，并进行市价下单。

## 如何运行

### 前提条件

- Python 3.9+
- Node.js 14+
- 一个 OKX 账户和 API 密钥

### 本地开发

#### 后端

1.  进入 `backend` 目录。
2.  创建虚拟环境：`python -m venv venv`
3.  激活虚拟环境：`source venv/bin/activate`
4.  安装依赖：`pip install -r requirements.txt`
5.  在 `backend/` 目录下创建 `.env` 文件，并添加您的 OKX API 凭据。您可以参考 `backend/.env.example` 文件。
    - 您可以添加多个账户，例如 `OKX_API_KEY_1`, `OKX_API_SECRET_1`, `OKX_API_PASSPHRASE_1`, `OKX_API_KEY_2` 等。
6.  运行后端服务：`uvicorn main:app --reload`

#### 前端

1.  进入 `frontend` 目录。
2.  安装依赖：`npm install`
3.  启动前端开发服务：`npm start`

应用程序将在 `http://localhost:3001` 可用。

## 功能特性

- 查看账户余额和持仓。
- 市价买入/卖出下单。
- 平仓。
- 实时更新账户信息。
- 可配置的常用交易对，用于批量下单。

## 项目结构

- `backend/`: 后端 FastAPI 应用程序。
  - `main.py`: 主要的 FastAPI 应用程序。
  - `requirements.txt`: Python 依赖。
  - `.env.example`: 环境变量示例文件。
  - `config.json`: 存储可配置的交易对。
- `frontend/`: 前端 React 应用程序。
  - `src/`: React 应用程序的源代码。
    - `src/App.tsx`: 主要的应用程序组件。
    - `src/Configuration.tsx`: 用于管理交易对的配置页面。
  - `package.json`: Node.js 依赖。

## Docker 部署

本项目可以使用 Docker 和 Docker Compose 轻松部署。

### 1. 构建 Docker 镜像

进入项目根目录，运行以下命令构建 Docker 镜像：

```bash
docker build -t willpan013/okx-dashboard-backend:latest -f ./backend/Dockerfile ./backend
docker build -t willpan013/okx-dashboard-frontend:latest -f ./frontend/Dockerfile ./frontend
```

如果您计划将镜像推送到自己的 Docker Hub 仓库，请将 `willpan013` 替换为您的 Docker Hub 用户名。

### 2. 使用 Docker Compose 运行

Docker Compose 用于协调后端和前端服务。请确保您已安装并运行 Docker Desktop。

#### 环境变量配置

运行前，您需要配置您的 OKX API 凭据。有两种方式：

##### a) 使用 `.env` 文件（推荐用于本地开发）

在**项目根目录**（与 `docker-compose.yml` 同级）下创建 `.env` 文件，并添加您的 API 凭据。此文件将由 Docker Compose 自动加载。

```
# 项目根目录下的 .env 文件
OKX_API_KEY_1=YOUR_API_KEY_1
OKX_API_SECRET_1=YOUR_SECRET_KEY_1
OKX_API_PASSPHRASE_1=YOUR_PASSPHRASE_1
OKX_FLAG_1=0 # 0 代表实盘，1 代表模拟盘
OKX_ACCOUNT_NAME_1=我的主账户

OKX_API_KEY_2=YOUR_API_KEY_2
OKX_API_SECRET_2=YOUR_SECRET_KEY_2
OKX_API_PASSPHRASE_2=YOUR_PASSPHRASE_2
OKX_FLAG_2=0
OKX_ACCOUNT_NAME_2=我的第二个账户
# ... 根据需要添加更多账户
```

##### b) 直接传递环境变量（不推荐用于敏感数据）

您也可以在运行 `docker run` 时直接传递环境变量，或者修改 `docker-compose.yml`（尽管对于敏感数据，使用 `.env` 文件更安全）。

对于 `docker-compose.yml`，您可以在 `backend` 服务下添加 `environment` 部分：

```yaml
services:
  backend:
    # ... 其他配置
    environment:
      - OKX_API_KEY_1=YOUR_API_KEY_1
      - OKX_API_SECRET_1=YOUR_SECRET_KEY_1
      - OKX_API_PASSPHRASE_1=YOUR_PASSPHRASE_1
      - OKX_FLAG_1=0
      - OKX_ACCOUNT_NAME_1=我的主账户
      # ... 根据需要添加更多
```

#### 运行应用程序

配置好 `.env` 文件（或环境变量）后，运行：

```bash
docker-compose up --build
```

此命令将：
- 构建 Docker 镜像（如果尚未构建或检测到更改）。
- 创建并启动 `backend` 和 `frontend` 容器。
- 按照 `docker-compose.yml` 中的定义链接服务。
- 挂载 `backend` 目录作为卷，允许 `config.json` 的更改持久化。

应用程序将通过 `http://localhost:3000` 访问。

### 3. 推送 Docker 镜像到 Docker Hub (可选)

如果您想分享您的镜像或将其部署到远程服务器，可以将其推送到 Docker Hub。首先，请确保您已登录 Docker Hub (`docker login`)。

```bash
docker push willpan013/okx-dashboard-backend:latest
docker push willpan013/okx-dashboard-frontend:latest
```

请将 `willpan013` 替换为您的 Docker Hub 用户名。


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

##### b) 直接传递环境变量（不推荐用于敏感数据）

您也可以在运行 `docker run` 时直接传递环境变量，或者修改 `docker-compose.yml`（尽管对于敏感数据，使用 `.env` 文件更安全）。

对于 `docker-compose.yml`，您可以在 `backend` 服务下添加 `environment` 部分：

```yaml
services:
  backend:
    # ... 其他配置
    environment:
      - OKX_API_KEY_1=YOUR_API_KEY_1
      - OKX_API_SECRET_1=YOUR_SECRET_KEY_1
      - OKX_API_PASSPHRASE_1=YOUR_PASSPHRASE_1
      - OKX_FLAG_1=0
      - OKX_ACCOUNT_NAME_1=MyMainAccount
      # ... 根据需要添加更多
```

#### 运行应用程序

配置好 `.env` 文件（或环境变量）后，运行：

```bash
docker-compose up --build
```

此命令将：
- 构建 Docker 镜像（如果尚未构建或检测到更改）。
- 创建并启动 `backend` 和 `frontend` 容器。
- 按照 `docker-compose.yml` 中的定义链接服务。
- 挂载 `backend` 目录作为卷，允许 `config.json` 的更改持久化。

应用程序将通过 `http://localhost:3000` 访问。

### 3. 推送 Docker 镜像到 Docker Hub (可选)

如果您想分享您的镜像或将其部署到远程服务器，可以将其推送到 Docker Hub。首先，请确保您已登录 Docker Hub (`docker login`)。

```bash
docker push willpan013/okx-dashboard-backend:latest
docker push willpan013/okx-dashboard-frontend:latest
```

请将 `willpan013` 替换为您的 Docker Hub 用户名。