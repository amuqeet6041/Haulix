/**
 * Copy for /about.
 *
 * PLACEHOLDER COPY: describes how HAULIX works in general terms. It makes no
 * claims about company history, team size, results or customers. Have the
 * HAULIX team review and approve it before launch.
 */

import type { TextItem } from "@/content/landing";

export const aboutPage = {
  header: {
    eyebrow: "About",
    title: "Dispatch support for the people who own the truck",
    description:
      "We find the freight, talk to the brokers and keep the paperwork straight. You keep driving and stay in charge of your business.",
  },
  intro: {
    eyebrow: "Who we are",
    title: "We handle the desk work so you can keep driving.",
    imageAlt: "Dark red semi-truck on an open highway at sunset",
  },
  mission: {
    label: "Our mission",
    text: "Give small carriers the kind of dispatch support that bigger operations have, so they can spend their time driving instead of chasing loads and paperwork.",
  },
  vision: {
    label: "Our vision",
    text: "Be the dispatcher carriers want on the other end of the phone: someone who knows their truck, respects their decisions and gives them straight answers.",
  },
  values: {
    eyebrow: "What we stand for",
    title: "The way we work",
    description: "Four things we hold ourselves to with every carrier and every load.",
    items: [
      {
        title: "You make the call",
        description:
          "We bring you load options and the details behind them. Nothing gets booked until you say yes.",
      },
      {
        title: "Straight answers",
        description:
          "If a rate looks low or a load has problems, we say so. You get the full picture before you decide.",
      },
      {
        title: "We know the equipment",
        description:
          "A reefer, a step deck and a hotshot run very differently. We dispatch with your trailer and schedule in mind.",
      },
      {
        title: "Your time matters",
        description:
          "Our job is to take work off your plate, not add to it. Fewer calls, less paperwork and more time on the road.",
      },
    ] satisfies TextItem[],
  },
  audience: {
    eyebrow: "Who we work with",
    title: "Built for small trucking businesses",
    items: [
      {
        title: "Owner-operators",
        description:
          "You run your own truck and want someone else working the load boards and broker calls.",
      },
      {
        title: "Independent truck owners",
        description:
          "You own your equipment and want dispatch help without giving up control of your business.",
      },
      {
        title: "Small and medium fleets",
        description:
          "You have a few trucks or a growing fleet and want one team coordinating loads across all of them.",
      },
    ] satisfies TextItem[],
  },
  cta: {
    title: "Let's talk about your truck.",
    description:
      "Tell us what you drive and where you like to run. We'll follow up and explain how we can help.",
  },
};
