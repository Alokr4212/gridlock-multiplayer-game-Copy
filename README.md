# Gridlock — Multiplayer Tic-Tac-Toe

A responsive, dark-themed Tic-Tac-Toe game built with React, Vite, and Supabase. Two people can play from separate devices using a room code or shareable link.

## Features

- Create a room and share its code/link.
- Join a room from another device.
- Live board updates through Supabase Realtime, with polling as a fallback.
- Turn enforcement in the UI, win/draw detection, highlighted winning cells, and rematches.
- Responsive layout for desktop and mobile.

## Beginner setup

### 1. Install Node.js

Install the current LTS version from [nodejs.org](https://nodejs.org/). Then open a terminal in this project folder.

### 2. Create a Supabase project

1. Visit [Supabase](https://supabase.com/dashboard) and create a free project.
2. Open **SQL Editor** in your Supabase project.
3. Open `supabase.sql` from this project, copy all of it, paste it into the SQL Editor, and run it.
4. In **Project Settings → API** (or **Data API** / **API Keys**, depending on dashboard version), copy the Project URL and the publishable/anon key.

**Security note:** The SQL policies are intentionally open to make a beginner demo easy to run. Anyone with the room code can potentially read or alter room state. This is suitable only for a public demo with no private information. For production, move game actions behind trusted server-side logic and enforce player/turn/win rules there.

### 3. Add your environment variables

Copy `.env.example` to a new file named `.env` in the project root. Replace the placeholders:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the public publishable/anon key only. Never put a Supabase `service_role` or secret key in a browser app. The `.env` file should not be committed to Git.

### 4. Run it locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

To test multiplayer, open the URL in two different browser profiles or devices. Create a room in one, then open the invite link or enter the room code on the other.

### 5. Build the production bundle

```bash
npm run build
npm run preview
```

Vite writes the deployable site to `dist/`.

## Publish it on the internet

### Option A: Vercel

1. Push this project to a GitHub repository. Do not commit `.env`.
2. Import the repository at [vercel.com](https://vercel.com/).
3. Set the framework preset to **Vite** if it is not detected automatically.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under the project's Environment Variables.
5. Deploy. Vercel will provide a public `https://...vercel.app` URL.

### Option B: Netlify

1. Push the project to GitHub and import it at [netlify.com](https://www.netlify.com/).
2. Set **Build command** to `npm run build` and **Publish directory** to `dist`.
3. Add the same two environment variables in Site configuration.
4. Deploy and open the public URL.

If you change environment variables, trigger a new deployment. Share the public URL plus a room code/invite link with your friend.

## Important behavior and limitations

- The room record persists in Supabase, so a player can join later with the same code.
- Realtime updates require the `ttt_rooms` table to be enabled in Supabase Realtime. The app polls every 2.5 seconds as a fallback.
- This is a learning project, not a cheat-resistant competitive game. Game rules are checked in the client and the starter database policies are permissive. A production version should use server-side transactional moves, authenticated player membership, room expiry, and stricter row-level security.
- The invite URL is based on the currently deployed site origin and includes `?room=ROOMCODE`.

## Troubleshooting

- **Setup page says to add credentials:** check that `.env` exists in the project root and the variable names match exactly; restart `npm run dev` after changing it.
- **Room not found:** verify the code and confirm the SQL setup ran in the same Supabase project as your environment variables.
- **Updates are delayed:** enable Realtime for `public.ttt_rooms` in Supabase's dashboard.
- **Deployment shows a blank page:** check the build logs and confirm the two environment variables are set for the deployment environment.
