import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandMark } from "./BrandMark";

describe("Identidade visual VetEstudo", () => {
  it("renderiza um símbolo SVG independente de imagens externas", () => {
    const html = renderToStaticMarkup(<BrandMark className="h-10 w-10" />);
    expect(html).toContain('viewBox="0 0 64 64"');
    expect(html).toContain('aria-label="VetEstudo"');
    expect(html).toContain("<path");
    expect(html).not.toContain("data:image/jpeg");
  });
});
