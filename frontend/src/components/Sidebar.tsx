import type React from 'react';
import { useMemo, useState } from 'react';
import type { ElementSummary } from '../types';
import './Sidebar.css';

type SidebarProps = {
  elements: ElementSummary[];
  pinnedIds: number[];
  onTogglePin: (id: number) => void;
  onSpawn: (element: ElementSummary) => void;
  onSelectForCombine: (element: ElementSummary) => void;
};

export function Sidebar({ elements, pinnedIds, onTogglePin, onSpawn, onSelectForCombine }: SidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) {
      return elements;
    }
    const lowered = search.toLocaleLowerCase('tr');
    return elements.filter((el) => el.name_tr.toLocaleLowerCase('tr').includes(lowered));
  }, [elements, search]);

  const pinnedElements = filtered.filter((el) => pinnedIds.includes(el.id));
  const regularElements = filtered.filter((el) => !pinnedIds.includes(el.id));

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, element: ElementSummary) => {
    event.dataTransfer.setData('application/x-element-id', String(element.id));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2>Keşfettiklerin</h2>
        <input
          type="search"
          placeholder="Ara..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="sidebar__section" aria-label="Favoriler">
        {pinnedElements.length > 0 && <p className="sidebar__section-title">Sık Kullandıkların</p>}
        {pinnedElements.map((element) => (
          <SidebarRow
            key={`pinned-${element.id}`}
            element={element}
            isPinned
            onTogglePin={onTogglePin}
            onSpawn={onSpawn}
            onSelect={onSelectForCombine}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
      <div className="sidebar__section" aria-label="Tüm elementler">
        {regularElements.map((element) => (
          <SidebarRow
            key={element.id}
            element={element}
            isPinned={false}
            onTogglePin={onTogglePin}
            onSpawn={onSpawn}
            onSelect={onSelectForCombine}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </aside>
  );
}

type SidebarRowProps = {
  element: ElementSummary;
  isPinned: boolean;
  onTogglePin: (id: number) => void;
  onSpawn: (element: ElementSummary) => void;
  onSelect: (element: ElementSummary) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, element: ElementSummary) => void;
};

function SidebarRow({ element, isPinned, onTogglePin, onSpawn, onSelect, onDragStart }: SidebarRowProps) {
  return (
    <div
      className="sidebar-row"
      draggable
      onDragStart={(event) => onDragStart(event, element)}
      onDoubleClick={() => onSpawn(element)}
      onClick={() => onSelect(element)}
      title={element.description_tr ?? ''}
    >
      <span className="sidebar-row__emoji">{element.emoji}</span>
      <span className="sidebar-row__name">{element.name_tr}</span>
      <button
        type="button"
        className={isPinned ? 'pin pin--active' : 'pin'}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin(element.id);
        }}
        aria-label={isPinned ? 'Sabitlemeyi bırak' : 'Sık kullanılanlara ekle'}
      >
        📌
      </button>
    </div>
  );
}
