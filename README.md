# Portfolio

Astro static site configured for Vercel's free deployment flow.

## Commands

| Command                | Action                                            |
| :--------------------- | :------------------------------------------------ |
| `npm install`          | Install dependencies                              |
| `npm run dev`          | Start the local dev server at `localhost:4321`    |
| `npm run check`        | Run Astro type and diagnostics checks             |
| `npm run build`        | Run checks and build the static site into `dist/` |
| `npm run preview`      | Preview the production build locally              |
| `npm run lint`         | Run ESLint                                        |
| `npm run format:check` | Check Prettier formatting                         |

## Vercel Deployment

Astro builds static output by default, and `astro.config.mjs` keeps that target explicit with `output: 'static'`. This is the best fit for Vercel's free tier because it does not require the Vercel adapter, serverless functions, or edge functions.

When importing the repository in Vercel, keep the auto-detected Astro settings:

| Setting          | Value                           |
| :--------------- | :------------------------------ |
| Framework Preset | Astro                           |
| Install Command  | `npm install` or Vercel default |
| Build Command    | `npm run build`                 |
| Output Directory | `dist`                          |

The production build runs `astro check` before `astro build`, so Vercel fails early on Astro or TypeScript issues instead of deploying a broken site.
