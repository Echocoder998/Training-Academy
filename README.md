# MCE Sales Academy (self-hosted)

The self-hosted version of MCE Sales Academy, a training app for industrial sales. It has courses and video lessons, quizzes, AI customer role-play by **voice (ElevenLabs, inside the app)** or chat, spec challenges, learning paths by role, certificates, and a team results dashboard. It's styled to match mceautomation.com: Libre Franklin type, MCE red `#ED1B30`, black navigation, charcoal bands and bold uppercase headings.

**Stack:** Next.js 16 · Neon Postgres + Drizzle · Auth.js with Microsoft sign-in · **Anthropic Claude** for all AI · ElevenLabs React SDK for voice · Vercel Blob for video · hosted on Vercel.

---

## Test mode (no sign-in)

When no sign-in method is configured, the app runs in **test mode**:
- Anyone with the link can use it, with no login.
- Each browser gets its own tester profile and progress.
- Everyone has admin access (Manage + Team Results).
- Testers can set their name on **My Progress** so Team Results shows who's who.
- A red **Test mode** badge shows in the header.

**Sign-in turns on automatically** when you add `ACCESS_CODE` (and optionally `ALLOWED_EMAIL_DOMAINS`) or the Microsoft Entra ID settings in Vercel and redeploy. At that point, `ADMIN_EMAILS` decides who's an admin.

While in test mode, share the link only with your testers. Anyone who has it can use your Anthropic and ElevenLabs credits.

## What's in the box

| Area | What it does |
| --- | --- |
| **Courses** (`/`) | Role picker, learning path progress and due date, and course cards with gauge-style progress. 11 courses are pre-loaded. |
| **Lessons** | Video (uploaded or linked), key points, and a quiz scored **on the server** so answers can't be faked. |
| **Practice** (`/practice`) | 6 customer scenarios. **Voice** runs the ElevenLabs agent inside the page, then grades the transcript. **Chat** is typed role-play with a streaming AI customer. Both save every call. |
| **Spec challenges** | "What would you quote?" questions, checked on the server. |
| **My Progress** | Lessons, practice calls and certificates. |
| **Team Results** (`/admin`) | Everyone's path, quiz scores, call scores and spec results. Click any call to read its transcript and grading. You can promote people to admin here. |
| **Manage** (`/admin/content`) | Add or edit courses, lessons (video upload, plus the AI "write 4 questions" button), scenarios, spec challenges and learning paths. |

---

## 1. Run it on your computer (about 15 minutes)

You need **Node.js 20 or newer**.

```bash
cd mce-sales-academy
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in at least these:

- `DATABASE_URL`: create a free project at **neon.tech** and copy the **pooled** connection string.
- `AUTH_SECRET`: run `npx auth secret` and paste the value.
- `AUTH_DEV_LOGIN="true"`: lets you sign in locally by typing an email. It only works in local dev and is ignored in production.
- `ADMIN_EMAILS`: your email, so you get Manage and Team Results.

Then create the tables, load the content and start the app:

```bash
npx drizzle-kit push      # creates the tables in Neon
npm run db:seed           # adds the starter courses, lessons, quizzes, scenarios, specs, paths
npm run dev               # open http://localhost:3000
```

AI chat, grading and voice need the keys in steps 3 and 4. Everything else works without them.

---

## 2. Microsoft sign-in (your IT team may need to do this)

1. Go to the **Azure portal**, then **Microsoft Entra ID → App registrations → New registration**.
2. Name it `MCE Sales Academy`. For account type, choose **Single tenant**.
3. Under **Redirect URI**, pick **Web** and enter:
   - `https://YOUR-DOMAIN/api/auth/callback/microsoft-entra-id`
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (for local testing)
4. Copy the **Application (client) ID** into `AUTH_MICROSOFT_ENTRA_ID_ID`.
5. Go to **Certificates & secrets → New client secret** and copy the **Value** into `AUTH_MICROSOFT_ENTRA_ID_SECRET`.
6. Copy the **Directory (tenant) ID** into `AUTH_MICROSOFT_ENTRA_ID_ISSUER` as `https://login.microsoftonline.com/<tenant-id>/v2.0`.

Once this is set, the sign-in page shows **Sign in with Microsoft**. Anyone listed in `ADMIN_EMAILS` becomes an admin the first time they sign in, and admins can promote others from Team Results.

---

## 3. AI: Anthropic Claude

All the AI runs on Claude. The only part that doesn't is the voice itself, which runs on ElevenLabs.

| Job | Model | Setting |
| --- | --- | --- |
| The role-play customer's replies (streamed, so they feel live) | Claude Haiku 5.5 | `ANTHROPIC_MODEL_FAST` |
| Grading calls and writing quiz questions (structured JSON output) | Claude Sonnet 5.5 | `ANTHROPIC_MODEL` |

