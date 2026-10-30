"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

type GameFrameProps = {
  title: string;
  src: string | null;
  sandbox: string;
  language?: "vi" | "en";
  unavailableMessage?: string;
};

export default function GameFrame({ title, src, sandbox, language = "vi", unavailableMessage }: GameFrameProps) {
  const frameRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);

  const labels = language === "en"
    ? {
        frame: "Game frame",
        enter: "Enter fullscreen",
        exit: "Exit fullscreen",
        enterShort: "Fullscreen",
        exitShort: "Exit",
        unavailable: "This URL cannot be embedded",
        fallback: "GameVault only embeds HTTPS URLs. You can still open the original site using the link above."
      }
    : {
        frame: "Khung trò chơi",
        enter: "Vào chế độ toàn màn hình",
        exit: "Thoát chế độ toàn màn hình",
        enterShort: "Toàn màn hình",
        exitShort: "Thoát",
        unavailable: "Không thể nhúng đường dẫn này",
        fallback: "GameVault chỉ nhúng đường dẫn HTTPS. Bạn vẫn có thể mở trang gốc bằng nút phía trên."
      };

  const exitFallback = useCallback(() => setFallbackFullscreen(false), []);

  const lockLandscape = useCallback(async () => {
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch {
      // Orientation locking is not supported in every browser, especially iOS Safari.
    }
  }, []);

  const unlockOrientation = useCallback(() => {
    try {
      screen.orientation?.unlock();
    } catch {
      // Ignore browsers that do not implement the Screen Orientation API.
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      const nativeFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(nativeFullscreen || fallbackFullscreen);
      if (nativeFullscreen) {
        void lockLandscape();
      } else {
        unlockOrientation();
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [fallbackFullscreen, lockLandscape, unlockOrientation]);

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
      unlockOrientation();
      return;
    }

    const element = frameRef.current;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        setIsFullscreen(true);
        await lockLandscape();
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
      aria-label={labels.frame}
    >
      <div className="play-frame-toolbar">
        <span>{title}</span>
        <button
          type="button"
          className="play-fullscreen-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? labels.exit : labels.enter}
          title={isFullscreen ? labels.exit : labels.enter}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          <span>{isFullscreen ? labels.exitShort : labels.enterShort}</span>
        </button>
      </div>
      {src ? (
        <iframe
          title={title}
          src={src}
          sandbox={sandbox}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen; gamepad; picture-in-picture; pointer-lock"
          allowFullScreen
        />
      ) : (
        <div className="play-frame-unavailable">
          <h2>{labels.unavailable}</h2>
          <p>{unavailableMessage ?? labels.fallback}</p>
        </div>
      )}
    </section>
  );
}
