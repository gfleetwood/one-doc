import { useEffect, useState } from 'react';
import TabBar from './components/TabBar.jsx';
import Sheet from './components/Sheet.jsx';
import Doc from './components/Doc.jsx';

const STORAGE_KEY = 'one-doc:workbook:v1';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeSheet(name = 'Sheet1') {
  return { id: uid(), type: 'sheet', name, cells: {}, rows: 100, cols: 26 };
}

function makeDoc(name = 'Doc1') {
  return { id: uid(), type: 'doc', name, html: '<p></p>' };
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length) return parsed;
    }
  } catch (_) {}
  const first = makeSheet('Sheet1');
  return { tabs: [first], activeId: first.id };
}

export default function App() {
  const [state, setState] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }, [state]);

  const active = state.tabs.find((t) => t.id === state.activeId) || state.tabs[0];

  function updateTab(id, patch) {
    setState((s) => ({
      ...s,
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }

  function addTab(type) {
    const sameType = state.tabs.filter((t) => t.type === type).length + 1;
    const tab = type === 'sheet' ? makeSheet(`Sheet${sameType}`) : makeDoc(`Doc${sameType}`);
    setState((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
  }

  function deleteTab(id) {
    setState((s) => {
      if (s.tabs.length === 1) return s;
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeId = s.activeId === id ? tabs[0].id : s.activeId;
      return { tabs, activeId };
    });
  }

  function renameTab(id, name) {
    if (!name.trim()) return;
    updateTab(id, { name: name.trim() });
  }

  function setActive(id) {
    setState((s) => ({ ...s, activeId: id }));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">▦</span>
          <span className="title">One Doc</span>
        </div>
        <div className="topbar-spacer" />
        <div className="topbar-meta">{active?.name}</div>
      </header>

      <main className="content">
        {active?.type === 'sheet' && (
          <Sheet
            key={active.id}
            tab={active}
            onChange={(patch) => updateTab(active.id, patch)}
          />
        )}
        {active?.type === 'doc' && (
          <Doc
            key={active.id}
            tab={active}
            onChange={(patch) => updateTab(active.id, patch)}
          />
        )}
      </main>

      <TabBar
        tabs={state.tabs}
        activeId={state.activeId}
        onSelect={setActive}
        onAdd={addTab}
        onDelete={deleteTab}
        onRename={renameTab}
      />
    </div>
  );
}
