/**
 * Copy for /services: the dispatch work HAULIX takes on for a carrier.
 *
 * Equipment-specific copy lives in `content/services.ts`. PLACEHOLDER COPY:
 * describes the service in general terms with no statistics, prices or
 * guarantees. Have the HAULIX team review and approve it before launch.
 */

export type DispatchServiceIcon = "search" | "handshake" | "route" | "messages" | "radio" | "file";

export interface DispatchService {
  id: string;
  title: string;
  description: string;
  icon: DispatchServiceIcon;
  /** Concrete tasks shown as a checklist under the description. */
  tasks: string[];
}

export const dispatchServices: DispatchService[] = [
  {
    id: "load-searching",
    title: "Load Searching",
    description:
      "We look for freight that fits your trailer, your lanes and your schedule. You get real options to choose from, not a load you never agreed to.",
    icon: "search",
    tasks: [
      "Freight matched to your equipment and weight limits",
      "Loads that fit your preferred lanes",
      "Options brought to you before anything is booked",
    ],
  },
  {
    id: "rate-negotiation",
    title: "Rate Negotiation",
    description:
      "We talk to brokers on your behalf and push for a rate that makes sense for the miles, the freight and your costs. Then we go over the terms with you.",
    icon: "handshake",
    tasks: [
      "Rates discussed with the broker before you commit",
      "Detention and layover terms raised upfront",
      "Final terms checked against the rate confirmation",
    ],
  },
  {
    id: "route-planning",
    title: "Route Planning",
    description:
      "We look at the whole trip, not just the next load. That means pickup and delivery windows, empty miles and where your next load might come from.",
    icon: "route",
    tasks: [
      "Appointment times checked against your available hours",
      "Empty miles considered when comparing loads",
      "Backhaul options looked at before you deliver",
    ],
  },
  {
    id: "broker-communication",
    title: "Broker Communication",
    description:
      "We handle the calls, emails and check-ins with brokers and shippers, so you are not answering the phone while you drive.",
    icon: "messages",
    tasks: [
      "Carrier setup packets sent and followed up",
      "Pickup and delivery updates shared with the broker",
      "Delays and detention raised as soon as they happen",
    ],
  },
  {
    id: "dispatch-management",
    title: "Dispatch Management",
    description:
      "From booking to delivery, your dispatcher keeps track of each load, confirms appointments and keeps you posted along the way.",
    icon: "radio",
    tasks: [
      "A dispatcher who knows your truck and your routine",
      "Appointments confirmed before you roll",
      "A heads up when plans change",
    ],
  },
  {
    id: "documentation",
    title: "Documentation and Paperwork",
    description:
      "Every load comes with paperwork. We help keep rate confirmations, carrier packets and delivery documents organized and sent where they need to go.",
    icon: "file",
    tasks: [
      "Rate confirmations reviewed with you before you sign",
      "Carrier setup paperwork handled with each broker",
      "Bills of lading and proof of delivery tracked for every load",
    ],
  },
];

export const servicesPage = {
  header: {
    eyebrow: "Services",
    title: "What your dispatcher handles",
    description:
      "Six parts of the job that eat up your day when you do them yourself. We take them on so you can stay focused on the road.",
  },
  intro: {
    eyebrow: "Dispatch services",
    title: "The work between finding a load and getting paid for it",
    description:
      "Most owner-operators spend hours each week on load boards, phone calls and paperwork. That is the work we do for you.",
  },
  control: {
    eyebrow: "What stays with you",
    title: "You still run your business.",
    description:
      "We do the legwork. You keep the decisions that matter, and you can always ask why we suggested a load.",
    items: ["Which loads you take", "The lanes you run", "When you head home"],
  },
  equipment: {
    title: "Works with all seven equipment types",
    description:
      "Every service on this page covers dry van, reefer, flatbed, step deck, power only, box truck and hotshot.",
    linkLabel: "See equipment we dispatch",
  },
  cta: {
    title: "Spend less time finding loads.",
    description:
      "Tell us about your truck and the freight you haul. We'll get back to you to talk about what dispatch could look like for you.",
  },
};
