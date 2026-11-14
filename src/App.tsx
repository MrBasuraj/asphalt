import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Engine, type RunStats, type Screen } from "./game/engine";
import { loadScores, type ScoreEntry } from "./game/scores";
import { cn } from "./utils/cn";

const fmt = (n: number) => Math.floor(n).toLocaleString("en-US");

/* ---------------- inline icons ---------------- */

function Icon({ d, size = 18, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const I = {
  bolt: "M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z",
  pause: "M6 4h4v16H6V4Zm8 0h4v16h-4V4Z",
  play: "M7 4l14 8-14 8V4Z",
  restart:
    "M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z",
  home: "M12 3 3 11h3v9h5v-6h2v6h5v-9h3L12 3Z",
  soundOn:
    "M4 9v6h4l5 5V4L8 9H4Zm12.5 3a3.5 3.5 0 0 0-1.85-3.07v6.13A3.5 3.5 0 0 0 16.5 12Zm-1.85-7.4v2.1a6 6 0 0 1 0 10.6v2.1a8 8 0 0 0 0-14.8Z",
  soundOff:
    "M4 9v6h4l5 5V4L8 9H4Zm14.6 3 2.2-2.2-1.4-1.4-2.2 2.2-2.2-2.2-1.4 1.4 2.2 2.2-2.2 2.2 1.4 1.4 2.2-2.2 2.2 2.2 1.4-1.4-2.2-2.2Z",
  flag: "M5 3v18h2v-7h11l-2.5-4L18 6H7V3H5Z",
};

/* ---------------- shared UI ---------------- */

function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}

function ScoreBoard({
  scores,
  highlight,
}: {
  scores: ScoreEntry[];
  highlight: number | null;
}) {
  const rankColor = ["text-amber", "text-mist", "text-[#ff9d5c]"];
  return (
    <div className="panel w-full p-4">
      <div className="hud-label mb-3 flex items-center gap-2">
        <Icon d={I.flag} size={12} className="text-ember" />
        TOP DRIVERS
      </div>
      {scores.length === 0 ? (
        <div className="py-2 text-center text-[11px] tracking-[0.2em] text-mist/50">
          NO RACES YET — SET THE FIRST MARK
        </div>
      ) : (
        <div className="space-y-1.5">
          {scores.map((s, i) => (
            <div
              key={`${s.date}-${i}`}
              className={cn(
                "flex items-center gap-3 px-2 py-1 text-[13px] transition-colors",
                highlight === i
                  ? "bg-ember/25 text-white shadow-[0_0_14px_rgba(255,61,46,0.35)]"
                  : "text-mist/80"
              )}
            >
              <span
                className={cn(
                  "font-display w-6 text-right text-sm",
                  rankColor[i] ?? "text-mist/40"
                )}
              >
                {i + 1}
              </span>
              <span className="font-display flex-1 tracking-wide">{fmt(s.score)}</span>
              <span className="text-[11px] tracking-widest text-mist/50">
                {s.km.toFixed(1)} KM
              </span>
              {highlight === i && (
                <span className="text-[10px] font-bold tracking-widest text-ember">
                  YOU
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Overlay({
  children,
  onBack,
  dim = 0.72,
}: {
  children: ReactNode;
  onBack?: () => void;
  dim?: number;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center overflow-y-auto px-4 py-6",
        onBack ? "cursor-pointer" : ""
      )}
      style={{
        background: `linear-gradient(180deg, rgba(7,9,14,${dim * 0.9}) 0%, rgba(7,9,14,${dim}) 100%)`,
      }}
      onClick={onBack}
    >
      <div className="m-auto flex w-full max-w-[420px] flex-col items-center gap-4 py-4">
        {children}
      </div>
    </div>
  );
}

function StopProp({ children }: { children: ReactNode }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  );
}

/* ---------------- app ---------------- */

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [stats, setStats] = useState<RunStats | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ar-muted") === "1";
    } catch {
      return false;
    }
  });

  const nitroFillRef = useRef<HTMLDivElement | null>(null);
  const onNitroFill = (el: HTMLDivElement | null) => {
    nitroFillRef.current = el;
    engineRef.current?.setNitroFill(el);
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, {
      onScreen: (s, st) => {
        setScreen(s);
        if (st) {
          setStats(st);
          setScores(loadScores());
        }
      },
      onMute: (m) => {
        setMuted(m);
        try {
          localStorage.setItem("ar-muted", m ? "1" : "0");
        } catch {
          /* ignore */
        }
      },
    });
    engine.setMuted(
      (() => {
        try {
          return localStorage.getItem("ar-muted") === "1";
        } catch {
          return false;
        }
      })()
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const noMenu = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", noMenu);
    return () => document.removeEventListener("contextmenu", noMenu);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    engineRef.current?.setMuted(next);
    setMuted(next);
    try {
      localStorage.setItem("ar-muted", next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const eng = () => engineRef.current;

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-ink font-ui text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* top-right HUD buttons */}
      <div className="absolute right-3 top-3 z-30 flex gap-2" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {(screen === "playing" || screen === "paused") && (
          <button
            className="icon-btn"
            aria-label="Pause"
            onClick={() => eng()?.pauseToggle()}
          >
            <Icon d={screen === "paused" ? I.play : I.pause} size={18} />
          </button>
        )}
        <button className="icon-btn" aria-label="Mute" onClick={toggleMute}>
          <Icon d={muted ? I.soundOff : I.soundOn} size={18} />
        </button>
      </div>

      {/* nitro pad */}
      {screen === "playing" && (
        <button
          className="nitro-pad absolute bottom-5 right-4 z-30"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            eng()?.setNitroHeld(true);
          }}
          onPointerUp={() => eng()?.setNitroHeld(false)}
          onPointerLeave={() => eng()?.setNitroHeld(false)}
          onPointerCancel={() => eng()?.setNitroHeld(false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Nitro"
        >
          <div ref={onNitroFill} className="fill" />
          <span className="lbl">
            <Icon d={I.bolt} size={20} className="text-volt" />
            NITRO
          </span>
        </button>
      )}

      {/* ---------------- MENU ---------------- */}
      {screen === "menu" && (
        <Overlay dim={0.66}>
          <div className="anim-pop flex flex-col items-center gap-1 text-center">
            <div className="hud-label mb-2 text-volt/80">
              ARCADE HIGHWAY RACER
            </div>
            <h1
              className="font-display -skew-x-6 leading-none tracking-tight"
              style={{ textShadow: "0 0 30px rgba(46,230,255,0.25)" }}
            >
              <span className="block text-[54px] text-white sm:text-[62px]">
                ASPHALT
              </span>
              <span
                className="block text-[64px] text-ember sm:text-[76px]"
                style={{
                  textShadow:
                    "0 0 36px rgba(255,61,46,0.55), 0 5px 0 #55130c",
                }}
              >
                RUSH
              </span>
            </h1>
            <p className="mt-1 text-[12px] font-semibold tracking-[0.3em] text-mist/70">
              OUTRUN THE TRAFFIC · CHAIN THE COMBO
            </p>
          </div>

          <div className="anim-pop-slow panel w-full p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-[11px] text-mist/80">
                <div className="hud-label">KEYBOARD</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="space-x-1">
                    <Kbd>A</Kbd>
                    <Kbd>D</Kbd>
                    <span className="opacity-50">/</span>
                    <Kbd>◀</Kbd>
                    <Kbd>▶</Kbd>
                  </span>
                  <span className="tracking-widest">STEER</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="space-x-1">
                    <Kbd>W</Kbd>
                    <span className="opacity-50">/</span>
                    <Kbd>SHIFT</Kbd>
                  </span>
                  <span className="tracking-widest">NITRO</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Kbd>S</Kbd>
                  <span className="tracking-widest">BRAKE</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Kbd>ESC</Kbd>
                  <span className="tracking-widest">PAUSE</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[11px] text-mist/80">
                <div className="hud-label">TOUCH</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="opacity-80">DRAG ANYWHERE</span>
                  <span className="tracking-widest">STEER</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="opacity-80">HOLD THE PAD</span>
                  <span className="tracking-widest">NITRO</span>
                </div>
                <div className="mt-2 rounded-sm border border-volt/30 bg-volt/10 px-2 py-1.5 text-[10px] leading-snug text-volt/90">
                  Graze traffic for CLOSE CALLS — combo multiplies all points.
                </div>
              </div>
            </div>
          </div>

          <div className="anim-pop-slow w-full">
            <ScoreBoard scores={scores} highlight={null} />
          </div>

          <button
            className="btn btn-primary anim-pop px-12 py-4 text-xl"
            onClick={() => eng()?.startGame()}
          >
            <Icon d={I.bolt} size={20} />
            START RACE
          </button>
          <div className="anim-soft text-[11px] tracking-[0.35em] text-volt/70">
            PRESS ENTER TO RACE
          </div>
        </Overlay>
      )}

      {/* ---------------- PAUSED ---------------- */}
      {screen === "paused" && (
        <Overlay dim={0.8}>
          <div className="anim-pop flex flex-col items-center gap-4">
            <h2
              className="font-display text-5xl text-white"
              style={{ textShadow: "0 0 26px rgba(46,230,255,0.35)" }}
            >
              PAUSED
            </h2>
            <div className="flex gap-6 text-center">
              <div>
                <div className="hud-label">SCORE</div>
                <div className="font-display text-2xl text-white">
                  {fmt(stats?.score ?? 0)}
                </div>
              </div>
              <div>
                <div className="hud-label">DISTANCE</div>
                <div className="font-display text-2xl text-volt">
                  {(stats?.distanceKm ?? 0).toFixed(1)} KM
                </div>
              </div>
              <div>
                <div className="hud-label">TOP SPEED</div>
                <div className="font-display text-2xl text-amber">
                  {stats?.topSpeed ?? 0}
                </div>
              </div>
            </div>
            <div className="flex w-full max-w-[300px] flex-col gap-2.5">
              <button
                className="btn btn-primary py-3.5 text-base"
                onClick={() => eng()?.resume()}
              >
                <Icon d={I.play} size={16} />
                RESUME
              </button>
              <button
                className="btn btn-ghost py-3 text-sm"
                onClick={() => eng()?.restart()}
              >
                <Icon d={I.restart} size={15} />
                RESTART
              </button>
              <button
                className="btn btn-ghost py-3 text-sm"
                onClick={() => eng()?.toMenu()}
              >
                <Icon d={I.home} size={15} />
                QUIT TO MENU
              </button>
            </div>
            <div className="text-[11px] tracking-[0.3em] text-mist/50">
              ESC TO RESUME
            </div>
          </div>
        </Overlay>
      )}

      {/* ---------------- GAME OVER ---------------- */}
      {screen === "gameover" && (
        <Overlay dim={0.78} onBack={() => eng()?.restart()}>
          <div className="anim-pop flex flex-col items-center gap-3">
            <h2
              className="font-display -skew-x-6 text-6xl text-ember"
              style={{
                textShadow:
                  "0 0 34px rgba(255,61,46,0.6), 0 5px 0 #55130c",
              }}
            >
              WRECKED
            </h2>
            {stats?.isRecord && (
              <div className="anim-record border border-amber/60 bg-amber/15 px-4 py-1 text-[12px] font-bold tracking-[0.3em] text-amber">
                ★ NEW RECORD ★
              </div>
            )}

            <div className="panel w-full p-4 text-center">
              <div className="hud-label">FINAL SCORE</div>
              <div
                className="font-display text-5xl text-white"
                style={{ textShadow: "0 0 22px rgba(255,210,63,0.3)" }}
              >
                {fmt(stats?.score ?? 0)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
                <div>
                  <div className="hud-label">DISTANCE</div>
                  <div className="font-display text-lg text-volt">
                    {(stats?.distanceKm ?? 0).toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="hud-label">TOP SPEED</div>
                  <div className="font-display text-lg text-amber">
                    {stats?.topSpeed ?? 0}
                  </div>
                </div>
                <div>
                  <div className="hud-label">BEST</div>
                  <div className="font-display text-lg text-lime">
                    {fmt(stats?.best ?? 0)}
                  </div>
                </div>
              </div>
            </div>

            <StopProp>
              <ScoreBoard scores={scores} highlight={stats?.rank ?? null} />
            </StopProp>

            <StopProp>
              <div className="flex w-full max-w-[300px] gap-2.5">
                <button
                  className="btn btn-primary flex-1 py-3.5 text-base"
                  onClick={() => eng()?.restart()}
                >
                  <Icon d={I.restart} size={16} />
                  RETRY
                </button>
                <button
                  className="btn btn-ghost flex-1 py-3.5 text-sm"
                  onClick={() => eng()?.toMenu()}
                >
                  <Icon d={I.home} size={15} />
                  MENU
                </button>
              </div>
            </StopProp>
            <div className="anim-soft text-[11px] tracking-[0.3em] text-mist/50">
              ENTER OR TAP ANYWHERE TO RETRY
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
