/* Icons.tsx — line art on a 24×24 grid, drawn in currentColor so a
 * caller sets the colour with a text- utility and nothing else. Same
 * hairline language as the habit drawings in ../../js/catalog.js. */

import type { IconId } from '../types';

interface IconProps {
  readonly id: IconId;
  readonly className?: string;
}

const PATHS: Readonly<Record<IconId, React.ReactNode>> = {
  agriculture: (
    <>
      <path d="M3 21h18" />
      <path d="M12 21v-8.2" />
      <path d="M12 13c0-3.4-2.3-5.7-5.7-6.1 0 3.4 2.3 5.7 5.7 6.1Z" />
      <path d="M12 15.4c0-4 2.5-6.6 6.2-7 0 4-2.5 6.6-6.2 7Z" />
    </>
  ),
  glass: (
    <>
      <path d="M6 3h12l-1.8 8.4a4.4 4.4 0 0 1-8.4 0Z" />
      <path d="M12 15.6V21" />
      <path d="M8.4 21h7.2" />
      <path d="M7.1 7.4h9.8" opacity=".45" />
    </>
  ),
  water: (
    <>
      <path d="M12 3c3.7 4.2 5.5 7.3 5.5 9.6a5.5 5.5 0 1 1-11 0C6.5 10.3 8.3 7.2 12 3Z" />
      <path d="M9.1 13.2a2.9 2.9 0 0 0 2.9 2.9" opacity=".5" />
    </>
  ),
  construction: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21V6h12v15" />
      <path d="M6 6l12 15M18 6 6 21" opacity=".35" />
      <path d="M6 13.5h12" opacity=".35" />
    </>
  ),
  industrial: (
    <>
      <path d="M3 21h18" />
      <path d="M4 21V11l5 3.1V11l5 3.1V6h5v15" />
      <path d="M16.5 10.5h2M16.5 14h2" opacity=".45" />
    </>
  ),
};

export function Icon({ id, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[id]}
    </svg>
  );
}

export function CheckIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function ArrowIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function AlertIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.2M12 16.3v.2" />
    </svg>
  );
}
