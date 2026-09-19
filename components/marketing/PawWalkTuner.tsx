'use client';

import { useState } from 'react';
import {
  PAW_WALK_DEFAULTS,
  type PawWalkTuning,
} from '@/lib/marketing/paw-walk-tuning';

interface Field {
  key: keyof PawWalkTuning;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint: string;
}

/** Order here is the order in the panel: size, then pace, then weight. */
const FIELDS: Field[] = [
  { key: 'size', label: 'Paw size', min: 20, max: 110, step: 1, unit: 'px', hint: 'Print width. Stride scales with it.' },
  { key: 'strideRatio', label: 'Stride', min: 1.4, max: 7, step: 0.05, unit: '×', hint: 'Gap between prints, in paw widths. Bigger = fewer, longer steps.' },
  { key: 'stepDuration', label: 'Footfall', min: 0.002, max: 0.06, step: 0.001, hint: 'How much scroll one print takes to land. Lower = snappier.' },
  { key: 'scrub', label: 'Scrub lag', min: 0, max: 2, step: 0.05, unit: 's', hint: 'Catch-up time. Higher = looser, floatier trail.' },
  { key: 'lead', label: 'Land line', min: 0.3, max: 1, step: 0.01, hint: 'How far down the screen a print lands. 0.72 = just below centre.' },
  { key: 'opacity', label: 'Opacity', min: 0.04, max: 1, step: 0.01, hint: 'Resting opacity once landed.' },
  { key: 'trackHalfWidth', label: 'Track width', min: 0, max: 70, step: 1, unit: 'px', hint: 'How far each print sits off the route line.' },
];

const panel: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 99999,
  width: 288,
  padding: '14px 16px 16px',
  borderRadius: 12,
  background: 'rgba(24,23,21,0.94)',
  color: '#f3ecd9',
  font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(6px)',
};

const button: React.CSSProperties = {
  flex: 1,
  padding: '7px 8px',
  borderRadius: 7,
  border: '1px solid rgba(243,236,217,0.25)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

/**
 * Dev-only tuner for the home paw walk (`?pawtune`). Never rendered in
 * production — HomePawWalk gates it on pawWalkDevFlags(). "Copy values" puts a
 * ready-to-paste PAW_WALK_DEFAULTS block on the clipboard.
 */
export default function PawWalkTuner({
  tuning,
  measuredSize,
  onChange,
}: {
  tuning: PawWalkTuning;
  measuredSize: number;
  onChange: (next: PawWalkTuning) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  /** idle → saving → saved/failed, shown on the Save path button. */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // size 0 means "whatever the CSS clamp resolves to" — show that number so
  // the slider starts where the trail actually is rather than at zero.
  const shown = (key: keyof PawWalkTuning) =>
    key === 'size' && tuning.size === 0 ? measuredSize : tuning[key];

  const copyValues = async () => {
    const body = FIELDS.map((f) => `  ${f.key}: ${shown(f.key)},`).join('\n');
    await navigator.clipboard.writeText(
      `export const PAW_WALK_DEFAULTS: PawWalkTuning = {\n${body}\n};`
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  /**
   * Writes the route as currently dragged into lib/marketing/paw-walk-path.ts.
   * The editor publishes __pawWalkPathSave when ?pawpath is on; without it
   * there is no path to save.
   */
  const savePath = async () => {
    const save = (window as unknown as { __pawWalkPathSave?: () => Promise<{ ok?: boolean }> })
      .__pawWalkPathSave;
    if (!save) {
      setSaveState('failed');
      window.setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    setSaveState('saving');
    try {
      const result = await save();
      setSaveState(result?.ok ? 'saved' : 'failed');
    } catch {
      setSaveState('failed');
    }
    window.setTimeout(() => setSaveState('idle'), 1800);
  };

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'failed' ? 'Failed' : 'Save path';

  return (
    <div id="paw-walk-tuner-panel" style={{ ...panel, paddingBottom: open ? 16 : 12 }}>
      <div
        id="paw-walk-tuner-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 12 : 0 }}
      >
        <strong style={{ letterSpacing: '0.04em' }}>PAW WALK</strong>
        <button
          id="paw-walk-tuner-collapse"
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ ...button, flex: 'none', padding: '3px 9px' }}
        >
          {open ? '–' : '+'}
        </button>
      </div>

      {open && (
        <>
          {FIELDS.map((f) => (
            <label key={f.key} id={`paw-walk-tuner-field-${f.key}`} style={{ display: 'block', marginBottom: 10 }} title={f.hint}>
              <span style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                <span>{f.label}</span>
                <span>
                  {shown(f.key)}
                  {f.unit ?? ''}
                </span>
              </span>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={shown(f.key)}
                onChange={(e) => onChange({ ...tuning, [f.key]: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#9aab7a' }}
              />
            </label>
          ))}

          <div id="paw-walk-tuner-actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" style={button} onClick={() => onChange({ ...PAW_WALK_DEFAULTS })}>
              Reset
            </button>
            <button type="button" style={button} onClick={copyValues}>
              {copied ? 'Copied' : 'Copy values'}
            </button>
          </div>
          <div id="paw-walk-tuner-path-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              id="paw-walk-tuner-save-path"
              style={button}
              onClick={savePath}
              title="Write the dragged route into lib/marketing/paw-walk-path.ts"
            >
              {saveLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
