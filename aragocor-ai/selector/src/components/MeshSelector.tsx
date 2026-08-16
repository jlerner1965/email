/* MeshSelector.tsx — the U.S. mesh button group.
 *
 * A radiogroup rather than a <select>, because the micron equivalent
 * and the "what this cut is for" note have to be visible while you are
 * choosing, not after. Roving tabindex and arrow keys, so it behaves
 * like the native control it replaces. */

import { useRef } from 'react';
import { MESH_CATALOG } from '../data/minerals';
import type { MeshSize } from '../types';

interface MeshSelectorProps {
  readonly options: readonly MeshSize[];
  readonly value: MeshSize;
  readonly onChange: (mesh: MeshSize) => void;
  /** Cut the chosen process is normally supplied at. */
  readonly recommended: MeshSize | null;
  readonly labelId: string;
}

export function MeshSelector({ options, value, onChange, recommended, labelId }: MeshSelectorProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = MESH_CATALOG[value];

  function move(from: number, delta: number) {
    const next = (from + delta + options.length) % options.length;
    const mesh = options[next];
    if (mesh === undefined) return;
    onChange(mesh);
    buttonRefs.current[next]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(index, -1);
        break;
      case 'Home': {
        event.preventDefault();
        const first = options[0];
        if (first !== undefined) {
          onChange(first);
          buttonRefs.current[0]?.focus();
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = options.length - 1;
        const last = options[lastIndex];
        if (last !== undefined) {
          onChange(last);
          buttonRefs.current[lastIndex]?.focus();
        }
        break;
      }
      default:
        break;
    }
  }

  return (
    <div>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((mesh, index) => {
          const option = MESH_CATALOG[mesh];
          const isSelected = mesh === value;
          const isRecommended = mesh === recommended;

          return (
            <button
              key={mesh}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(mesh)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative flex min-w-[92px] flex-col items-start rounded-md border px-3 py-2.5 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fluor-600 ${
                isSelected
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-600 hover:bg-ink-50'
              }`}
            >
              <span className="text-sm font-semibold tnum">{mesh} Mesh</span>
              <span
                className={`font-mono text-[11px] tnum ${isSelected ? 'text-ink-300' : 'text-ink-400'}`}
              >
                {option.micron} µm
              </span>
              {isRecommended && (
                <span
                  className={`absolute -top-2 right-2 rounded-full px-1.5 py-px font-mono text-[9px] tracking-wider uppercase ${
                    isSelected ? 'bg-fluor-500 text-white' : 'bg-fluor-100 text-fluor-700'
                  }`}
                >
                  Typical
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-ink-500"
      >
        <span aria-hidden="true" className="mt-[7px] h-px w-4 shrink-0 bg-ink-200" />
        <span>
          <strong className="font-semibold text-ink-700 tnum">
            {value} Mesh ({active.micron} µm)
          </strong>{' '}
          — {active.note}.
        </span>
      </p>
    </div>
  );
}
