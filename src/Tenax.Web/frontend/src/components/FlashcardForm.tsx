import { FormEvent, useMemo, useState } from "react";

type FlashcardFormValues = {
  term: string;
  definition: string;
  imageUrl: string;
};

type FlashcardFormProps = {
  initialValues?: Partial<FlashcardFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  formError?: string;
  fieldErrors?: Record<string, string | undefined>;
  onSubmit: (payload: {
    term: string;
    definition: string;
    imageUrl: string | null;
  }) => void;
};

export const FlashcardForm = ({
  initialValues,
  submitLabel,
  isSubmitting,
  formError,
  fieldErrors,
  onSubmit,
}: FlashcardFormProps) => {
  const [values, setValues] = useState<FlashcardFormValues>({
    term: initialValues?.term ?? "",
    definition: initialValues?.definition ?? "",
    imageUrl: initialValues?.imageUrl ?? "",
  });

  const clientFieldErrors = useMemo(() => {
    const errors: Record<string, string | undefined> = {};

    if (values.term.trim().length === 0) {
      errors.term = "Term is required";
    }

    if (values.definition.trim().length === 0) {
      errors.definition = "Definition is required";
    }

    return errors;
  }, [values.term, values.definition]);

  const submitDisabled =
    isSubmitting || Boolean(clientFieldErrors.term || clientFieldErrors.definition);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    onSubmit({
      term: values.term.trim(),
      definition: values.definition.trim(),
      imageUrl: values.imageUrl.trim() ? values.imageUrl.trim() : null,
    });
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <div role="alert" className="alert">
          {formError}
        </div>
      ) : null}

      <div>
        <label htmlFor="term" className="field-label">
          Term or phrase
        </label>
        <input
          id="term"
          name="term"
          value={values.term}
          onChange={(event) => setValues((prev) => ({ ...prev, term: event.target.value }))}
          className="field-input"
          aria-invalid={Boolean(fieldErrors?.term || clientFieldErrors.term)}
          aria-describedby="term-error"
          maxLength={200}
        />
        <p id="term-error" className="field-error">
          {fieldErrors?.term ?? clientFieldErrors.term ?? ""}
        </p>
      </div>

      <div>
        <label htmlFor="definition" className="field-label">
          Definition
        </label>
        <textarea
          id="definition"
          name="definition"
          value={values.definition}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, definition: event.target.value }))
          }
          className="field-input field-input--textarea"
          aria-invalid={Boolean(fieldErrors?.definition || clientFieldErrors.definition)}
          aria-describedby="definition-error"
          maxLength={2000}
        />
        <p id="definition-error" className="field-error">
          {fieldErrors?.definition ?? clientFieldErrors.definition ?? ""}
        </p>
      </div>

      <div>
        <label htmlFor="imageUrl" className="field-label">
          Image URL (optional)
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          value={values.imageUrl}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, imageUrl: event.target.value }))
          }
          className="field-input"
          aria-invalid={Boolean(fieldErrors?.imageUrl)}
          aria-describedby="imageUrl-error"
          maxLength={2048}
        />
        <p id="imageUrl-error" className="field-error">
          {fieldErrors?.imageUrl ?? ""}
        </p>
      </div>

      <button
        type="submit"
        disabled={submitDisabled}
        className="button button--primary"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
};
