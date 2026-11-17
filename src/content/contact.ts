/**
 * Copy for /contact. Phone, email and address come from `siteConfig.contact`
 * and are only shown once the business provides real ones.
 *
 * PLACEHOLDER COPY: have the HAULIX team review it before launch.
 */

export const contactPage = {
  header: {
    eyebrow: "Contact",
    title: "Talk to the HAULIX team",
    description:
      "Questions about dispatch, equipment or how we work? Send us a message and someone from our team will get back to you.",
  },
  form: {
    title: "Send us a message",
    description: "Fields marked with an asterisk are required.",
  },
  paths: [
    {
      title: "Ready to start dispatch?",
      description:
        "Use the carrier inquiry form. It asks for your equipment and truck count, so we can come prepared.",
      link: { label: "Go to Get Started", href: "/get-started" },
    },
    {
      title: "Have a quick question?",
      description: "Our FAQ covers the questions carriers ask us most about working together.",
      link: { label: "Read the FAQ", href: "/faq" },
    },
  ],
  tips: {
    title: "Helpful to include",
    items: ["Your equipment type", "How many trucks you run", "The best time to reach you"],
  },
  detailsTitle: "Reach us directly",
};
