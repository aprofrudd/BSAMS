"""Admin data pool service for Boxing Science reference groups."""

from typing import List


def get_admin_athlete_ids(client) -> List[str]:
    """
    Get all athlete IDs belonging to admin users.

    Queries the profiles table for users with role='admin',
    then returns all athlete IDs owned by those admin users.
    """
    # Find all admin user IDs
    admin_profiles = (
        client.table("profiles")
        .select("id")
        .eq("role", "admin")
        .execute()
    )

    if not admin_profiles.data:
        return []

    admin_user_ids = [p["id"] for p in admin_profiles.data]

    # Get all athletes belonging to admin users
    all_athlete_ids = []
    for admin_id in admin_user_ids:
        athletes = (
            client.table("athletes")
            .select("id")
            .eq("coach_id", admin_id)
            .execute()
        )
        all_athlete_ids.extend(a["id"] for a in athletes.data)

    return all_athlete_ids


def get_admin_athletes(client) -> list:
    """
    Get all athletes (with gender) belonging to admin users.

    Returns list of dicts with 'id' and 'gender' keys.
    """
    admin_profiles = (
        client.table("profiles")
        .select("id")
        .eq("role", "admin")
        .execute()
    )

    if not admin_profiles.data:
        return []

    admin_user_ids = [p["id"] for p in admin_profiles.data]

    all_athletes = []
    for admin_id in admin_user_ids:
        athletes = (
            client.table("athletes")
            .select("id, gender")
            .eq("coach_id", admin_id)
            .execute()
        )
        all_athletes.extend(athletes.data)

    return all_athletes