1. Go to **console.anthropic.com → API keys → Create key**.
2. Paste it into `ANTHROPIC_API_KEY`.
3. Set a monthly spend limit under **Settings → Limits** so there are no surprises.

To switch models, change the two settings. Everything AI-related is in `src/lib/ai.ts`.

## 4. ElevenLabs voice (inside the app)

- `ELEVENLABS_AGENT_ID` is already set to your **MCE Sales Academy – Practice Customer** agent.
- **Recommended:** In ElevenLabs, go to **Developers → API keys**, create a key, and add it as `ELEVENLABS_API_KEY`. The app then starts each call with a private signed link. After that works, open your agent in ElevenLabs, go to **Security**, and turn on **Enable authentication**. That way, only your app can start calls and nobody can use your minutes from the public link.
- When a trainee starts a call, the app sends the agent the scenario number automatically, so the call starts in character.
- Scenario numbers must match between **Manage → Role-play & specs** and the agent's prompt in ElevenLabs.

---

## 5. Deploy to Vercel

The repo is already on GitHub. Each deploy creates or updates the database tables and adds any missing starter content (`vercel-build` script), so there's nothing to run by hand.

1. In **vercel.com**, go to **Add New → Project** and import `Echocoder998/Training-Academy`. Leave the framework set to Next.js.
2. **Database:** on the project page, go to **Storage → Create Database → Neon** and connect it. This adds `DATABASE_URL` automatically. You can also paste your own Neon URL.
3. **Video storage:** go to **Storage → Create → Blob** and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
4. Under **Settings → Environment Variables**, add the following:

   | Name | Value | Needed for |
   | --- | --- | --- |
   | `ANTHROPIC_API_KEY` | From console.anthropic.com | AI role-play, grading, quiz writer |
   | `ELEVENLABS_AGENT_ID` | `agent_9401m5wj7gdrfbzvrxvt8pjf939w` | Voice calls |
   | `ELEVENLABS_API_KEY` | Optional | Private voice sessions (see step 4 above) |

   That's all you need for **test mode**. When you're ready for sign-in, add `AUTH_SECRET` (from `npx auth secret`), `ACCESS_CODE`, `ALLOWED_EMAIL_DOMAINS` and `ADMIN_EMAILS`, or the Microsoft settings from step 2.

5. **Deployments → Redeploy** after connecting the database, so the tables get created and the content loads.

**Custom domain:** in Vercel, go to **Settings → Domains** and add something like `academy.yourcompany.com`.

## Branding

- Colors, type and spacing are all in `:root` at the top of `src/app/globals.css`.
- **Logo:** the header uses an "MCE | SALES ACADEMY" wordmark. To use the official logo, get the white SVG from marketing and put it in `public/brand/`. Then replace the wordmark block in `src/app/(app)/layout.tsx` with `<img src="/brand/your-logo.svg" alt="MCE" height={32} />`. Check with marketing before using MCE's logo and name in an internal tool.

---

## Moving from the claude.ai version

| | Old (claude.ai page) | New (self-hosted) |
| --- | --- | --- |
| Voice practice | Opens ElevenLabs in a new tab | **Runs inside the app**, then the transcript is graded and saved |
| Who's who | claude.ai accounts | Company Microsoft sign-in |
| Data | Artifact storage | Your Neon Postgres (you own it, and can back it up and query it) |
| AI | Claude via claude.ai | Claude via the Anthropic API (your key) |
| Video | 20 MB per file | Up to 2 GB per file (Vercel Blob) |
| Branding | Generic | MCE look and feel, on your own domain |
| Call review | Score only | Full transcript and coaching notes for managers |

**Content** (all 11 courses, 13 lessons with quizzes, 6 scenarios, 6 spec challenges and 3 paths) is in `src/db/seed-data.json` and loads with `npm run db:seed`. **Learner progress from the old version doesn't carry over.** Everyone starts fresh, which is usually fine for a launch.

**Suggested rollout:**
1. **Week 1:** Run it locally with Neon and your Anthropic key, test it, and edit content.
2. **Week 2:** Get IT's help with the Microsoft sign-in, then deploy to Vercel and pilot with 2–3 reps.
3. **Week 3:** Turn on ElevenLabs authentication, upload videos and roll out to the team. Keep the old claude.ai version until the pilot is signed off.

**Rough running costs:** Vercel Hobby or Pro ($0–20/mo), Neon free tier, Anthropic API (mostly Haiku for replies plus Sonnet for grading: usually a few dollars a month for a small team), and ElevenLabs conversation minutes on your plan.

---

## Useful commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run typecheck    # TypeScript check
npx drizzle-kit push # apply schema changes to the database
npm run db:seed      # add any missing starter content (never overwrites your edits)
npm run db:seed -- --reset   # put the starter items back to their original text
npm run db:studio    # browse the database in your browser
```

For local work you can also point `DATABASE_URL` at a plain local Postgres (`postgresql://...@localhost/...`). The app switches drivers automatically.
