import pytest
from app.services.llm import STRUCTURED_QA_PROMPT

def test_structured_qa_prompt_formatting():
    """
    Test that the STRUCTURED_QA_PROMPT can be formatted with context and history
    without throwing a KeyError due to literal JSON braces.
    """
    context_block = "Sample context"
    history_block = "Sample history"
    
    try:
        formatted = STRUCTURED_QA_PROMPT.format(
            context=context_block,
            history=history_block,
        )
    except KeyError as e:
        pytest.fail(f"Prompt formatting threw a KeyError: {e}. Literal JSON braces must be double-escaped as {{ and }}.")
    
    # Verify variables were substituted
    assert "Sample context" in formatted
    assert "Sample history" in formatted
    
    # Verify literal JSON was rendered with single braces
    assert "{" in formatted
    assert "}" in formatted
    assert '"answerable": boolean' in formatted
