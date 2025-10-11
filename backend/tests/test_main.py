import pytest
from unittest.mock import MagicMock, patch
from backend.main import generate_playbook, reflect_on_response

# Since the main module initializes clients at the global scope,
# we need to patch them before importing the module functions.
# However, for simplicity in this environment, we will patch them within the test functions.

@pytest.fixture
def mock_openai_client():
    """Fixture to mock the openai.OpenAI client."""
    with patch('backend.main.clients', {}) as mock_clients:
        mock_clients['openai_client'] = MagicMock()
        yield mock_clients['openai_client']

@pytest.fixture
def mock_clients(mock_openai_client):
    """Fixture to mock the clients dictionary."""
    with patch('backend.main.clients', {}) as mock_clients:
        mock_clients['openai_client'] = mock_openai_client
        mock_clients['embedding_model'] = MagicMock()
        mock_clients['embedding_model'].encode.return_value.tolist.return_value = [0.1, 0.2, 0.3]
        mock_clients['weaviate_client'] = MagicMock()
        yield mock_clients


def test_generate_playbook(mock_clients):
    """Test the generate_playbook function."""
    # --- Arrange ---
    mock_clients['openai_client'].chat.completions.create.return_value.choices = [MagicMock(message=MagicMock(content="1. Do this\n2. Do that"))]
    mock_clients['weaviate_client'].data_object.create.return_value = "mock-uuid"

    prompt = "test prompt"
    context = "test context"

    # --- Act ---
    playbook, playbook_uuid = generate_playbook(prompt, context)

    # --- Assert ---
    assert playbook == "1. Do this\n2. Do that"
    assert playbook_uuid == "mock-uuid"
    mock_clients['openai_client'].chat.completions.create.assert_called_once()
    mock_clients['weaviate_client'].data_object.create.assert_called_once_with(
        data_object={"playbook": "1. Do this\n2. Do that", "confidence": 0.5},
        class_name="Playbook",
        vector=[0.1, 0.2, 0.3]
    )


def test_reflect_on_response_valid_score(mock_clients):
    """Test the reflect_on_response function with a valid score."""
    # --- Arrange ---
    mock_clients['openai_client'].chat.completions.create.return_value.choices = [MagicMock(message=MagicMock(content="0.9"))]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 0.9
    mock_clients['openai_client'].chat.completions.create.assert_called_once()


def test_reflect_on_response_invalid_score(mock_clients):
    """Test the reflect_on_response function with an invalid score."""
    # --- Arrange ---
    mock_clients['openai_client'].chat.completions.create.return_value.choices = [MagicMock(message=MagicMock(content="invalid"))]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 0.5 # Should return the default score
    mock_clients['openai_client'].chat.completions.create.assert_called_once()


def test_reflect_on_response_score_clamping(mock_clients):
    """Test that the score is clamped between 0.0 and 1.0."""
    # --- Arrange ---
    mock_clients['openai_client'].chat.completions.create.return_value.choices = [MagicMock(message=MagicMock(content="1.5"))]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 1.0

    # --- Arrange ---
    mock_clients['openai_client'].chat.completions.create.return_value.choices = [MagicMock(message=MagicMock(content="-0.5"))]

    # --- Act ---
    score = reflect_on_response("prompt", "context", "playbook", "response")

    # --- Assert ---
    assert score == 0.0
