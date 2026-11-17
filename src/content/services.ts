/**
 * Equipment-specific dispatch services.
 *
 * PLACEHOLDER COPY: wording is generic and contains no statistics or promises.
 * Have the HAULIX team review and replace it before launch.
 */

export const equipmentSlugs = [
  "dry-van",
  "reefer",
  "flatbed",
  "step-deck",
  "power-only",
  "box-truck",
  "hotshot",
] as const;

export type EquipmentSlug = (typeof equipmentSlugs)[number];

/** Keys map to Lucide icons in `components/services/service-icon.tsx`. */
export type ServiceIconKey = "package" | "snowflake" | "layers" | "ruler" | "plug" | "box" | "zap";

export interface EquipmentService {
  slug: EquipmentSlug;
  name: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  icon: ServiceIconKey;
}

export const equipmentServices: EquipmentService[] = [
  {
    slug: "dry-van",
    name: "Dry Van Dispatch",
    shortDescription: "Enclosed trailers for palletized and boxed freight.",
    description:
      "Dry vans are the most common trailer type in US trucking. We help dry van owners find and book freight that fits their trucks, lanes and schedules.",
    highlights: [
      "Freight search matched to your preferred lanes",
      "Rate negotiation support",
      "Paperwork and broker communication handled for you",
    ],
    icon: "package",
  },
  {
    slug: "reefer",
    name: "Reefer Dispatch",
    shortDescription: "Temperature-controlled freight for refrigerated trailers.",
    description:
      "Refrigerated freight has its own timing and handling requirements. We help reefer owners find loads that suit their equipment and keep communication clear with brokers and shippers.",
    highlights: [
      "Loads suited to temperature-controlled equipment",
      "Clear communication on pickup and delivery windows",
      "Support with rate confirmations",
    ],
    icon: "snowflake",
  },
  {
    slug: "flatbed",
    name: "Flatbed Dispatch",
    shortDescription: "Open-deck freight such as building materials and machinery.",
    description:
      "Flatbed work often involves securement and specific load requirements. We help flatbed owners find suitable freight and plan their runs.",
    highlights: [
      "Freight search for open-deck equipment",
      "Load details confirmed before you commit",
      "Back-haul planning support",
    ],
    icon: "layers",
  },
  {
    slug: "step-deck",
    name: "Step Deck Dispatch",
    shortDescription: "Lowered-deck trailers for taller freight.",
    description:
      "Step decks carry freight that needs extra height clearance. We help step deck owners identify loads that fit their equipment and route.",
    highlights: [
      "Loads matched to deck height and length",
      "Route and clearance details confirmed upfront",
      "Broker communication support",
    ],
    icon: "ruler",
  },
  {
    slug: "power-only",
    name: "Power Only Dispatch",
    shortDescription: "Tractor-only capacity pulling customer trailers.",
    description:
      "Power only operators pull trailers owned by customers. We help find power only freight and coordinate pickups and drop-offs.",
    highlights: [
      "Power only freight search",
      "Trailer pickup and drop coordination",
      "Support with scheduling",
    ],
    icon: "plug",
  },
  {
    slug: "box-truck",
    name: "Box Truck Dispatch",
    shortDescription: "Straight trucks for local, regional and expedited freight.",
    description:
      "Box trucks serve a wide range of delivery and regional freight needs. We help box truck owners find freight that fits their vehicle and territory.",
    highlights: [
      "Freight search for straight trucks",
      "Local and regional load options",
      "Rate and paperwork support",
    ],
    icon: "box",
  },
  {
    slug: "hotshot",
    name: "Hotshot Dispatch",
    shortDescription: "Smaller trucks and trailers for time-sensitive freight.",
    description:
      "Hotshot trucking focuses on faster, smaller loads. We help hotshot owners find freight that matches their trailer and availability.",
    highlights: [
      "Time-sensitive freight search",
      "Flexible lane planning",
      "Direct communication with your dispatcher",
    ],
    icon: "zap",
  },
];

export function getEquipmentService(slug: string): EquipmentService | undefined {
  return equipmentServices.find((service) => service.slug === slug);
}
