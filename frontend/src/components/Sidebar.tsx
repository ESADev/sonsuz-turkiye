import type { ElementSummary } from '../types';
import './Sidebar.css';

type SidebarProps = {
  seeds: ElementSummary[];
  discoveries: ElementSummary[];
  onSelect: (element: ElementSummary) => void;
  selectedIds: number[];
  activeSlot: 'first' | 'second';
};

export function Sidebar({ seeds, discoveries, onSelect, selectedIds, activeSlot }: SidebarProps) {
  const activeLabel = activeSlot === 'first' ? '1. element' : '2. element';

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <h2>Elementler</h2>
        <p>Şu an {activeLabel} için seçim yapıyorsun.</p>
      </header>
      <section>
        <h3>Başlangıç</h3>
        {seeds.map((element) => (
          <SidebarRow
            key={element.id}
            element={element}
            onClick={() => onSelect(element)}
            isSelected={selectedIds.includes(element.id)}
          />
        ))}
      </section>
      <section>
        <h3>Keşiflerim</h3>
        {discoveries.length === 0 && <p className="sidebar__empty">Henüz keşif yok.</p>}
        {discoveries.map((element) => (
          <SidebarRow
            key={element.id}
            element={element}
            onClick={() => onSelect(element)}
            isSelected={selectedIds.includes(element.id)}
          />
        ))}
      </section>
    </aside>
  );
}

type SidebarRowProps = {
  element: ElementSummary;
  onClick: () => void;
  isSelected: boolean;
};

function SidebarRow({ element, onClick, isSelected }: SidebarRowProps) {
  return (
    <button
      type="button"
      className={isSelected ? 'sidebar-row sidebar-row--selected' : 'sidebar-row'}
      onClick={onClick}
    >
      <span className="sidebar-row__emoji">{element.emoji}</span>
      <span className="sidebar-row__name">{element.name_tr}</span>
    </button>
  );
}
