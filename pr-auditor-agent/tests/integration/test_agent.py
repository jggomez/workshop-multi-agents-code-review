from google.adk.runners import InMemoryRunner
from google.adk.sessions import InMemorySessionService
from app.agent import root_agent, app


def test_pr_auditor_agent_pipeline_structure() -> None:
    """Test that the agent pipeline runner can be initialized."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="app")
    runner = InMemoryRunner(agent=root_agent, app_name="app")

    assert runner is not None
    assert session.id is not None
    assert app.root_agent == root_agent
