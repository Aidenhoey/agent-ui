# Agent UI

Agent UI is an MIT-licensed React component library for protocol-driven agent conversations, run timelines, tool activity, artifacts, interrupts, and rich content. The repository also contains a Vite Portal that consumes the same package artifacts users receive.

The installable package is named `@aidenhoey/agent-ui`. Its npm metadata is configured in `packages/agent-ui/package.json`.

## Install

```bash
npm install @aidenhoey/agent-ui react react-dom
```

React 18.2 and React 19 are supported. Import the precompiled stylesheet once in your application; consumers do not need Tailwind or source scanning.

```tsx
import { Button, LocaleProvider } from "@aidenhoey/agent-ui";
import "@aidenhoey/agent-ui/styles.css";

export function Example() {
  return (
    <LocaleProvider locale="en-US">
      <Button>Start run</Button>
    </LocaleProvider>
  );
}
```

Mock players and demo scenarios are intentionally kept out of the root API:

```ts
import { buildScenarios, createRunPlayer } from "@aidenhoey/agent-ui/mock";
```

## Workspace commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm pack:check
pnpm test:consumer
```

`pnpm build` builds `packages/agent-ui/dist` first and then builds the Portal through the package's formal exports. No npm publication occurs as part of these commands.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution and release preparation guidance.
