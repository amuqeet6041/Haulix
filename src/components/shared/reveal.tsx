"use client";

import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Delay in seconds, useful for staggering siblings. */
  delay?: number;
  className?: string;
}

/**
 * Subtle fade-up on first view. Respects the user's reduced-motion setting.
 * Keep usage restrained: hero content and card grids only.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
