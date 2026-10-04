# Local Presidio boundary

The analyzer detects text PII; the Next.js server applies replacements locally
and never stores the original transcript. The image redactor uses OCR to cover
PII before a frame can reach the vision model. Both bind to localhost so other
LAN devices cannot call them.

```powershell
docker compose -f services/presidio/compose.yml up -d
```

Then set these values in `.env.local` and restart Next.js:

```dotenv
PRESIDIO_ANALYZER_URL=http://127.0.0.1:5002
FRAME_REDACTION_MODE=presidio
FRAME_REDACTION_URL=http://127.0.0.1:5003/redact
```

For a real deployment, pin `PRESIDIO_VERSION` to a reviewed release, place the
containers on a private network, require service authentication at the ingress,
and do not expose either container publicly.

Stop it with:

```powershell
docker compose -f services/presidio/compose.yml down
```
