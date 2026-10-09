import pytest
import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Mseek Music API"
    assert data["status"] == "online"

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_new_releases():
    response = client.get("/api/music/new-releases")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "title" in first
        assert "artists" in first
        assert "id" in first

def test_search():
    response = client.get("/api/music/search?q=coldplay&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "id" in first
    assert "title" in first
    assert "artists" in first
    assert "thumbnail" in first

def test_info():
    response = client.get("/api/music/info/dQw4w9WgXcQ")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "title" in data
    assert "related" in data
    assert isinstance(data["related"], list)
