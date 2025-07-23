import os
import weaviate
from tree_sitter import Language, Parser
from sentence_transformers import SentenceTransformer

# --- Configuration ---
WEAVIATE_URL = "http://localhost:8080"
CODE_DIRECTORY = "../../"  # Directory to index
MODEL_NAME = 'all-MiniLM-L6-v2'

# --- Tree-sitter setup for Python ---
PY_LANGUAGE = Language('build/my-languages.so', 'python')
parser = Parser()
parser.set_language(PY_LANGUAGE)

def chunk_code(file_path):
    """Parses a code file and yields chunks (functions, classes)."""
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()
    tree = parser.parse(bytes(code, "utf8"))
    # This is a simplified chunking logic. A real implementation would be more robust.
    # Here, we'll just treat the whole file as a chunk for simplicity in this example.
    # A more advanced version would iterate through function and class nodes.
    yield code, os.path.basename(file_path)


def main():
    """Main ingestion script."""
    client = weaviate.Client(WEAVIATE_URL)
    embedding_model = SentenceTransformer(MODEL_NAME)

    # --- Schema setup in Weaviate ---
    class_obj = {
        "class": "CodeChunk",
        "vectorizer": "none", # We provide our own vectors
        "properties": [
            {"name": "code", "dataType": ["text"]},
            {"name": "file_name", "dataType": ["string"]},
        ]
    }
    try:
        client.schema.create_class(class_obj)
    except weaviate.exceptions.UnexpectedStatusCodeException:
        print("Schema 'CodeChunk' already exists.")


    # --- Ingestion process ---
    with client.batch as batch:
        batch.batch_size=100
        for root, _, files in os.walk(CODE_DIRECTORY):
            for file in files:
                if file.endswith(('.py', '.js', '.ts')): # Add other file types as needed
                    file_path = os.path.join(root, file)
                    print(f"Indexing {file_path}...")
                    for chunk, file_name in chunk_code(file_path):
                        vector = embedding_model.encode(chunk).tolist()
                        batch.add_data_object(
                            data_object={"code": chunk, "file_name": file_name},
                            class_name="CodeChunk",
                            vector=vector
                        )
    print("Ingestion complete.")


if __name__ == "__main__":
    # This part is tricky because tree-sitter needs the language grammar compiled.
    # For a real project, you'd have a build step for this.
    # We will create a placeholder build script.
    if not os.path.exists('build/my-languages.so'):
        print("Language grammar not compiled. Please run a build script.")
        # As a placeholder, we'll create the file to avoid crashing the script
        os.makedirs('build', exist_ok=True)
        with open('build/my-languages.so', 'w') as f:
            f.write('') # Create an empty file
    main()
