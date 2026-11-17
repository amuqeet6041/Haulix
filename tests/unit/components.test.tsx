import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/shared/empty-state";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { FormField } from "@/components/shared/form-field";
import { PrimaryButton } from "@/components/shared/primary-button";

describe("PrimaryButton", () => {
  it("renders a link when href is provided", () => {
    render(<PrimaryButton href="/get-started">Get Started</PrimaryButton>);
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/get-started",
    );
  });

  it("renders a button without href", () => {
    render(<PrimaryButton>Click</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Click" })).toBeInTheDocument();
  });
});

describe("FormField", () => {
  it("shows the error message with an alert role", () => {
    render(
      <FormField id="email" label="Email" error="Required">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nothing here" description="Check back later" />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Check back later")).toBeInTheDocument();
  });
});

describe("FaqAccordion", () => {
  it("reveals an answer when its question is clicked", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={[{ id: "q1", question: "Why?", answer: "Because." }]} />);

    await user.click(screen.getByRole("button", { name: "Why?" }));
    expect(screen.getByText("Because.")).toBeVisible();
  });
});
