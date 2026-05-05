# Portfolio

Astro static site configured for Vercel's free deployment flow.

## Node Version

This project targets Node 24. If you use `nvm`, run:

```sh
nvm install
nvm use
```

## Commands

| Command                | Action                                         |
| :--------------------- | :--------------------------------------------- |
| `npm install`          | Install dependencies                           |
| `npm run dev`          | Start the local dev server at `localhost:4321` |
| `npm run check`        | Run Astro type and diagnostics checks          |
| `npm run build`        | Run checks and build the site into `dist/`     |
| `npm run preview`      | Preview the production build locally           |
| `npm run lint`         | Run ESLint                                     |
| `npm run format:check` | Check Prettier formatting                      |

## Vercel Deployment

Astro builds the portfolio pages as static output and uses `@astrojs/vercel` for Vercel deployment. The site also exposes `/api/ip` as a small serverless endpoint for visitor IP detection, so deployments can use Vercel Functions runtime and quota even though the main pages are static.

When importing the repository in Vercel, keep the auto-detected Astro settings:

| Setting          | Value                           |
| :--------------- | :------------------------------ |
| Framework Preset | Astro                           |
| Install Command  | `npm install` or Vercel default |
| Build Command    | `npm run build`                 |
| Output Directory | `dist`                          |

The production build runs `astro check` before `astro build`, so Vercel fails early on Astro or TypeScript issues instead of deploying a broken site.
