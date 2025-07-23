import requests

prompt = "def hello_world():"
code_context = "A function that prints 'Hello, World!'"

response = requests.post(
    "http://127.0.0.1:8000/generate",
    json={"prompt": prompt, "code_context": code_context},
)

print(response.json())
