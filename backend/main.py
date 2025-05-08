from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import sys
from io import StringIO
import contextlib
import traceback
from openai import OpenAI

# Load environment variables
load_dotenv()

app = FastAPI(
    title="NotebookLLM API",
    description="API for NotebookLLM mobile application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
async def root():
    """Redirect to API documentation"""
    return RedirectResponse(url="/docs")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "gpt-3.5-turbo"

class CodeExecutionRequest(BaseModel):
    code: str
    model: Optional[str] = "gpt-3.5-turbo"

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
async def chat_endpoint(request: ChatRequest):
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Format messages for the model
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Get response from OpenAI
        response = client.chat.completions.create(
            model=request.model,
            messages=formatted_messages
        )
        
        return {
            "response": response.choices[0].message.content,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "models": [
            "gpt-3.5-turbo",
            "gpt-4",
            "gpt-4-turbo-preview"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"} 