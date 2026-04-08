import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteDeckMutation } from "../api/decks";
import { isConcurrencyConflictError, isPersistenceUnavailableError } from "../api/errors";

export type DeleteDeckFlowState =
  | "idle"
  | "confirming"
  | "error_concurrency"
  | "error_persistence"
  | "error_generic";

export type UseDeleteDeckFlowReturn = {
  deleteState: DeleteDeckFlowState;
  isDeleting: boolean;
  deleteTriggerRef: RefObject<HTMLButtonElement>;
  confirmDeleteRef: RefObject<HTMLButtonElement>;
  startConfirming: () => void;
  cancelConfirm: () => void;
  confirmDelete: () => void;
  dismissError: () => void;
  retryFromError: () => void;
};

export const useDeleteDeckFlow = (deckId: string): UseDeleteDeckFlowReturn => {
  const navigate = useNavigate();
  const [deleteState, setDeleteState] = useState<DeleteDeckFlowState>("idle");
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement>(null);
  const previousDeleteStateRef = useRef(deleteState);
  const deleteMutation = useDeleteDeckMutation(deckId);

  useEffect(() => {
    setDeleteState("idle");
  }, [deckId]);

  useEffect(() => {
    const previousDeleteState = previousDeleteStateRef.current;
    if (deleteState === "confirming") {
      confirmDeleteRef.current?.focus();
    }
    if (deleteState === "idle" && previousDeleteState !== "idle") {
      deleteTriggerRef.current?.focus();
    }
    previousDeleteStateRef.current = deleteState;
  }, [deleteState]);

  useEffect(() => {
    const escapableStates = ["confirming", "error_concurrency", "error_persistence", "error_generic"] as const;
    if (!(escapableStates as readonly string[]).includes(deleteState)) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDeleteState("idle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteState]);

  const confirmDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/decks");
      },
      onError: (error) => {
        if (isConcurrencyConflictError(error)) {
          setDeleteState("error_concurrency");
          return;
        }
        if (isPersistenceUnavailableError(error)) {
          setDeleteState("error_persistence");
          return;
        }
        setDeleteState("error_generic");
      },
    });
  };

  return {
    deleteState,
    isDeleting: deleteMutation.isPending,
    deleteTriggerRef,
    confirmDeleteRef,
    startConfirming: () => setDeleteState("confirming"),
    cancelConfirm: () => setDeleteState("idle"),
    confirmDelete,
    dismissError: () => setDeleteState("idle"),
    retryFromError: () => setDeleteState("confirming"),
  };
};
