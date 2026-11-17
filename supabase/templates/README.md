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

Microsoft 365 (sunsteps.eu):

| Field         | Value                                        |
| ------------- | -------------------------------------------- |
| Host          | `smtp.office365.com`                         |
| Port          | `587`                                        |
| Username      | the mailbox that sends, e.g. `hello@sunsteps.eu` |
| Password      | that mailbox's password, typed into the dashboard only |
| Sender email  | the same address, or an alias it can send as |
| Sender name   | `Sun Steps`                                  |

The mailbox needs **Authenticated SMTP** turned on (Microsoft 365 admin
center → Users → the user → Mail → Manage email apps). Microsoft is retiring
password-based SMTP AUTH for Exchange Online, so this may stop working; Resend
or another transactional provider is the longer-term option.

After saving, sign up with a test address in both languages and check the
sender, subject and button link.
