"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

type GameOrientation = "auto" | "landscape" | "portrait";
type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape" | "portrait") => Promise<void>;
};

type GameFrameProps = {
  title: string;
  src: string | null;
  sandbox: string;
  orientation: GameOrientation;
  language?: "vi" | "en";
  unavailableMessage?: string;
};

export default function GameFrame({
  title,
  src,
  sandbox,
  orientation,
  language = "vi",
  unavailableMessage
}: GameFrameProps) {
  const frameRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [orientationNoticeVisible, setOrientationNoticeVisible] = useState(false);

  const labels = language === "en"
    ? {
        frame: "Game frame",
        enter: "Enter fullscreen",
        exit: "Exit fullscreen",
        enterShort: "Fullscreen",
        exitShort: "Exit",
        unavailable: "This URL cannot be embedded",
        fallback: "GameVault only embeds HTTPS URLs. You can still open the original site using the link above.",
        dismissOrientationNotice: "Dismiss orientation notice"
      }
    : {
        frame: "Khung trò chơi",
        enter: "Vào chế độ toàn màn hình",
        exit: "Thoát chế độ toàn màn hình",
        enterShort: "Toàn màn hình",
        exitShort: "Thoát",
        unavailable: "Không thể nhúng đường dẫn này",
        fallback: "GameVault chỉ nhúng đường dẫn HTTPS. Bạn vẫn có thể mở trang gốc bằng nút phía trên.",
        dismissOrientationNotice: "Đóng hướng dẫn xoay màn hình"
      };

  const orientationNotice = language === "en"
    ? orientation === "landscape"
      ? "This game is set to landscape. If the browser cannot rotate automatically, enable auto-rotate and turn your phone sideways."
      : "This game is set to portrait. If the browser cannot rotate automatically, enable auto-rotate and hold your phone upright."
    : orientation === "landscape"
      ? "Game này được đặt ở chế độ ngang. Nếu trình duyệt không tự xoay, hãy bật Tự động xoay rồi xoay điện thoại nằm ngang."
      : "Game này được đặt ở chế độ dọc. Nếu trình duyệt không tự xoay, hãy bật Tự động xoay rồi giữ điện thoại thẳng đứng.";

  const unlockOrientation = useCallback(() => {
    try {
      const orientationApi = window.screen?.orientation as LockableScreenOrientation | undefined;
      orientationApi?.unlock?.();
    } catch {
      // Ignore browsers that do not implement the Screen Orientation API.
    }
  }, []);

  const applyOrientation = useCallback(async (): Promise<boolean> => {
    if (orientation === "auto") {
      unlockOrientation();
      setOrientationNoticeVisible(false);
      return true;
    }

    try {
      const orientationApi = window.screen?.orientation as LockableScreenOrientation | undefined;
      if (!orientationApi || typeof orientationApi.lock !== "function") {
        setOrientationNoticeVisible(true);
        return false;
      }
      await orientationApi.lock(orientation);
      setOrientationNoticeVisible(false);
      return true;
    } catch {
      // Orientation locking is restricted or unsupported in some browsers and fullscreen modes.
      setOrientationNoticeVisible(true);
      return false;
    }
  }, [orientation, unlockOrientation]);

  useEffect(() => {
    const syncFullscreen = () => {
      const nativeFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(nativeFullscreen || fallbackFullscreen);
      if (!nativeFullscreen) {
        unlockOrientation();
        setOrientationNoticeVisible(false);
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [fallbackFullscreen, unlockOrientation]);

  useEffect(() => {
    if (orientation === "auto") return;
    const orientationApi = window.screen?.orientation as LockableScreenOrientation | undefined;
    if (!orientationApi) return;

    const syncOrientation = () => {
      const matches = orientation === "landscape"
        ? orientationApi.type.startsWith("landscape")
        : orientationApi.type.startsWith("portrait");
      setOrientationNoticeVisible(isFullscreen && !matches);
    };

    orientationApi.addEventListener("change", syncOrientation);
    if (isFullscreen) syncOrientation();
    return () => orientationApi.removeEventListener("change", syncOrientation);
  }, [orientation, isFullscreen]);

  useEffect(() => {
    if (!fallbackFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFallbackFullscreen(false);
        setIsFullscreen(false);
        unlockOrientation();
        setOrientationNoticeVisible(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [fallbackFullscreen, unlockOrientation]);

  useEffect(() => () => unlockOrientation(), [unlockOrientation]);

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
      setOrientationNoticeVisible(false);
      return;
    }

    const element = frameRef.current;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        setIsFullscreen(true);
        await applyOrientation();
        return;
      } catch {
        // Some mobile browsers do not support fullscreen for regular page elements.
      }
    }

    setFallbackFullscreen(true);
    setIsFullscreen(true);
    setOrientationNoticeVisible(orientation !== "auto");
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
      {orientationNoticeVisible && isFullscreen && orientation !== "auto" && (
        <div className="play-orientation-notice" role="status">
          <p>{orientationNotice}</p>
          <button
            type="button"
            aria-label={labels.dismissOrientationNotice}
            onClick={() => setOrientationNoticeVisible(false)}
          >
            <X size={17} />
          </button>
        </div>
      )}
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
