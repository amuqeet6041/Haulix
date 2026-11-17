/**
 * Steps of the carrier onboarding journey, shared by the homepage and /how-it-works.
 * PLACEHOLDER COPY: confirm the real onboarding process with the HAULIX team.
 */

export interface ProcessStep {
  title: string;
  description: string;
}

export const processSteps: ProcessStep[] = [
  {
    title: "Tell us about your truck",
    description: "Share your equipment, number of trucks and the lanes you prefer to run.",
  },
  {
    title: "We review your inquiry",
    description: "Our team looks over your details and gets in touch to talk through your needs.",
  },
  {
    title: "Agree how we will work together",
    description: "We explain how dispatching works and answer your questions before you commit.",
  },
  {
    title: "Start moving freight",
    description: "Your dispatcher helps you find loads and handle the details along the way.",
  },
];
