from __future__ import annotations


def apply_to_posting(client, student_id: str, posting_id: str) -> dict:
    # Check that the posting exists and is open
    posting_result = (
        client.table("postings")
        .select("id,status")
        .eq("id", posting_id)
        .limit(1)
        .execute()
    )

    if not posting_result.data:
        raise ValueError("Posting not found")

    posting = posting_result.data[0]

    if posting.get("status") != "open":
        raise ValueError("This posting is not open for applications")

    # Prevent duplicate applications
    existing = (
        client.table("applications")
        .select("id,status")
        .eq("student_id", student_id)
        .eq("posting_id", posting_id)
        .limit(1)
        .execute()
    )

    if existing.data:
        raise ValueError("You have already applied to this posting")

    # Create application
    result = (
        client.table("applications")
        .insert(
            {
                "student_id": student_id,
                "posting_id": posting_id,
                "status": "applied",
            }
        )
        .execute()
    )

    if not result.data:
        raise ValueError("Failed to create application")

    application = result.data[0]

    return {
        "id": application["id"],
        "posting_id": application["posting_id"],
        "status": application["status"],
    }


def list_my_applications(client, student_id: str) -> list[dict]:
    result = (
        client.table("applications")
        .select(
            "id,posting_id,status,applied_at,updated_at,"
            "postings(title,companies(name))"
        )
        .eq("student_id", student_id)
        .order("applied_at", desc=True)
        .execute()
    )

    items = []

    for row in result.data or []:
        posting = row.get("postings") or {}
        company = posting.get("companies") or {}

        items.append(
            {
                "id": row["id"],
                "posting_id": row["posting_id"],
                "title": posting.get("title", ""),
                "company": company.get("name", ""),
                "status": row["status"],
                "applied_at": row.get("applied_at", ""),
                "updated_at": row.get("updated_at", ""),
            }
        )

    return items