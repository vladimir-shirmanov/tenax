import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckForm } from "./DeckForm";

describe("DeckForm", () => {
  it("hides validation errors before the field is dirty", () => {
    render(
      <DeckForm
        submitLabel="Create deck"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByText("A deck must have a name to get started.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create deck/i })).toBeDisabled();
    expect(screen.getByLabelText(/deck name/i)).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText(/deck name/i)).toHaveAttribute(
      "aria-describedby",
      "deck-name-help deck-name-count"
    );
  });

  it("shows validation error after name field becomes dirty and invalid", async () => {
    const user = userEvent.setup();

    render(
      <DeckForm
        submitLabel="Create deck"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/deck name/i);
    await user.type(nameInput, " ");

    expect(screen.getByText("A deck must have a name to get started.")).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby", "deck-name-help deck-name-count deck-name-error");
  });

  it("shows validation error after name field is touched and blurred without typing", async () => {
    const user = userEvent.setup();

    render(
      <DeckForm
        submitLabel="Create deck"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/deck name/i);
    await user.click(nameInput);
    await user.tab();

    expect(screen.getByText("A deck must have a name to get started.")).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby", "deck-name-help deck-name-count deck-name-error");
  });

  it("blocks submit while invalid", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <DeckForm
        submitLabel="Create deck"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: /create deck/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not render Cancel button when onCancel is not provided", () => {
    render(
      <DeckForm
        submitLabel="Create deck"
        isSubmitting={false}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument();
  });

  it("renders Cancel button when onCancel is provided", () => {
    render(
      <DeckForm
        submitLabel="Create deck"
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
      <DeckForm
        submitLabel="Create deck"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    await user.type(screen.getByLabelText(/deck name/i), "Spanish Basics");
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Cancel button is disabled while isSubmitting", () => {
    render(
      <DeckForm
        submitLabel="Create deck"
        isSubmitting
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();
  });
});
