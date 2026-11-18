import { Check } from "lucide-react";
import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Eyebrow } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { hero } from "@/content/landing";
import { equipmentServices } from "@/content/services";

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
      {/* Orange panel (top right) that the equipment card sits over */}
      <div
        aria-hidden="true"
        className="absolute top-20 right-0 hidden h-[50%] w-[26%] rounded-l-banner bg-orange lg:block"
      />

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
                <p className="text-sm font-medium text-ink/65">{hero.equipmentCard.label}</p>
                <p className="mt-2 font-display text-5xl leading-none font-light tracking-tight text-orange sm:text-6xl">
                  {equipmentCount}
                </p>
                <p className="mt-2 text-sm font-medium text-ink/75">{hero.equipmentCard.caption}</p>
              </div>

              {/* Dispatcher card (overlaps the image edge) */}
              <div className="relative -mt-16 ml-4 w-[min(20rem,85%)] rounded-2xl border border-white/10 bg-ink/85 p-5 shadow-lift backdrop-blur-md sm:ml-8 lg:absolute lg:bottom-10 lg:-left-16 lg:mt-0 lg:ml-0">
                <p className="text-sm font-semibold text-orange">{hero.dispatcherCard.label}</p>
                <p className="mt-2 font-display text-lg font-semibold text-white">
                  {hero.dispatcherCard.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-subtle-foreground">
                  {hero.dispatcherCard.description}
                </p>
                <ul className="mt-4 space-y-1.5">
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
