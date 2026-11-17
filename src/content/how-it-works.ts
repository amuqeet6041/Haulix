/**
 * Copy for /how-it-works. Onboarding steps reuse `content/process.ts` (shared
 * with the homepage) and add a longer explanation for each one.
 *
 * PLACEHOLDER COPY: confirm the real onboarding and dispatch workflow with the
 * HAULIX team before launch.
 */

import type { TextItem } from "@/content/landing";
import { processSteps, type ProcessStep } from "@/content/process";

/** Longer explanations for each onboarding step, in the same order as `processSteps`. */
const onboardingDetails = [
  "Fill out the Get Started form or send us a message. Your MC and DOT numbers help, but you can add them later.",
  "Someone from our team goes over your details and reaches out to talk about your equipment, lanes and goals.",
  "We go over what we need from you, how we will stay in touch and what you can expect from us. There is no pressure to sign on the spot.",
  "Once the paperwork is in place, your dispatcher starts looking for freight that fits your truck.",
];

export interface OnboardingStep extends ProcessStep {
  detail: string;
}

export const onboardingSteps: OnboardingStep[] = processSteps.map((step, index) => ({
  ...step,
  detail: onboardingDetails[index] ?? "",
}));

export const howItWorksPage = {
  header: {
    eyebrow: "How it works",
    title: "How working with HAULIX works",
    description:
      "Here is what to expect, from your first message to a delivered load and everything in between.",
  },
  onboarding: {
    eyebrow: "Getting started",
    title: "Four steps to your first load",
    description:
      "Getting set up is a conversation. We want to understand your operation before we book anything for you.",
  },
  loadCycle: {
    eyebrow: "Day to day",
    title: "A typical load, start to finish",
    description: "Once you are set up, this is how each load usually comes together.",
    stages: [
      {
        title: "Search",
        description: "Your dispatcher looks for loads that fit your equipment, lanes and schedule.",
      },
      {
        title: "Review",
        description:
          "We bring you the pickup, delivery, weight, miles and rate. You decide if it works.",
      },
      {
        title: "Book",
        description:
          "Once you say yes, we lock in the terms with the broker and send you the rate confirmation.",
      },
      {
        title: "Haul",
        description:
          "While you drive, we stay in touch with the broker and let you know if anything changes.",
      },
      {
        title: "Deliver",
        description:
          "After delivery, we help get the paperwork where it needs to go and start lining up the next load.",
      },
    ] satisfies TextItem[],
  },
  prepare: {
    eyebrow: "Before you reach out",
    title: "What to have ready",
    description:
      "You do not need everything on day one. These details help us understand your operation faster.",
    items: [
      "Your name and the best way to reach you",
      "Your equipment type and how many trucks you run",
      "Your MC and DOT numbers, if you have them",
      "The lanes and regions you like to run",
    ],
    imageAlt: "Black semi-truck driving at night with orange light trails",
  },
  cta: {
    title: "Ready for step one?",
    description:
      "It starts with a short form. Tell us about your truck and we'll take it from there.",
  },
};
