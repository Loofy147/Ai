from fastapi import FastAPI
from pydantic import BaseModel
import openai
import os
import weaviate
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# --- Configuration ---
WEAVIATE_URL = "http://localhost:8080"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = 'all-MiniLM-L6-v2'

# --- Initialize models and clients ---
openai.api_key = OPENAI_API_KEY
embedding_model = SentenceTransformer(MODEL_NAME)
weaviate_client = weaviate.Client(WEAVIATE_URL)

class CodeRequest(BaseModel):
    prompt: str

def retrieve_context(prompt: str) -> str:
    """Retrieves relevant code chunks from Weaviate."""
    prompt_vector = embedding_model.encode(prompt).tolist()

    result = weaviate_client.query.get(
        "CodeChunk",
        ["code", "file_name"]
    ).with_near_vector({
        "vector": prompt_vector
    }).with_limit(3).do()

    context = ""
    for item in result["data"]["Get"]["CodeChunk"]:
        context += f"--- From {item['file_name']} ---\n{item['code']}\n\n"
    return context

@app.post("/generate")
async def generate(request: CodeRequest):
    context = retrieve_context(request.prompt)

    augmented_prompt = (
        f"You are an expert AI programming assistant.\n"
        f"Answer the user's request based on the following context retrieved from their codebase.\n\n"
        f"--- Context ---\n{context}"
        f"--- User Request ---\n{request.prompt}\n\n"
        f"--- Answer ---\n"
    )

    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=augmented_prompt,
        max_tokens=1500,
        n=1,
        stop=None,
        temperature=0.5,
    )
    return {"response": response.choices[0].text.strip()}


class TestRequest(BaseModel):
    code: str
    testing_framework: str = "pytest"

@app.post("/generate-test")
async def generate_test(request: TestRequest):
    context = retrieve_context(request.code)

    prompt = (
        f"You are a QA engineer. Write a unit test for the following function using the {request.testing_framework} framework.\n\n"
        f"--- Function to test ---\n{request.code}\n\n"
        f"--- Context from codebase ---\n{context}\n\n"
        f"--- Test Code ---\n"
    )

    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=1024,
        n=1,
        stop=None,
        temperature=0.5,
    )
    return {"response": response.choices[0].text.strip()}
