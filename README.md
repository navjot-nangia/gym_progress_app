# Gym Progress App

A focused, mobile-first workout tracker for logging major lifts, working weight, sets, reps, and personal bests.

## Included lifts

- Bench Press
- Back Squat
- Deadlift
- Overhead Press
- Barbell Row
- Pull-up

## Features

- Quick weight additions: 1, 2.5, 5, 10, 25, and 45 lb
- Persistent workout history
- Personal-best indicators
- Sets and reps tracking
- Entry deletion
- Responsive mobile and desktop layout

## Development

```bash
pnpm install
pnpm run db:generate
pnpm run build
```

The app uses Next.js/Vinext, React, TypeScript, Tailwind CSS, Drizzle ORM, and Cloudflare D1.
