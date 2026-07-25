import pytest
from fastapi.testclient import TestClient
from app.fast_api_app import app


def test_well_known_agent_card_redirect():
    """Test that /.well-known/agent.json redirects to root agent card."""
    with TestClient(app) as client:
        response = client.get("/.well-known/agent.json", follow_redirects=False)
        assert response.status_code in (302, 307)
        assert "/a2a/app/.well-known/agent-card.json" in response.headers["location"]


def test_root_a2a_agent_card_endpoint():
    """Test fetching root A2A agent card."""
    with TestClient(app) as client:
        response = client.get("/a2a/app/.well-known/agent-card.json")
        assert response.status_code == 200
        card = response.json()
        assert "name" in card
        assert "capabilities" in card


def test_subagent_a2a_agent_card_endpoints():
    """Test fetching A2A agent cards for individual sub-agents."""
    endpoints = [
        "/a2a/pr_investigator_agent/.well-known/agent-card.json",
        "/a2a/critical_reviewer_agent/.well-known/agent-card.json",
        "/a2a/pr_report_agent/.well-known/agent-card.json",
    ]
    with TestClient(app) as client:
        for ep in endpoints:
            res = client.get(ep)
            assert res.status_code == 200
            data = res.json()
            assert "name" in data
