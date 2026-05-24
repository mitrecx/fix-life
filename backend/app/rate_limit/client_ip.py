"""Extract client IP from proxied HTTP requests."""


def get_client_ip(
    *,
    x_forwarded_for: str | None,
    x_real_ip: str | None,
    direct_host: str | None,
) -> str | None:
    """Prefer the first public IP from X-Forwarded-For, then X-Real-IP, then direct peer."""
    if x_forwarded_for:
        first = x_forwarded_for.split(",")[0].strip()
        if first:
            return first
    if x_real_ip and x_real_ip.strip():
        return x_real_ip.strip()
    if direct_host:
        return direct_host
    return None
