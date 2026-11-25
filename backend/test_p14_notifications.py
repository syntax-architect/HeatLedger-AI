"""
Unit tests for Prompt P14: Notification Centre Service
"""

import pytest
try:
    from backend.db.connection import get_db_connection, set_tenant_context
except ImportError:
    from db.connection import get_db_connection, set_tenant_context
from notification_service import NotificationService, MAX_NOTIFICATIONS_PER_HOUR

TEST_ORG = "org_test_howrah_notifications"
TEST_USER = "user_qa_liluah_01"

@pytest.fixture(autouse=True)
def clean_db():
    set_tenant_context(org_id=TEST_ORG, is_service_role=True)
    NotificationService._init_db()
    with get_db_connection(org_id=TEST_ORG, is_service_role=True) as db:
        db.execute("DELETE FROM notifications WHERE organization_id = ?", (TEST_ORG,))
        db.execute("DELETE FROM notification_preferences WHERE organization_id = ?", (TEST_ORG,))
    yield
    set_tenant_context(None, None)

def test_notification_creation_and_rate_limiting():
    # 1. Create up to MAX_NOTIFICATIONS_PER_HOUR (10)
    for i in range(MAX_NOTIFICATIONS_PER_HOUR):
        notif = NotificationService.create_notification(
            organization_id=TEST_ORG,
            recipient_id=TEST_USER,
            title=f"Regulatory Alert #{i+1}",
            message=f"Statutory test message {i+1}",
            category="regulatory_deadline",
            severity="info"
        )
        assert notif is not None
        assert notif["notification_id"].startswith("notif_")
        assert notif["is_read"] is False

    # 2. 11th notification must be refused by rate limiter
    overflow_notif = NotificationService.create_notification(
        organization_id=TEST_ORG,
        recipient_id=TEST_USER,
        title="Spam Alert 11",
        message="Should be blocked by rate limiter",
        category="system_event",
        severity="info"
    )
    assert overflow_notif is None

def test_notification_read_lifecycle():
    # Create 3 notifications
    n1 = NotificationService.create_notification(TEST_ORG, "Alert 1", "Msg 1", recipient_id=TEST_USER)
    NotificationService.create_notification(TEST_ORG, "Alert 2", "Msg 2", recipient_id=TEST_USER)
    NotificationService.create_notification(TEST_ORG, "Alert 3", "Msg 3", recipient_id=TEST_USER)

    all_notifs = NotificationService.list_notifications(TEST_ORG)
    assert len(all_notifs) == 3

    # Mark n1 as read
    res = NotificationService.mark_as_read(TEST_ORG, n1["notification_id"])
    assert res is True

    unread = NotificationService.list_notifications(TEST_ORG, unread_only=True)
    assert len(unread) == 2
    assert all(n["notification_id"] != n1["notification_id"] for n in unread)

    # Mark all read
    updated_count = NotificationService.mark_all_read(TEST_ORG)
    assert updated_count == 2
    assert len(NotificationService.list_notifications(TEST_ORG, unread_only=True)) == 0

def test_user_preferences_lifecycle():
    # Default preferences
    prefs = NotificationService.get_preferences(TEST_ORG, TEST_USER)
    assert prefs["in_app"] is True
    assert prefs["email"] is True
    assert prefs["whatsapp"] is False

    # Update preferences
    updated = NotificationService.update_preferences(TEST_ORG, TEST_USER, {
        "in_app": True,
        "email": False,
        "whatsapp": True,
        "regulatory_deadlines": True,
        "signoff_alerts": False
    })

    assert updated["email"] is False
    assert updated["whatsapp"] is True
    assert updated["signoff_alerts"] is False

    # Verify persistence
    persisted = NotificationService.get_preferences(TEST_ORG, TEST_USER)
    assert persisted["whatsapp"] is True
    assert persisted["email"] is False
