"""
Builds the deterministic text document that gets embedded for a student.

Deliberately NOT raw database JSON — a stable, human-readable document
whose exact text only changes when something meaningful about the
student's profile changes. Stable ordering (skills and certifications are
always sorted the same way) is what makes content-hash-based
"skip if unchanged" caching in embedding_service.py actually work.
"""
from __future__ import annotations


def build_profile_document(
    *,
    domain_name: str | None,
    bio: str | None,
    matched_skill_names: list[str],
    academic_record: dict | None,
    certification_titles: list[str],
    resume_extracted_text: str | None,
) -> str:
    lines: list[str] = ["Student Profile", ""]

    lines.append("Domain:")
    lines.append(domain_name or "Not specified")
    lines.append("")

    if bio:
        lines.append("Bio:")
        lines.append(bio.strip())
        lines.append("")

    lines.append("Skills:")
    # Stable ordering: case-insensitive alphabetical, de-duplicated.
    unique_sorted_skills = sorted({s.strip() for s in matched_skill_names if s.strip()}, key=str.lower)
    if unique_sorted_skills:
        lines.extend(unique_sorted_skills)
    else:
        lines.append("None recorded")
    lines.append("")

    if academic_record:
        lines.append("Academic:")
        cgpa = academic_record.get("cgpa_till_date")
        year = academic_record.get("academic_year")
        if cgpa is not None:
            lines.append(f"CGPA: {cgpa}")
        if year:
            lines.append(f"Academic year: {year}")
        lines.append("")

    lines.append("Certifications:")
    unique_sorted_certs = sorted({c.strip() for c in certification_titles if c.strip()}, key=str.lower)
    if unique_sorted_certs:
        lines.extend(unique_sorted_certs)
    else:
        lines.append("None recorded")
    lines.append("")

    if resume_extracted_text:
        lines.append("Resume:")
        lines.append(resume_extracted_text.strip())

    return "\n".join(lines).strip()
