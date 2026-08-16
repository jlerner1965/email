/* FormField.tsx — one labelled control, wired for screen readers.
 *
 * The error is rendered in the same place whether it came from a blur
 * or from a submit, and aria-describedby points at it, so the message
 * is announced rather than just drawn. */

import { forwardRef } from 'react';

interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly error?: string | undefined;
  readonly hint?: string;
  readonly type?: 'text' | 'email';
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly multiline?: boolean;
  readonly rows?: number;
  readonly disabled?: boolean;
}

export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  function FormField(
    {
      id,
      label,
      value,
      onChange,
      onBlur,
      error,
      hint,
      type = 'text',
      placeholder,
      autoComplete,
      multiline = false,
      rows = 3,
      disabled = false,
    },
    ref,
  ) {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

    const controlClass = `w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-colors duration-200 placeholder:text-ink-300 focus:outline-2 focus:outline-offset-0 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400 ${
      error
        ? 'border-hematite-600 focus:border-hematite-600 focus:outline-hematite-600'
        : 'border-ink-200 focus:border-fluor-600 focus:outline-fluor-600'
    }`;

    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-900">
          {label}
          <span className="ml-1 text-hematite-600" aria-hidden="true">
            *
          </span>
        </label>

        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            rows={rows}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className={`${controlClass} resize-y leading-relaxed`}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={id}
            type={type}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className={controlClass}
          />
        )}

        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-[12.5px] font-medium text-hematite-600">
            {error}
          </p>
        ) : (
          hint && (
            <p id={hintId} className="mt-1.5 text-[12.5px] text-ink-400">
              {hint}
            </p>
          )
        )}
      </div>
    );
  },
);
