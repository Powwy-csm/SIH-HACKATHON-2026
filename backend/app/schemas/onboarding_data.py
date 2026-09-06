# Static Question Bank for MVP

ASSESSMENT_QUESTIONS = {
    "default": [
        {
            "id": "q1",
            "text": "What is the primary purpose of version control?",
            "options": ["Tracking changes", "Writing code", "Deploying apps", "Debugging"],
            "correct_index": 0
        },
        {
            "id": "q2",
            "text": "Which of the following is an example of an interpreted language?",
            "options": ["C++", "Java", "Python", "Rust"],
            "correct_index": 2
        },
        {
            "id": "q3",
            "text": "What does API stand for?",
            "options": ["Application Programming Interface", "Advanced Program Integration", "Application Process Integration", "Automated Programming Interface"],
            "correct_index": 0
        }
    ],
    # We can expand this mapping: "subdomain_id" or "interest_id" -> list of questions.
}

def get_questions_for_interest(interest_id: str | None = None) -> list[dict]:
    # For MVP, return a generic set if no specific one exists
    return ASSESSMENT_QUESTIONS.get(interest_id, ASSESSMENT_QUESTIONS["default"])

CONFIDENCE_WEIGHTS = {
    "self_report": 0.40,
    "assessment": 0.40,
    "evidence": 0.20
}

def calculate_confidence(self_report_score: float, assessment_score: float, evidence_score: float) -> float:
    score = (
        (self_report_score * CONFIDENCE_WEIGHTS["self_report"]) +
        (assessment_score * CONFIDENCE_WEIGHTS["assessment"]) +
        (evidence_score * CONFIDENCE_WEIGHTS["evidence"])
    )
    return max(0.0, min(100.0, score))

def get_self_report_score(level: str) -> float:
    mapping = {
        "beginner": 30.0,
        "intermediate": 60.0,
        "advanced": 90.0
    }
    return mapping.get(level.lower(), 0.0)
