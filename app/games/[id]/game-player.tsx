"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Languages,
  Maximize2,
  Minimize2,
  Moon,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sun,
  Type,
  MoveVertical,
  Activity,
  ChevronUp,
  ChevronDown,
  CircleDot,
  Crosshair,
  FileCode2,
  Globe2,
  Play
} from "lucide-react";

type Language = "vi" | "en";
type Theme = "paper" | "night";
type PreviewSize = "normal" | "large";
type ToolbarPosition = { x: number; y: number };
const DEFAULT_TOOLBAR_POSITION: ToolbarPosition = { x: 50, y: 9 };
type ProjectOrientation = "auto" | "landscape" | "portrait";
type LockableScreenOrientation = ScreenOrientation & {
  lock: (orientation: "landscape" | "portrait") => Promise<void>;
};

function getLockableScreenOrientation(): LockableScreenOrientation | null {
  const orientation = window.screen?.orientation as LockableScreenOrientation | undefined;
  return orientation && typeof orientation.lock === "function" ? orientation : null;
}

type ProjectDetailsData = {
  title: string;
  description: string;
  kind: "html" | "url";
  externalUrl: string | null;
  embeddedUrl: string | null;
  sourceUrl: string | null;
  downloadUrl: string | null;
  orientation: ProjectOrientation;
};

type SavedPreferences = {
  language?: Language;
  theme?: Theme;
  largeText?: boolean;
  motionReduced?: boolean;
};

const PREFERENCES_KEY = "gamevault-preferences-v1";
const PLAYER_PREFERENCES_KEY = "gamevault-player-preferences-v1";

const copy = {
  vi: {
    htmlKicker: "DỰ ÁN HTML ĐÃ CÔNG KHAI",
    urlKicker: "DỰ ÁN LIÊN KẾT",
    htmlFallback: "Dự án HTML đã được kiểm tra và phê duyệt trước khi công khai.",
    urlFallback: "Bản xem trước sẽ chạy trực tiếp tại đây nếu website nguồn cho phép nhúng.",
    publishedSource: "Mã nguồn đã lưu trên GitHub",
    downloadProject: "Tải tệp HTML",
    reviewed: "Đã qua kiểm duyệt",
    backHome: "Quay lại danh sách dự án",
    switchLanguage: "Chuyển sang tiếng Anh",
    previewLabel: "Bản xem trước dự án",
    previewHeading: "Xem trước dự án",
    previewIntro: "Nội dung chỉ được tải khi bạn chủ động mở bản xem trước.",
    previewButton: "Xem trước dự án",
    htmlType: "Tệp HTML",
    urlType: "Website liên kết",
    showControls: "Hiện thanh công cụ",
    hideControls: "Thu gọn thanh công cụ",
    previewUnavailable: "Dự án này hiện không có bản xem trước để chạy trong PJVault.",
    previewHelp: "Nếu khung xem trước trống, website nguồn có thể đang từ chối nhúng. PJVault không thể ghi đè giới hạn do website đó đặt ra.",
    sourceDisclosure: "Nguồn dự án (tùy chọn)",
    originalSite: "Mở website gốc",
    sourceUnavailable: "Không có liên kết nguồn.",
    fullscreen: "Toàn màn hình",
    exitFullscreen: "Thoát toàn màn hình",
    fullscreenFallback: "Trình duyệt không hỗ trợ toàn màn hình gốc; đang dùng chế độ tràn màn hình dự phòng.",
    reload: "Tải lại dự án",
    largerPreview: "Khung xem lớn",
    normalPreview: "Khung xem tiêu chuẩn",
    darkTheme: "Bật giao diện tối",
    lightTheme: "Bật giao diện sáng",
    largerText: "Tăng cỡ chữ",
    normalText: "Cỡ chữ tiêu chuẩn",
    reduceMotion: "Giảm chuyển động",
    restoreMotion: "Bật chuyển động",
    lockOrientation: "Khóa hướng màn hình",
    unlockOrientation: "Bỏ khóa hướng màn hình",
    orientationUnavailable: "Thiết bị hoặc trình duyệt không cho phép khóa hướng màn hình.",
    orientationNeedsFullscreen: "Hãy bật toàn màn hình trước khi khóa hướng màn hình.",
    customControls: "Tùy chỉnh trình xem",
    scrollPageUp: "Cuộn trang lên",
    scrollPageDown: "Cuộn trang xuống",
    frameReloaded: "Đã tải lại dự án.",
    moveControls: "Kéo để di chuyển, chạm để mở điều khiển",
    resetPosition: "Đặt lại vị trí nút"
  },
  en: {
    htmlKicker: "PUBLISHED HTML PROJECT",
    urlKicker: "LINKED PROJECT",
    htmlFallback: "This HTML project was reviewed and approved before publication.",
    urlFallback: "The preview runs here inside PJVault when the source website permits embedding.",
    publishedSource: "Archived source on GitHub",
    downloadProject: "Download HTML file",
    reviewed: "Reviewed",
    backHome: "Back to project library",
    switchLanguage: "Switch to Vietnamese",
    previewLabel: "Project preview",
    previewHeading: "Preview this project",
    previewIntro: "The project only loads when you choose to open its preview.",
    previewButton: "Preview project",
    htmlType: "HTML file",
    urlType: "Linked website",
    showControls: "Show controls",
    hideControls: "Collapse controls",
    previewUnavailable: "This project does not currently have an in-app preview.",
    previewHelp: "If the preview is blank, the source website may be refusing embedding. PJVault cannot override restrictions set by that website.",
    sourceDisclosure: "Project source (optional)",
    originalSite: "Open original website",
    sourceUnavailable: "No source link is available.",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    fullscreenFallback: "Native fullscreen is unavailable; using an expanded in-page view.",
    reload: "Reload project",
    largerPreview: "Larger preview",
    normalPreview: "Standard preview",
    darkTheme: "Use dark appearance",
    lightTheme: "Use light appearance",
    largerText: "Increase text size",
    normalText: "Default text size",
    reduceMotion: "Reduce motion",
    restoreMotion: "Enable motion",
    lockOrientation: "Lock screen orientation",
    unlockOrientation: "Unlock screen orientation",
    orientationUnavailable: "This device or browser cannot lock screen orientation.",
    orientationNeedsFullscreen: "Enter fullscreen before locking the screen orientation.",
    customControls: "Viewer preferences",
    scrollPageUp: "Scroll page up",
    scrollPageDown: "Scroll page down",
    frameReloaded: "Project reloaded.",
    moveControls: "Drag to move; tap to show controls",
    resetPosition: "Reset button position"
  }
} as const;

