import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.matching_engine import RequiredSkill, compute_match, gap_priority


def test_perfect_match_scores_100():
    required = [RequiredSkill("s1", "Python", 80, "high")]
    result = compute_match({"s1": 90}, required)
    assert result.match_score == 100.0
    assert result.matched_skills[0]["skill"] == "Python"
    assert result.missing_skills == []


def test_missing_skill_scores_zero_contribution():
    required = [RequiredSkill("s1", "Cloud", 70, "high")]
    result = compute_match({}, required)
    assert result.match_score == 0.0
    assert result.missing_skills[0]["skill"] == "Cloud"
    assert result.missing_skills[0]["gap"] == 70.0


def test_partial_match_is_proportional():
    required = [RequiredSkill("s1", "SQL", 100, "medium")]
    result = compute_match({"s1": 50}, required)
    assert result.match_score == 50.0
    assert result.missing_skills[0]["gap"] == 50.0


def test_importance_weighting_changes_overall_score():
    # High-importance skill missing should hurt more than low-importance skill missing
    required_high_missing = [
        RequiredSkill("s1", "Python", 80, "high"),   # student has this
        RequiredSkill("s2", "Cloud", 80, "low"),      # student missing this
    ]
    required_low_missing = [
        RequiredSkill("s1", "Python", 80, "low"),
        RequiredSkill("s2", "Cloud", 80, "high"),
    ]
    levels = {"s1": 80}
    r1 = compute_match(levels, required_high_missing)
    r2 = compute_match(levels, required_low_missing)
    # Missing a low-importance skill should hurt overall score less
    assert r1.match_score > r2.match_score


def test_no_required_skills_returns_zero_with_reason():
    result = compute_match({"s1": 80}, [])
    assert result.match_score == 0.0
    assert "No required skills" in result.reason


def test_gap_priority_thresholds():
    assert gap_priority(55) == "high"
    assert gap_priority(25) == "medium"
    assert gap_priority(5) == "low"
    assert gap_priority(40) == "high"   # boundary inclusive
    assert gap_priority(15) == "medium"  # boundary inclusive


def test_reason_mentions_matched_and_missing():
    required = [
        RequiredSkill("s1", "Python", 50, "high"),
        RequiredSkill("s2", "Cloud", 50, "high"),
    ]
    result = compute_match({"s1": 80}, required)
    assert "Python" in result.reason
    assert "Cloud" in result.reason


def test_simulation_style_override_improves_score():
    required = [RequiredSkill("s1", "Cloud", 80, "high")]
    baseline = compute_match({"s1": 20}, required)
    improved = compute_match({"s1": 80}, required)  # simulate raising the level
    assert improved.match_score > baseline.match_score
    assert improved.match_score == 100.0
