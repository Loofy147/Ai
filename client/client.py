import requests
import argparse

BACKEND_URL = "http://127.0.0.1:8000"

def main():
    """Main function for the interactive CLI."""
    print("Welcome to the ACE Interactive CLI.")
    print("Type 'exit' to quit.")

    while True:
        try:
            prompt = input("ace> ")
            if prompt.lower() == 'exit':
                break

            # We will add command parsing here in the next step.
            parts = prompt.split(" ", 1)
            command = parts[0]

            if command == "generate":
                if len(parts) > 1:
                    response = requests.post(
                        f"{BACKEND_URL}/generate",
                        json={"prompt": parts[1]},
                    )
                    data = response.json()
                    print(data['response'])

                    feedback_prompt = input("Was this helpful? (yes/no): ")
                    if feedback_prompt.lower() == 'yes':
                        requests.post(
                            f"{BACKEND_URL}/feedback",
                            json={"playbook_uuid": data['playbook_uuid'], "feedback": "👍 Helpful"},
                        )
                    elif feedback_prompt.lower() == 'no':
                        requests.post(
                            f"{BACKEND_URL}/feedback",
                            json={"playbook_uuid": data['playbook_uuid'], "feedback": "👎 Not Helpful"},
                        )
                else:
                    print("Usage: generate <prompt>")
            elif command == "generate-test":
                if len(parts) > 1:
                    response = requests.post(
                        f"{BACKEND_URL}/generate-test",
                        json={"code": parts[1]},
                    )
                    data = response.json()
                    print(data['response'])
                else:
                    print("Usage: generate-test <code>")
            else:
                print(f"Unknown command: {command}")

        except KeyboardInterrupt:
            print("\nExiting.")
            break
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ACE CLI tool.")
    # We will add non-interactive commands here in the next step.

    args = parser.parse_args()

    # For now, we will just run the interactive session.
    main()
