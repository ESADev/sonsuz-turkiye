import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CanvasElement } from '../types';
import './CanvasBoard.css';

type CanvasBoardProps = {
  elements: CanvasElement[];
  selectedUid: string | null;
  onSelect: (uid: string, elementId: number) => void;
  onClearSelection: () => void;
  onDropFromSidebar: (elementId: number, position: { x: number; y: number }) => void;
  onMoveElement: (uid: string, position: { x: number; y: number }) => void;
  onCombineRequest: (sourceUid: string, targetUid: string) => void;
};

export function CanvasBoard({
  elements,
  selectedUid,
  onSelect,
  onClearSelection,
  onDropFromSidebar,
  onMoveElement,
  onCombineRequest
}: CanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerState = useRef<{
    uid: string | null;
    offsetX: number;
    offsetY: number;
  }>({ uid: null, offsetX: 0, offsetY: 0 });
  const elementRefs = useRef(new Map<string, HTMLDivElement>());
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const setElementRef = useCallback((uid: string, node: HTMLDivElement | null) => {
    if (node) {
      elementRefs.current.set(uid, node);
    } else {
      elementRefs.current.delete(uid);
    }
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rawId = event.dataTransfer.getData('application/x-element-id');
    if (!rawId) return;
    const elementId = Number(rawId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onDropFromSidebar(elementId, { x, y });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, uid: string) => {
    event.preventDefault();
    const node = elementRefs.current.get(uid);
    if (!node || !containerRef.current) return;
    node.setPointerCapture(event.pointerId);
    const rect = node.getBoundingClientRect();
    pointerState.current = {
      uid,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>, uid: string) => {
    if (pointerState.current.uid !== uid || !containerRef.current) return;
    event.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const nextX = event.clientX - rect.left - pointerState.current.offsetX;
    const nextY = event.clientY - rect.top - pointerState.current.offsetY;
    onMoveElement(uid, { x: nextX, y: nextY });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>, uid: string) => {
    event.preventDefault();
    const node = elementRefs.current.get(uid);
    if (node) {
      node.releasePointerCapture(event.pointerId);
    }
    if (!containerRef.current) return;
    const droppedOn = findTargetUid(uid, event.clientX, event.clientY, elementRefs.current);
    if (droppedOn && droppedOn !== uid) {
      onCombineRequest(uid, droppedOn);
    }
    pointerState.current = { uid: null, offsetX: 0, offsetY: 0 };
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>, description?: string) => {
    if (!description) return;
    setTooltip({ x: event.clientX, y: event.clientY, text: description });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>, description?: string) => {
    if (!description || !tooltip) return;
    setTooltip({ x: event.clientX, y: event.clientY, text: description });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div
      className="canvas"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(event) => {
        if (event.target === containerRef.current) {
          onClearSelection();
        }
      }}
    >
      <div className="canvas__grid" aria-hidden />
      {elements.map((element) => (
        <div
          key={element.uid}
          ref={(node) => setElementRef(element.uid, node)}
          className={
            'canvas-item' +
            (element.uid === selectedUid ? ' canvas-item--selected' : '') +
            (element.isNew ? ' canvas-item--new' : '')
          }
          style={{ transform: `translate(${element.x}px, ${element.y}px)` }}
          onPointerDown={(event) => handlePointerDown(event, element.uid)}
          onPointerMove={(event) => handlePointerMove(event, element.uid)}
          onPointerUp={(event) => handlePointerUp(event, element.uid)}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(element.uid, element.elementId);
          }}
          onMouseEnter={(event) => handleMouseEnter(event, element.description)}
          onMouseMove={(event) => handleMouseMove(event, element.description)}
          onMouseLeave={handleMouseLeave}
        >
          <span className="canvas-item__emoji">{element.emoji}</span>
          <span className="canvas-item__name">{element.name}</span>
          {element.isNew && (
            <span className="canvas-item__badge">{element.isFirstEver ? 'İlk Keşif!' : 'Yeni!'}</span>
          )}
        </div>
      ))}
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function findTargetUid(
  sourceUid: string,
  clientX: number,
  clientY: number,
  refs: Map<string, HTMLDivElement>
): string | null {
  for (const [uid, node] of refs.entries()) {
    if (uid === sourceUid) continue;
    const rect = node.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return uid;
    }
  }
  return null;
}
