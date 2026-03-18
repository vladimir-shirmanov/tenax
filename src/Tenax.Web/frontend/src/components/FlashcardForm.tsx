import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields, touchedFields, isValid },
  } = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    mode: "all",
    defaultValues: {
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

  const submitDisabled = isSubmitting || !isValid;
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
          aria-describedby={visibleTermError ? "term-error" : undefined}
          maxLength={200}
          {...register("term")}
        />
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
          aria-describedby={visibleDefinitionError ? "definition-error" : undefined}
          maxLength={2000}
          {...register("definition")}
        />
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
          aria-describedby={visibleImageUrlError ? "imageUrl-error" : undefined}
          maxLength={2048}
          {...register("imageUrl")}
        />
        {visibleImageUrlError ? (
          <p id="imageUrl-error" className="field-error">
            {visibleImageUrlError}
          </p>
        ) : null}
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
