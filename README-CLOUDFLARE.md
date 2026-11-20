# GAGA DJ — Cloudflare deployment

The site is deployed as a Cloudflare Worker with static Vite assets, Cloudflare D1 for content/admin data, and Cloudflare R2 for uploaded media.

## 1. Create Cloudflare resources

From the repository root, install dependencies and authenticate Wrangler:

```bash
npm install
npx wrangler login
npx wrangler d1 create gaga-dj-db
npx wrangler r2 bucket create gaga-dj-media
```

Copy the D1 `database_id` printed by the D1 create command into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`. Keep the bucket name exactly `gaga-dj-media`.

## 2. Configure secrets

Set a long random session-signing secret (at least 32 random bytes):

```bash
npx wrangler secret put ADMIN_SESSION_SECRET
```

Optionally set an initial administrator passcode as a Worker secret. If omitted, the administrator initializes a passcode once through the private Admin Studio:

```bash
npx wrangler secret put ADMIN_PASSCODE
```

Do not put either value in frontend code, Git, or `.env` files committed to the repository. The only authorized admin email is `gagadeejay31@gmail.com`.

## 3. Apply the database migration

```bash
npm run db:migrate:remote
```

For local development, use `npm run db:migrate:local`.

## 4. Build and deploy

```bash
npm run deploy
```

The Worker serves the Vite build and handles `/api/*` and `/uploads/*`. The admin session is an HttpOnly, Secure, SameSite cookie; content and inquiries are stored in D1; uploaded media is stored in R2.

## 5. Verify

- Open the deployed site and submit a test booking inquiry.
- Open the Admin Studio using the site's existing admin entry point.
- Initialize the admin passcode (first deployment only), then add a draft item, publish it, and upload an image/audio/video file.
- Confirm the item appears publicly only when published and the inquiry appears in the admin inbox.

## Notes

- Existing local JSON files and files in the old `uploads/` folder are not automatically copied to D1/R2. Import existing content/media before switching production traffic if those files contain data you need to keep.
- Cloudflare account resources and secrets must be created in your Cloudflare account. They cannot be provisioned from GitHub alone.
- `GEMINI_API_KEY` is not used by the current Worker routes. If a future server-side Gemini route is added, configure it with `npx wrangler secret put GEMINI_API_KEY`.
