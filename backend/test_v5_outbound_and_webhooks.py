"""
Test Suite for Prompt Pack v5 Task 3.5: Outbound HTTP & SSRF Safety + Webhook Rejections
Covers:
1. Blocks HTTP (non-HTTPS), internal IPs (127.0.0.1, 10.0.0.1, 169.254.169.254), and arbitrary external hosts.
2. Permits allowlisted integration hosts when DNS resolves publicly.
3. Blocks URL userinfo credentials (@ smuggling).
"""

import pytest
from backend.safe_http import ALLOWED_OUTBOUND_HOSTS, SSRFBlockedError, validate_outbound_url


@pytest.mark.parametrize("bad_url", [
    "http://api.resend.com/emails",                   # Non-HTTPS
    "https://127.0.0.1/admin",                        # Loopback
    "https://169.254.169.254/latest/meta-data/",      # Cloud metadata SSRF
    "https://10.0.0.5:8080/internal",                 # RFC1918 private
    "https://192.168.1.1/router",                     # RFC1918 private
    "https://evil.example.com/steal",                 # Non-allowlisted domain
    "https://user:pass@api.resend.com/emails",        # URL userinfo smuggling
    "https://[::1]/local",                            # IPv6 loopback
    "",
])
def test_v5_3_5_ssrf_and_host_allowlist_blocks_bad_targets(bad_url):
    with pytest.raises(SSRFBlockedError):
        validate_outbound_url(bad_url, resolve_dns=False)


def test_v5_3_5_allows_approved_https_hosts():
    for host in ALLOWED_OUTBOUND_HOSTS:
        res = validate_outbound_url(f"https://{host}/v1/test", resolve_dns=False)
        assert res.startswith(f"https://{host}")
