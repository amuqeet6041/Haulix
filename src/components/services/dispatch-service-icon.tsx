import {
  FileText,
  Handshake,
  MessagesSquare,
  Radio,
  Route,
  Search,
  type LucideIcon,
} from "lucide-react";

import type { DispatchServiceIcon as IconKey } from "@/content/dispatch-services";

const iconMap: Record<IconKey, LucideIcon> = {
  search: Search,
  handshake: Handshake,
  route: Route,
  messages: MessagesSquare,
  radio: Radio,
  file: FileText,
};

interface DispatchServiceIconProps {
  name: IconKey;
  className?: string;
}

/** Decorative icon for a dispatch service (see `content/dispatch-services.ts`). */
export function DispatchServiceIcon({ name, className }: DispatchServiceIconProps) {
  const Icon = iconMap[name];
  return <Icon className={className} aria-hidden="true" />;
}
