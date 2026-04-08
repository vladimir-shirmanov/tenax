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
    expect(screen.getByLabelText(/term or phrase/i)).toHaveAttribute("aria-describedby", "term-count");
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
    expect(termInput).toHaveAttribute("aria-describedby", "term-count term-error");
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
    expect(termInput).toHaveAttribute("aria-describedby", "term-count term-error");
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

  it("disables submit when unchanged if disableIfUnchanged is enabled", () => {
    render(
      <FlashcardForm
        initialValues={{ term: "hola", definition: "hello", imageUrl: "" }}
        submitLabel="Save changes"
        isSubmitting={false}
        disableIfUnchanged
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("does not render Cancel button when onCancel is not provided", () => {
    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument();
  });

  it("renders Cancel button when onCancel is provided", () => {
    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
  });

  it("Cancel button calls onCancel and does not submit form", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onCancel = jest.fn();

    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    await user.type(screen.getByLabelText(/term or phrase/i), "hola");
    await user.type(screen.getByLabelText(/definition/i), "hello");
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Cancel button is disabled while isSubmitting", () => {
    render(
      <FlashcardForm
        submitLabel="Create flashcard"
        isSubmitting
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();
  });
});
