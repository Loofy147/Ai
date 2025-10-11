from fastapi import FastAPI
from pydantic import BaseModel
import openai
import os
import weaviate
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

clients = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Initialize models and clients ---
    openai.api_key = os.getenv("OPENAI_API_KEY")
    clients['embedding_model'] = SentenceTransformer('all-MiniLM-L6-v2')
    clients['weaviate_client'] = weaviate.Client(os.getenv("WEAVIATE_URL", "http://localhost:8080"))
    yield
    # --- Cleanup ---
    clients.clear()

app = FastAPI(lifespan=lifespan)

class CodeRequest(BaseModel):
    prompt: str

def retrieve_context(prompt: str) -> str:
    """Retrieves relevant code chunks and playbooks from Weaviate."""
    prompt_vector = clients['embedding_model'].encode(prompt).tolist()

    # --- Retrieve Code Chunks ---
    code_result = clients['weaviate_client'].query.get(
        "CodeChunk",
        ["code", "file_name"]
    ).with_near_vector({
        "vector": prompt_vector
    }).with_limit(3).do()

    context = "--- Relevant Code Chunks ---\n"
    if "data" in code_result and "Get" in code_result["data"] and "CodeChunk" in code_result["data"]["Get"] and code_result["data"]["Get"]["CodeChunk"]:
        for item in code_result["data"]["Get"]["CodeChunk"]:
            context += f"--- From {item['file_name']} ---\n{item['code']}\n\n"

    # --- Retrieve High-Confidence Playbooks ---
    playbook_result = weaviate_client.query.get(
        "Playbook",
        ["playbook", "confidence"]
    ).with_near_vector({
        "vector": prompt_vector
    }).with_where({
        "path": ["confidence"],
        "operator": "GreaterThan",
        "valueNumber": 0.7
    }).with_limit(1).do()

    if "data" in playbook_result and "Get" in playbook_result["data"] and "Playbook" in playbook_result["data"]["Get"] and playbook_result["data"]["Get"]["Playbook"]:
        context += "--- Recommended Playbook ---\n"
        for item in playbook_result["data"]["Get"]["Playbook"]:
            context += f"{item['playbook']}\n\n"

    return context

def generate_playbook(prompt: str, context: str) -> str:
    """Generates a playbook using an LLM."""
    playbook_prompt = (
        f"You are an expert AI architect. Based on the user's request and the following code context, "
        f"create a high-level playbook of steps to achieve the user's goal. "
        f"The playbook should be a list of actionable steps.\n\n"
        f"--- Context ---\n{context}\n\n"
        f"--- User Request ---\n{prompt}\n\n"
        f"--- Playbook ---\n"
    )

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an expert AI architect."},
            {"role": "user", "content": playbook_prompt}
        ],
        max_tokens=500,
        n=1,
        stop=None,
        temperature=0.3,
    )
    playbook = response.choices[0].text.strip()

    # --- Store the playbook in Weaviate ---
    playbook_vector = clients['embedding_model'].encode(playbook).tolist()
    playbook_uuid = clients['weaviate_client'].data_object.create(
        data_object={"playbook": playbook, "confidence": 0.5}, # Initial confidence
        class_name="Playbook",
        vector=playbook_vector
    )

    return playbook, playbook_uuid

def reflect_on_response(prompt: str, context: str, playbook: str, response: str) -> float:
    """Uses an LLM to reflect on the quality of a response and returns a confidence score."""
    reflection_prompt = (
        f"You are a senior AI software engineer. Evaluate the quality of the generated response based on the "
        f"user's request, the provided context, and the playbook that was followed. "
        f"Rate the response on a scale of 0.0 to 1.0, where 1.0 is a perfect response. "
        f"Output only the numeric score.\n\n"
        f"--- User Request ---\n{prompt}\n\n"
        f"--- Context ---\n{context}\n\n"
        f"--- Playbook ---\n{playbook}\n\n"
        f"--- Generated Response ---\n{response}\n\n"
        f"--- Quality Score ---\n"
    )

    reflection_response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a senior AI software engineer."},
            {"role": "user", "content": reflection_prompt}
        ],
        max_tokens=10,
        n=1,
        stop=None,
        temperature=0.0,
    )
    try:
        score = float(reflection_response.choices[0].text.strip())
        return max(0.0, min(1.0, score)) # Clamp the score between 0.0 and 1.0
    except ValueError:
        return 0.5 # Default score if parsing fails

@app.post("/generate")
async def generate(request: CodeRequest):
    context = retrieve_context(request.prompt)
    playbook, playbook_uuid = generate_playbook(request.prompt, context)

    augmented_prompt = (
        f"You are an expert AI programming assistant.\n"
        f"Follow the playbook to answer the user's request based on the provided context.\n\n"
        f"--- Playbook ---\n{playbook}\n\n"
        f"--- Context ---\n{context}"
        f"--- User Request ---\n{request.prompt}\n\n"
        f"--- Answer ---\n"
    )

    response_text = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an expert AI programming assistant."},
            {"role": "user", "content": augmented_prompt}
        ],
        max_tokens=1500,
        n=1,
        stop=None,
        temperature=0.5,
    ).choices[0].text.strip()

    # --- Reflect and update playbook confidence ---
    new_confidence = reflect_on_response(request.prompt, context, playbook, response_text)
    clients['weaviate_client'].data_object.update(
        uuid=playbook_uuid,
        class_name="Playbook",
        data_object={"confidence": new_confidence}
    )

    return {"response": response_text}


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

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"You are a QA engineer. Write a unit test for the following function using the {request.testing_framework} framework."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1024,
        n=1,
        stop=None,
        temperature=0.5,
    )
    return {"response": response.choices[0].text.strip()}
