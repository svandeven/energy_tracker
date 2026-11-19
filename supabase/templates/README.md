# Auth email templates

Branded versions of the emails Supabase Auth sends. They live in the Supabase
dashboard, not in code, so changes here have to be pasted in by hand:
**Authentication → Emails → Templates**.

| Dashboard template   | File                  | Subject                                                                                       |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Confirm sign up      | `confirm-signup.html` | `{{ if eq (print .Data.locale) "nl" }}Bevestig je Lekker Bezig-account{{ else }}Confirm your Sun Steps account{{ end }}` |
| Reset password       | `reset-password.html` | `{{ if eq (print .Data.locale) "nl" }}Nieuw wachtwoord voor Lekker Bezig{{ else }}Reset your Sun Steps password{{ end }}` |
| Change email address | `change-email.html`   | `{{ if eq (print .Data.locale) "nl" }}Bevestig je nieuwe e-mailadres{{ else }}Confirm your new Sun Steps email{{ end }}` |

Each template picks Dutch or English from `locale` in the user metadata, which
the app sets at sign-up (`AuthProvider.signUp`). Accounts created before that,
or through Apple/Google, have no `locale` and get English.

The reset email keeps the 6-digit `{{ .Token }}`: the app's recovery screen
accepts either the code or the pasted link.

## Sender

Supabase's built-in mailer always sends as `Supabase Auth
<noreply@mail.app.supabase.io>` and is rate-limited, so the sender comes from
custom SMTP: **Authentication → Emails → SMTP Settings**.

Resend, with sunsteps.eu verified in region eu-west-1. The DNS records
(DKIM `resend._domainkey`, MX and SPF on `send`, CNAME `rsend`) are in
Cloudflare; the root SPF and DMARC records are untouched because Resend sends
from the `send` subdomain.

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Host          | `smtp.resend.com`                                      |
| Port          | `465`                                                  |
| Username      | `resend`                                               |
| Password      | a Resend API key with sending access to sunsteps.eu, typed into the dashboard only |
| Sender email  | `hello@sunsteps.eu`                                    |
| Sender name   | `Sun Steps`                                            |

With custom SMTP, Supabase also caps sign-up emails per hour: raise
**Authentication → Rate Limits → Rate limit for sending emails** if testing hits
"email rate limit exceeded". A wrong port makes sign-up hang until the gateway
returns 504 rather than failing with an SMTP error.

After saving, sign up with a test address in both languages and check the
sender, subject and button link.
