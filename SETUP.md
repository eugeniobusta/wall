# Setting up your own Wall

About 45 minutes from nothing to a wall that updates when you talk to it. Every step says exactly where to click.

If you use [Claude Code](https://claude.com/claude-code), open this folder in it and say "set this project up following SETUP.md".
It can do steps 1, 2, 4 and 5 for you through the Supabase and Vercel tools, and will ask you for the parts that need your logins.

## What you need

* A projector with an HDMI input, and a pale wall or a whiteboard
* A computer that stays near the projector to show the wall page (a Mac in this guide)
* A free [Supabase](https://supabase.com) account and a free [Vercel](https://vercel.com) account
* Node 20 or newer
* Optional: an [Anthropic API key](https://console.anthropic.com) for the Ask field and Siri
* Optional: a Mac with Xcode command line tools (`xcode-select --install`) for Apple Calendar and Reminders

## 1. Supabase

1. Create a new project. Pick the region closest to you.
2. Open `supabase/schema.sql`, replace `you@example.com` (it appears twice) with the email you will sign in with.
3. In the dashboard: **SQL Editor → New query**, paste the file, **Run**.
4. **Authentication → Users → Add user → Create new user.** Enter the same email and a strong password, and tick **Auto Confirm User**. This is the login for your wall.
5. **Authentication → Sign In / Providers.** Turn off **Allow new users to sign up** and save.
6. **Project Settings → API Keys.** Keep this page open. You need the project URL, the publishable key and the secret key in the next step.

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, the publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, the secret key |
| `ALLOWED_EMAIL` | The email from step 1 |
| `WALL_API_TOKEN` | Run `openssl rand -hex 24` and paste the result |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys. Set a monthly spend limit while you are there. |

Never commit this file. It is already in `.gitignore`.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/edit`, sign in, and add an item. Open `http://localhost:3000/wall` in a second window and watch it appear.

## 4. Deploy to Vercel

1. Push your fork to GitHub.
2. In Vercel: **Add New → Project**, import the repository. The framework is detected as Next.js.
3. **Settings → Environment Variables.** Add every variable from `.env.local` for Production and Preview. Mark the secret key, the Anthropic key and the token as sensitive.
4. Deploy. Add your own domain under **Settings → Domains** if you have one.

From now on every push to `main` deploys, and an open wall reloads itself when the new version is live.

## 5. Apple Calendar and Reminders (Mac)

```bash
cd agent && ./install.sh
```

The script builds Wall Agent, puts it in `~/Applications`, makes it start at login and launches it. macOS asks twice for
permission, once for Calendars and once for Reminders. Click **Allow** both times.

Check it worked: `tail ~/Library/Logs/WallAgent.log` should show `synced N events, M reminders`.

The agent has no window and no Dock icon. It syncs while the Mac is awake. If the wall says the calendar is stale, the Mac is asleep.

## 6. The projector

1. **Never connect a cheap projector to Wi-Fi.** Skip its setup screen. Many ship with malware. It only needs to be an HDMI screen.
2. Turn the projector on its side so the image is tall, and aim it at the board.
3. Connect the computer to the projector with an HDMI cable (USB-C to HDMI on a recent Mac) and select the HDMI input on the projector.
4. On the Mac: **System Settings → Displays**, select the projector, set **Rotation** to 90° (or 270° if the picture is upside down). Make sure the displays are not mirrored, so the projector is its own extra screen.
5. Run `display/install.sh https://your-domain/wall`. It creates **Wall Display** in `~/Applications`.
6. Open **Wall Display**. A plain window with the wall opens. Sign in once.
7. Drag that window onto the projector screen and press **Control + Command + F** to make it full screen.
8. Focus the lens.
9. On your phone open the app, **Settings → Alignment → Adjust corners**, and drag the four corners until the image sits square on the board.

Wall Display keeps the screen awake for as long as its window is open. To make it start by itself, add it under **System Settings → General → Login Items**.

## 7. The phone

1. Open your wall's address in Safari and sign in.
2. Tap **Share → Add to Home Screen**. From now on open it from the icon. It runs full screen like any other app.

## 8. Siri

In the **Shortcuts** app tap **+** and add these four actions in order:

1. **Dictate Text**
2. **Get Contents of URL**
   * URL: `https://your-domain/api/command`
   * Tap **Show More**. Method: **POST**
   * Headers: add `Authorization` with the value `Bearer ` followed by your `WALL_API_TOKEN`
   * Request Body: **JSON**. Add a field named `text` and set its value to the **Dictated Text** variable
3. **Get Dictionary Value**. Key: `reply`
4. **Speak Text**. Input: the **Dictionary Value**

Name the shortcut **Wall**. Then say "Hey Siri, Wall", wait for the prompt, and say "add gym tomorrow at six" or "goodnight".

## When something is off

| What you see | What to do |
| --- | --- |
| The wall says the calendar was last synced hours ago | Wake the Mac, or open Wall Agent from `~/Applications` |
| The app says the session expired | Sign in again. It then stays signed in |
| Ask answers with a Claude API error | The Anthropic key is missing or out of credit, or `WALL_MODEL` names a model that no longer exists |
| The image does not fit the board | **Settings → Alignment** in the app, or move the projector |
| The wall is black | Check the **Wall** switch on the Wall tab and the quiet hours in Settings |
