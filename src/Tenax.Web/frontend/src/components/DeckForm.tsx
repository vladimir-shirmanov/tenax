import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

type DeckFormValues = {
  name: string;
  description: string;
};

const deckFormSchema = z.object({
  name: z.string().trim().min(1, "A deck must have a name to get started."),
  description: z.string(),
});

type DeckFormProps = {
  initialValues?: Partial<DeckFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  formError?: string;
  fieldErrors?: Record<string, string | undefined>;
  disableIfUnchanged?: boolean;
  onCancel?: () => void;
  onSubmit: (payload: {
    name: string;
    description: string | null;
  }) => void;
};

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

export const DeckForm = ({
  initialValues,
  submitLabel,
  isSubmitting,
  formError,
  fieldErrors,
  disableIfUnchanged,
  onCancel,
  onSubmit,
}: DeckFormProps) => {
  const initialName = initialValues?.name ?? "";
  const initialDescription = initialValues?.description ?? "";

  const {
    control,
    register,
    handleSubmit,
    setFocus,
    formState: { errors, dirtyFields, touchedFields, isDirty, isValid },
  } = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    mode: "all",
    defaultValues: {
      name: initialName,
      description: initialDescription,
    },
  });

  const values = useWatch({
    control,
    defaultValue: {
      name: initialName,
      description: initialDescription,
    },
  });

  const normalizedValues: DeckFormValues = {
    name: values?.name ?? "",
    description: values?.description ?? "",
  };

  const submitDisabled =
    isSubmitting ||
    !isValid ||
    (disableIfUnchanged ? !isDirty : false);

  const showNameError = Boolean(dirtyFields.name || touchedFields.name);
  const showDescriptionError = Boolean(dirtyFields.description || touchedFields.description);

  const visibleNameError = showNameError
    ? fieldErrors?.name ?? errors.name?.message
    : undefined;
  const visibleDescriptionError = showDescriptionError
    ? fieldErrors?.description
    : undefined;

  const nameDescribedBy = visibleNameError
    ? "deck-name-help deck-name-count deck-name-error"
    : "deck-name-help deck-name-count";
  const descriptionDescribedBy = visibleDescriptionError
    ? "deck-description-help deck-description-count deck-description-error"
    : "deck-description-help deck-description-count";

  const submitValues = (submittedValues: DeckFormValues) => {
    if (submitDisabled) {
      return;
    }

    onSubmit({
      name: submittedValues.name.trim(),
      description: submittedValues.description.trim()
        ? submittedValues.description.trim()
        : null,
    });
  };

  useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 48rem)")
        : null;

    if (!mediaQuery?.matches) {
      return;
    }

    setFocus("name");
  }, [setFocus]);

  return (
    <form className="form-grid" onSubmit={handleSubmit(submitValues)} noValidate>
      {formError ? (
        <div role="alert" className="alert" aria-live="polite">
          {formError}
        </div>
      ) : null}

      <div>
        <label htmlFor="deckName" className="field-label">
          Deck Name
        </label>
        <input
          id="deckName"
          className="field-input"
          aria-invalid={Boolean(visibleNameError)}
          aria-describedby={nameDescribedBy}
          maxLength={MAX_NAME_LENGTH}
          {...register("name")}
        />
        <p id="deck-name-help" className="field-hint" style={{ marginTop: "0.35rem" }}>
          e.g., Spanish Travel Phrases, JLPT N5 Vocabulary
        </p>
        <p id="deck-name-count" className="field-hint" style={{ marginTop: "0.2rem" }}>
          {normalizedValues.name.length}/{MAX_NAME_LENGTH}
        </p>
        {visibleNameError ? (
          <p id="deck-name-error" className="field-error" aria-live="polite">
            {visibleNameError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="deckDescription" className="field-label">
          Description
        </label>
        <textarea
          id="deckDescription"
          className="field-input field-input--textarea"
          aria-invalid={Boolean(visibleDescriptionError)}
          aria-describedby={descriptionDescribedBy}
          maxLength={MAX_DESCRIPTION_LENGTH}
          {...register("description")}
        />
        <p id="deck-description-help" className="field-hint" style={{ marginTop: "0.35rem" }}>
          Add context on what you are learning in this deck.
        </p>
        <p id="deck-description-count" className="field-hint" style={{ marginTop: "0.2rem" }}>
          {normalizedValues.description.length}/{MAX_DESCRIPTION_LENGTH}
        </p>
        {visibleDescriptionError ? (
          <p id="deck-description-error" className="field-error" aria-live="polite">
            {visibleDescriptionError}
          </p>
        ) : null}
      </div>

      <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
        <button type="submit" disabled={submitDisabled} className="button button--primary">
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="button button--ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
};
