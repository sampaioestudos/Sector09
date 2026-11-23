import { useCallback, useEffect, useRef, useState } from 'react';
import { TouchControls } from './components/TouchControls';
import { SoundEngine } from './game/audio';
import { Sector09Engine } from './game/engine';
import { LEVELS } from './game/levels';
import { HudSnapshot, PortalColor, SaveProgress } from './game/types';

const SAVE_KEY = 'sector09_fallout_save_v1';

type ScreenMode = 'title' | 'playing' | 'paused' | 'victory';

interface FeedbackBanner {
  text: string;
  tone: 'cyan' | 'amber' | 'danger' | 'success';
}

function loadProgress(): SaveProgress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveProgress>;
      return {
        highestUnlocked: typeof parsed.highestUnlocked === 'number' ? parsed.highestUnlocked : 0,
        completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
        bestTimes: parsed.bestTimes ?? {},
        muted: Boolean(parsed.muted),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    highestUnlocked: 0,
    completedLevels: [],
    bestTimes: {},
    muted: false,
  };
}

function saveProgress(progress: SaveProgress): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // ignore storage errors
  }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Sector09Engine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const [progress, setProgress] = useState<SaveProgress>(() => loadProgress());
  const [screen, setScreen] = useState<ScreenMode>('title');
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [touchMode, setTouchMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  });

  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);
  const [completionTime, setCompletionTime] = useState(0);

  const [hud, setHud] = useState<HudSnapshot>({
    levelIndex: 0,
    levelCode: LEVELS[0].code,
    levelTitle: LEVELS[0].title,
    levelHint: LEVELS[0].hint,
    cyanActive: false,
    amberActive: false,
    carryingCube: false,
    canGrabCube: false,
    buttonsTotal: 0,
    buttonsActive: 0,
    receptorsTotal: 0,
    receptorsActive: 0,
    doorOpen: false,
    pointerLocked: false,
    elapsedSeconds: 0,
  });

  const showToast = useCallback(
    (text: string, tone: 'cyan' | 'amber' | 'danger' | 'success') => {
      setFeedback({ text, tone });
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedback(null);
      }, 2400);
    },
    []
  );

  // Initialize Three.js engine once inside isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const sound = new SoundEngine();
    sound.setMuted(loadProgress().muted);
    soundRef.current = sound;

    const engine = new Sector09Engine(mount, sound, {
      onHudUpdate: (snap) => setHud(snap),
      onFeedback: (msg, tone) => showToast(msg, tone),
      onLevelComplete: (lvlIndex, elapsed) => {
        setCompletionTime(elapsed);
        setProgress((prev) => {
          const completed = prev.completedLevels.includes(lvlIndex)
            ? prev.completedLevels
            : [...prev.completedLevels, lvlIndex];
          const nextUnlocked = Math.min(
            LEVELS.length - 1,
            Math.max(prev.highestUnlocked, lvlIndex + 1)
          );
          const prevBest = prev.bestTimes[lvlIndex];
          const bestTimes = {
            ...prev.bestTimes,
            [lvlIndex]:
              typeof prevBest === 'number' ? Math.min(prevBest, Math.round(elapsed)) : Math.round(elapsed),
          };
          const updated: SaveProgress = {
            ...prev,
            highestUnlocked: nextUnlocked,
            completedLevels: completed,
            bestTimes,
          };
          saveProgress(updated);
          return updated;
        });
        setScreen('victory');
      },
    });
    engineRef.current = engine;

    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
      engine.dispose();
      sound.dispose();
      engineRef.current = null;
      soundRef.current = null;
    };
  }, [showToast]);

  // Keyboard shortcuts for Title / Pause / Victory
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && (screen === 'playing' || screen === 'paused')) {
        e.preventDefault();
        if (screen === 'playing') {
          engineRef.current?.setPaused(true);
          setScreen('paused');
        } else {
          engineRef.current?.setPaused(false);
          setScreen('playing');
          engineRef.current?.requestPointerLockSafe();
        }
      } else if ((e.code === 'Enter' || e.code === 'Space') && screen === 'title' && !showLevelSelect) {
        e.preventDefault();
        handleStartLevel(progress.highestUnlocked);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showLevelSelect, progress.highestUnlocked]);

  const handleStartLevel = (index: number) => {
    setShowLevelSelect(false);
    setScreen('playing');
    engineRef.current?.startGame(index, !touchMode);
  };

  const handleResume = () => {
    setScreen('playing');
    engineRef.current?.setPaused(false);
    if (!touchMode) {
      engineRef.current?.requestPointerLockSafe();
    }
  };

  const handlePause = () => {
    engineRef.current?.setPaused(true);
    setScreen('paused');
  };

  const handleReset = () => {
    engineRef.current?.resetLevel();
    if (screen === 'paused' || screen === 'victory') {
      setScreen('playing');
      engineRef.current?.setPaused(false);
    }
  };

  const handleToggleMute = () => {
    const next = !progress.muted;
    soundRef.current?.setMuted(next);
    setProgress((prev) => {
      const updated = { ...prev, muted: next };
      saveProgress(updated);
      return updated;
    });
  };

  const handleFirePortal = (color: PortalColor) => {
    engineRef.current?.firePortal(color);
  };

  const isLastLevel = hud.levelIndex >= LEVELS.length - 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05080d] text-[#e6f7ff]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="game-canvas-wrap absolute inset-0 h-full w-full"
      />

      {/* =================================================================== */}
      {/* ACTIVE GAMEPLAY HUD (Unobstructed Center)                           */}
      {/* =================================================================== */}
      {screen === 'playing' && (
        <div className="pointer-events-none fixed inset-0 z-10">
          {/* Top-Left Sector Telemetry Badge */}
          <div className="pointer-events-auto fixed top-3 left-3 flex flex-col gap-1.5 rounded border-2 border-[#00f0ff]/80 bg-[#070b12]/90 px-3 py-2">
            <div className="flex items-center gap-2.5">
              <span className="rounded border border-[#00f0ff] bg-[#0a2130] px-1.5 py-0.5 text-xs font-bold tracking-widest text-[#00f0ff]">
                SEC {hud.levelCode}
              </span>
              <span className="text-xs font-bold tracking-wider text-[#e6f7ff] sm:text-sm">
                {hud.levelTitle}
              </span>
              <span className="ml-1 text-xs font-semibold text-[#7ca4c4] tabular-nums">
                {formatTime(hud.elapsedSeconds)}
              </span>
            </div>

            {/* Compact Lock / Portal Indicators */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
              <span className={hud.cyanActive ? 'text-[#00f0ff]' : 'text-[#4e6178]'}>
                🌀 CYAN {hud.cyanActive ? 'ON' : 'OFF'}
              </span>
              <span className={hud.amberActive ? 'text-[#ff9100]' : 'text-[#4e6178]'}>
                🌀 AMBER {hud.amberActive ? 'ON' : 'OFF'}
              </span>
              {hud.buttonsTotal > 0 && (
                <span
                  className={
                    hud.buttonsActive >= hud.buttonsTotal ? 'text-[#00f0ff]' : 'text-[#ff9100]'
                  }
                >
                  🔘 {hud.buttonsActive}/{hud.buttonsTotal}
                </span>
              )}
              {hud.receptorsTotal > 0 && (
                <span
                  className={
                    hud.receptorsActive >= hud.receptorsTotal ? 'text-[#00f0ff]' : 'text-[#ff007f]'
                  }
                >
                  ⚡ {hud.receptorsActive}/{hud.receptorsTotal}
                </span>
              )}
              <span className={hud.doorOpen ? 'text-[#39ff14]' : 'text-[#ff3b30]'}>
                🚪 {hud.doorOpen ? 'OPEN' : 'LOCKED'}
              </span>
            </div>
          </div>

          {/* Top-Right Quick Action Bar */}
          <div className="pointer-events-auto fixed top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTouchMode((v) => !v)}
              title="Toggle Touch Controls"
              className={`flex h-10 w-10 items-center justify-center rounded border-2 text-base ${
                touchMode
                  ? 'border-[#00f0ff] bg-[#0a2333] text-[#00f0ff]'
                  : 'border-[#33465c] bg-[#070b12]/90 text-[#9cb4cc]'
              }`}
            >
              📱
            </button>
            <button
              type="button"
              onClick={handleToggleMute}
              title="Toggle Audio"
              className="flex h-10 w-10 items-center justify-center rounded border-2 border-[#33465c] bg-[#070b12]/90 text-base text-[#e6f7ff] hover:border-[#00f0ff]"
            >
              {progress.muted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Level (R)"
              className="flex h-10 w-10 items-center justify-center rounded border-2 border-[#ff9100]/80 bg-[#070b12]/90 text-base text-[#ff9100] hover:bg-[#1f1305]"
            >
              🔄
            </button>
            <button
              type="button"
              onClick={handlePause}
              title="Pause (Esc)"
              className="flex h-10 w-10 items-center justify-center rounded border-2 border-[#00f0ff]/80 bg-[#070b12]/90 text-base text-[#00f0ff] hover:bg-[#09202e]"
            >
              ⏸️
            </button>
          </div>

          {/* Center Crosshair with Portal Pair Arcs */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-9 w-9 items-center justify-center">
              <div
                className={`absolute top-1 bottom-1 left-0 w-2 rounded-l-full border-2 border-r-0 ${
                  hud.cyanActive ? 'border-[#00f0ff]' : 'border-[#00f0ff]/35'
                }`}
              />
              <div
                className={`absolute top-1 right-0 bottom-1 w-2 rounded-r-full border-2 border-l-0 ${
                  hud.amberActive ? 'border-[#ff9100]' : 'border-[#ff9100]/35'
                }`}
              />
              <div className="h-1.5 w-1.5 rounded-full bg-[#e6f7ff]" />
            </div>
            {(hud.canGrabCube || hud.carryingCube) && (
              <div className="mt-2 whitespace-nowrap rounded border border-[#ff007f] bg-[#070b12]/90 px-2 py-0.5 text-center text-[10px] font-bold tracking-wider text-[#ff85c2]">
                {hud.carryingCube ? '📦 CARRYING [E/F DROP]' : '📦 PRESS [E/F] TO PICK UP'}
              </div>
            )}
          </div>

          {/* Feedback Toast */}
          {feedback && (
            <div
              className={`fixed top-20 left-1/2 -translate-x-1/2 rounded border-2 bg-[#070b12]/95 px-4 py-1.5 text-xs font-bold tracking-wider ${
                feedback.tone === 'danger'
                  ? 'border-[#ff3b30] text-[#ff7066]'
                  : feedback.tone === 'amber'
                  ? 'border-[#ff9100] text-[#ffae42]'
                  : feedback.tone === 'success'
                  ? 'border-[#39ff14] text-[#7dff63]'
                  : 'border-[#00f0ff] text-[#00f0ff]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Desktop Pointer Lock Prompt & Subtle Bottom Objective Strip */}
          {!touchMode && !hud.pointerLocked && (
            <button
              type="button"
              onClick={() => engineRef.current?.requestPointerLockSafe()}
              className="pointer-events-auto fixed bottom-12 left-1/2 -translate-x-1/2 rounded border-2 border-[#00f0ff] bg-[#071520] px-5 py-2 text-xs font-bold tracking-widest text-[#00f0ff] hover:bg-[#0c2638]"
            >
              CLICK VIEWPORT TO LOCK AIM · LMB CYAN · RMB/Q AMBER · E/F CUBE · R RESET
            </button>
          )}

          {/* Bottom-center level hint */}
          <div className="fixed bottom-3 left-1/2 hidden max-w-xl -translate-x-1/2 truncate rounded border border-[#223447] bg-[#070b12]/90 px-3 py-1 text-[11px] text-[#9bb8d4] sm:block">
            {hud.levelHint}
          </div>

          {/* Mobile Touch Controls */}
          {touchMode && (
            <TouchControls
              carryingCube={hud.carryingCube}
              canGrabCube={hud.canGrabCube}
              onMove={(x, y) => engineRef.current?.setTouchMove(x, y)}
              onLookDelta={(dx, dy) => engineRef.current?.addLookDelta(dx, dy)}
              onFirePortal={handleFirePortal}
              onJump={() => engineRef.current?.triggerJump()}
              onInteract={() => engineRef.current?.toggleCarryCube()}
            />
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TITLE SCREEN OVERLAY                                                */}
      {/* =================================================================== */}
      {screen === 'title' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded border-2 border-[#00f0ff] bg-[#070b12]/95 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-[#1c2b3d] pb-4">
              <div>
                <div className="text-xs font-bold tracking-[0.28em] text-[#ff9100]">
                  ☣️ CONTAINMENT PROTOCOL // 2089
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-wider text-[#e6f7ff] sm:text-4xl">
                  SECTOR 09: <span className="text-[#00f0ff]">FALLOUT</span>
                </h1>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className="flex h-11 w-11 items-center justify-center rounded border-2 border-[#33465c] bg-[#0b121c] text-lg hover:border-[#00f0ff]"
                title="Toggle Audio"
              >
                {progress.muted ? '🔇' : '🔊'}
              </button>
            </div>

            {!showLevelSelect ? (
              <div className="mt-5 space-y-5">
                <p className="text-sm leading-relaxed text-[#a6c2de]">
                  Navigate a ruined underground nuclear research complex. Fire{' '}
                  <span className="font-bold text-[#00f0ff]">Cyan</span> and{' '}
                  <span className="font-bold text-[#ff9100]">Amber</span> portals onto clean
                  concrete panels, preserve momentum across chasms, route plasma lasers, and unlock
                  all 10 containment sectors.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleStartLevel(progress.highestUnlocked)}
                    className="flex-1 rounded border-2 border-[#00f0ff] bg-[#0a2333] px-5 py-3.5 text-sm font-black tracking-widest text-[#00f0ff] hover:bg-[#10354d]"
                  >
                    🌀{' '}
                    {progress.highestUnlocked > 0
                      ? `CONTINUE — SECTOR ${LEVELS[progress.highestUnlocked].code}`
                      : 'ENTER SECTOR 01'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLevelSelect(true)}
                    className="rounded border-2 border-[#ff9100] bg-[#211306] px-5 py-3.5 text-sm font-bold tracking-widest text-[#ff9100] hover:bg-[#331d09]"
                  >
                    🗂️ SELECT SECTOR ({progress.completedLevels.length}/10)
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded border border-[#1d2d3f] bg-[#0a1019] p-3 text-xs text-[#89a7c4] sm:grid-cols-2">
                  <div>
                    <span className="font-bold text-[#e6f7ff]">DESKTOP:</span> WASD Move · Mouse Aim
                    · LMB Cyan · RMB/Q Amber · Space Jump · E/F Cube · R Reset
                  </div>
                  <div>
                    <span className="font-bold text-[#e6f7ff]">MOBILE TOUCH:</span> Left Joystick
                    Move · Right Drag Look · On-Screen Portal & Action Pads
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-widest text-[#ff9100]">
                    SELECT CONTAINMENT SECTOR
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowLevelSelect(false)}
                    className="rounded border border-[#33465c] bg-[#0c141f] px-3 py-1 text-xs font-bold text-[#9bb8d4] hover:border-[#00f0ff]"
                  >
                    ← BACK
                  </button>
                </div>

                <div className="grid max-h-72 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-5">
                  {LEVELS.map((lvl, idx) => {
                    const unlocked = idx <= progress.highestUnlocked;
                    const done = progress.completedLevels.includes(idx);
                    const best = progress.bestTimes[idx];
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => handleStartLevel(idx)}
                        className={`flex flex-col items-start rounded border-2 p-2.5 text-left ${
                          unlocked
                            ? done
                              ? 'border-[#39ff14] bg-[#091c0d] text-[#e6f7ff] hover:bg-[#0f2e16]'
                              : 'border-[#00f0ff] bg-[#091c29] text-[#e6f7ff] hover:bg-[#102d40]'
                            : 'cursor-not-allowed border-[#1c2633] bg-[#080c12] text-[#45566b]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between text-xs font-black">
                          <span>SEC {lvl.code}</span>
                          <span>{done ? '✅' : unlocked ? '🌀' : '🔒'}</span>
                        </div>
                        <div className="mt-1 line-clamp-1 text-[10px] font-bold tracking-wide">
                          {lvl.title}
                        </div>
                        {typeof best === 'number' && (
                          <div className="mt-1 text-[10px] text-[#7dff63] tabular-nums">
                            {formatTime(best)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PAUSE MODAL                                                         */}
      {/* =================================================================== */}
      {screen === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#04070c]/80 p-4">
          <div className="w-full max-w-md rounded border-2 border-[#00f0ff] bg-[#070b12] p-6">
            <div className="text-xs font-bold tracking-widest text-[#ff9100]">
              ⏸️ SIMULATION PAUSED
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-wider text-[#e6f7ff]">
              SECTOR {hud.levelCode}: {hud.levelTitle}
            </h2>
            <p className="mt-2 text-xs text-[#92b0cc]">{hud.levelHint}</p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleResume}
                className="rounded border-2 border-[#00f0ff] bg-[#0a2333] py-3 text-sm font-black tracking-widest text-[#00f0ff] hover:bg-[#10354d]"
              >
                ▶ RESUME
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded border-2 border-[#ff9100] bg-[#211306] py-3 text-sm font-bold tracking-widest text-[#ff9100] hover:bg-[#331d09]"
              >
                🔄 RESTART SECTOR
              </button>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.returnToTitle();
                  setShowLevelSelect(true);
                  setScreen('title');
                }}
                className="rounded border-2 border-[#33465c] bg-[#0b121c] py-3 text-sm font-bold tracking-widest text-[#b6cde3] hover:border-[#00f0ff]"
              >
                🗂️ SECTOR SELECT
              </button>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.returnToTitle();
                  setShowLevelSelect(false);
                  setScreen('title');
                }}
                className="rounded border border-[#28384a] bg-[#070b12] py-2.5 text-xs font-bold tracking-widest text-[#7d98b3] hover:text-[#e6f7ff]"
              >
                EXIT TO TITLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VICTORY / SECTOR COMPLETE MODAL                                     */}
      {/* =================================================================== */}
      {screen === 'victory' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#04070c]/80 p-4">
          <div className="w-full max-w-md rounded border-2 border-[#39ff14] bg-[#070b12] p-6">
            <div className="text-xs font-bold tracking-widest text-[#39ff14]">
              ✅ {isLastLevel ? 'FACILITY ESCAPE COMPLETE' : 'SECTOR CLEARED'}
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-wider text-[#e6f7ff]">
              SECTOR {hud.levelCode}: {hud.levelTitle}
            </h2>

            <div className="mt-4 flex items-center justify-between rounded border border-[#1c2c3d] bg-[#0b121c] px-4 py-3">
              <span className="text-xs font-bold tracking-wider text-[#89a7c4]">CLEAR TIME</span>
              <span className="text-xl font-black text-[#00f0ff] tabular-nums">
                {formatTime(completionTime)}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {!isLastLevel ? (
                <button
                  type="button"
                  onClick={() => handleStartLevel(hud.levelIndex + 1)}
                  className="rounded border-2 border-[#00f0ff] bg-[#0a2333] py-3 text-sm font-black tracking-widest text-[#00f0ff] hover:bg-[#10354d]"
                >
                  🌀 PROCEED TO SECTOR {LEVELS[hud.levelIndex + 1].code}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    engineRef.current?.returnToTitle();
                    setShowLevelSelect(true);
                    setScreen('title');
                  }}
                  className="rounded border-2 border-[#39ff14] bg-[#0b2410] py-3 text-sm font-black tracking-widest text-[#7dff63]"
                >
                  🏆 ALL 10 SECTORS CLEARED — SECTOR SELECT
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="rounded border-2 border-[#ff9100] bg-[#211306] py-2.5 text-xs font-bold tracking-widest text-[#ff9100]"
              >
                🔄 REPLAY SECTOR
              </button>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.returnToTitle();
                  setShowLevelSelect(false);
                  setScreen('title');
                }}
                className="rounded border border-[#28384a] bg-[#070b12] py-2.5 text-xs font-bold tracking-widest text-[#7d98b3]"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
