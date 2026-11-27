"""
HEATLEDGER AI: WhatsApp & Email Intake Webhooks and Config Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import base64
import json
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from dependencies import get_current_user
    from intake_service import IntakeService, WHATSAPP_VERIFY_TOKEN
except ImportError:
    from backend.dependencies import get_current_user
    from backend.intake_service import IntakeService, WHATSAPP_VERIFY_TOKEN

router = APIRouter(tags=["Intake & Webhooks"])


class WhatsAppPairingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plant_id: str = Field(default="plant-howrah-01", max_length=100)
    user_id: Optional[str] = Field(default="usr_owner_01", max_length=100)


class EmailConfigUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plant_id: str = Field(default="plant-howrah-01")
    allow_list: List[str] = Field(default_factory=list)
    is_active: bool = True


@router.get("/api/webhooks/whatsapp")
def verify_whatsapp_webhook(request: Request):
    hub_mode = request.query_params.get("hub.mode")
    hub_verify_token = request.query_params.get("hub.verify_token")
    hub_challenge = request.query_params.get("hub.challenge")
    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/api/webhooks/whatsapp")
async def handle_whatsapp_webhook(request: Request):
    raw_body = await request.body()
    sig_header = request.headers.get("X-Hub-Signature-256")
    if sig_header and not IntakeService.verify_webhook_signature(raw_body, sig_header):
        raise HTTPException(status_code=403, detail="Invalid WhatsApp signature")

    try:
        data = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if data.get("object") == "whatsapp_business_account" and "entry" in data:
        results = []
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                for msg in change.get("value", {}).get("messages", []):
                    msg_id = msg.get("id", str(uuid.uuid4()))
                    sender = msg.get("from", "")
                    msg_type = msg.get("type", "text")
                    text_body = msg.get("text", {}).get("body", "") if msg_type == "text" else (
                        "Image MTC" if msg_type == "image" else ("Document MTC" if msg_type == "document" else None)
                    )
                    media_fname = msg.get("document", {}).get("filename", "certificate.pdf") if msg_type == "document" else None
                    results.append(IntakeService.process_whatsapp_inbound(
                        sender_phone=sender, message_id=msg_id, message_type=msg_type,
                        text_body=text_body, media_bytes=None, media_filename=media_fname,
                    ))
        return {"status": "ok", "processed": len(results), "events": results}

    sender_phone = data.get("sender_phone") or data.get("from") or "+919876543210"
    message_id = data.get("message_id") or data.get("id") or f"wamid_{uuid.uuid4().hex[:12]}"
    message_type = data.get("message_type") or data.get("type") or "text"
    text_body = data.get("text_body") or data.get("body")
    media_b64 = data.get("media_base64")
    media_filename = data.get("media_filename")

    media_bytes = None
    if media_b64:
        try:
            media_bytes = base64.b64decode(media_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid media_base64 payload")

    return IntakeService.process_whatsapp_inbound(
        sender_phone=sender_phone, message_id=message_id, message_type=message_type,
        text_body=text_body, media_bytes=media_bytes, media_filename=media_filename,
    )


@router.post("/api/webhooks/email-in")
async def handle_email_inbound(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    sender_email = data.get("sender_email") or data.get("from")
    recipient_email = data.get("recipient_email") or data.get("to")
    if not sender_email or not recipient_email:
        raise HTTPException(status_code=422, detail="Both sender_email and recipient_email are required")

    return IntakeService.process_email_inbound(
        sender_email=sender_email, recipient_email=recipient_email,
        subject=data.get("subject", "Mill Certificate"),
        attachments=data.get("attachments", []),
        html_body=data.get("html_body") or data.get("html"),
        plain_body=data.get("plain_body") or data.get("text"),
        external_id=data.get("external_id") or data.get("message_id"),
    )


@router.post("/api/intake/whatsapp/generate-pairing-code")
def generate_whatsapp_pairing(payload: WhatsAppPairingRequest, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    resolved_plant = payload.plant_id or current_user.get("plant_id") or "default_plant"
    return IntakeService.generate_pairing_code(
        user_id=current_user.get("user_id", payload.user_id),
        organization_id=org_id, plant_id=resolved_plant,
    )


@router.get("/api/intake/whatsapp/pairings")
def list_whatsapp_pairings(plant_id: Optional[str] = None, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    return {"pairings": IntakeService.get_whatsapp_pairings(organization_id=org_id, plant_id=plant_id)}


@router.delete("/api/intake/whatsapp/pairings/{pairing_id}")
def unlink_whatsapp_pairing(pairing_id: str, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    if not IntakeService.unlink_whatsapp(organization_id=org_id, pairing_id=pairing_id):
        raise HTTPException(status_code=404, detail="Pairing not found or unauthorized")
    return {"status": "success", "pairing_id": pairing_id, "message": "Phone number unlinked successfully"}


@router.get("/api/intake/email/config")
def get_email_intake_config(plant_id: Optional[str] = None, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    resolved_plant = plant_id or current_user.get("plant_id") or "default_plant"
    return IntakeService.get_or_create_plant_config(plant_id=resolved_plant, organization_id=org_id)


@router.post("/api/intake/email/config")
def update_email_intake_config(payload: EmailConfigUpdateRequest, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    resolved_plant = payload.plant_id or current_user.get("plant_id") or "default_plant"
    return IntakeService.update_email_config(
        plant_id=resolved_plant, organization_id=org_id,
        allow_list=payload.allow_list, is_active=payload.is_active,
    )


@router.get("/api/intake/budget")
def get_intake_budget(plant_id: Optional[str] = None, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    resolved_plant = plant_id or current_user.get("plant_id") or "default_plant"
    return IntakeService.get_budget_status(plant_id=resolved_plant, organization_id=org_id)


@router.get("/api/intake/inbound-log")
def get_intake_inbound_log(plant_id: Optional[str] = None, limit: int = 50, current_user=Depends(get_current_user)):
    org_id = current_user.get("organization_id") or current_user.get("org_id")
    return {"logs": IntakeService.get_inbound_log(organization_id=org_id, plant_id=plant_id, limit=min(limit, 100))}
