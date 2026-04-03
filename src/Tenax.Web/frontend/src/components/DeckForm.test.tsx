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
});
