# NotebookLLM

NotebookLLM is an interactive notebook-style application that combines the power of Large Language Models with a code execution environment. It provides a seamless interface for writing code, getting AI assistance, and executing Python code all in one place.

## Features

- 🤖 AI-powered chat interface using Ollama with llama3.2 model
- 📝 Interactive notebook-style interface
- 💻 Real-time Python code execution
- 🔄 Support for multiple cell types (code, text, markdown)
- 🎨 Modern and responsive UI
- 🐳 Containerized deployment with Docker

## Prerequisites

Before running the application, make sure you have the following installed:
- [Docker](https://www.docker.com/get-started)
- [Ollama](https://ollama.ai/)
- llama3.2 model for Ollama (`ollama pull llama3.2`)

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd NotebookLLMApp
```

2. Make sure Ollama is running and the llama3.2 model is installed:
```bash
ollama pull llama3.2
ollama run llama3.2
```

3. Start the application using Docker Compose:
```bash
docker-compose up --build
```

4. Access the application:
- Frontend: http://localhost:19006
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
NotebookLLMApp/
├── backend/
│   ├── main.py           # FastAPI backend server
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── screens/         # React Native screens
│   ├── App.tsx         # Main application component
│   └── config.ts       # Configuration files
├── docker/
│   ├── Dockerfile.backend   # Backend container configuration
│   └── Dockerfile.frontend  # Frontend container configuration
└── docker-compose.yml      # Docker services configuration
```

## Architecture

- **Frontend**: React Native/Expo web application
- **Backend**: FastAPI Python server
- **LLM Provider**: Ollama running llama3.2 model
- **Container Orchestration**: Docker Compose

## API Endpoints

- `POST /chat`: Send messages to the AI model
- `POST /execute`: Execute Python code
- `GET /models`: List available AI models
- `GET /health`: Check system health

## Development

### Running Locally

1. Start the backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

2. Start the frontend:
```bash
cd frontend
npm install
npx expo start --web
```

### Docker Development

The application is containerized using Docker for consistent development and deployment:

```bash
# Build and start containers
docker-compose up --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Ollama](https://ollama.ai/) for providing the LLM infrastructure
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/) for the frontend framework 