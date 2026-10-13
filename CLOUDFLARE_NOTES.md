# Cloudflare deployment for ECHOS

ECHOS now includes a **Cloudflare Workers** adapter in `src/index.js`, the browser UI in `public/index.html`, and Wrangler configuration in `wrangler.jsonc`. The Python research prototype remains available locally and is not executed by Cloudflare.

## Existing Cloudflare Git deployment

The Cloudflare Git deployment command can remain:

```bash
npx wrangler deploy
```

Keep the **root directory** as the repository root, not `public/`, and avoid setting a Pages-specific static output directory. Wrangler reads `wrangler.jsonc`, compiles `src/index.js`, and publishes `public/index.html` as an asset. No build command is required. `npm install` may be run by the platform if package.json is detected.

If configuring the deployment afresh, select a **Cloudflare Workers** project, connect the GitHub repository `SE-66/ECHOS`, use branch `main`, and run `npx wrangler deploy` from the root.

## Local Cloudflare preview

```bash
npm install
npm run dev
```

Check `http://localhost:8787/` and `http://localhost:8787/api/health`.

## Regression tests

```bash
npm run test:worker
python -m unittest discover -s tests -v
```

The Cloudflare adapter was checked against all 44 Python scenario oracle cases locally: action and response-category classifications agree, with only a nonsemantic numeric-display difference at one zero boundary (`0` versus `0.00`). Python and JS use distinct hashing serialization; certificate hashes across runtimes are not meant to be interchangeable.

## Public-demo safety and scope

- The Cloudflare app implements the **four synthetic financial domains** only; it does not call an external LLM, process real business data, or authenticate users.
- The front-end `/api/evaluate` intentionally displays reference answers. It is **not** a confidential blind-test API. Do not transmit private answer keys or experimental cases there.
- The Worker performs deterministic decision-rule validation and score calculation server-side. The Python reference remains the research source of truth; test additional cases before extending the JS port.
- Do not use for investment or corporate financial execution. Do not ingest confidential documents until authentication, rate limiting, contracts and data safeguards are implemented.
- **Repository is public.** Public disclosure may affect patent options. Contact qualified IP counsel before disclosing new technical inventions.

## Cloudflare settings summary

| Setting | Value |
|---|---|
| Deployment command | `npx wrangler deploy` |
| Root directory | Repository root |
| Wrangler config | `wrangler.jsonc` |
| Worker entry | `src/index.js` |
| Static assets | `public/` |
| Worker-first routes | `/api/*` |
| Health endpoint | `/api/health` |

Cloudflare documentation: https://developers.cloudflare.com/workers/wrangler/configuration/ and https://developers.cloudflare.com/workers/static-assets/