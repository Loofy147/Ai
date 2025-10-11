import pytest
from unittest.mock import MagicMock, patch
from backend.main import generate_playbook, reflect_on_response

# Since the main module initializes clients at the global scope,
# we need to patch them before importing the module functions.
# However, for simplicity in this environment, we will patch them within the test functions.

@pytest.fixture
def mock_openai_chat_completion():
    """Fixture to mock openai.ChatCompletion.create."""
    with patch('backend.main.openai.ChatCompletion.create') as mock_create:
        yield mock_create

@pytest.fixture
def mock_clients():
    """Fixture to mock the clients dictionary."""
    with patch('backend.main.clients', {}) as mock_clients:
        mock_clients['embedding_model'] = MagicMock()
        mock_clients['embedding_model'].encode.return_value.tolist.return_value = [0.1, 0.2, 0.3]
        mock_clients['weaviate_client'] = MagicMock()
        yield mock_clients


def test_generate_playbook(mock_openai_chat_completion, mock_clients):
    """Test the generate_playbook function."""
    # --- Arrange ---
    mock_openai_chat_completion.return_value.choices = [MagicMock(text="1. Do this\n2. Do that")]
    mock_clients['weaviate_client'].data_object.create.return_value = "mock-uuid"

    prompt = "test prompt"
    context = "test context"

    # --- Act ---
    playbook, playbook_uuid = generate_playbook(prompt, context)

    # --- Assert ---
    assert playbook == "1. Do this\n2. Do that"
    assert playbook_uuid == "mock-uuid"
    mock_openai_chat_completion.assert_called_once()
    mock_clients['weaviate_client'].data_object.create.assert_called_once_with(
        data_object={"playbook": "1. Do this\n2. Do that", "confidence": 0.5},
        class_name="Playbook",
        vector=[0.1, 0.2, 0.3]
    )


def test_reflect_on_response_valid_score(mock_openai_chat_completion):
    """Test the reflect_on_response function with a valid score."""
    # --- Arrange ---
    mock_openai_chat_completion.return_value.choices = [MagicMock(text="0.9")]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 0.9
    mock_openai_chat_completion.assert_called_once()


def test_reflect_on_response_invalid_score(mock_openai_chat_completion):
    """Test the reflect_on_response function with an invalid score."""
    # --- Arrange ---
    mock_openai_chat_completion.return_value.choices = [MagicMock(text="invalid")]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 0.5 # Should return the default score
    mock_openai_chat_completion.assert_called_once()


def test_reflect_on_response_score_clamping(mock_openai_chat_completion):
    """Test that the score is clamped between 0.0 and 1.0."""
    # --- Arrange ---
    mock_openai_chat_completion.return_value.choices = [MagicMock(text="1.5")]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 1.0

    # --- Arrange ---
    mock_openai_chat_completion.return_value.choices = [MagicMock(text="-0.5")]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 0.0