function readStorageObject(key: string): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue with defaults when storage is unavailable or malformed.
  }
  return {};
}

export default function ProjectDetails({ project }: { project: ProjectDetailsData }) {
  const [language, setLanguage] = useState<Language>("vi");
  const [theme, setTheme] = useState<Theme>("paper");
  const [largeText, setLargeText] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("normal");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>(DEFAULT_TOOLBAR_POSITION);
  const [toolbarDragging, setToolbarDragging] = useState(false);
  const [orientationSupported, setOrientationSupported] = useState(false);
  const [orientationLocked, setOrientationLocked] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [notice, setNotice] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const toolbarDragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: ToolbarPosition } | null>(null);
  const toolbarMovedRef = useRef(false);
  const t = copy[language];
  const fullscreenActive = isFullscreen || fallbackFullscreen;

  useEffect(() => {
    const saved = readStorageObject(PREFERENCES_KEY) as SavedPreferences;
    const playerPrefs = readStorageObject(PLAYER_PREFERENCES_KEY);

    if (saved.language === "vi" || saved.language === "en") setLanguage(saved.language);
    if (saved.theme === "paper" || saved.theme === "night") setTheme(saved.theme);
    if (typeof saved.largeText === "boolean") setLargeText(saved.largeText);
    if (typeof saved.motionReduced === "boolean") {
      setMotionReduced(saved.motionReduced);
    } else {
      setMotionReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    if (playerPrefs.previewSize === "normal" || playerPrefs.previewSize === "large") {
      setPreviewSize(playerPrefs.previewSize);
    }
    const savedPosition = playerPrefs.toolbarPosition as ToolbarPosition | undefined;
    if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
      setToolbarPosition({ x: Math.min(91.5, Math.max(8.5, savedPosition.x)), y: Math.min(91.5, Math.max(8.5, savedPosition.y)) });
    }

    setOrientationSupported(Boolean(getLockableScreenOrientation()));
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;

    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.scale = largeText ? "large" : "normal";
    document.documentElement.dataset.motion = motionReduced ? "reduced" : "normal";
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "paper" ? "#edf2f1" : "#17242a"
    );

    try {
      const shared = readStorageObject(PREFERENCES_KEY);
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
        ...shared,
        language,
        theme,
        largeText,
        motionReduced
      }));
      const playerPrefs = readStorageObject(PLAYER_PREFERENCES_KEY);
      window.localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify({
        ...playerPrefs,
        previewSize,
        toolbarPosition
      }));
    } catch {
      // Preferences remain active for this session if storage is blocked.
    }
  }, [language, theme, largeText, motionReduced, previewSize, toolbarPosition, preferencesLoaded]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeElement = document.fullscreenElement;
      const active = Boolean(
        activeElement &&
        (activeElement === previewRef.current || previewRef.current?.contains(activeElement))
      );
      setIsFullscreen(active);

      if (!active) {
        setOrientationLocked(false);
        try {
          window.screen?.orientation?.unlock?.();
        } catch {
          // Orientation may already have been released by the browser.
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!fallbackFullscreen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFallbackFullscreen(false);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [fallbackFullscreen]);

  useEffect(() => {
    return () => {
      if (document.fullscreenElement === previewRef.current) {
        void document.exitFullscreen().catch(() => undefined);
      }
      try {
        window.screen?.orientation?.unlock?.();
      } catch {
        // Ignore cleanup errors when orientation locking is unsupported.
      }
    };
  }, []);

  function toggleLanguage() {
    setLanguage(current => current === "vi" ? "en" : "vi");
  }

  async function applyProjectOrientation() {
    if (project.orientation === "auto") return;

    const orientation = getLockableScreenOrientation();
    if (!orientation) return;

    try {
      await orientation.lock(project.orientation);
      setOrientationLocked(true);
      setNotice("");
    } catch {
      setOrientationLocked(false);
      setNotice(t.orientationUnavailable);
    }
  }

  async function toggleOrientationLock() {
    if (!document.fullscreenElement) {
      setNotice(t.orientationNeedsFullscreen);
      return;
    }

    const orientation = getLockableScreenOrientation();
    if (!orientation) {
      setNotice(t.orientationUnavailable);
      return;
    }

    try {
      if (orientationLocked) {
        window.screen.orientation.unlock();
        setOrientationLocked(false);
      } else if (project.orientation !== "auto") {
        await orientation.lock(project.orientation);
        setOrientationLocked(true);
      } else {
        setNotice(t.orientationUnavailable);
      }
      setNotice("");
    } catch {
      setNotice(t.orientationUnavailable);
    }
  }

  async function toggleFullscreen() {
    const container = previewRef.current;
    if (!container) return;

    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }

    if (document.fullscreenElement === container) {
      try {
        await document.exitFullscreen();
      } catch {
        setNotice(t.fullscreenFallback);
      }
      return;
    }

    if (typeof container.requestFullscreen === "function") {
      try {
        await container.requestFullscreen();
        setIsFullscreen(document.fullscreenElement === container);
        await applyProjectOrientation();
        return;
      } catch {
        setIsFullscreen(false);
      }
    }

    setFallbackFullscreen(true);
    setNotice(t.fullscreenFallback);
  }

  function reloadProject() {
    setPreviewStarted(true);
    setFrameKey(current => current + 1);
    setNotice(t.frameReloaded);
  }

  function handleToolbarPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in a few embedded browsers.
    }
    toolbarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: toolbarPosition
    };
    toolbarMovedRef.current = false;
    setToolbarDragging(true);
  }

  function handleToolbarPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = toolbarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!toolbarMovedRef.current && Math.hypot(dx, dy) < 4) return;
    toolbarMovedRef.current = true;

    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

    setToolbarPosition({
      x: Math.min(91.5, Math.max(8.5, drag.origin.x + (dx / bounds.width) * 100)),
      y: Math.min(91.5, Math.max(8.5, drag.origin.y + (dy / bounds.height) * 100))
    });
  }

  function finishToolbarDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (toolbarDragRef.current?.pointerId !== event.pointerId) return;
    toolbarDragRef.current = null;
    setToolbarDragging(false);
  }

  function activateToolbarHandle() {
    if (toolbarMovedRef.current) {
      toolbarMovedRef.current = false;
      return;
    }
    void toggleFullscreen();
  }

  function resetToolbarPosition() {
    setToolbarPosition(DEFAULT_TOOLBAR_POSITION);
  }


  function scrollPage(direction: "up" | "down") {
    const distance = Math.max(320, Math.round(window.innerHeight * 0.72));
    window.scrollBy({ top: direction === "up" ? -distance : distance, behavior: motionReduced ? "auto" : "smooth" });
  }

  const pageClassName = "play-page project-detail-page";
  const previewClassName = "project-preview-shell" + (fallbackFullscreen ? " is-fallback-fullscreen" : "");

  return (
    <main
      className={pageClassName}
      data-large-text={largeText ? "true" : "false"}
      data-motion={motionReduced ? "reduced" : "normal"}
    >
      <header className="play-header">
        <Link href="/" className="play-back"><ArrowLeft size={16} /> {t.backHome}</Link>
        <div className="play-header-actions">
          <button
            type="button"
            className="play-language-button"
            onClick={toggleLanguage}
            aria-label={t.switchLanguage}
            title={t.switchLanguage}
          >
            <Languages size={15} />
            <span>{language === "vi" ? "EN" : "VI"}</span>
          </button>
          <span className="play-safe"><ShieldCheck size={15} /> {t.reviewed}</span>
        </div>
      </header>

      <section className="play-intro project-detail-intro">
        <div className="project-detail-topline">
          <span className="project-detail-type">{project.kind === "html" ? t.htmlType : t.urlType}</span>
          <span className="project-detail-reviewed"><ShieldCheck size={15} /> {t.reviewed}</span>
        </div>
        <h1>{project.title}</h1>
        <p>{project.description || (project.kind === "html" ? t.htmlFallback : t.urlFallback)}</p>
        <div className="project-detail-actions">
          {project.downloadUrl && (
            <a className="project-download-button" href={project.downloadUrl} download>
              <Download size={17} /> {t.downloadProject}
            </a>
          )}
          {project.externalUrl && (
            <a className="project-source-link" href={project.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
              <ExternalLink size={15} /> {t.originalSite}
            </a>
          )}
          {project.sourceUrl && (
            <a className="project-source-link" href={project.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> {t.publishedSource}
            </a>
          )}
        </div>
      </section>

      {!previewStarted && (
        <section className="project-preview-gate" aria-label={t.previewLabel}>
          <div className="project-preview-gate-icon" aria-hidden="true">
            {project.kind === "html" ? <FileCode2 size={24} /> : <Globe2 size={24} />}
          </div>
          <div className="project-preview-gate-copy">
            <h2>{t.previewHeading}</h2>
            <p>{t.previewIntro}</p>
          </div>
          {project.embeddedUrl ? (
            <button type="button" className="project-preview-start" onClick={() => setPreviewStarted(true)}>
              <Play size={16} fill="currentColor" /> {t.previewButton}
            </button>
          ) : (
            <p className="project-preview-gate-unavailable">{t.previewUnavailable}</p>
          )}
        </section>
      )}

      {previewStarted && project.embeddedUrl && (
        <section ref={previewRef} className={previewClassName} data-preview-size={previewSize} aria-label={t.previewLabel}>
          <div className={"project-preview-toolbar" + (fullscreenActive ? " is-fullscreen-toolbar" : "")}>
            {fullscreenActive ? (
              <button type="button" className={"fullscreen-toolbar-dot" + (toolbarDragging ? " is-dragging" : "")}
                style={{ left: toolbarPosition.x + "%", top: toolbarPosition.y + "%" }}
                onPointerDown={handleToolbarPointerDown} onPointerMove={handleToolbarPointerMove}
                onPointerUp={finishToolbarDrag} onPointerCancel={finishToolbarDrag}
                onClick={activateToolbarHandle} aria-label={t.exitFullscreen} title={t.exitFullscreen}>
                <Minimize2 size={21} strokeWidth={2.2} />
              </button>
            ) : (
              <div className="project-preview-toolbar-inner">
                <button type="button" className="preview-control-btn preview-fullscreen-btn"
                  onClick={() => void toggleFullscreen()} aria-pressed={false}
                  aria-label={t.fullscreen} title={t.fullscreen}>
                  <Maximize2 size={17} /><span>{t.fullscreen}</span>
                </button>
              </div>
            )}
          </div>
          <iframe key={frameKey} className="project-preview-frame" title={project.title}
            src={project.embeddedUrl}
            sandbox={project.kind === "html"
              ? "allow-scripts allow-pointer-lock allow-orientation-lock"
              : "allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-orientation-lock"}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowFullScreen loading="eager" />
          {notice && <p className="project-preview-notice" role="status">{notice}</p>}
          <p className="project-preview-help">{t.previewHelp}</p>
        </section>
      )}

    </main>
  );
}
