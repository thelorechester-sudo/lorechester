/**
 * Catch-all error summary for admin forms.
 *
 * `fieldErrors()` keys nested Zod issues by path — "images.0.url" — and no
 * form renders a field with that name, so those failures used to make the
 * Save button do nothing at all with no explanation. This lists every error
 * the form did not already display next to a field.
 */
export function FormErrors({
  errors,
  /** Keys the form renders itself, so they are not repeated here. */
  handled = [],
  className,
}: {
  errors: Record<string, string>;
  handled?: string[];
  className?: string;
}) {
  const entries = Object.entries(errors).filter(
    ([key]) => key !== "_form" && !handled.includes(key),
  );

  if (!errors._form && entries.length === 0) return null;

  return (
    <div
      role="alert"
      className={
        "rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent " +
        (className ?? "")
      }
    >
      {errors._form && <p>{errors._form}</p>}

      {entries.length > 0 && (
        <>
          <p className="font-medium">This couldn&apos;t be saved:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {entries.map(([key, message]) => (
              <li key={key}>
                <span className="font-mono text-xs">{key}</span> — {message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
