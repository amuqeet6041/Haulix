import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Build an absolute URL from a site path, e.g. absoluteUrl("/about"). */
export function joinUrl(base: string, path = "/"): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath === "/" ? cleanBase : `${cleanBase}${cleanPath}`;
}
