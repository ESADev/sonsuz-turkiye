import { useEffect, useRef, useState } from 'react';
import { CanvasBoard } from './components/CanvasBoard';
import { Sidebar } from './components/Sidebar';
import { combineElements, fetchElements } from './lib/api';
import type { CanvasElement, ElementSummary } from './types';
import './App.css';

let elementCounter = 0;

export default function App() {
  const [elements, setElements] = useState<ElementSummary[]>([]);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef<{ width: number; height: number }>({ width: 800, height: 600 });

  useEffect(() => {
    void loadElements();
  }, []);


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

  function spawnOnCanvas(element: ElementSummary, x: number, y: number) {
    const uid = `canvas-${elementCounter++}`;
    setCanvasElements((prev) => [
      ...prev,
      {
        uid,
        elementId: element.id,
        name: element.name_tr,
        emoji: element.emoji,
        x,
        y
      }
    ]);
  }

  function handleMoveElement(uid: string, position: { x: number; y: number }) {
    const clamped = clampPosition(position, boardRef.current.width, boardRef.current.height);
    setCanvasElements((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, x: clamped.x, y: clamped.y } : item))
    );
  }

  async function requestCombine(sourceUid: string, targetUid: string) {
    const source = canvasElements.find((item) => item.uid === sourceUid);
    const target = canvasElements.find((item) => item.uid === targetUid);
    if (!source || !target) return;
    try {
      setError(null);
      const response = await combineElements(source.elementId, target.elementId);
      setElements((prev) => {
        const exists = prev.some((item) => item.id === response.element.id);
        return exists ? prev : [...prev, response.element];
      });
      const spawn = clampPosition({ x: target.x + 40, y: target.y + 40 }, boardRef.current.width, boardRef.current.height);
      spawnOnCanvas(response.element, spawn.x, spawn.y);
      setCanvasElements((prev) => prev.filter((item) => item.uid !== sourceUid && item.uid !== targetUid));
    } catch (err) {
      setError('Kombinasyon yapılamadı.');
      console.error(err);
    }
  }

  function handleBoardSizeChange(size: { width: number; height: number }) {
    boardRef.current = size;
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Sonsuz Türkiye</h1>
        <p>Türk kültürünü harmanlayan basit bir element birleştirme oyunu.</p>
      </header>
      <main className="app__body">
        <CanvasBoard
          elements={canvasElements}
          selectedUid={selectedUid}
          onMoveElement={handleMoveElement}
          onCombineRequest={requestCombine}
          onSizeChange={handleBoardSizeChange}
        />
        <Sidebar elements={elements} />
      </main>
      {error && (
        <div className="app__error" role="status">
          {error}
        </div>
      )}
    </div>
  );
}

function clampPosition(position: { x: number; y: number }, width: number, height: number) {
  const margin = 32;
  return {
    x: Math.min(Math.max(position.x, margin), Math.max(width - margin, margin)),
    y: Math.min(Math.max(position.y, margin), Math.max(height - margin, margin))
  };
}
