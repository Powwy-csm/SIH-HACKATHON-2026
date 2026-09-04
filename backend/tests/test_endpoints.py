import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "dummy_anon")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "dummy_service")

import pytest
from fastapi.testclient import TestClient

from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.main import app
from tests.mock_supabase import build_mock_client


@pytest.fixture
def mock_client():
    return build_mock_client()


@pytest.fixture
def api(mock_client):
    def fake_current_student():
        return CurrentStudent(student_id="student-1", email="asha@example.edu", client=mock_client)

    def fake_service_client():
        return mock_client  # same fake DB; service-role write path reuses it in tests

    app.dependency_overrides[get_current_student] = fake_current_student
    app.dependency_overrides[get_service_client] = fake_service_client
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_health():
    client = TestClient(app)
    assert client.get("/health").json() == {"status": "ok"}


def test_profile_analyze(api):
    res = api.post("/api/student-ai/profile/analyze")
    assert res.status_code == 200
    body = res.json()
    assert body["profile_completeness"] > 0
    assert any(s["skill"] == "Python" for s in body["verified_skills"])
    assert any(s["skill"] == "SQL" for s in body["unverified_skills"])
    assert body["certifications_count"] == 1
    assert body["academic_summary"]["cgpa"] == 8.2


def test_dashboard_reports_analysis_required_when_no_cache(api):
    res = api.get("/api/student-ai/dashboard")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "analysis_required"
    assert body["top_recommendation"] is None


def test_opportunity_match_excludes_closed_postings_and_writes_recommendation(api, mock_client):
    res = api.post("/api/student-ai/opportunities/match", json={})
    assert res.status_code == 200
    body = res.json()
    postings_returned = [r["posting_id"] for r in body["recommendations"]]
    assert "posting-1" in postings_returned
    assert "posting-2" not in postings_returned  # status=closed, must be excluded

    rec = body["recommendations"][0]
    # python: 85/80 capped at 100%, sql: 55/70 ~78.6%, cloud: 0/75 = 0% (missing), weighted by importance
    assert 0 < rec["match_score"] < 100
    assert any(m["skill"] == "Python" for m in rec["matched_skills"])
    assert any(m["skill"] == "Cloud Computing" for m in rec["missing_skills"])

    # confirm it was actually upserted into the (fake) recommendations table
    written = mock_client._db.tables["recommendations"]
    assert any(r["posting_id"] == "posting-1" and r["student_id"] == "student-1" for r in written)


def test_dashboard_ready_after_opportunity_match(api):
    api.post("/api/student-ai/opportunities/match", json={})
    res = api.get("/api/student-ai/dashboard")
    body = res.json()
    assert body["status"] == "ready"
    assert body["top_recommendation"]["posting_id"] == "posting-1"
    assert body["verified_skills_count"] == 1


def test_skill_gap_analysis_requires_posting_id_and_writes_gaps(api, mock_client):
    res = api.post("/api/student-ai/skill-gaps/analyze", json={"posting_id": "posting-1"})
    assert res.status_code == 200
    body = res.json()
    assert body["posting_id"] == "posting-1"
    gap_skills = {g["skill"]: g for g in body["gaps"]}
    assert gap_skills["Cloud Computing"]["gap"] == 75.0
    assert gap_skills["Cloud Computing"]["priority"] == "high"
    assert gap_skills["Python"]["gap"] == 0.0  # 85 current vs 80 required -> no gap

    written = mock_client._db.tables["skill_gaps"]
    assert any(
        r["skill_id"] == "skill-cloud" and r["target_role"] == "posting-1" and r["student_id"] == "student-1"
        for r in written
    )


def test_skill_gap_analysis_missing_posting_id_is_422(api):
    # Authenticated (via fixture override), but body omits the required posting_id
    res = api.post("/api/student-ai/skill-gaps/analyze", json={})
    assert res.status_code == 422


def test_skill_gap_analysis_missing_posting_id_without_auth_is_401():
    # Unauthenticated request: auth is enforced regardless of body validity
    client = TestClient(app)
    res = client.post("/api/student-ai/skill-gaps/analyze", json={})
    assert res.status_code == 401


def test_skill_gap_analysis_unknown_posting_is_404(api):
    res = api.post("/api/student-ai/skill-gaps/analyze", json={"posting_id": "does-not-exist"})
    assert res.status_code == 404


def test_simulate_improvement_does_not_persist(api, mock_client):
    before_recs = list(mock_client._db.tables["recommendations"])
    before_skills = list(mock_client._db.tables["student_skills"])

    res = api.post(
        "/api/student-ai/simulate-improvement",
        json={
            "posting_id": "posting-1",
            "skill_improvements": [{"skill_id": "skill-cloud", "target_level": 90}],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["simulated_score"] > body["current_score"]
    assert body["delta"] > 0
    cloud_row = next(b for b in body["skill_breakdown"] if b["skill_id"] == "skill-cloud")
    assert cloud_row["target"] == 90
    assert cloud_row["contribution_delta"] > 0

    # Confirm nothing was written anywhere as a side effect
    assert mock_client._db.tables["recommendations"] == before_recs
    assert mock_client._db.tables["student_skills"] == before_skills


def test_unauthenticated_request_is_401():
    client = TestClient(app)
    res = client.post("/api/student-ai/profile/analyze")
    assert res.status_code == 401


def test_get_student_documents(api):
    res = api.get("/api/resume/documents")
    assert res.status_code == 200
    docs = res.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1
    first = docs[0]
    assert "id" in first
    assert "title" in first
    assert "skills_verified" in first
    assert "Python" in first["skills_verified"]


def test_verify_document_validation_errors(api):
    # Empty file
    res = api.post("/api/resume/verify-document", files={"file": ("test.pdf", b"", "application/pdf")})
    assert res.status_code == 400

    # Unsupported format
    res = api.post("/api/resume/verify-document", files={"file": ("test.exe", b"fake binary", "application/octet-stream")})
    assert res.status_code == 400
