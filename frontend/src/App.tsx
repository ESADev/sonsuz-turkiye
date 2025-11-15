import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { combineElements, fetchElements } from './lib/api';
import type { ElementSummary } from './types';
import './App.css';

type Slot = 'first' | 'second';

export default function App() {
  const [elements, setElements] = useState<ElementSummary[]>([]);
  const [activeSlot, setActiveSlot] = useState<Slot>('first');
  const [firstElementId, setFirstElementId] = useState<number | null>(null);
  const [secondElementId, setSecondElementId] = useState<number | null>(null);
  const [resultElement, setResultElement] = useState<ElementSummary | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadElements();
  }, []);

  const firstElement = useMemo(
    () => elements.find((item) => item.id === firstElementId) ?? null,
    [elements, firstElementId]
  );
  const secondElement = useMemo(
    () => elements.find((item) => item.id === secondElementId) ?? null,
    [elements, secondElementId]
  );

  async function loadElements() {
    try {
      setError(null);
      const data = await fetchElements();
      setElements(data);
    } catch (err) {
      setError('Elementler yüklenemedi.');
      console.error(err);
    }
  }

  function handleSelectElement(element: ElementSummary) {
    setError(null);
    if (activeSlot === 'first') {
      setFirstElementId(element.id);
      setActiveSlot('second');
    } else {
      setSecondElementId(element.id);
      setActiveSlot('first');
    }
  }

  function handleFocusSlot(slot: Slot) {
    setActiveSlot(slot);
  }

  async function handleCreate() {
    if (!firstElementId || !secondElementId) {
      setError('Lütfen iki element seçin.');
      return;
    }
    setIsCombining(true);
    setError(null);
    setResultElement(null);
    try {
      const response = await combineElements(firstElementId, secondElementId);
      setElements((prev) => {
        const exists = prev.some((item) => item.id === response.element.id);
        return exists ? prev : [...prev, response.element];
      });
      setResultElement(response.element);
    } catch (err) {
      console.error(err);
      setError('Oluşturma başarısız oldu.');
    } finally {
      setIsCombining(false);
    }
  }

  const selectedIds = [firstElementId, secondElementId].filter(
    (value): value is number => value !== null
  );

  const seeds = elements.filter((element) => element.is_seed);
  const discoveries = elements.filter((element) => !element.is_seed);

  return (
    <div className="app">
      <Sidebar
        seeds={seeds}
        discoveries={discoveries}
        onSelect={handleSelectElement}
        selectedIds={selectedIds}
        activeSlot={activeSlot}
      />
      <main className="app__main">
        <header className="app__header">
          <div>
            <h1>Sonsuz Türkiye</h1>
            <p>İki elementi seç, “Create!” de ve keşfet.</p>
          </div>
          <button
            type="button"
            className="create-button"
            onClick={handleCreate}
            disabled={
              isCombining || firstElementId === null || secondElementId === null
            }
          >
            Create!
          </button>
        </header>
        <section className="creation-area" aria-live="polite">
          <ElementSlot
            label="1. Element"
            element={firstElement}
            isActive={activeSlot === 'first'}
            onClick={() => handleFocusSlot('first')}
          />
          <span className="creation-area__operator">+</span>
          <ElementSlot
            label="2. Element"
            element={secondElement}
            isActive={activeSlot === 'second'}
            onClick={() => handleFocusSlot('second')}
          />
          <span className="creation-area__operator">=</span>
          <ResultSlot isLoading={isCombining} element={resultElement} />
        </section>
        {error && (
          <div className="app__error" role="status">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

type ElementSlotProps = {
  label: string;
  element: ElementSummary | null;
  isActive: boolean;
  onClick: () => void;
};

function ElementSlot({ label, element, isActive, onClick }: ElementSlotProps) {
  return (
    <button
      type="button"
      className={isActive ? 'element-slot element-slot--active' : 'element-slot'}
      onClick={onClick}
    >
      <span className="element-slot__label">{label}</span>
      {element ? (
        <span className="element-slot__content">
          <span className="element-slot__emoji">{element.emoji}</span>
          <span className="element-slot__name">{element.name_tr}</span>
        </span>
      ) : (
        <span className="element-slot__placeholder">Element seç</span>
      )}
    </button>
  );
}

type ResultSlotProps = {
  isLoading: boolean;
  element: ElementSummary | null;
};

function ResultSlot({ isLoading, element }: ResultSlotProps) {
  return (
    <div className="result-slot">
      <span className="element-slot__label">Sonuç</span>
      {isLoading ? (
        <div className="result-slot__loading">
          <span className="spinner" aria-hidden="true" />
          <span>Oluşturuluyor...</span>
        </div>
      ) : element ? (
        <span className="element-slot__content">
          <span className="element-slot__emoji">{element.emoji}</span>
          <span className="element-slot__name">{element.name_tr}</span>
        </span>
      ) : (
        <span className="element-slot__placeholder">Sonuç burada görünecek</span>
      )}
    </div>
  );
}
