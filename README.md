# Tyga-Finacials
Gamma Signals

## Composio integration

Composio is wired into the server side of the application using the current `@composio/core` SDK. The browser must never receive the project API key.

### Server setup

1. Use Node.js 22.22.3+.
2. Install dependencies with `npm install`.
3. Set `COMPOSIO_API_KEY` in the deployment environment.
4. Deploy the `api/` functions on a serverless host such as Vercel.
5. Check `GET /api/composio/health` to confirm the server can see the configuration.

The current frontend is a static/Jekyll-style site, so the Composio key is intentionally kept out of `index.html` and other browser assets. User-scoped Composio sessions should be added only after the application's real authenticated user/tenant identity is available on the server.
