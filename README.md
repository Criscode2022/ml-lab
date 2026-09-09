# ML Lab

Interactive machine learning laboratory. The first complete slice is **Linear Regression**: a noisy dataset, a draggable fit, residuals and MSE, animated gradient descent, a deliberate “Break it” path, theory behind a depth control, sandboxed Python, a Socratic tutor, a scored challenge, and saved progress.

## Stack

- Angular 22 laboratory UI
- NestJS API (`/api`)
- Neon Postgres
- Isolated Python runner (local child process in development; Vercel Sandbox in production when credentials exist)
- Vercel AI SDK `ToolLoopAgent` (SpaceXAI / xAI via AI Gateway)

## Local

```bash
cp .env.example .env   # then set DATABASE_URL and JWT_SECRET
npm install
npm run db:schema
npm test
npm run build
npm run dev            # API :3000, web :4200 (proxies /api)
```

Open `http://localhost:4200`, create an account, pick a goal, enter the lab.

## Tests

```bash
npx vitest run packages/ml-core     # dataset, MSE, GD convergence/divergence
npx vitest run packages/sandbox     # isolated Python, NumPy MSE, timeout, stop/reset
npx vitest run packages/agent-core  # tools + structured tutor context
npm run test:api                    # register/login, isolation, challenge, honest AI errors
```
