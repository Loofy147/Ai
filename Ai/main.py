# main.py

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# --- Initialize the FastAPI app and OpenAI client ---
app = FastAPI(
    title="AI Coder Assistant API",
    description="An API for a custom AI coding assistant.",
    version="1.0.0"
)

try:
    # The client automatically reads the OPENAI_API_KEY from the environment
    client = OpenAI()
except Exception as e:
    # This will help in debugging if the API key is missing
    print(f"Error: Could not initialize OpenAI client. Check your API key. Details: {e}")
    client = None

# --- Define the data models for API requests ---
class CodeQuery(BaseModel):
    prompt: str
    code_context: str | None = None
    language: str = "python" # Add language to make the prompt better

# --- API Endpoints ---

@app.get("/")
def read_root():
    """A simple endpoint to check if the API is running."""
    return {"status": "AI Coder API is running"}

@app.post("/generate-code")
def generate_code(query: CodeQuery):
    """
    Receives a prompt and code context, then returns AI-generated code.
    """
    if not client:
        raise HTTPException(status_code=500, detail="OpenAI client is not initialized. Check server logs for details.")

    # Create a more detailed system prompt for the AI
    system_prompt = f"""
    You are an expert programmer specializing in the {query.language} language.
    Your task is to help a user with their code.
    - Be concise and accurate.
    - Provide only the code unless asked for an explanation.
    - If you are asked to complete a function, only return the completed function.
    """

    # Combine the user's prompt with any code they provided for context
    full_prompt = query.prompt
    if query.code_context:
        full_prompt += f"\n\nHere is the current code for context:\n```{query.language}\n{query.code_context}\n```"

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Use "gpt-4" for higher quality results
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            temperature=0.2, # Lower temperature for more predictable code
            max_tokens=1000
        )
        generated_code = response.choices[0].message.content
        return {"generated_code": generated_code.strip()}
    except Exception as e:
        # This will return a detailed error to the client if the API call fails
        raise HTTPException(status_code=503, detail=f"An error occurred with the OpenAI API: {e}")
