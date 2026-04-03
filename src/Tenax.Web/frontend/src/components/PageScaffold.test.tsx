import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PageScaffold } from "./PageScaffold";
import { Breadcrumb } from "./Breadcrumb";

describe("page scaffold", () => {
  it("renders breadcrumb content above the page header when provided", () => {
    render(
      <MemoryRouter>
        <PageScaffold
          title="Test title"
          subtitle="Test subtitle"
          breadcrumb={<Breadcrumb items={[{ label: "Decks", href: "/decks" }, { label: "New deck" }]} />}
        >
          <p>Body content</p>
        </PageScaffold>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test title" })).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });
});
