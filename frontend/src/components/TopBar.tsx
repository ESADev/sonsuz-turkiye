import './TopBar.css';

type TopBarProps = {
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
};

export function TopBar({ onOpenSettings, onOpenAbout, onToggleTheme, isDark }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        <span className="topbar__emoji">🧩</span>
        <div>
          <h1>Sonsuz Türkiye</h1>
          <p>Türkiye internet kültürünü harmanlayan sonsuz crafting oyunu</p>
        </div>
      </div>
      <div className="topbar__actions">
        <button type="button" onClick={onOpenSettings} className="ghost">
          Ayarlar
        </button>
        <button type="button" onClick={onToggleTheme} className="ghost">
          Tema: {isDark ? 'Karanlık' : 'Aydınlık'}
        </button>
        <button type="button" onClick={onOpenAbout} className="accent">
          Hakkında
        </button>
      </div>
    </header>
  );
}
