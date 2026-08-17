import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./components/ui/button.js";
import { ImageLightbox } from "./components/ImageLightbox.js";
import { LocaleProvider } from "./i18n/locale-context.js";

describe("server rendering", () => {
  it("renders stable components without a browser global", () => {
    const html = renderToString(
      <LocaleProvider locale="en-US">
        <Button>Rendered on the server</Button>
      </LocaleProvider>,
    );
    expect(html).toContain("Rendered on the server");
  });

  it("does not access document while rendering a portal component", () => {
    const html = renderToString(
      <LocaleProvider locale="en-US">
        <ImageLightbox
          images={[{ id: "image-1", kind: "image", name: "preview.png", url: "/preview.png" }]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => {}}
        />
      </LocaleProvider>,
    );
    expect(html).toBe("");
  });
});
