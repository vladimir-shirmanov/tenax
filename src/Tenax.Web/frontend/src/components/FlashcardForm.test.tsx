import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardForm } from "./FlashcardForm";

describe("FlashcardForm", () => {
  it("hides validation errors before fields are dirty", () => {
    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByText("Term is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Definition is required")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create flashcard/i })).toBeDisabled();
    expect(screen.getByLabelText(/term or phrase/i)).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText(/term or phrase/i)).not.toHaveAttribute("aria-describedby", "term-error");
  });

  it("shows validation error after term field becomes dirty and invalid", async () => {
    const user = userEvent.setup();

    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    const termInput = screen.getByLabelText(/term or phrase/i);
    await user.type(termInput, " ");

    expect(screen.getByText("Term is required")).toBeInTheDocument();
    expect(termInput).toHaveAttribute("aria-invalid", "true");
    expect(termInput).toHaveAttribute("aria-describedby", "term-error");
  });

  it("shows validation error after term field is touched and blurred without typing", async () => {
    const user = userEvent.setup();

    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    const termInput = screen.getByLabelText(/term or phrase/i);
    await user.click(termInput);
    await user.tab();

    expect(screen.getByText("Term is required")).toBeInTheDocument();
    expect(termInput).toHaveAttribute("aria-invalid", "true");
    expect(termInput).toHaveAttribute("aria-describedby", "term-error");
  });

  it("blocks submit while invalid", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: /create flashcard/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
