import { useEffect, useRef, type ChangeEvent } from 'react';
import { api, apiBaseUrl } from '../lib/api';
import { fromEditorHtml, toEditorHtml } from '../lib/html';
import { errorText } from '../lib/use-load';

type Props = {
  /** Html loaded once on mount (use `key` to reload another post). */
  initialHtml: string;
  onChange(html: string): void;
  onError(message: string): void;
};

const BLOCKS: { label: string; tag: string }[] = [
  { label: 'Đoạn', tag: 'p' },
  { label: 'Tiêu đề lớn', tag: 'h2' },
  { label: 'Tiêu đề nhỏ', tag: 'h3' },
  { label: 'Trích dẫn', tag: 'blockquote' },
];

/**
 * Minimal rich-text editor on contentEditable. It produces plain html that the API sanitizes on save
 * (only a small tag set survives), so no editor library is needed.
 */
export function RichEditor({ initialHtml, onChange, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = toEditorHtml(initialHtml, apiBaseUrl());
    // initial content only; the editor owns the DOM afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(fromEditorHtml(ref.current?.innerHTML ?? '', apiBaseUrl()));
  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    emit();
  };

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { url } = await api<{ url: string }>('/admin/uploads', { method: 'POST', body: fd });
      exec('insertImage', `${apiBaseUrl()}${url}`);
    } catch (err) {
      onError(errorText(err));
    }
  }

  function link() {
    const url = window.prompt('Địa chỉ liên kết (https://…)');
    if (url && /^https?:\/\//i.test(url.trim())) exec('createLink', url.trim());
    else if (url) onError('Liên kết phải bắt đầu bằng http:// hoặc https://');
  }

  return (
    <div className="editor">
      <div className="toolbar" role="toolbar" aria-label="Định dạng bài viết">
        {BLOCKS.map((b) => (
          <button key={b.tag} type="button" className="btn secondary" onClick={() => exec('formatBlock', b.tag)}>
            {b.label}
          </button>
        ))}
        <button type="button" className="btn secondary" onClick={() => exec('bold')}>
          <b>Đậm</b>
        </button>
        <button type="button" className="btn secondary" onClick={() => exec('italic')}>
          <i>Nghiêng</i>
        </button>
        <button type="button" className="btn secondary" onClick={() => exec('insertUnorderedList')}>
          Danh sách
        </button>
        <button type="button" className="btn secondary" onClick={() => exec('insertOrderedList')}>
          Danh sách số
        </button>
        <button type="button" className="btn secondary" onClick={link}>
          Liên kết
        </button>
        <label className="btn secondary" htmlFor="editor-image">
          Chèn ảnh
        </label>
        <input id="editor-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={upload} />
      </div>
      <div
        ref={ref}
        className="editor-body post-preview"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung bài viết"
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
