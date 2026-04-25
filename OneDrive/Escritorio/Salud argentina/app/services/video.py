import uuid


def create_jitsi_room() -> dict:
    """
    Create a Jitsi Meet room with a unique session ID.

    Returns:
        dict: Room information with:
            - sesion_video_id: Unique room identifier (starts with "saludos-")
            - url: Full Jitsi Meet URL (https://meet.jit.si/{room_id})
    """
    room_id = f"saludos-{uuid.uuid4().hex[:12]}"
    return {
        "sesion_video_id": room_id,
        "url": f"https://meet.jit.si/{room_id}",
    }
