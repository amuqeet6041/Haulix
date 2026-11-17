"use client";

import { MotionConfig, motion } from "framer-motion";
import * as React from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Delay in seconds, useful for staggering siblings. */
  delay?: number;
  className?: string;
}

/**
 * Subtle fade-up on first view. Keep usage restrained: section content and
 * card grids only.
 *
 * Always renders the same element on server and client (no hydration
 * mismatch). With `reducedMotion="user"`, Framer Motion drops the movement for
 * people who prefer reduced motion and keeps only the opacity fade.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
