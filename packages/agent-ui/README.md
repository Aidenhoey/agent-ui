# @aidenhoey/agent-ui

Protocol-driven React components for agent conversations and run timelines.

## Install

```bash
npm install @aidenhoey/agent-ui react react-dom
```

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

The stylesheet is precompiled and includes the package's tokens, component rules, animations, and utility classes. Consumers do not need to scan library source files. React 18.2 and React 19 are supported.

Demo-only utilities are available from `@aidenhoey/agent-ui/mock` and are not part of the stable root API.

This package is licensed under the [MIT License](./LICENSE).
