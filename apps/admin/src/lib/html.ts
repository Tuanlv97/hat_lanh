/** Stored posts keep image paths as `/uploads/...`; the editor needs them absolute to display. */
export function toEditorHtml(html: string, apiBase: string): string {
  return html.replace(/(\ssrc=["'])\/uploads\//gi, `$1${apiBase}/uploads/`);
}

/** Inverse of toEditorHtml: strips the API origin again so the saved html stays portable. */
export function fromEditorHtml(html: string, apiBase: string): string {
  return html.split(`${apiBase}/uploads/`).join('/uploads/');
}

/** `datetime-local` value (local wall clock) to an ISO string with offset, or null when empty/invalid. */
export function localToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string to a `datetime-local` value in the browser's time zone. */
export function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
