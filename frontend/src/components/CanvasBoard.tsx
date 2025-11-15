import { useEffect, useRef } from 'react';
import type { DragEvent, PointerEvent } from 'react';
import type { CanvasElement } from '../types';
import './CanvasBoard.css';

type CanvasBoardProps = {
  elements: CanvasElement[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  onDropFromSidebar: (elementId: number, position: { x: number; y: number }) => void;
  onMoveElement: (uid: string, position: { x: number; y: number }) => void;
  onCombineRequest: (sourceUid: string, targetUid: string) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
};

export function CanvasBoard({
  elements,
  selectedUid,
  onSelect,
  onDropFromSidebar,
  onMoveElement,
  onCombineRequest,
  onSizeChange
}: CanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ uid: string | null; offsetX: number; offsetY: number }>({
    uid: null,
    offsetX: 0,
    offsetY: 0
  });
  const elementRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.contentRect;
        onSizeChange({ width: box.width, height: box.height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onSizeChange]);

  const setElementRef = (uid: string, element: HTMLDivElement | null) => {
    if (element) {
      elementRefs.current.set(uid, element);
    } else {
      elementRefs.current.delete(uid);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/x-element-id');
    if (!raw || !containerRef.current) return;
    const elementId = Number(raw);
    const rect = containerRef.current.getBoundingClientRect();
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    onDropFromSidebar(elementId, position);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>, uid: string) => {
    const element = elementRefs.current.get(uid);
    if (!element || !containerRef.current) return;
    element.setPointerCapture(event.pointerId);
    const rect = element.getBoundingClientRect();
    dragState.current = {
      uid,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>, uid: string) => {
    if (dragState.current.uid !== uid || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onMoveElement(uid, {
      x: event.clientX - rect.left - dragState.current.offsetX,
      y: event.clientY - rect.top - dragState.current.offsetY
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>, uid: string) => {
    const element = elementRefs.current.get(uid);
    if (element) {
      element.releasePointerCapture(event.pointerId);
    }
    const target = findTargetUid(uid, event.clientX, event.clientY, elementRefs.current);
    if (target) {
      onCombineRequest(uid, target);
    }
    dragState.current = { uid: null, offsetX: 0, offsetY: 0 };
  };

  return (
    <div ref={containerRef} className="canvas" onDrop={handleDrop} onDragOver={handleDragOver}>
      {elements.map((element) => (
        <div
          key={element.uid}
          ref={(node) => setElementRef(element.uid, node)}
          className={element.uid === selectedUid ? 'canvas-item canvas-item--selected' : 'canvas-item'}
          style={{ transform: `translate(${element.x}px, ${element.y}px)` }}
          onPointerDown={(event) => handlePointerDown(event, element.uid)}
          onPointerMove={(event) => handlePointerMove(event, element.uid)}
          onPointerUp={(event) => handlePointerUp(event, element.uid)}
          onClick={() => onSelect(element.uid)}
        >
          <span className="canvas-item__emoji">{element.emoji}</span>
          <span className="canvas-item__name">{element.name}</span>
        </div>
      ))}
    </div>
  );
}

function findTargetUid(
  sourceUid: string,
  clientX: number,
  clientY: number,
  refs: Map<string, HTMLDivElement>
): string | null {
  for (const [uid, element] of refs.entries()) {
    if (uid === sourceUid) continue;
    const rect = element.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return uid;
    }
  }
  return null;
}
