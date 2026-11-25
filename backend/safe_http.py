"""
HEATLEDGER AI: Safe Outbound HTTP & Webhook Security Wrapper (Prompt Pack v5 - Task 3.5)

Defends against SSRF, open outbound redirects, and internal cloud metadata probing:
1. Enforces HTTPS scheme only.
2. Restricts hostnames to an explicit static allowlist (Resend, Razorpay, Gemini, Cloudflare Turnstile, UK Trade Tariff).
3. Resolves DNS and rejects private RFC1918, loopback, link-local (169.254.169.254), multicast, or reserved IPs.
4. Enforces bounded timeouts, disables automatic cross-host redirects, and caps response body bytes.
"""

import ipaddress
import socket
from urllib.parse import urlparse
from typing import Dict, Optional, Tuple

import urllib.request
import urllib.error

ALLOWED_OUTBOUND_HOSTS = frozenset({
    "api.resend.com",
    "api.razorpay.com",
    "generativelanguage.googleapis.com",
    "challenges.cloudflare.com",
    "www.trade-tariff.service.gov.uk",
})

DEFAULT_TIMEOUT_SECONDS = 10.0
MAX_RESPONSE_BYTES = 2 * 1024 * 1024  # 2 MB


class SSRFBlockedError(ValueError):
    """Raised when an outbound HTTP target violates host allowlist or IP safety rules."""


def _is_forbidden_ip(ip_obj) -> bool:
    return (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_multicast
        or ip_obj.is_reserved
        or ip_obj.is_unspecified
    )


def validate_outbound_url(url: str, resolve_dns: bool = True) -> str:
    """
    Validates an outbound URL against:
    - HTTPS scheme only
    - No userinfo credentials in URL
    - Hostname strictly in ALLOWED_OUTBOUND_HOSTS
    - IP literal and DNS resolution checks blocking private/loopback/link-local addresses
    """
    if not url or not isinstance(url, str):
        raise SSRFBlockedError("Empty outbound URL.")

    parsed = urlparse(url.strip())
    if parsed.scheme.lower() != "https":
        raise SSRFBlockedError(f"Only HTTPS outbound requests are allowed (got {parsed.scheme!r}).")

    if parsed.username or parsed.password:
        raise SSRFBlockedError("URL credentials are not permitted.")

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        raise SSRFBlockedError("Missing hostname in outbound URL.")

    # Direct IP literal check before host allowlist
    try:
        literal_ip = ipaddress.ip_address(hostname)
        if _is_forbidden_ip(literal_ip):
            raise SSRFBlockedError(f"Blocked internal/reserved IP target: {hostname}")
    except ValueError:
        pass

    if hostname not in ALLOWED_OUTBOUND_HOSTS:
        raise SSRFBlockedError(f"Outbound host {hostname!r} is not on the approved allowlist.")

    if resolve_dns:
        try:
            addr_infos = socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM)
        except socket.gaierror as exc:
            raise SSRFBlockedError(f"Failed to resolve outbound host {hostname!r}.") from exc

        for _, _, _, _, sockaddr in addr_infos:
            resolved_ip = sockaddr[0]
            ip_obj = ipaddress.ip_address(resolved_ip)
            if _is_forbidden_ip(ip_obj):
                raise SSRFBlockedError(f"Resolved IP {resolved_ip} for {hostname!r} is in a restricted range.")

    return url.strip()


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SSRFBlockedError(f"Outbound HTTP redirects are disabled for SSRF safety (redirect to {newurl!r}).")


def safe_request(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[bytes] = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    max_bytes: int = MAX_RESPONSE_BYTES,
) -> Tuple[int, bytes]:
    """
    Executes an allowlisted, timeout-bounded HTTPS request with redirects disabled
    and response size strictly capped.
    """
    validated_url = validate_outbound_url(url, resolve_dns=True)
    req = urllib.request.Request(
        validated_url,
        data=body,
        headers=headers or {},
        method=method.upper(),
    )
    opener = urllib.request.build_opener(_NoRedirectHandler())
    with opener.open(req, timeout=min(timeout, 30.0)) as resp:
        data = resp.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise SSRFBlockedError(f"Response exceeded {max_bytes} byte limit.")
        return resp.status, data
