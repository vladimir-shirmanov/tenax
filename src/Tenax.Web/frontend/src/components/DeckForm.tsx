import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type DeckFormValues = {
  name: string;
  description: string;
};

type DeckFormProps = {
  initialValues?: Partial<DeckFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  formError?: string;
  fieldErrors?: Record<string, string | undefined>;
  disableIfUnchanged?: boolean;
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
  onSubmit,
}: DeckFormProps) => {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const initialName = initialValues?.name ?? "";
  const initialDescription = initialValues?.description ?? "";
  const [values, setValues] = useState<DeckFormValues>({
    name: initialName,
    description: initialDescription,
  });

  useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 48rem)")
        : null;

    if (!mediaQuery?.matches) {
      return;
    }

    nameInputRef.current?.focus();
  }, []);

  const clientFieldErrors = useMemo(() => {
    const errors: Record<string, string | undefined> = {};

    if (values.name.trim().length === 0) {
      errors.name = "A deck must have a name to get started.";
    }

    return errors;
  }, [values.name]);

  const isDirty =
    values.name !== initialName ||
    values.description !== initialDescription;

  const submitDisabled =
    isSubmitting ||
    Boolean(clientFieldErrors.name) ||
    (disableIfUnchanged ? !isDirty : false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    onSubmit({
      name: values.name.trim(),
      description: values.description.trim() ? values.description.trim() : null,
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
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
          ref={nameInputRef}
          id="deckName"
          name="deckName"
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          className="field-input"
          aria-invalid={Boolean(fieldErrors?.name || clientFieldErrors.name)}
          aria-describedby="deck-name-help deck-name-error"
          maxLength={MAX_NAME_LENGTH}
        />
        <p id="deck-name-help" className="flat-list__meta" style={{ marginTop: "0.35rem" }}>
          e.g., Spanish Travel Phrases, JLPT N5 Vocabulary
        </p>
        <p className="flat-list__meta" style={{ marginTop: "0.2rem" }}>
          {values.name.length}/{MAX_NAME_LENGTH}
        </p>
        <p id="deck-name-error" className="field-error" aria-live="polite">
          {fieldErrors?.name ?? clientFieldErrors.name ?? ""}
        </p>
      </div>

      <div>
        <label htmlFor="deckDescription" className="field-label">
          Description
        </label>
        <textarea
          id="deckDescription"
          name="deckDescription"
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
          className="field-input field-input--textarea"
          aria-invalid={Boolean(fieldErrors?.description)}
          aria-describedby="deck-description-help deck-description-error"
          maxLength={MAX_DESCRIPTION_LENGTH}
        />
        <p id="deck-description-help" className="flat-list__meta" style={{ marginTop: "0.35rem" }}>
          Add context on what you are learning in this deck.
        </p>
        <p className="flat-list__meta" style={{ marginTop: "0.2rem" }}>
          {values.description.length}/{MAX_DESCRIPTION_LENGTH}
        </p>
        <p id="deck-description-error" className="field-error" aria-live="polite">
          {fieldErrors?.description ?? ""}
        </p>
      </div>

      <button type="submit" disabled={submitDisabled} className="button button--primary">
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
};
