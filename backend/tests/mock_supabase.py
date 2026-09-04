"""
A minimal fake of the supabase-py query-builder interface, just enough to
exercise our repository functions end-to-end without a live Supabase
project (this sandbox has no network access to *.supabase.co).

This is intentionally narrow: it supports .table().select().eq().single()/
.execute(), .order().limit(), .upsert(), and a fake .auth.get_user(), which
is exactly the surface app/services/repository.py and app/deps/auth.py use.
"""
from __future__ import annotations

from types import SimpleNamespace


class FakeResult:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class FakeQuery:
    def __init__(self, table_data: list[dict], table_name: str, db: "FakeDB"):
        self._rows = list(table_data)
        self._table_name = table_name
        self._db = db
        self._filters: list[tuple[str, str]] = []
        self._select_cols = None
        self._single = False
        self._order_col = None
        self._order_desc = False
        self._limit = None
        self._count_mode = None

    def select(self, cols, count=None):
        self._select_cols = cols
        self._count_mode = count
        return self

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def single(self):
        self._single = True
        return self

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n):
        self._limit = n
        return self

    def upsert(self, rows, on_conflict=None):
        if isinstance(rows, dict):
            rows = [rows]
        for row in rows:
            self._db.upsert_row(self._table_name, row, on_conflict)
        return FakeExecuteWrapper(FakeResult(data=rows))

    def _apply_filters(self):
        rows = self._rows
        for col, val in self._filters:
            rows = [r for r in rows if r.get(col) == val]
        return rows

    def _resolve_relations(self, row: dict) -> dict:
        """Resolve nested selects like skills(name, skill_categories(name))
        using the fake DB's other tables, based on *_id foreign keys present
        on the row. Good enough for our fixture data shapes."""
        return self._db.resolve(self._table_name, row)

    def execute(self):
        rows = self._apply_filters()
        if self._order_col:
            rows = sorted(rows, key=lambda r: (r.get(self._order_col) is None, r.get(self._order_col)),
                          reverse=self._order_desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        resolved = [self._resolve_relations(dict(r)) for r in rows]
        count = len(self._apply_filters()) if self._count_mode else None
        if self._single:
            return FakeResult(data=resolved[0] if resolved else None, count=count)
        return FakeResult(data=resolved, count=count)


class FakeExecuteWrapper:
    def __init__(self, result):
        self._result = result

    def execute(self):
        return self._result


class FakeDB:
    """Holds representative mock rows for each table, keyed by table name."""

    def __init__(self, tables: dict[str, list[dict]]):
        self.tables = tables

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables.get(name, []), name, self)

    def upsert_row(self, table_name: str, row: dict, on_conflict: str | None):
        rows = self.tables.setdefault(table_name, [])
        if on_conflict:
            keys = on_conflict.split(",")
            for i, existing in enumerate(rows):
                if all(existing.get(k) == row.get(k) for k in keys):
                    merged = {**existing, **row}
                    if table_name == "skill_gaps":
                        merged["gap"] = max(
                            (merged.get("required_level") or 0) - (merged.get("current_level") or 0), 0
                        )
                    rows[i] = merged
                    return
        if table_name == "skill_gaps":
            row = dict(row)
            row["gap"] = max((row.get("required_level") or 0) - (row.get("current_level") or 0), 0)
        rows.append(row)

    def resolve(self, table_name: str, row: dict) -> dict:
        row = dict(row)
        if table_name == "student_skills" and "skill_id" in row:
            skill = next((s for s in self.tables.get("skills", []) if s["id"] == row["skill_id"]), None)
            if skill:
                skill_out = dict(skill)
                cat = next((c for c in self.tables.get("skill_categories", []) if c["id"] == skill.get("category_id")), None)
                skill_out["skill_categories"] = {"name": cat["name"]} if cat else None
                row["skills"] = skill_out
        if table_name == "posting_required_skills" and "skill_id" in row:
            skill = next((s for s in self.tables.get("skills", []) if s["id"] == row["skill_id"]), None)
            row["skills"] = {"name": skill["name"]} if skill else None
        if table_name == "postings" and "company_id" in row:
            company = next((c for c in self.tables.get("companies", []) if c["id"] == row["company_id"]), None)
            row["companies"] = {"name": company["name"]} if company else None
        if table_name == "recommendations" and "posting_id" in row:
            posting = next((p for p in self.tables.get("postings", []) if p["id"] == row["posting_id"]), None)
            if posting:
                company = next((c for c in self.tables.get("companies", []) if c["id"] == posting.get("company_id")), None)
                row["postings"] = {"title": posting["title"], "companies": {"name": company["name"] if company else "Unknown"}}
        if table_name == "skill_gaps" and "skill_id" in row:
            skill = next((s for s in self.tables.get("skills", []) if s["id"] == row["skill_id"]), None)
            row["skills"] = {"name": skill["name"]} if skill else None
        return row


