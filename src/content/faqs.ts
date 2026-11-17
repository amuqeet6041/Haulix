/**
 * Frequently asked questions.
 * PLACEHOLDER COPY: answers are general and avoid specific commitments.
 * Replace with approved HAULIX answers before launch.
 */

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    id: "what-is-dispatching",
    question: "What does a truck dispatcher do?",
    answer:
      "A truck dispatcher helps carriers find freight, negotiate rates, handle paperwork and stay in contact with brokers and shippers, so drivers can focus on driving.",
  },
  {
    id: "who-can-apply",
    question: "Who can work with HAULIX?",
    answer:
      "HAULIX is built for US owner-operators, independent truck owners and small to medium fleets. Submit an inquiry and our team will follow up to discuss your equipment and needs.",
  },
  {
    id: "equipment-types",
    question: "Which equipment types do you support?",
    answer:
      "We publish dispatch services for dry van, reefer, flatbed, step deck, power only, box truck and hotshot equipment. See the Services page for details.",
  },
  {
    id: "pricing",
    question: "How much does dispatching cost?",
    answer:
      "Pricing details will be published on the Pricing page. In the meantime, send a carrier inquiry and we will discuss options with you directly.",
  },
  {
    id: "getting-started",
    question: "How do I get started?",
    answer:
      "Fill out the carrier inquiry form on the Get Started page. Our team will review your details and contact you.",
  },
];
