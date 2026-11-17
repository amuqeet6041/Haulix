"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Faq } from "@/content/faqs";

interface FaqAccordionProps {
  items: Faq[];
}

/** Client component: expand/collapse needs interactivity. */
export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className="rounded-panel border border-white/10 bg-ink-warm/60 px-6 sm:px-8"
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
