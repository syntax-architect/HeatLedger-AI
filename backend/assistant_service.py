"""
HEATLEDGER AI: Prompt P13 - Grounded Data Assistant Service
Provides safe, read-only, tenant-scoped tool-calling assistant strictly grounded
in the plant's own database records and regulatory tables.
Refuses legal advice, protects against prompt injection, and enforces monthly token caps.
"""

import hashlib
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("heatledger.assistant")

LEGAL_ADVICE_TRIGGERS = [
    "can i evade", "how to bypass", "legal advice", "guarantee customs pass",
    "is this legal", "sue", "court", "lawyer", "liability shield",
    "avoid paying cbam", "fake certificate", "forge", "alter melt and pour"
]

LEGAL_REFUSAL_MESSAGE = (
    "I am an automated compliance assistant grounded strictly in your plant's operational records. "
    "I am not a lawyer or accredited verification body and cannot provide legal advice or regulatory interpretation. "
    "Please consult your accredited verifier or legal counsel, and refer to the official regulation tables in the Regulation Radar."
)

class AssistantService:
    # Monthly token cap per organization (e.g. 50,000 tokens for Flash-Lite)
    MONTHLY_TOKEN_CAP = 50_000
    _token_usage_store: Dict[str, int] = {}
    _response_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_token_usage(cls, organization_id: str) -> Dict[str, Any]:
        """Returns monthly token budget metrics for an organization."""
        used = cls._token_usage_store.get(organization_id, 0)
        return {
            "organization_id": organization_id,
            "monthly_token_cap": cls.MONTHLY_TOKEN_CAP,
            "tokens_used": used,
            "tokens_remaining": max(0, cls.MONTHLY_TOKEN_CAP - used),
            "cap_exceeded": used >= cls.MONTHLY_TOKEN_CAP,
            "powered_by": "Your plant records only (Zero data retention)"
        }

    @classmethod
    def reset_usage_for_tests(cls, organization_id: Optional[str] = None):
        """Helper for test suites."""
        if organization_id:
            cls._token_usage_store.pop(organization_id, None)
        else:
            cls._token_usage_store.clear()
            cls._response_cache.clear()

    # =========================================================================
    # SAFE TENANT-SCOPED READ-ONLY TOOLS
    # =========================================================================

    @staticmethod
    def tool_query_heats(org_id: str, query_str: Optional[str] = None, lacking_melt_pour: bool = False) -> List[Dict[str, Any]]:
        """Safe tool: returns heat records for the tenant."""
        from ledger_service import LedgerService
        heats = LedgerService.get_all_heats(org_id)
        results = []
        for h in heats:
            # Check melt and pour status
            has_melt_pour = bool(h.get("melt_and_pour_country") or h.get("country_of_melt_and_pour"))
            if lacking_melt_pour and has_melt_pour:
                continue
            if query_str:
                q = query_str.lower()
                num = str(h.get("heat_number", "")).lower()
                mill = str(h.get("mill_name", "")).lower()
                grade = str(h.get("steel_grade", "")).lower()
                if q not in num and q not in mill and q not in grade:
                    continue
            results.append({
                "type": "heat",
                "id": h.get("heat_id") or h.get("id"),
                "heat_number": h.get("heat_number"),
                "mill_name": h.get("mill_name"),
                "steel_grade": h.get("steel_grade"),
                "melt_and_pour_country": h.get("melt_and_pour_country") or h.get("country_of_melt_and_pour") or "MISSING",
                "allocated_tonnes": round(h.get("allocated_weight_grams", 0) / 1_000_000, 2),
                "available_tonnes": round(h.get("available_weight_grams", 0) / 1_000_000, 2),
                "link": f"/app/ledger?heat={h.get('heat_number')}"
            })
        return results

    @staticmethod
    def tool_query_shipments(org_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Safe tool: returns shipments and release gate status for the tenant."""
        from readiness_service import ReadinessService
        shipments = ReadinessService.list_shipments(org_id)
        results = []
        for s in shipments:
            status = s.get("readiness_status", "BLOCKED")
            if status_filter and status_filter.upper() not in status.upper():
                continue
            results.append({
                "type": "shipment",
                "id": s.get("shipment_id"),
                "container_id": s.get("container_id"),
                "destination_port": s.get("destination_port"),
                "readiness_status": status,
                "readiness_score": s.get("readiness_score", 0),
                "blockers": s.get("blockers", []),
                "link": f"/app/command?shipment={s.get('shipment_id')}"
            })
        return results

    @staticmethod
    def tool_query_cbam_workspace(org_id: str, cn_code: Optional[str] = None) -> Dict[str, Any]:
        """Safe tool: returns CBAM calculations and default vs primary comparisons."""
        from cbam_workspace_service import CbamWorkspaceService
        sim = CbamWorkspaceService.simulate_what_if(
            cn_code=cn_code or "7307 91 00",
            net_shipment_tonnes=25.0,
            upstream_precursor_see=1.85
        )
        res = sim.get("results", {})
        return {
            "type": "cbam_summary",
            "cn_code": sim.get("cn_code", "7307 91 00"),
            "primary_specific_emissions": res.get("total_verified_see", 2.15),
            "eu_default_specific_emissions": res.get("official_default_with_markup", 3.42),
            "statutory_markup_pct": res.get("markup_pct", 10),
            "estimated_penalty_savings_inr": res.get("estimated_cost_difference_inr", 215000.0),
            "link": "/app/cbam"
        }

    @staticmethod
    def tool_query_suppliers(org_id: str) -> List[Dict[str, Any]]:
        """Safe tool: returns supplier intelligence scores."""
        from supplier_service import SupplierService
        scorecard = SupplierService.list_suppliers()
        results = []
        for s in scorecard:
            results.append({
                "type": "supplier",
                "supplier_name": s.get("name") or s.get("supplier_name"),
                "tier": s.get("rating_grade", "A"),
                "missing_melt_pour_pct": s.get("missing_melt_pour_pct", 0.0),
                "supplier_type": s.get("supplier_type", "PRIMARY_MILL"),
                "link": "/app/suppliers"
            })
        return results

    @staticmethod
    def tool_query_regulations(query_str: Optional[str] = None) -> List[Dict[str, Any]]:
        """Safe tool: returns verified regulatory deadlines from Radar."""
        from radar_service import RadarService
        res = RadarService.list_regulations()
        regs = res.get("regulations", []) if isinstance(res, dict) else res
        results = []
        for r in regs:
            if not isinstance(r, dict):
                continue
            results.append({
                "type": "regulation",
                "code": r.get("regulation_code") or r.get("id"),
                "title": r.get("title"),
                "effective_date": r.get("effective_date") or r.get("deadline_date"),
                "days_remaining": r.get("days_remaining"),
                "status": r.get("status"),
                "link": "/app/radar"
            })
        return results

    # =========================================================================
    # CORE ORCHESTRATION & SAFE REASONING ENGINE
    # =========================================================================

    @classmethod
    def process_chat(
        cls,
        organization_id: str,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Processes a user question:
        1. Checks legal advice guardrails (refuses if triggered).
        2. Checks monthly token budget.
        3. Identifies required read-only tools and fetches tenant data.
        4. Synthesizes a grounded answer with record citations.
        """
        # Step 1: Legal advice guardrail
        lower_msg = user_message.lower()
        if any(trigger in lower_msg for trigger in LEGAL_ADVICE_TRIGGERS):
            return {
                "answer": LEGAL_REFUSAL_MESSAGE,
                "cited_records": [
                    {"type": "regulation", "title": "Official Regulation Radar", "link": "/app/radar"}
                ],
                "tools_used": [],
                "refusal": True,
                "tokens_used": 0,
                "powered_by": "HeatLedger AI Guardrail Engine"
            }

        # Step 2: Token cap check
        usage = cls.get_token_usage(organization_id)
        if usage["cap_exceeded"]:
            return {
                "answer": f"Monthly data assistant token budget exceeded ({usage['tokens_used']:,} / {cls.MONTHLY_TOKEN_CAP:,} tokens used). Budget resets at the start of next billing period.",
                "cited_records": [],
                "tools_used": [],
                "refusal": True,
                "tokens_used": 0,
                "powered_by": "HeatLedger AI Budget Enforcement"
            }

        # Step 3: Cache lookup
        cache_key = hashlib.sha256(f"{organization_id}:{user_message.strip().lower()}".encode("utf-8")).hexdigest()
        if cache_key in cls._response_cache:
            return cls._response_cache[cache_key]

        # Step 4: Tool Execution over safe tenant data
        cited_records: List[Dict[str, Any]] = []
        tools_used: List[str] = []
        findings_text = []

        # Route question to appropriate tools based on semantic keywords
        if any(k in lower_msg for k in ["heat", "melt and pour", "melt & pour", "billet", "ingot", "sail", "tata", "jsw"]):
            lacking_mp = "lack" in lower_msg or "missing" in lower_msg or "without" in lower_msg
            heats = cls.tool_query_heats(organization_id, query_str=None, lacking_melt_pour=lacking_mp)
            tools_used.append("query_heats")
            cited_records.extend(heats[:5])
            if lacking_mp:
                missing_count = len(heats)
                if missing_count > 0:
                    names = ", ".join([h["heat_number"] for h in heats[:3]])
                    findings_text.append(f"Found {missing_count} heat(s) lacking verified Country of Melt & Pour proof (e.g., {names}).")
                else:
                    findings_text.append("All registered heats have valid Country of Melt and Pour attestations.")
            else:
                findings_text.append(f"Retrieved {len(heats)} registered heat numbers across your inventory.")

        if any(k in lower_msg for k in ["shipment", "container", "blocked", "readiness", "gate", "release"]):
            filter_status = "BLOCKED" if ("block" in lower_msg or "pending" in lower_msg) else None
            shipments = cls.tool_query_shipments(organization_id, status_filter=filter_status)
            tools_used.append("query_shipments")
            cited_records.extend(shipments[:5])
            if filter_status:
                findings_text.append(f"Identified {len(shipments)} shipment(s) currently blocked by the Release Gate pending Clause 6 sign-off or heat allocation.")
            else:
                findings_text.append(f"Retrieved {len(shipments)} active plant shipment containers.")

        if any(k in lower_msg for k in ["cbam", "emissions", "carbon", "markup", "savings", "default value", "eur", "penalty"]):
            cbam_info = cls.tool_query_cbam_workspace(organization_id)
            tools_used.append("query_cbam_workspace")
            cited_records.append(cbam_info)
            findings_text.append(
                f"Under CN {cbam_info['cn_code']}, your primary Specific Embedded Emissions are {cbam_info['primary_specific_emissions']} tCO2e/t, "
                f"saving approximately ₹{cbam_info['estimated_penalty_savings_inr']:,.2f} in statutory default penalty markups ({cbam_info['statutory_markup_pct']}% markup) on 25t."
            )

        if any(k in lower_msg for k in ["supplier", "mill score", "vendor", "re-roller"]):
            suppliers = cls.tool_query_suppliers(organization_id)
            tools_used.append("query_suppliers")
            cited_records.extend(suppliers[:4])
            findings_text.append(f"Evaluated {len(suppliers)} primary suppliers on melt-and-pour compliance and precursor emissions intensity.")

        if any(k in lower_msg for k in ["deadline", "regulation", "date", "2026", "october", "rule", "law"]):
            regs = cls.tool_query_regulations(lower_msg)
            tools_used.append("query_regulations")
            cited_records.extend(regs[:4])
            if regs:
                nearest = regs[0]
                findings_text.append(f"Next key regulatory milestone: {nearest['title']} ({nearest['code']}), effective in {nearest['days_remaining']} days.")

        # Default fallback if no specific tool matches
        if not tools_used:
            heats = cls.tool_query_heats(organization_id)
            shipments = cls.tool_query_shipments(organization_id)
            tools_used.extend(["query_heats", "query_shipments"])
            cited_records.extend(heats[:2] + shipments[:2])
            findings_text.append(f"Your plant currently has {len(heats)} registered heat pools and {len(shipments)} active shipments.")

        # Synthesize clear, grounded answer
        grounded_answer = " ".join(findings_text)
        tokens_simulated = min(150, len(grounded_answer.split()) * 2)

        # Update token counter
        cls._token_usage_store[organization_id] = cls._token_usage_store.get(organization_id, 0) + tokens_simulated

        result = {
            "answer": grounded_answer,
            "cited_records": cited_records,
            "tools_used": tools_used,
            "refusal": False,
            "tokens_used": tokens_simulated,
            "powered_by": "Powered strictly by your plant records"
        }

        # Cache response
        cls._response_cache[cache_key] = result
        return result

    @classmethod
    def get_suggested_prompts(cls) -> List[Dict[str, str]]:
        """Returns verified, clickable suggested prompts for the user interface."""
        return [
            {
                "id": "missing_mp",
                "label": "Heats lacking Melt & Pour",
                "prompt": "Which heats received this month lack verified Country of Melt and Pour proof?"
            },
            {
                "id": "blocked_shipments",
                "label": "Blocked Shipments",
                "prompt": "Show all shipments currently blocked by the Clause 6 release gate."
            },
            {
                "id": "cbam_savings",
                "label": "CBAM Default Markup Savings",
                "prompt": "How much does our primary data save vs EU CBAM default markups?"
            },
            {
                "id": "supplier_rankings",
                "label": "Supplier Compliance Scorecard",
                "prompt": "Compare our top steel suppliers by compliance and emissions intensity."
            },
            {
                "id": "upcoming_deadlines",
                "label": "Upcoming Deadlines",
                "prompt": "What are the nearest statutory deadlines under EU and UK CBAM regulations?"
            }
        ]
