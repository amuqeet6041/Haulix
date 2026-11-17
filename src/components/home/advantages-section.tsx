import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { advantages } from "@/content/landing";

export function AdvantagesSection() {
  return (
    <section aria-labelledby="why-title" className="section-y">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <Reveal className="lg:sticky lg:top-28">
              <SectionHeading
                id="why-title"
                eyebrow={advantages.eyebrow}
                title={advantages.title}
                description={advantages.description}
              />
              <PrimaryButton href="/get-started" size="xl" className="mt-9 px-8">
                Work with HAULIX
              </PrimaryButton>
            </Reveal>
          </div>

          <ol className="lg:col-span-7 lg:pl-8">
            {advantages.items.map((item, index) => (
              <li key={item.title}>
                <Reveal delay={index * 0.05}>
                  <div className="group grid gap-3 border-t border-border py-8 transition-colors duration-300 last:border-b sm:grid-cols-[5rem_1fr] sm:gap-6 sm:py-10">
                    <span className="font-display text-4xl font-light tracking-tight text-subtle-foreground transition-colors duration-300 group-hover:text-orange">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-xl leading-relaxed text-subtle-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
