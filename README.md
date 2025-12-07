# QIX

A modern web implementation of the classic 1981 arcade game Qix.

## Gameplay

Claim territory by drawing lines across the playing field. Avoid the Qix (the abstract geometric enemy bouncing around) and the Sparx (enemies that patrol the border). Claim 75% of the field to advance to the next level.

**Controls:**
- **Arrow keys / WASD** — Move
- **Hold Shift** — Slow draw mode (2× points)
- **Space / Enter** — Start / Pause
- **Escape** — Pause

## Features

- Classic Qix mechanics with polygon-based territory claiming
- Multiple Qixes with unique colors and movement patterns at higher levels
- Sparx that patrol the border
- Fuse mechanic when standing still while drawing
- Slow draw mode for bonus points
- Local highscore leaderboard
- Responsive canvas that adapts to window size
- Touch support for mobile play

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- HTML5 Canvas

## Run Locally

```bash
npm install
npm run dev
```

## Environment Variables

For highscore persistence, set up a [Turso](https://turso.tech) database:

```
TURSO_DB=libsql://your-database.turso.io
TURSO_TOKEN=your-auth-token
```

## License & Acknowledgements

MIT License (c) Claude Opus 4.5

Thanks to David Pomerenke for his helpful feedback during development.
