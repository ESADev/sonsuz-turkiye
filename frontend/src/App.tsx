import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { Sidebar } from './components/Sidebar';
import { CanvasBoard } from './components/CanvasBoard';
import { TopBar } from './components/TopBar';
import { Modal } from './components/Modal';
import { combineElements, fetchElements } from './lib/api';
import { useGameSession } from './hooks/useGameSession';
import type { CanvasElement, ElementSummary } from './types';
import './App.css';

const PIN_STORAGE_KEY = 'sonsuz-turkiye-pinned';
const THEME_STORAGE_KEY = 'sonsuz-turkiye-theme';
const CANVAS_LIMIT = 24;
const VANISH_ANIMATION_MS = 320;

const AudioContextClass =
  typeof window !== 'undefined'
    ? (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : null;
const audioContext = AudioContextClass ? new AudioContextClass() : null;

function playPopSound() {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

export default function App() {
  const { sessionId, safetyOverride, setSafetyOverride, isLoading: sessionLoading, bootstrapSession } = useGameSession();
  const queryClient = useQueryClient();
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    const stored = window.localStorage.getItem(PIN_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as number[]) : [];
  });
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_STORAGE_KEY) ?? 'light');
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectionElementId, setSelectionElementId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const elementDetails = useRef<Map<number, { description: string; tags: string[]; name: string; emoji: string }>>(new Map());

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const { data: elementList } = useQuery({
    enabled: Boolean(sessionId),
    queryKey: ['elements', sessionId],
    queryFn: () => fetchElements(sessionId!),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!elementList) return;
    // ensure seed elements are on the sidebar with descriptions tracked
    elementList.forEach((el) => {
      if (el.description_tr) {
        elementDetails.current.set(el.id, {
          description: el.description_tr,
          tags: [],
          name: el.name_tr,
          emoji: el.emoji
        });
      }
    });
  }, [elementList]);

  const combineMutation = useMutation({
    mutationFn: (
      params: {
        sourceId: number;
        targetId: number;
        anchorUid: string;
        targetUid: string;
        spawnAt: { x: number; y: number };
      }
    ) =>
      combineElements(sessionId!, params.sourceId, params.targetId, safetyOverride).then((response) => ({
        response,
        anchorUid: params.anchorUid,
        targetUid: params.targetUid,
        spawnAt: params.spawnAt
      })),
    onSuccess: ({ response, anchorUid, targetUid, spawnAt }) => {
      if (response.rateLimitReached) {
        setToast('Bugün çok üretken çıktın! Biraz dinlen, sonra devam edelim.');
        return;
      }

      elementDetails.current.set(response.element.id, {
        description: response.element.description_tr,
        tags: response.element.tags,
        name: response.element.name_tr,
        emoji: response.element.emoji
      });

      queryClient.invalidateQueries({ queryKey: ['elements', sessionId] }).catch(() => undefined);
      addCanvasElement(response.element.id, spawnAt.x, spawnAt.y, {
        highlight: true,
        firstEver: response.isFirstEverCombination
      });
      markElementAsNotNew(anchorUid);
      vanishCanvasElements([anchorUid, targetUid]);
      playPopSound();

      if (response.isFirstEverCombination) {
        setToast('Bu kombinasyonu dünyada ilk sen keşfettin!');
      } else if (response.isNewElementForSession) {
        setToast(`${response.element.name_tr} şimdi koleksiyonunda!`);
      }
    },
    onError: (error: unknown) => {
      console.error(error);
      setToast('Bir şeyler ters gitti. Yeniden dene.');
    }
  });

  const addCanvasElement = (
    elementId: number,
    x: number,
    y: number,
    options: { highlight?: boolean; firstEver?: boolean } = {}
  ) => {
    const details = elementDetails.current.get(elementId);
    const name = details?.name ?? elementList?.find((el) => el.id === elementId)?.name_tr ?? 'Bilinmeyen';
    const emoji = details?.emoji ?? elementList?.find((el) => el.id === elementId)?.emoji ?? '✨';
    const description = details?.description ?? '';
    const tags = details?.tags ?? [];
    const width = containerWidthRef.current || 820;
    const height = containerHeightRef.current || 620;
    const newElement: CanvasElement = {
      uid: uuidv4(),
      elementId,
      name,
      emoji,
      description,
      tags,
      x: Math.max(16, Math.min(x, width - 180)),
      y: Math.max(16, Math.min(y, height - 140)),
      discoveredAt: Date.now(),
      isNew: options.highlight,
      isFirstEver: options.firstEver
    };
    setCanvasElements((prev) => {
      const next: CanvasElement[] = [...prev.slice(-(CANVAS_LIMIT - 1)), newElement];
      return next;
    });
    if (options.highlight) {
      window.setTimeout(() => {
        setCanvasElements((prev) =>
          prev.map((item) => (item.uid === newElement.uid ? { ...item, isNew: false } : item))
        );
      }, 3600);
    }
  };

  const markElementAsNotNew = (uid: string) => {
    setCanvasElements((prev) => prev.map((item) => (item.uid === uid ? { ...item, isNew: false } : item)));
  };

  const vanishCanvasElements = (uids: string[]) => {
    if (!uids.length) return;
    setCanvasElements((prev) =>
      prev.map((item) => (uids.includes(item.uid) ? { ...item, isVanishing: true } : item))
    );
    if (selectedUid && uids.includes(selectedUid)) {
      setSelectedUid(null);
      setSelectionElementId(null);
    }
    window.setTimeout(() => {
      setCanvasElements((prev) => prev.filter((item) => !uids.includes(item.uid)));
    }, VANISH_ANIMATION_MS);
  };

  const containerWidthRef = useRef<number>(0);
  const containerHeightRef = useRef<number>(0);

  const updateContainerSize = () => {
    const canvas = document.querySelector('.canvas') as HTMLDivElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    containerWidthRef.current = rect.width;
    containerHeightRef.current = rect.height;
  };

  useEffect(() => {
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  const handleDropFromSidebar = (element: ElementSummary, position: { x: number; y: number }) => {
    addCanvasElement(element.id, position.x, position.y);
  };

  const handleMoveElement = (uid: string, position: { x: number; y: number }) => {
    setCanvasElements((prev) =>
      prev.map((item) => (item.uid === uid && !item.isVanishing ? { ...item, x: position.x, y: position.y } : item))
    );
  };

  const handleSelect = (uid: string, elementId: number) => {
    if (selectedUid && selectionElementId && selectedUid !== uid) {
      // combine via click
      const target = canvasElements.find((item) => item.uid === uid);
      const source = canvasElements.find((item) => item.uid === selectedUid);
      if (target && source) {
        requestCombination(source, target);
      }
      setSelectedUid(null);
      setSelectionElementId(null);
    } else {
      setSelectedUid(uid);
      setSelectionElementId(elementId);
    }
  };

  const requestCombination = (source: CanvasElement, target: CanvasElement) => {
    if (source.isVanishing || target.isVanishing) {
      return;
    }
    const centerX = target.x + 80;
    const centerY = target.y + 60;
    combineMutation.mutate({
      sourceId: source.elementId,
      targetId: target.elementId,
      anchorUid: source.uid,
      targetUid: target.uid,
      spawnAt: { x: centerX, y: centerY }
    });
  };

  const handleCombineRequest = (sourceUid: string, targetUid: string) => {
    const source = canvasElements.find((item) => item.uid === sourceUid);
    const target = canvasElements.find((item) => item.uid === targetUid);
    if (!source || !target) return;
    requestCombination(source, target);
  };

  const togglePin = (id: number) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id];
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const dismissToast = () => setToast(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const canvasElementsWithDetails = useMemo(() => canvasElements, [canvasElements]);

  if (sessionLoading) {
    return (
      <div className="loading-screen">
        <p>Oturum hazırlanıyor...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="loading-screen">
        <p>Oturum oluşturulamadı. Yeniden denemek için sayfayı tazele.</p>
        <button type="button" onClick={bootstrapSession}>
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onToggleTheme={toggleTheme}
        isDark={theme === 'dark'}
      />
      <div className="app-shell__main">
        <CanvasBoard
          elements={canvasElementsWithDetails}
          selectedUid={selectedUid}
          onSelect={handleSelect}
          onClearSelection={() => {
            setSelectedUid(null);
            setSelectionElementId(null);
          }}
          onDropFromSidebar={(elementId, position) => {
            const element = elementList?.find((el) => el.id === elementId);
            if (element) {
              handleDropFromSidebar(element, position);
            }
          }}
          onMoveElement={handleMoveElement}
          onCombineRequest={handleCombineRequest}
        />
        <Sidebar
          elements={elementList ?? []}
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          onSpawn={(element) => handleDropFromSidebar(element, {
            x: Math.random() * ((containerWidthRef.current ?? 600) - 200) + 80,
            y: Math.random() * ((containerHeightRef.current ?? 400) - 200) + 80
          })}
          onSelectForCombine={(element) => {
            const candidate = canvasElements.find((item) => item.elementId === element.id);
            if (candidate) {
              handleSelect(candidate.uid, candidate.elementId);
            } else {
              handleDropFromSidebar(element, {
                x: Math.random() * ((containerWidthRef.current ?? 600) - 200) + 80,
                y: Math.random() * ((containerHeightRef.current ?? 400) - 200) + 80
              });
            }
          }}
        />
      </div>
      {isSettingsOpen && (
        <Modal
          title="Ayarlar"
          description="Deneyimini kişiselleştir"
          onClose={() => setIsSettingsOpen(false)}
        >
          <label className="toggle">
            <input
              type="checkbox"
              checked={safetyOverride}
              onChange={(event) => setSafetyOverride(event.target.checked)}
            />
            <span>
              Güvenli Mod
              <small>
                Kapalıyken moderasyon daha gevşer. Yine de hassas içerikler bloklanabilir.
              </small>
            </span>
          </label>
          <p>
            <strong>İpucu:</strong> Bir elementi sürükleyip diğerinin üzerine bırakınca kombinasyon denenir. Mobilde
            dokun-dokun ile de çalışır.
          </p>
        </Modal>
      )}
      {isAboutOpen && (
        <Modal
          title="Sonsuz Türkiye Hakkında"
          description="Türk internet kültürünü kutlayan deneysel bir oyun"
          onClose={() => setIsAboutOpen(false)}
        >
          <p>
            Sonsuz Türkiye, klasik element birleştirme oyunlarını Türk internet kültürü ile birleştirir. Çay, simit,
            derbi gerginliği ve daha niceleri Gemini ile harmanlanır.
          </p>
          <p>
            İnce ayarlarla Türkçe mizahı, gündelik hayatı ve nostaljiyi ön plana çıkarır. Güvenli içerik filtresi,
            moderasyon katmanları ve hız limitleri sayesinde herkes için keyiflidir.
          </p>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status" onClick={dismissToast}>
          {toast}
        </div>
      )}
    </div>
  );
}
