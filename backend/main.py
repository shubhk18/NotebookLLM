from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from dotenv import load_dotenv
import sys
from io import StringIO
import contextlib
import traceback
import logging
import requests
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class OllamaProvider:
    def __init__(self):
        # Use host.docker.internal when running in Docker, fallback to localhost otherwise
        self.base_url = "http://host.docker.internal:11434"  # Docker-aware Ollama API URL
        self.model = "llama3.2"  # Updated to match your installed model
        self.check_connection()

    def check_connection(self):
        try:
            logger.info(f"Attempting to connect to Ollama at {self.base_url}")
            response = requests.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                logger.info("Successfully connected to Ollama API")
                # Check if our model is available
                models = response.json().get("models", [])
                if not any(m["name"].startswith(self.model) for m in models):
                    logger.warning(f"Model {self.model} not found in Ollama. Please run 'ollama pull {self.model}'")
            else:
                raise ConnectionError(f"Failed to connect to Ollama API: Status code {response.status_code}")
        except Exception as e:
            logger.error(f"Error connecting to Ollama: {str(e)}")
            raise

    async def generate_response(self, message: str) -> str:
        try:
            logger.info(f"Generating response for message: '{message}'")
            # Prepare the prompt
            data = {
                "model": self.model,
                "prompt": message,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "num_ctx": 2048,
                }
            }

            # Make request to Ollama API
            logger.info("Sending request to Ollama API")
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=data,
                timeout=30  # Add timeout
            )
            
            response.raise_for_status()  # Raise exception for non-200 status codes
            
            # Extract the response
            result = response.json()
            response_text = result.get("response", "").strip()
            
            if not response_text:
                raise ValueError("Empty response received from Ollama API")
                
            logger.info("Successfully generated response")
            return response_text

        except requests.Timeout:
            logger.error("Request to Ollama API timed out")
            raise HTTPException(
                status_code=504,
                detail="Request to Ollama API timed out"
            )
        except requests.RequestException as e:
            logger.error(f"Request to Ollama API failed: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to communicate with Ollama API: {str(e)}"
            )
        except ValueError as e:
            logger.error(f"Invalid response from Ollama API: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error in generate_response: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"An unexpected error occurred while generating response: {str(e)}"
            )

app = FastAPI(
    title="NotebookLLM API",
    description="API for NotebookLLM mobile application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Ollama provider
try:
    ollama_provider = OllamaProvider()
except Exception as e:
    logger.error(f"Failed to initialize Ollama provider: {str(e)}")
    ollama_provider = None

@app.get("/", include_in_schema=False)
async def root():
    """Redirect to API documentation"""
    return RedirectResponse(url="/docs")

class ChatMessage(BaseModel):
    role: str
    content: str

class SimpleChatRequest(BaseModel):
    message: str = Field(..., description="The message to send to the AI")
    model: str = Field(default="llama3.2", description="The model to use")

class CodeExecutionRequest(BaseModel):
    code: str
    model: Optional[str] = "llama3.2"

@contextlib.contextmanager
def capture_output():
    """Capture stdout and stderr"""
    stdout, stderr = StringIO(), StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    try:
        sys.stdout, sys.stderr = stdout, stderr
        yield stdout, stderr
    finally:
        sys.stdout, sys.stderr = old_out, old_err

@app.post("/execute")
async def execute_code(request: CodeExecutionRequest):
    try:
        with capture_output() as (stdout, stderr):
            try:
                # Create a dictionary for local variables
                local_vars = {}
                
                # Execute the code
                exec(request.code, {}, local_vars)
                
                # Get the output
                output = stdout.getvalue()
                error_output = stderr.getvalue()
                
                # If there's error output, include it in the response
                if error_output:
                    output = f"Error:\n{error_output}\n\nOutput:\n{output}"
                
                # If there's no output but we have variables, show them
                if not output and local_vars:
                    output = "Variables defined:\n"
                    for var_name, var_value in local_vars.items():
                        if not var_name.startswith('_'):
                            output += f"{var_name} = {repr(var_value)}\n"
                
                return {
                    "output": output or "Code executed successfully with no output.",
                    "status": "success"
                }
            except Exception as e:
                return {
                    "output": f"Error:\n{traceback.format_exc()}",
                    "status": "error"
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: SimpleChatRequest):
    try:
        logger.info(f"Received chat request: message='{request.message}' model='{request.model}'")
        
        if not ollama_provider:
            raise HTTPException(
                status_code=500,
                detail="Ollama provider not initialized. Please make sure Ollama is running."
            )

        try:
            # Generate response using Ollama
            response_text = await ollama_provider.generate_response(request.message)
            
            if not response_text:
                raise ValueError("Empty response received from Ollama")
                
            return {
                "response": response_text,
                "status": "success",
                "provider": "ollama"
            }
        except requests.RequestException as e:
            logger.error(f"Ollama API request failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to communicate with Ollama API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error generating response: {str(e)}"
            )
            
    except HTTPException as he:
        logger.error(f"HTTP Exception in chat endpoint: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/models")
async def list_models():
    """List available models"""
    try:
        response = requests.get(f"{ollama_provider.base_url}/api/tags")
        if response.status_code == 200:
            models = response.json().get("models", [])
            return {
                "models": [m["name"] for m in models]
            }
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return {
            "models": ["llama3.2"]  # Updated fallback model
        }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        response = requests.get(f"{ollama_provider.base_url}/api/tags")
        ollama_healthy = response.status_code == 200
    except:
        ollama_healthy = False

    return {
        "status": "healthy",
        "ollama_available": ollama_healthy
    } 