import { useEffect, useMemo, useState } from 'react';
import { combineElements, fetchElements } from './lib/api';
import type { ElementSummary } from './types';
import './App.css';

type ActiveSlot = 'first' | 'second';

export default function App() {
  const [elements, setElements] = useState<ElementSummary[]>([]);
  const [selectedFirst, setSelectedFirst] = useState<ElementSummary | null>(null);
  const [selectedSecond, setSelectedSecond] = useState<ElementSummary | null>(null);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>('first');
  const [output, setOutput] = useState<ElementSummary | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadElements();
  }, []);

  async function loadElements() {
    try {
      setError(null);
      const data = await fetchElements();
      setElements(data);
    } catch (err) {
      console.error(err);
      setError('Elementler yüklenemedi.');
    }
  }

  const seeds = useMemo(() => elements.filter((element) => element.is_seed), [elements]);
  const discoveries = useMemo(
    () => elements.filter((element) => !element.is_seed),
    [elements]
  );

  function handleSelect(element: ElementSummary) {
    setError(null);
    if (activeSlot === 'first') {
      setSelectedFirst(element);
      setActiveSlot('second');
    } else {
      setSelectedSecond(element);
      setActiveSlot('first');
    }
  }

  function isSelected(element: ElementSummary): boolean {
    return (
      (!!selectedFirst && selectedFirst.id === element.id) ||
      (!!selectedSecond && selectedSecond.id === element.id)
    );
  }

  async function handleCombine() {
    if (!selectedFirst || !selectedSecond || isCombining) {
      return;
    }

    setIsCombining(true);
    setOutput(null);
    setError(null);

    try {
      const response = await combineElements(selectedFirst.id, selectedSecond.id);
      setOutput(response.element);
      setElements((prev) => {
        const exists = prev.some((item) => item.id === response.element.id);
        return exists ? prev : [...prev, response.element];
      });
    } catch (err) {
      console.error(err);
      setError('Birleştirme başarısız oldu.');
    } finally {
      setIsCombining(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Sonsuz Türkiye</h1>
        <p>İki elementi seç, karıştır ve yeni keşifler yap.</p>
      </header>
      <div className="app__content">
        <aside className="sidebar">
          <div className="sidebar__section">
            <h2>Elementler</h2>
            <ul className="element-list">
              {seeds.map((element) => (
                <li key={element.id}>
                  <button
                    type="button"
                    className={`element ${isSelected(element) ? 'element--selected' : ''}`}
                    onClick={() => handleSelect(element)}
                  >
                    <span className="element__emoji">{element.emoji}</span>
                    <span className="element__name">{element.name_tr}</span>
                  </button>
                </li>
              ))}
              {discoveries.length > 0 && <li className="element-list__divider" />}
              {discoveries.map((element) => (
                <li key={element.id}>
                  <button
                    type="button"
                    className={`element ${isSelected(element) ? 'element--selected' : ''}`}
                    onClick={() => handleSelect(element)}
                  >
                    <span className="element__emoji">{element.emoji}</span>
                    <span className="element__name">{element.name_tr}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="sidebar__section">
            <h3>Keşiflerim:</h3>
            {discoveries.length === 0 ? (
              <p className="sidebar__empty">Henüz keşif yok.</p>
            ) : (
              <ul className="discovery-list">
                {discoveries.map((element) => (
                  <li key={element.id}>
                    <span className="element__emoji">{element.emoji}</span>
                    <span className="element__name">{element.name_tr}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="board">
          <div className="board__status">
            <span>Aktif kutu: {activeSlot === 'first' ? 'Birinci' : 'İkinci'}</span>
          </div>
          <div className="board__slots">
            <button
              type="button"
              className={`slot ${activeSlot === 'first' ? 'slot--active' : ''}`}
              onClick={() => setActiveSlot('first')}
            >
              {selectedFirst ? (
                <div className="slot__content">
                  <span className="slot__emoji">{selectedFirst.emoji}</span>
                  <span className="slot__name">{selectedFirst.name_tr}</span>
                </div>
              ) : (
                <span className="slot__placeholder">Birinci elementi seç</span>
              )}
            </button>
            <button
              type="button"
              className={`slot ${activeSlot === 'second' ? 'slot--active' : ''}`}
              onClick={() => setActiveSlot('second')}
            >
              {selectedSecond ? (
                <div className="slot__content">
                  <span className="slot__emoji">{selectedSecond.emoji}</span>
                  <span className="slot__name">{selectedSecond.name_tr}</span>
                </div>
              ) : (
                <span className="slot__placeholder">İkinci elementi seç</span>
              )}
            </button>
            <div className="slot slot--output">
              {isCombining ? (
                <div className="spinner" aria-label="Yaratım yapılıyor" />
              ) : output ? (
                <div className="slot__content">
                  <span className="slot__emoji">{output.emoji}</span>
                  <span className="slot__name">{output.name_tr}</span>
                </div>
              ) : (
                <span className="slot__placeholder">Sonuç burada görünecek</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="create-button"
            onClick={handleCombine}
            disabled={!selectedFirst || !selectedSecond || isCombining}
          >
            Create!
          </button>
        </main>
      </div>
      {error && (
        <div className="app__error" role="status">
          {error}
        </div>
      )}
    </div>
  );
}
