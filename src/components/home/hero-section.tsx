import { Check } from "lucide-react";
import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Eyebrow } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { hero } from "@/content/landing";
import { equipmentServices } from "@/content/services";

/** Stylised freight route drawn over the orange panel (decorative). */
function RouteLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 520"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full text-ink"
    >
      <path
        d="M60 -10 C 90 90, 30 140, 140 190 S 300 230, 250 330 S 120 430, 230 540"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <path
        d="M330 -10 C 300 80, 360 120, 320 210 S 220 300, 300 380 S 380 470, 340 540"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
        strokeDasharray="4 6"
      />
      <path
        d="M248 70 V 150 H 300 V 260 H 262 V 360"
        className="text-cream"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [248, 70],
        [300, 260],
        [262, 360],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`} className="text-cream">
          <circle cx={cx} cy={cy} r="14" fill="currentColor" fillOpacity="0.2" />
          <circle cx={cx} cy={cy} r="5" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

export function HeroSection() {
  const equipmentCount = String(equipmentServices.length).padStart(2, "0");

  return (
    <section
      id={landingSectionIds.home}
      aria-labelledby="hero-title"
      className="relative -mt-20 overflow-hidden pt-20"
    >
      {/* Ambient lighting */}
      <div aria-hidden="true" className="bg-hero-ambient pointer-events-none absolute inset-0" />
      {/* Orange route panel (top right) */}
      <div
        aria-hidden="true"
        className="bg-route-grid absolute top-0 right-0 hidden h-[74%] w-[33%] overflow-hidden rounded-bl-banner bg-orange lg:block"
      >
        <RouteLines />
      </div>

      <Container className="relative">
        <div className="grid items-center gap-14 pt-10 pb-16 sm:pt-14 lg:min-h-[44rem] lg:grid-cols-12 lg:gap-8 lg:pt-6 lg:pb-24">
          <div className="relative z-10 animate-in duration-700 fade-in slide-in-from-bottom-4 motion-reduce:animate-none lg:col-span-6">
            <Eyebrow>{hero.eyebrow}</Eyebrow>
            <h1
              id="hero-title"
              className="mt-7 text-[2.75rem] leading-[1.02] font-light tracking-[-0.045em] sm:text-6xl lg:text-[5.25rem]"
            >
              {hero.titleLead} <span className="font-semibold text-orange">{hero.titleAccent}</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-pretty text-gray/85 sm:text-lg">
              {hero.description}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <PrimaryButton href={hero.primaryCta.href} size="xl">
                {hero.primaryCta.label}
              </PrimaryButton>
              <ArrowLink href={hero.secondaryCta.href} className="py-2 sm:text-base">
                {hero.secondaryCta.label}
              </ArrowLink>
            </div>
          </div>

          <div className="relative animate-in delay-150 duration-700 fill-mode-backwards fade-in slide-in-from-bottom-4 motion-reduce:animate-none lg:col-span-6">
            <div className="relative mx-auto max-w-xl lg:mr-0 lg:ml-6">
              {/* Orange route block behind the image on small screens */}
              <div
                aria-hidden="true"
                className="bg-route-grid absolute -top-6 -right-5 h-3/4 w-3/4 overflow-hidden rounded-media bg-orange sm:-right-8 lg:hidden"
              >
                <RouteLines />
              </div>
              {/* Main image */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-media border border-white/10 shadow-lift sm:aspect-[5/5] lg:aspect-[4/5] lg:w-[82%]">
                <Image
                  src="/images/hero/truck-night-trails.jpg"
                  alt={hero.imageAlt}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(min-width: 1024px) 34vw, (min-width: 640px) 80vw, 100vw"
                  className="object-cover object-[64%_50%]"
                />
                <div aria-hidden="true" className="bg-image-shade absolute inset-0" />
                {/* Paperwork chip */}
                <div className="absolute top-5 left-5 rounded-full border border-white/15 bg-ink/70 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  <span className="mr-2 inline-block size-2 rounded-full bg-orange align-middle" />
                  {hero.paperworkCard.label} handled
                </div>
              </div>

              {/* Equipment card (floats over the orange panel) */}
              <div className="absolute top-8 -right-1 w-40 rounded-2xl bg-cream p-4 text-ink shadow-lift sm:top-10 sm:right-0 sm:w-48 sm:p-5 lg:top-16 lg:-right-2">
                <p className="label-caps text-ink/60">{hero.equipmentCard.label}</p>
                <p className="mt-2 font-display text-5xl leading-none font-light tracking-tight text-orange sm:text-6xl">
                  {equipmentCount}
                </p>
                <p className="mt-2 text-sm font-medium text-ink/75">{hero.equipmentCard.caption}</p>
              </div>

              {/* Dispatcher card (overlaps the image edge) */}
              <div className="relative -mt-16 ml-4 w-[min(20rem,85%)] rounded-2xl border border-white/10 bg-ink/85 p-5 shadow-lift backdrop-blur-md sm:ml-8 lg:absolute lg:bottom-10 lg:-left-16 lg:mt-0 lg:ml-0">
                <p className="label-caps text-orange">{hero.dispatcherCard.label}</p>
                <p className="mt-2 font-display text-lg font-semibold text-white">
                  {hero.dispatcherCard.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-subtle-foreground">
                  {hero.dispatcherCard.description}
                </p>
                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                  {hero.paperworkCard.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray">
                      <Check className="size-4 text-orange" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
