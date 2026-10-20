import { describe, expect, it } from 'vitest';
import { fromEditorHtml, isoToLocal, localToIso, toEditorHtml } from '../html';

const API = 'http://localhost:3000';

describe('editor html', () => {
  it('makes upload paths absolute for editing and back again', () => {
    const stored = '<p>x</p><img src="/uploads/a.png" alt="">';
    const editing = toEditorHtml(stored, API);
    expect(editing).toContain(`src="${API}/uploads/a.png"`);
    expect(fromEditorHtml(editing, API)).toBe(stored);
  });
  it('leaves other images alone', () => {
    const html = '<img src="https://cdn.example/x.png">';
    expect(toEditorHtml(html, API)).toBe(html);
  });
});

describe('datetime helpers', () => {
  it('round-trips through the local input format', () => {
    const iso = localToIso('2026-10-20T08:30');
    expect(iso).not.toBeNull();
    expect(isoToLocal(iso)).toBe('2026-10-20T08:30');
  });
  it('treats empty and invalid as null/empty', () => {
    expect(localToIso('')).toBeNull();
    expect(localToIso('nope')).toBeNull();
    expect(isoToLocal(null)).toBe('');
  });
});
