from app.services.video import create_jitsi_room


def test_room_has_sesion_video_id():
    room = create_jitsi_room()
    assert "sesion_video_id" in room
    assert room["sesion_video_id"].startswith("saludos-")


def test_room_url_uses_jitsi():
    room = create_jitsi_room()
    assert room["url"] == f"https://meet.jit.si/{room['sesion_video_id']}"


def test_two_rooms_have_different_ids():
    assert create_jitsi_room()["sesion_video_id"] != create_jitsi_room()["sesion_video_id"]
