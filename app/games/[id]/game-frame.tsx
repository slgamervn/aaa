"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

type GameFrameProps = {
  title: string;
  src: string | null;
  sandbox: string;
  unavailableMessage?: string;
};

export default function GameFrame({ title, src, sandbox, unavailableMessage }: GameFrameProps) {
  const frameRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);

  const exitFallback = useCallback(() => setFallbackFullscreen(false), []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement) || fallbackFullscreen);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [fallbackFullscreen]);

  useEffect(() => {
    if (!fallbackFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitFallback();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [fallbackFullscreen, exitFallback]);

  const toggleFullscreen = async () => {
    if (fallbackFullscreen || document.fullscreenElement) {
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {
          // Keep the page-level fallback available if the browser rejects exitFullscreen().
        }
      }
      setFallbackFullscreen(false);
      setIsFullscreen(false);
      return;
    }

    const element = frameRef.current;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        setIsFullscreen(true);
        return;
      } catch {
        // Some mobile browsers do not support fullscreen for regular page elements.
      }
    }

    setFallbackFullscreen(true);
    setIsFullscreen(true);
  };

  return (
    <section
      ref={frameRef}
      className={"play-frame-wrap" + (fallbackFullscreen ? " is-fallback-fullscreen" : "")}
      aria-label="Game frame"
    >
      <div className="play-frame-toolbar">
        <span>{title}</span>
        <button
          type="button"
          className="play-fullscreen-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Chơi toàn màn hình"}
          title={isFullscreen ? "Thoát toàn màn hình" : "Chơi toàn màn hình"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          <span>{isFullscreen ? "Thoát" : "Toàn màn hình"}</span>
        </button>
      </div>
      {src ? (
        <iframe
          title={title}
          src={src}
          sandbox={sandbox}
          referrerPolicy="no-referrer"
          allow="fullscreen; gamepad"
          allowFullScreen
        />
      ) : (
        <div className="play-frame-unavailable">
          <h2>Không thể nhúng đường dẫn này</h2>
          <p>{unavailableMessage ?? "GameVault chỉ nhúng đường dẫn HTTPS. Bạn vẫn có thể mở trang gốc bằng nút phía trên."}</p>
        </div>
      )}
    </section>
  );
}
