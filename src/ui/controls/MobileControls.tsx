import { useEffect, useRef, useState } from "react";

type StickVector = {
  x: number;
  y: number;
};

type MobileControlsProps = {
  nearestInteractionLabel?: string;
  onMove: (x: number, y: number) => void;
  onCameraTurn: (x: number, y: number) => void;
  onInteract: () => void;
};

type VirtualJoystickProps = {
  label: string;
  className?: string;
  axis: "both" | "horizontal" | "cardinal";
  activeControlPointersRef: React.MutableRefObject<Set<number>>;
  onChange: (value: StickVector) => void;
};

const JOYSTICK_RADIUS = 44;
const DEAD_ZONE = 0.12;

export function MobileControls({
  nearestInteractionLabel,
  onMove,
  onCameraTurn,
  onInteract
}: MobileControlsProps) {
  const onMoveRef = useRef(onMove);
  const onCameraTurnRef = useRef(onCameraTurn);
  const activeControlPointersRef = useRef(new Set<number>());

  useEffect(() => {
    onMoveRef.current = onMove;
    onCameraTurnRef.current = onCameraTurn;
  });

  useEffect(() => {
    return () => {
      onMoveRef.current(0, 0);
      onCameraTurnRef.current(0, 0);
    };
  }, []);

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <VirtualJoystick
        label="Move"
        axis="both"
        className="mobile-joystick--move"
        activeControlPointersRef={activeControlPointersRef}
        onChange={({ x, y }) => onMove(x, y)}
      />

      <button
        className={`mobile-interact ${nearestInteractionLabel ? "is-available" : ""}`}
        type="button"
        onClick={onInteract}
        aria-label={nearestInteractionLabel ? `Tương tác: ${nearestInteractionLabel}` : "Tương tác"}
        title="Tương tác"
      >
        <svg
          aria-hidden="true"
          className="mobile-interact__icon"
          viewBox="0 0 24 24"
          fill="none"
          focusable="false"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
          <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      </button>

      <VirtualJoystick
        label="Turn"
        axis="cardinal"
        className="mobile-joystick--turn"
        activeControlPointersRef={activeControlPointersRef}
        onChange={({ x, y }) => onCameraTurn(x, y)}
      />
    </div>
  );
}

function VirtualJoystick({
  label,
  className = "",
  axis,
  activeControlPointersRef,
  onChange
}: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [thumb, setThumb] = useState<StickVector>({ x: 0, y: 0 });

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let offsetX = event.clientX - centerX;
    let offsetY = axis === "horizontal" ? 0 : event.clientY - centerY;
    const distance = Math.hypot(offsetX, offsetY);

    if (distance > JOYSTICK_RADIUS) {
      const scale = JOYSTICK_RADIUS / distance;
      offsetX *= scale;
      offsetY *= scale;
    }

    if (axis === "cardinal") {
      if (Math.abs(offsetX) >= Math.abs(offsetY)) {
        offsetY = 0;
      } else {
        offsetX = 0;
      }
    }

    const normalizedX = applyDeadZone(offsetX / JOYSTICK_RADIUS);
    const normalizedY = axis === "horizontal" ? 0 : applyDeadZone(-offsetY / JOYSTICK_RADIUS);

    setThumb({ x: offsetX, y: offsetY });
    onChange({ x: normalizedX, y: normalizedY });
  };

  const reset = () => {
    if (activePointerIdRef.current !== null) {
      activeControlPointersRef.current.delete(activePointerIdRef.current);
    }
    activePointerIdRef.current = null;
    setThumb({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <div className={`mobile-joystick ${className}`}>
      <div
        ref={baseRef}
        className="mobile-joystick__base"
        role="application"
        aria-label={`${label} joystick`}
        onPointerDown={(event) => {
          event.preventDefault();
          if (activePointerIdRef.current !== null) return;
          if (activeControlPointersRef.current.has(event.pointerId)) return;
          activeControlPointersRef.current.add(event.pointerId);
          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          event.preventDefault();
          if (activePointerIdRef.current !== event.pointerId) return;
          updateFromPointer(event);
        }}
        onPointerUp={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;
          reset();
        }}
        onPointerCancel={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;
          reset();
        }}
        onLostPointerCapture={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;
          reset();
        }}
      >
        <div
          className="mobile-joystick__thumb"
          style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}

function applyDeadZone(value: number) {
  if (Math.abs(value) < DEAD_ZONE) return 0;
  return value;
}
