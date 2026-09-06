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
        self._table_name = table_name
        self._db = db
        self._filters: list[tuple[str, object]] = []
        self._in_filters: list[tuple[str, list]] = []
        self._select_cols = None
        self._single = False
        self._order_col = None
        self._order_desc = False
        self._limit = None
        self._count_mode = None
        self._is_delete = False
        self._update_vals = None
        self.not_ = SimpleNamespace(is_=self._not_is)

    def _not_is(self, col, val):
        return self

    def select(self, cols, count=None):
        self._select_cols = cols
        self._count_mode = count
        return self

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def in_(self, col, vals):
        self._in_filters.append((col, list(vals)))
        return self

    def ilike(self, col, val):
        # Case-insensitive match in mock
        clean_val = str(val).strip("%")
        self._filters.append((col, clean_val))
        return self

    def delete(self):
        self._is_delete = True
        return self

    def update(self, vals):
        self._update_vals = vals
        return self

    def insert(self, rows):
        if isinstance(rows, dict):
            rows = [rows]
        for row in rows:
            self._db.tables.setdefault(self._table_name, []).append(dict(row))
        return FakeExecuteWrapper(FakeResult(data=rows))

    def single(self):
        self._single = True
        return self

    def maybe_single(self):
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

    def _matches_filters(self, r: dict) -> bool:
        for col, val in self._filters:
            if r.get(col) != val:
                return False
        for col, vals in self._in_filters:
            if r.get(col) not in vals:
                return False
        return True

    def execute(self):
        table_rows = self._db.tables.get(self._table_name, [])
        if self._is_delete:
            matched = [r for r in table_rows if self._matches_filters(r)]
            self._db.tables[self._table_name] = [r for r in table_rows if not self._matches_filters(r)]
            return FakeResult(data=matched)

        if self._update_vals:
            matched = []
            for r in table_rows:
                if self._matches_filters(r):
                    r.update(self._update_vals)
                    matched.append(dict(r))
            return FakeResult(data=matched)

        rows = [r for r in table_rows if self._matches_filters(r)]
        if self._order_col:
            rows = sorted(rows, key=lambda r: (r.get(self._order_col) is None, r.get(self._order_col)),
                          reverse=self._order_desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        resolved = [self._db.resolve(self._table_name, dict(r)) for r in rows]
        count = len(rows) if self._count_mode else None
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
        if table_name == "students":
            student_id = row.get("id")
            row["student_skills"] = [
                self.resolve("student_skills", dict(s))
                for s in self.tables.get("student_skills", [])
                if s.get("student_id") == student_id
            ]
            row["student_projects"] = [
                dict(p) for p in self.tables.get("student_projects", []) if p.get("student_id") == student_id
            ]
            row["academic_records"] = [
                dict(a) for a in self.tables.get("academic_records", []) if a.get("student_id") == student_id
            ]
            if row.get("domain_id"):
                domain = next((d for d in self.tables.get("domains", []) if d["id"] == row["domain_id"]), None)
                row["domains"] = {"name": domain["name"]} if domain else None
            if row.get("subdomain_id"):
                subdomain = next((s for s in self.tables.get("subdomains", []) if s["id"] == row["subdomain_id"]), None)
                row["subdomains"] = {"name": subdomain["name"]} if subdomain else None
            if row.get("interest_id"):
                field = next((f for f in self.tables.get("fields_of_interest", []) if f["id"] == row["interest_id"]), None)
                row["fields_of_interest"] = {"name": field["name"]} if field else None
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
        self.admin = SimpleNamespace(
            update_user_by_id=lambda uid, attributes=None, **kwargs: {
                "id": uid,
                "user_metadata": (attributes or {}).get("user_metadata", {})
            }
        )

    def get_user(self, token: str):
        if token != "valid-student-token":
            raise Exception("invalid token")
        return SimpleNamespace(user=SimpleNamespace(id=self._user_id))


class FakeStorageBucket:
    def __init__(self, name: str):
        self.name = name
        self.files = {}

    def upload(self, path, file_bytes, options=None):
        self.files[path] = file_bytes
        return {"Key": path}

    def remove(self, paths):
        for p in paths:
            self.files.pop(p, None)
        return [{"name": p} for p in paths]

    def create_signed_url(self, path, expires_in):
        return {"signedURL": f"https://mock-storage.local/{self.name}/{path}?token=mock"}


class FakeStorage:
    def __init__(self):
        self.buckets = {}

    def from_(self, bucket_name: str) -> FakeStorageBucket:
        if bucket_name not in self.buckets:
            self.buckets[bucket_name] = FakeStorageBucket(bucket_name)
        return self.buckets[bucket_name]


class FakeClient:
    """Stands in for supabase.Client — enough surface for our code paths."""

    def __init__(self, db: FakeDB, user_id: str):
        self._db = db
        self.auth = FakeAuth(user_id)
        self.postgrest = SimpleNamespace(auth=lambda token: None)
        self.storage = FakeStorage()

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
                "resume_url": "student-1/resumes/resume-1.pdf",
                "linkedin_url": "https://linkedin.com/in/asha",
                "github_url": "https://github.com/asha",
                "portfolio_url": None,
                "bio": "Final year CSE student interested in backend + ML.",
                "domain_id": "domain-cs",
                "subdomain_id": None,
                "interest_id": None,
                "is_placed": False,
                "onboarding_completed": True,
            }
        ],
        "resume_processing_jobs": [
            {
                "id": "job-1",
                "resume_id": "resume-1",
                "student_id": "student-1",
                "storage_path": "student-1/resumes/resume-1.pdf",
                "file_name": "Asha_Resume.pdf",
                "file_type": "pdf",
                "file_size": 102400,
                "status": "completed",
                "extracted_text": "Python SQL developer",
                "created_at": "2026-02-01T12:00:00Z",
                "updated_at": "2026-02-01T12:00:00Z",
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
                "credential_url": "student-1/proofs/aws_cert.pdf",
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
        "student_projects": [],
    }


def build_mock_client(user_id: str = "student-1") -> FakeClient:
    db = FakeDB(build_mock_dataset())
    return FakeClient(db, user_id)