class FakeAuth:
    def __init__(self, user_id: str):
        self._user_id = user_id

    def get_user(self, token: str):
        if token != "valid-student-token":
            raise Exception("invalid token")
        return SimpleNamespace(user=SimpleNamespace(id=self._user_id))


class FakeClient:
    """Stands in for supabase.Client — enough surface for our code paths."""

    def __init__(self, db: FakeDB, user_id: str):
        self._db = db
        self.auth = FakeAuth(user_id)
        self.postgrest = SimpleNamespace(auth=lambda token: None)

    def table(self, name: str) -> FakeQuery:
        return self._db.table(name)


def build_mock_dataset() -> dict:
    """Representative rows mirroring the real SIH26044 schema shapes."""
    return {
        "profiles": [
            {"id": "student-1", "role": "student", "email": "asha@example.edu"},
        ],
        "students": [
            {
                "id": "student-1",
                "resume_url": "student-documents/student-1/resume.pdf",
                "linkedin_url": "https://linkedin.com/in/asha",
                "github_url": "https://github.com/asha",
                "portfolio_url": None,
                "bio": "Final year CSE student interested in backend + ML.",
                "domain_id": "domain-cs",
                "is_placed": False,
            }
        ],
        "academic_records": [
            {"student_id": "student-1", "semester": 6, "cgpa_till_date": 8.2, "backlogs": 0,
             "attendance_percentage": 91.4, "academic_year": "2025-2026"}
        ],
        "certifications": [
            {
                "id": "cert-1",
                "student_id": "student-1",
                "title": "AWS Cloud Practitioner",
                "issuing_organization": "Amazon Web Services",
                "credential_url": "https://aws.amazon.com",
                "is_verified": True,
                "created_at": "2026-01-15T10:00:00Z",
            },
        ],
        "skill_categories": [
            {"id": "cat-lang", "name": "Programming Languages"},
            {"id": "cat-cloud", "name": "Cloud & DevOps"},
        ],
        "skills": [
            {"id": "skill-python", "name": "Python", "category_id": "cat-lang"},
            {"id": "skill-sql", "name": "SQL", "category_id": "cat-lang"},
            {"id": "skill-cloud", "name": "Cloud Computing", "category_id": "cat-cloud"},
        ],
        "student_skills": [
            {"student_id": "student-1", "skill_id": "skill-python", "proficiency": "advanced",
             "proficiency_score": 85, "is_verified": True, "source": "institution_verified"},
            {"student_id": "student-1", "skill_id": "skill-sql", "proficiency": "intermediate",
             "proficiency_score": 55, "is_verified": False, "source": "student_added"},
            # skill-cloud intentionally absent -> a real gap
        ],
        "companies": [
            {"id": "company-1", "name": "Nimbus Analytics"},
        ],
        "postings": [
            {"id": "posting-1", "title": "Backend Developer Intern", "company_id": "company-1",
             "domain_id": "domain-cs", "type": "internship", "status": "open"},
            {"id": "posting-2", "title": "Data Analytics Intern", "company_id": "company-1",
             "domain_id": "domain-cs", "type": "internship", "status": "closed"},  # should be excluded
        ],
        "posting_required_skills": [
            {"posting_id": "posting-1", "skill_id": "skill-python", "required_level": 80, "importance": "high"},
            {"posting_id": "posting-1", "skill_id": "skill-sql", "required_level": 70, "importance": "medium"},
            {"posting_id": "posting-1", "skill_id": "skill-cloud", "required_level": 75, "importance": "high"},
        ],
        "recommendations": [],
        "skill_gaps": [],
    }


def build_mock_client(user_id: str = "student-1") -> FakeClient:
    db = FakeDB(build_mock_dataset())
    return FakeClient(db, user_id)
