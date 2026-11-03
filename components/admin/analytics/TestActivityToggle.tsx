'use client';

/**
 * "Include test activity". Off by default: every business number excludes
 * activity an admin confirmed as test (a marked test device, a marked
 * session, a lead or request marked test). On shows real and test together.
 * Raw records are never hidden or changed either way.
 */
export function TestActivityToggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label id={id} className="admin-test-toggle" htmlFor={`${id}-input`}>
      <input id={`${id}-input`} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>Include test activity</span>
    </label>
  );
}
