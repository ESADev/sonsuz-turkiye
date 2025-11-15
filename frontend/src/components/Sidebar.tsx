import type { DragEvent } from 'react';
import type { ElementSummary } from '../types';
import './Sidebar.css';

type SidebarProps = {
  elements: ElementSummary[];
  onSpawn: (elementId: number) => void;
};

export function Sidebar({ elements}: SidebarProps) {
  const seeds = elements.filter((element) => element.is_seed);
  const discoveries = elements.filter((element) => !element.is_seed);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, elementId: number) => {
    event.dataTransfer.setData('application/x-element-id', String(elementId));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="sidebar">
      <section>
        <h2>Başlangıç</h2>
        {seeds.map((element) => (
          <SidebarRow key={element.id} element={element} onDragStart={handleDragStart} />
        ))}
      </section>
      <section>
        <h2>Keşifler</h2>
        {discoveries.length === 0 && <p className="sidebar__empty">Henüz keşif yok.</p>}
        {discoveries.map((element) => (
          <SidebarRow key={element.id} element={element} onDragStart={handleDragStart} />
        ))}
      </section>
    </aside>
  );
}

type SidebarRowProps = {
  element: ElementSummary;
  onSpawn: (elementId: number) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, elementId: number) => void;
};

function SidebarRow({ element, onDragStart }: SidebarRowProps) {
  return (
    <div
      className="sidebar-row"
      draggable
      onDragStart={(event) => onDragStart(event, element.id)}
    >
      <span className="sidebar-row__emoji">{element.emoji}</span>
      <span className="sidebar-row__name">{element.name_tr}</span>
    </div>
  );
}
