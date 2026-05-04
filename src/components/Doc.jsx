import { useEffect, useRef } from 'react';

const TOOLS = [
  { cmd: 'bold', label: 'B', title: 'Bold (Ctrl+B)', style: { fontWeight: 700 } },
  { cmd: 'italic', label: 'I', title: 'Italic (Ctrl+I)', style: { fontStyle: 'italic' } },
  { cmd: 'underline', label: 'U', title: 'Underline (Ctrl+U)', style: { textDecoration: 'underline' } },
  { cmd: 'strikeThrough', label: 'S', title: 'Strikethrough', style: { textDecoration: 'line-through' } },
];

const BLOCKS = [
  { value: 'P', label: 'Normal' },
  { value: 'H1', label: 'Heading 1' },
  { value: 'H2', label: 'Heading 2' },
  { value: 'H3', label: 'Heading 3' },
  { value: 'BLOCKQUOTE', label: 'Quote' },
  { value: 'PRE', label: 'Code' },
];

export default function Doc({ tab, onChange }) {
  const ref = useRef(null);

  // Initialize content once per tab id.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (tab.html || '')) {
      ref.current.innerHTML = tab.html || '<p></p>';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  function exec(cmd, value = null) {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    handleInput();
  }

  function handleInput() {
    if (ref.current) onChange({ html: ref.current.innerHTML });
  }

  function setBlock(tag) {
    exec('formatBlock', tag);
  }

  return (
    <div className="doc">
      <div className="doc-toolbar">
        <select
          className="block-select"
          defaultValue="P"
          onChange={(e) => setBlock(e.target.value)}
          title="Paragraph style"
        >
          {BLOCKS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        <span className="tool-sep" />
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            className="tool-btn"
            title={t.title}
            style={t.style}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(t.cmd);
            }}
          >
            {t.label}
          </button>
        ))}
        <span className="tool-sep" />
        <button className="tool-btn" title="Bullet list" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}>•</button>
        <button className="tool-btn" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }}>1.</button>
        <span className="tool-sep" />
        <button className="tool-btn" title="Align left" onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }}>⯇</button>
        <button className="tool-btn" title="Align center" onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }}>≡</button>
        <button className="tool-btn" title="Align right" onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }}>⯈</button>
        <span className="tool-sep" />
        <button
          className="tool-btn"
          title="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt('Link URL:', 'https://');
            if (url) exec('createLink', url);
          }}
        >
          🔗
        </button>
        <button
          className="tool-btn"
          title="Clear formatting"
          onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}
        >
          ⌫
        </button>
      </div>

      <div className="doc-page-wrap">
        <div
          ref={ref}
          className="doc-page"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          spellCheck
        />
      </div>
    </div>
  );
}
