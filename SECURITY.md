# Secrets Handling
- Never commit real secrets. Keep `.env` local-only; use `.env.example` as a template.
- Rotate credentials if `.env` was previously tracked or shared.
- Ensure `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET`, and `QPAY_WEBHOOK_SECRET` are set in every environment.
