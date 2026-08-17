# Contributing

## Development

Use Node.js 22 and the pnpm version declared in the root `package.json`.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm pack:check
pnpm test:consumer
```

Keep production components, hooks, and public types in the root `@aidenhoey/agent-ui` entry. Mock players, scenarios, temporary upload helpers, and Portal-only content belong under `@aidenhoey/agent-ui/mock` or inside the Portal. Add new runtime dependencies to `packages/agent-ui/package.json`; React and ReactDOM must remain peer dependencies.

## Changesets

Add a changeset for user-visible package changes:

```bash
pnpm changeset
```

Choose `@aidenhoey/agent-ui`, describe the public impact, and select the appropriate semantic version bump. Maintainers can apply pending versions with `pnpm version-packages`.

## Releases

Do not publish from a development branch. Before a release, confirm the final npm package name and availability, npm ownership or organization, `NPM_TOKEN` or trusted publishing setup, the intended version, and the protected GitHub `npm` environment. The release workflow is manual and requires an explicit confirmation string.
