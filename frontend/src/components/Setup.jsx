import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

export default function Setup({ onChange }) {
  const [tasks, setTasks] = useState([]);
  const [label, setLabel] = useState('');
  const [tools, setTools] = useState('');

  const load = async () => setTasks((await api.tasks()).tasks);
  useEffect(() => { load(); }, []);
  const refresh = async () => { await load(); onChange?.(); };

  const add = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    await api.addTask(label.trim(), tools.trim() || null);
    setLabel(''); setTools('');
    refresh();
  };

  // Every distinct tool mentioned across not-yet-done tasks = your shopping/bring list.
  const toolkit = useMemo(() => {
    const set = new Set();
    for (const t of tasks) {
      if (t.done) continue;
      (t.tools || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((tool) => set.add(tool.toLowerCase()));
    }
    return [...set].sort();
  }, [tasks]);

  return (
    <section>
      {toolkit.length > 0 && (
        <div className="card toolkit">
          <div className="field-label">🧰 Tools you'll need</div>
          <div className="chips">
            {toolkit.map((t) => <span className="chip" key={t}>{t}</span>)}
          </div>
        </div>
      )}

      <div className="card">
        {tasks.map((t) => (
          <div className={t.done ? 'task done' : 'task'} key={t.id}>
            <button className="check" onClick={() => api.updateTask(t.id, { done: t.done ? 0 : 1 }).then(refresh)}>
              {t.done ? '☑' : '☐'}
            </button>
            <div className="task-body">
              <span className="item-name">{t.label}</span>
              {t.tools && <span className="task-tools">needs: {t.tools}</span>}
            </div>
            <button className="icon danger" onClick={() => api.deleteTask(t.id).then(refresh)} title="Delete">✕</button>
          </div>
        ))}
        {tasks.length === 0 && <p className="muted small">No setup tasks yet.</p>}

        <form className="add-task" onSubmit={add}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a task (e.g. Mount the TV)" />
          <input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="tools needed, comma-separated" />
          <button>+ Task</button>
        </form>
      </div>
    </section>
  );
}
