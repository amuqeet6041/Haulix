"use client";

import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="py-28">
      <Container narrow>
        <h1 className="text-4xl">Something went wrong</h1>
        <p className="mt-4">An unexpected error occurred. You can try again, or head back home.</p>
        <div className="mt-8 flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
