import React, { useRef, useState } from 'react';
import { PortalColor } from '../game/types';

interface TouchControlsProps {
  carryingCube: boolean;
  canGrabCube: boolean;
  onMove: (x: number, y: number) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onFirePortal: (color: PortalColor) => void;
  onJump: () => void;
  onInteract: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  carryingCube,
  canGrabCube,
  onMove,
  onLookDelta,
  onFirePortal,
  onJump,
  onInteract,
}) => {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joyPointerId = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  const maxRadius = 42;

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerId.current !== null) return;
    joyPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyCenter.current = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyPointerId.current) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyPointerId.current) return;
    e.stopPropagation();
    joyPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - joyCenter.current.x;
    const dy = clientY - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clamped;
    const oy = Math.sin(angle) * clamped;
    setKnobOffset({ x: ox, y: oy });
    onMove(ox / maxRadius, -oy / maxRadius);
  };

  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastLookPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    const dx = e.clientX - lastLookPos.current.x;
    const dy = e.clientY - lastLookPos.current.y;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    onLookDelta(dx, dy);
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    lookPointerId.current = null;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* Right-half camera touch drag zone */}
      <div
        className="pointer-events-auto touch-control fixed top-16 right-0 bottom-0 left-[42%]"
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        aria-label="Camera Look Touch Area"
      />

      {/* Bottom-left Virtual Joystick */}
      <div
        className="pointer-events-auto touch-control fixed bottom-6 left-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#00f0ff]/75 bg-[#070b12]/80"
        onPointerDown={handleJoyDown}
        onPointerMove={handleJoyMove}
        onPointerUp={handleJoyUp}
        onPointerCancel={handleJoyUp}
        aria-label="Movement Joystick"
      >
        <div className="pointer-events-none h-20 w-20 rounded-full border border-[#00f0ff]/30" />
        <div
          className="pointer-events-none absolute flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#00f0ff] bg-[#0f2233] text-xs font-bold text-[#00f0ff]"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        >
          ✛
        </div>
      </div>

      {/* Bottom-right Action Buttons */}
      <div className="pointer-events-auto touch-control fixed right-5 bottom-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onFirePortal('cyan');
          }}
          className="flex h-14 w-16 flex-col items-center justify-center rounded border-2 border-[#00f0ff] bg-[#071824] text-[#00f0ff] active:scale-95"
        >
          <span className="text-lg leading-none">🌀</span>
          <span className="mt-1 text-[10px] font-bold tracking-wider">CYAN</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onFirePortal('amber');
          }}
          className="flex h-14 w-16 flex-col items-center justify-center rounded border-2 border-[#ff9100] bg-[#211406] text-[#ff9100] active:scale-95"
        >
          <span className="text-lg leading-none">🌀</span>
          <span className="mt-1 text-[10px] font-bold tracking-wider">AMBER</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onInteract();
          }}
          className={`flex h-14 w-16 flex-col items-center justify-center rounded border-2 active:scale-95 ${
            carryingCube || canGrabCube
              ? 'border-[#ff007f] bg-[#290b1b] text-[#ff85c2]'
              : 'border-[#4a5d75] bg-[#0b111a] text-[#9bb3cc]'
          }`}
        >
          <span className="text-lg leading-none">📦</span>
          <span className="mt-1 text-[10px] font-bold tracking-wider">
            {carryingCube ? 'DROP' : 'CUBE'}
          </span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onJump();
          }}
          className="flex h-14 w-16 flex-col items-center justify-center rounded border-2 border-[#94b8d8] bg-[#0d1622] text-[#e6f7ff] active:scale-95"
        >
          <span className="text-lg leading-none">⬆️</span>
          <span className="mt-1 text-[10px] font-bold tracking-wider">JUMP</span>
        </button>
      </div>
    </div>
  );
};
