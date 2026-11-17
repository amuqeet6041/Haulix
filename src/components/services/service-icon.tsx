import { Box, Layers, Package, Plug, Snowflake, Ruler, Zap, type LucideIcon } from "lucide-react";

import type { ServiceIconKey } from "@/content/services";

const iconMap: Record<ServiceIconKey, LucideIcon> = {
  package: Package,
  snowflake: Snowflake,
  layers: Layers,
  ruler: Ruler,
  plug: Plug,
  box: Box,
  zap: Zap,
};

interface ServiceIconProps {
  name: ServiceIconKey;
  className?: string;
}

export function ServiceIcon({ name, className }: ServiceIconProps) {
  const Icon = iconMap[name];
  return <Icon className={className} aria-hidden="true" />;
}
