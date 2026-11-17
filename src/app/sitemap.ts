import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/config/site";
import { equipmentServices } from "@/content/services";

const staticPaths = [
  "/",
  "/about",
  "/services",
  "/pricing",
  "/how-it-works",
  "/contact",
  "/faq",
  "/resources",
  "/blog",
  "/get-started",
  "/privacy-policy",
  "/terms",
];

/** Foundation sitemap. Add blog posts here once the blog has content. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...staticPaths,
    ...equipmentServices.map((service) => `/services/${service.slug}`),
  ];
  return paths.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
