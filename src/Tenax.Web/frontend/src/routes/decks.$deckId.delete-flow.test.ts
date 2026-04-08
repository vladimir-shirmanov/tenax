import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { ReactNode, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../api/errors";
import { useDeleteDeckFlow } from "./decks.$deckId.delete-flow";

const mockMutate = jest.fn();
const mockUseDeleteDeckMutation = jest.fn();

jest.mock("../api/decks", () => ({
  useDeleteDeckMutation: (...args: unknown[]) => mockUseDeleteDeckMutation(...args),
}));

const wrapperFactory = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, children)
    );
  };
};

describe("useDeleteDeckFlow", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockUseDeleteDeckMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it("starts in idle and supports startConfirming/cancelConfirm transitions", () => {
    const { result } = renderHook(() => useDeleteDeckFlow("deck_123"), {
      wrapper: wrapperFactory(),
    });

    expect(result.current.deleteState).toBe("idle");

    act(() => {
      result.current.startConfirming();
    });
    expect(result.current.deleteState).toBe("confirming");

    act(() => {
      result.current.cancelConfirm();
    });
    expect(result.current.deleteState).toBe("idle");
  });

  it.each([
    ["error_concurrency", new ApiError(409, { code: "concurrency_conflict", message: "Conflict" })],
    ["error_persistence", new ApiError(503, { code: "persistence_unavailable", message: "Unavailable" })],
    ["error_generic", new ApiError(500, { code: "server_error", message: "Error" })],
  ] as const)("dismissError returns %s state to idle", (expectedState, apiError) => {
    mockMutate.mockImplementation((_variables: undefined, options?: { onError?: (error: unknown) => void }) => {
      options?.onError?.(apiError);
    });

    const { result } = renderHook(() => useDeleteDeckFlow("deck_123"), {
      wrapper: wrapperFactory(),
    });

    act(() => {
      result.current.startConfirming();
      result.current.confirmDelete();
    });
    expect(result.current.deleteState).toBe(expectedState);

    act(() => {
      result.current.dismissError();
    });
    expect(result.current.deleteState).toBe("idle");
  });

  it.each([
    new ApiError(409, { code: "concurrency_conflict", message: "Conflict" }),
    new ApiError(503, { code: "persistence_unavailable", message: "Unavailable" }),
    new ApiError(500, { code: "server_error", message: "Error" }),
  ])("retryFromError returns to confirming", (apiError) => {
    mockMutate.mockImplementation((_variables: undefined, options?: { onError?: (error: unknown) => void }) => {
      options?.onError?.(apiError);
    });

    const { result } = renderHook(() => useDeleteDeckFlow("deck_123"), {
      wrapper: wrapperFactory(),
    });

    act(() => {
      result.current.startConfirming();
      result.current.confirmDelete();
    });
    expect(result.current.deleteState).not.toBe("idle");

    act(() => {
      result.current.retryFromError();
    });
    expect(result.current.deleteState).toBe("confirming");
  });
});
