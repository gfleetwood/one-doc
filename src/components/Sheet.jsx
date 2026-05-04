import { useEffect, useMemo, useRef, useState } from 'react';
import { cellKey, evalCell, indexToColLetter } from '../utils/formula.js';

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26;

export default function Sheet({ tab, onChange }) {
  const rows = tab.rows || DEFAULT_ROWS;
  const cols = tab.cols || DEFAULT_COLS;
  const cells = tab.cells || {};
  const [sel, setSel] = useState({ row: 0, col: 0 });
  const [editing, setEditing] = useState(null); // { row, col, value }
  const formulaRef = useRef(null);
  const gridRef = useRef(null);

  const selKey = cellKey(sel.row, sel.col);
  const selRaw = cells[selKey] ?? '';

  // Memoized computed values for visible cells.
  const computed = useMemo(() => {
    const out = {};
    for (const k of Object.keys(cells)) {
      out[k] = evalCell(cells[k], cells, new Set(), k);
    }
    return out;
  }, [cells]);

  function setCell(key, value) {
    const next = { ...cells };
    if (value === '' || value == null) delete next[key];
    else next[key] = value;
    onChange({ cells: next });
  }

  function commitEdit(nextSel) {
    if (editing) {
      setCell(cellKey(editing.row, editing.col), editing.value);
      setEditing(null);
    }
    if (nextSel) setSel(nextSel);
  }

  function onCellMouseDown(row, col) {
    commitEdit({ row, col });
    gridRef.current?.focus();
  }

  function onCellDoubleClick(row, col) {
    const k = cellKey(row, col);
    setEditing({ row, col, value: cells[k] ?? '' });
  }

  function onKeyDown(e) {
    if (editing) return;
    const { row, col } = sel;
    const move = (dr, dc) => {
      e.preventDefault();
      setSel({
        row: Math.max(0, Math.min(rows - 1, row + dr)),
        col: Math.max(0, Math.min(cols - 1, col + dc)),
      });
    };
    if (e.key === 'ArrowUp') return move(-1, 0);
    if (e.key === 'ArrowDown') return move(1, 0);
    if (e.key === 'ArrowLeft') return move(0, -1);
    if (e.key === 'ArrowRight' || e.key === 'Tab') return move(0, e.shiftKey ? -1 : 1);
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditing({ row, col, value: cells[selKey] ?? '' });
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      setCell(selKey, '');
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      setEditing({ row, col, value: e.key });
      e.preventDefault();
    }
  }

  function onEditKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit({ row: Math.min(rows - 1, sel.row + 1), col: sel.col });
      gridRef.current?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit({ row: sel.row, col: Math.min(cols - 1, sel.col + 1) });
      gridRef.current?.focus();
    } else if (e.key === 'Escape') {
      setEditing(null);
      gridRef.current?.focus();
    }
  }

  useEffect(() => {
    gridRef.current?.focus();
  }, [tab.id]);

  const headerCols = Array.from({ length: cols }, (_, i) => i);
  const headerRows = Array.from({ length: rows }, (_, i) => i);

  return (
    <div className="sheet">
      <div className="formula-bar">
        <div className="cell-name">{selKey}</div>
        <div className="fx">fx</div>
        <input
          ref={formulaRef}
          className="formula-input"
          value={editing ? editing.value : (selRaw ?? '')}
          onChange={(e) => setEditing({ row: sel.row, col: sel.col, value: e.target.value })}
          onFocus={() => {
            if (!editing) setEditing({ row: sel.row, col: sel.col, value: selRaw ?? '' });
          }}
          onBlur={() => commitEdit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitEdit();
              gridRef.current?.focus();
            }
          }}
          placeholder="Enter a value or formula starting with ="
        />
      </div>

      <div className="grid-wrap" tabIndex={0} ref={gridRef} onKeyDown={onKeyDown}>
        <table className="grid">
          <thead>
            <tr>
              <th className="corner"></th>
              {headerCols.map((c) => (
                <th key={c} className={`col-h ${sel.col === c ? 'hl' : ''}`}>
                  {indexToColLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {headerRows.map((r) => (
              <tr key={r}>
                <th className={`row-h ${sel.row === r ? 'hl' : ''}`}>{r + 1}</th>
                {headerCols.map((c) => {
                  const k = cellKey(r, c);
                  const isSel = sel.row === r && sel.col === c;
                  const isEditing = editing && editing.row === r && editing.col === c;
                  const display =
                    computed[k] !== undefined ? computed[k] : cells[k] ?? '';
                  return (
                    <td
                      key={c}
                      className={`cell ${isSel ? 'selected' : ''}`}
                      onMouseDown={() => onCellMouseDown(r, c)}
                      onDoubleClick={() => onCellDoubleClick(r, c)}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          className="cell-edit"
                          value={editing.value}
                          onChange={(e) =>
                            setEditing({ row: r, col: c, value: e.target.value })
                          }
                          onBlur={() => commitEdit()}
                          onKeyDown={onEditKeyDown}
                        />
                      ) : (
                        <span className={typeof display === 'number' ? 'num' : ''}>
                          {String(display)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
