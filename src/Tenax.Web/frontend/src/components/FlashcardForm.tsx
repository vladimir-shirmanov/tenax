import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

type FlashcardFormValues = {
  term: string;
  definition: string;
  imageUrl: string;
};

const flashcardFormSchema = z.object({
  term: z.string().trim().min(1, "Term is required"),
  definition: z.string().trim().min(1, "Definition is required"),
  imageUrl: z.string(),
});

type FlashcardFormProps = {
  initialValues?: Partial<FlashcardFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  formError?: string;
  fieldErrors?: Record<string, string | undefined>;
  disableIfUnchanged?: boolean;
  onCancel?: () => void;
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
  disableIfUnchanged,
  onCancel,
  onSubmit,
}: FlashcardFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, dirtyFields, touchedFields, isDirty, isValid },
  } = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    mode: "all",
    defaultValues: {
      term: initialValues?.term ?? "",
      definition: initialValues?.definition ?? "",
      imageUrl: initialValues?.imageUrl ?? "",
    },
  });

  const values = useWatch({
    control,
    defaultValue: {
      term: initialValues?.term ?? "",
      definition: initialValues?.definition ?? "",
      imageUrl: initialValues?.imageUrl ?? "",
    },
  });

  const showTermError = Boolean(dirtyFields.term || touchedFields.term);
  const showDefinitionError = Boolean(dirtyFields.definition || touchedFields.definition);
  const showImageUrlError = Boolean(dirtyFields.imageUrl || touchedFields.imageUrl);

  const visibleTermError = showTermError
    ? fieldErrors?.term ?? errors.term?.message
    : undefined;
  const visibleDefinitionError = showDefinitionError
    ? fieldErrors?.definition ?? errors.definition?.message
    : undefined;
  const visibleImageUrlError = showImageUrlError
    ? fieldErrors?.imageUrl
    : undefined;

  const submitDisabled = isSubmitting || !isValid || (disableIfUnchanged ? !isDirty : false);
  const termDescribedBy = visibleTermError ? "term-count term-error" : "term-count";
  const definitionDescribedBy = visibleDefinitionError
    ? "definition-count definition-error"
    : "definition-count";
  const imageUrlDescribedBy = visibleImageUrlError ? "imageUrl-count imageUrl-error" : "imageUrl-count";
  const submitValues = (values: FlashcardFormValues) => {
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
    <form className="form-grid" onSubmit={handleSubmit(submitValues)} noValidate>
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
          className="field-input"
          aria-invalid={Boolean(visibleTermError)}
          aria-describedby={termDescribedBy}
          maxLength={200}
          {...register("term")}
        />
        <p id="term-count" className="field-hint" style={{ marginTop: "0.2rem" }}>
          {(values?.term ?? "").length}/200
        </p>
        {visibleTermError ? (
          <p id="term-error" className="field-error">
            {visibleTermError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="definition" className="field-label">
          Definition
        </label>
        <textarea
          id="definition"
          className="field-input field-input--textarea"
          aria-invalid={Boolean(visibleDefinitionError)}
          aria-describedby={definitionDescribedBy}
          maxLength={2000}
          {...register("definition")}
        />
        <p id="definition-count" className="field-hint" style={{ marginTop: "0.2rem" }}>
          {(values?.definition ?? "").length}/2000
        </p>
        {visibleDefinitionError ? (
          <p id="definition-error" className="field-error">
            {visibleDefinitionError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="imageUrl" className="field-label">
          Image URL (optional)
        </label>
        <input
          id="imageUrl"
          type="url"
          className="field-input"
          aria-invalid={Boolean(visibleImageUrlError)}
          aria-describedby={imageUrlDescribedBy}
          maxLength={2048}
          {...register("imageUrl")}
        />
        <p id="imageUrl-count" className="field-hint" style={{ marginTop: "0.2rem" }}>
          {(values?.imageUrl ?? "").length}/2048
        </p>
        {visibleImageUrlError ? (
          <p id="imageUrl-error" className="field-error">
            {visibleImageUrlError}
          </p>
        ) : null}
      </div>

      <div className="section-row" style={{ justifyContent: "flex-start", gap: "0.6rem" }}>
        <button
          type="submit"
          disabled={submitDisabled}
          className="button button--primary"
        >
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
