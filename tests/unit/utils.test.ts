import { describe, expect, it } from "vitest";

import { cn, joinUrl } from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes, last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
});

describe("joinUrl", () => {
  it("joins base and path without double slashes", () => {
    expect(joinUrl("https://example.com/", "/about")).toBe("https://example.com/about");
  });

  it("returns just the base for the root path", () => {
    expect(joinUrl("https://example.com/", "/")).toBe("https://example.com");
  });
});
