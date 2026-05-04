import { useEffect, useRef, useState } from 'react';

export default function TabBar({ tabs, activeId, onSelect, onAdd, onDelete, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function startEdit(tab) {
    setEditingId(tab.id);
    setDraft(tab.name);
  }

  function commitEdit() {
    if (editingId) onRename(editingId, draft);
    setEditingId(null);
  }

  return (
    <div className="tabbar">
      <div className="tabbar-add" ref={menuRef}>
        <button
          className="tabbar-add-btn"
          title="Add new"
          onClick={() => setMenuOpen((o) => !o)}
        >
          +
        </button>
        {menuOpen && (
          <div className="tabbar-menu">
            <button
              onClick={() => {
                onAdd('sheet');
                setMenuOpen(false);
              }}
            >
              <span className="menu-ico sheet">▦</span> New sheet
            </button>
            <button
              onClick={() => {
                onAdd('doc');
                setMenuOpen(false);
              }}
            >
              <span className="menu-ico doc">📄</span> New doc
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              className={`tab ${isActive ? 'active' : ''} ${tab.type}`}
              onClick={() => onSelect(tab.id)}
              onDoubleClick={() => startEdit(tab)}
              title={`${tab.type === 'sheet' ? 'Sheet' : 'Doc'}: ${tab.name} (double-click to rename)`}
            >
              <span className="tab-ico">{tab.type === 'sheet' ? '▦' : '📄'}</span>
              {editingId === tab.id ? (
                <input
                  autoFocus
                  className="tab-edit"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="tab-name">{tab.name}</span>
              )}
              {tabs.length > 1 && (
                <button
                  className="tab-close"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${tab.name}"?`)) onDelete(tab.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
