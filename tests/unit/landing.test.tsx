import { describe, expect, it } from "vitest";

import { landingSectionIds, mainNav } from "@/config/navigation";
import { equipmentCategories, trustHighlights } from "@/content/landing";
import { equipmentSlugs } from "@/content/services";

describe("landing content", () => {
  it("assigns a trailer category to every equipment type", () => {
    for (const slug of equipmentSlugs) {
      expect(equipmentCategories[slug]).toBeTruthy();
    }
  });

  it("keeps trust highlights free of numeric statistics", () => {
    for (const item of trustHighlights) {
      expect(`${item.title} ${item.description}`).not.toMatch(/\d|%/);
    }
  });
});

describe("main navigation", () => {
  it("links each item to an existing landing section", () => {
    const ids = Object.values(landingSectionIds) as string[];
    for (const item of mainNav) {
      const hash = item.href.split("#")[1];
      if (hash) expect(ids).toContain(hash);
    }
  });
});
