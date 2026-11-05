# Nevernote

**One note. One moment. A little piece of forever.**

Nevernote is a minimal public archive where each account can publish one note of up to 1,000 characters. Published notes are visible to everyone and cannot be edited or deleted through the app.

## What's included

- Responsive single-page interface
- Supabase email/password sign-up and sign-in
- Public archive, newest notes first
- One-note-per-account enforcement in Postgres
- Row Level Security (RLS) for public reads and authenticated inserts
- No client-facing update or delete policies

## Supabase project

The frontend is configured to use the Nevernote Supabase project in Frankfurt. It uses the project's **publishable** key, which is designed to be included in browser applications. Never put a Supabase service-role key in frontend code.

The `public.notes` table contains:
- `id`: generated UUID
- `user_id`: the authenticated account, unique
- `content`: note text (1–1,000 characters)
- `created_at`: submission timestamp

## Run locally

You can serve the folder with any static web server:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

1. Open the repository's **Settings**.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Wait for GitHub Pages to finish publishing and open the URL shown there.

## First-time sign-up

Create an account with your email and a password. If Supabase asks you to confirm your email, follow the confirmation link before signing in.

## Important limitation

The app and database permissions prevent ordinary users from editing or deleting notes through the public client API. The project owner and database administrators still have administrative control and can change or remove database records. So this is an immutable-by-design public app, not a promise that no administrator could ever delete data.

A unique database constraint is the final guard against multiple notes from the same account, even if someone bypasses the interface.
