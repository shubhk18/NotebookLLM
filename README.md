# NotebookLLM

A notebook-style LLM application that combines the power of interactive code execution with AI assistance.

## Features

- Interactive code execution in a notebook interface
- AI-powered code assistance and explanations
- Support for Python code execution
- Real-time output display
- Modern, responsive UI

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose
- OpenAI API key

### Option 1: Run from Docker Hub

1. Create a new directory and create a `docker-compose.yml` file:
```bash
mkdir notebookllm && cd notebookllm
```

2. Create the docker-compose.yml with the following content:
```yaml
version: '3.8'

services:
  backend:
    image: <your-dockerhub-username>/notebookllm-backend:latest
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - OPENAI_API_KEY=your_api_key_here
    networks:
      - notebookllm-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: <your-dockerhub-username>/notebookllm-frontend:latest
    ports:
      - "19000:19000"
      - "19001:19001"
      - "19002:19002"
    environment:
      - NODE_ENV=development
      - EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
      - REACT_NATIVE_PACKAGER_HOSTNAME=host.docker.internal
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - notebookllm-network

networks:
  notebookllm-network:
    driver: bridge
```

3. Start the services:
```bash
docker compose up
```

### Option 2: Build from Source

1. Clone the repository:
```bash
git clone <your-repo-url>
cd NotebookLLMApp
```

2. Create a `.env` file in the backend directory:
```bash
cd backend
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

3. Build and start the services:
```bash
docker compose up --build
```

## Accessing the Application

Once the containers are running:

1. Backend API: 
   - URL: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

2. Frontend Application:
   - URL: http://localhost:19000
   - Web Interface: http://localhost:19000/web

## Container Details

### Backend Container
- Base image: Python 3.9-slim
- Exposed port: 8000
- Health check endpoint: /health
- Environment variables:
  - OPENAI_API_KEY: Your OpenAI API key
  - PYTHONUNBUFFERED: 1

### Frontend Container
- Base image: Node 18-slim
- Exposed ports: 19000, 19001, 19002
- Environment variables:
  - NODE_ENV: development
  - EXPO_DEVTOOLS_LISTEN_ADDRESS: 0.0.0.0
  - REACT_NATIVE_PACKAGER_HOSTNAME: host.docker.internal

## Troubleshooting

1. If the backend health check fails:
   ```bash
   docker compose logs backend
   ```

2. If the frontend fails to start:
   ```bash
   docker compose logs frontend
   ```

3. To restart services:
   ```bash
   docker compose restart
   ```

4. To rebuild containers after changes:
   ```bash
   docker compose down
   docker compose up --build
   ```

## Development

### Backend Development

The backend is built with FastAPI and provides:
- Code execution endpoint
- Chat completion endpoint using OpenAI
- Health check endpoint

### Frontend Development

The frontend is built with React Native and Expo, featuring:
- Notebook-style interface
- Code and text cells
- Real-time code execution
- Output display

## API Endpoints

- `POST /execute`: Execute Python code
- `POST /chat`: Interact with the LLM
- `GET /models`: List available models
- `GET /health`: Health check

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 