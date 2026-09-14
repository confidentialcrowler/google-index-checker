# Security Architecture & Hardening Controls

## 1. Server-Side Request Forgery (SSRF) Defense
Outbound HTTP requests during Technical SEO analysis and URL inspection are protected against SSRF:
- **Private IP Address Blocking**: Prohibits requests to `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`.
- **Cloud Metadata Protection**: Explicitly blocks `169.254.169.254` and `metadata.google.internal`.
- **DNS Rebinding Prevention**: Resolves domain to IP addresses before initiating TCP connections. If the resolved IP belongs to a private block, the request is terminated immediately.
- **Redirect Chain Validation**: Each redirect step is re-validated against the SSRF ruleset before following.

## 2. Excel & CSV Formula Injection Protection
When exporting user-controlled data (page titles, URLs, meta tags, and provider error messages) into spreadsheets:
- Cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized by prepending a single quote (`'`).
- Prevents remote command execution (DDE) and dynamic link injection in Microsoft Excel and Google Sheets.

## 3. Rate Limiting & Abuse Prevention
- **Application Level**: Token-bucket rate limiting restricts client IPs from flooding endpoints.
- **Provider Level**: Provider-specific quotas and requests/second ceilings prevent accidental API exhaustion or billing overages.

## 4. Sensitive Credential Isolation
- Google OAuth tokens and third-party API keys are stored exclusively on the server side and never sent to the client browser.
