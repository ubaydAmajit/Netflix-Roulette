# NextFlix — a streaming roulette

Can't make up your mind for your next binge? We got your NextFlix!

Pick the streaming services you actually pay for, spin the wheel, and get one
thing to watch that's genuinely available to you in your region — with a
trailer.

## Running it

```bash
cd nextflix-web
npm install
cp .env.example .env.local
```
In .env.local

- `TMDB_ACCESS_TOKEN` — the v4 "API Read Access Token" (long `eyJ...` string). Preferred.
- `TMDB_API_KEY` — the v3 "API Key" (32-char hex).

Then `npm run dev` and open <http://localhost:3000>.