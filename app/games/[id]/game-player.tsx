"use client";

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
  Crosshair
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
    previewLabel: "Đang chạy trong GameVault",
    showControls: "Hiện thanh công cụ",
    hideControls: "Thu gọn thanh công cụ",
    previewUnavailable: "Dự án này hiện không có bản xem trước để chạy trong GameVault.",
    previewHelp: "Nếu khung xem trước trống, website nguồn có thể đang từ chối nhúng. GameVault không thể ghi đè giới hạn do website đó đặt ra.",
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
    urlFallback: "The preview runs here inside GameVault when the source website permits embedding.",
    publishedSource: "Archived source on GitHub",
    downloadProject: "Download HTML file",
    reviewed: "Reviewed",
    backHome: "Back to project library",
    switchLanguage: "Switch to Vietnamese",
    previewLabel: "Running inside GameVault",
    showControls: "Show controls",
    hideControls: "Collapse controls",
    previewUnavailable: "This project does not currently have an in-app preview.",
    previewHelp: "If the preview is blank, the source website may be refusing embedding. GameVault cannot override restrictions set by that website.",
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
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>(DEFAULT_TOOLBAR_POSITION);
  const [toolbarDragging, setToolbarDragging] = useState(false);
  const [orientationSupported, setOrientationSupported] = useState(false);
  const [orientationLocked, setOrientationLocked] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
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
      theme === "paper" ? "#f3f0e7" : "#171c18"
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
      setToolbarExpanded(!active);

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
      setToolbarExpanded(true);
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
        setToolbarExpanded(false);
        await applyProjectOrientation();
        return;
      } catch {
        setIsFullscreen(false);
      }
    }

    setFallbackFullscreen(true);
    setToolbarExpanded(false);
    setNotice(t.fullscreenFallback);
  }

  function reloadProject() {
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
    setToolbarExpanded(true);
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
        <a href="/" className="play-back"><ArrowLeft size={16} /> {t.backHome}</a>
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
        <div className="section-kicker">{project.kind === "html" ? t.htmlKicker : t.urlKicker}</div>
        <h1>{project.title}</h1>
        <p>{project.description || (project.kind === "html" ? t.htmlFallback : t.urlFallback)}</p>
        {project.downloadUrl && (
          <div className="project-detail-actions">
            <a className="project-download-button" href={project.downloadUrl} download>
              <Download size={17} /> {t.downloadProject}
            </a>
          </div>
        )}
      </section>

      <section
        ref={previewRef}
        className={previewClassName}
        data-preview-size={previewSize}
        aria-label={t.previewLabel}
      >
        <div className={"project-preview-toolbar" + (fullscreenActive ? " is-fullscreen-toolbar" : "")}>
          {fullscreenActive && !toolbarExpanded ? (
            <button
              type="button"
              className={"fullscreen-toolbar-dot" + (toolbarDragging ? " is-dragging" : "")}
              style={{ left: toolbarPosition.x + "%", top: toolbarPosition.y + "%" }}
              onPointerDown={handleToolbarPointerDown}
              onPointerMove={handleToolbarPointerMove}
              onPointerUp={finishToolbarDrag}
              onPointerCancel={finishToolbarDrag}
              onClick={activateToolbarHandle}
              aria-label={t.moveControls}
              aria-expanded={false}
              title={t.moveControls}
            >
              <CircleDot size={22} strokeWidth={2.1} />
            </button>
          ) : (
            <div className={fullscreenActive ? "fullscreen-toolbar-panel" : "project-preview-toolbar-inner"}>
              <div className="project-preview-toolbar-top">
                <div className="project-preview-heading">
                  <span className="project-preview-dot" aria-hidden="true" />
                  <span>{t.previewLabel}</span>
                </div>
                {fullscreenActive && (
                  <div className="fullscreen-toolbar-panel-actions">
                    <button
                      type="button"
                      className="fullscreen-toolbar-reset"
                      onClick={resetToolbarPosition}
                      aria-label={t.resetPosition}
                      title={t.resetPosition}
                    >
                      <Crosshair size={17} />
                    </button>
                    <button
                      type="button"
                      className="fullscreen-toolbar-collapse"
                      onClick={() => setToolbarExpanded(false)}
                      aria-label={t.hideControls}
                      aria-expanded={true}
                      title={t.hideControls}
                    >
                      <ChevronUp size={19} />
                    </button>
                  </div>
                )}
              </div>

              <div className="project-preview-controls" role="group" aria-label={t.customControls}>
                {!fullscreenActive && (
                  <>
                    <button
                      type="button"
                      className="preview-control-btn page-scroll-control"
                      onClick={() => scrollPage("up")}
                      aria-label={t.scrollPageUp}
                      title={t.scrollPageUp}
                    >
                      <ChevronUp size={17} />
                    </button>

                    <button
                      type="button"
                      className="preview-control-btn page-scroll-control"
                      onClick={() => scrollPage("down")}
                      aria-label={t.scrollPageDown}
                      title={t.scrollPageDown}
                    >
                      <ChevronDown size={17} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="preview-control-btn"
                  onClick={() => setPreviewSize(current => current === "normal" ? "large" : "normal")}
                  aria-pressed={previewSize === "large"}
                  aria-label={previewSize === "large" ? t.normalPreview : t.largerPreview}
                  title={previewSize === "large" ? t.normalPreview : t.largerPreview}
                >
                  <MoveVertical size={16} />
                </button>

                <button
                  type="button"
                  className="preview-control-btn"
                  onClick={() => setTheme(current => current === "paper" ? "night" : "paper")}
                  aria-pressed={theme === "night"}
                  aria-label={theme === "paper" ? t.darkTheme : t.lightTheme}
                  title={theme === "paper" ? t.darkTheme : t.lightTheme}
                >
                  {theme === "paper" ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                <button
                  type="button"
                  className="preview-control-btn"
                  onClick={() => setLargeText(current => !current)}
                  aria-pressed={largeText}
                  aria-label={largeText ? t.normalText : t.largerText}
                  title={largeText ? t.normalText : t.largerText}
                >
                  <Type size={16} />
                </button>

                <button
                  type="button"
                  className="preview-control-btn"
                  onClick={() => setMotionReduced(current => !current)}
                  aria-pressed={motionReduced}
                  aria-label={motionReduced ? t.restoreMotion : t.reduceMotion}
                  title={motionReduced ? t.restoreMotion : t.reduceMotion}
                >
                  <Activity size={16} />
                </button>

                {orientationSupported && project.orientation !== "auto" && (
                  <button
                    type="button"
                    className="preview-control-btn"
                    onClick={() => void toggleOrientationLock()}
                    disabled={!isFullscreen}
                    aria-pressed={orientationLocked}
                    aria-label={orientationLocked ? t.unlockOrientation : t.lockOrientation}
                    title={orientationLocked ? t.unlockOrientation : t.lockOrientation}
                  >
                    <RotateCw size={16} />
                  </button>
                )}

                <button
                  type="button"
                  className="preview-control-btn"
                  onClick={reloadProject}
                  aria-label={t.reload}
                  title={t.reload}
                >
                  <RefreshCw size={16} />
                </button>

                <button
                  type="button"
                  className="preview-control-btn preview-fullscreen-btn"
                  onClick={() => void toggleFullscreen()}
                  aria-pressed={fullscreenActive}
                  aria-label={fullscreenActive ? t.exitFullscreen : t.fullscreen}
                  title={fullscreenActive ? t.exitFullscreen : t.fullscreen}
                >
                  {fullscreenActive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                  <span>{fullscreenActive ? t.exitFullscreen : t.fullscreen}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {project.embeddedUrl ? (
          <iframe
            key={frameKey}
            className="project-preview-frame"
            title={project.title}
            src={project.embeddedUrl}
            sandbox={project.kind === "html"
              ? "allow-scripts allow-pointer-lock allow-orientation-lock"
              : "allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-orientation-lock"}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope"
            allowFullScreen
            loading="eager"
          />
        ) : (
          <div className="project-preview-blocked">
            <h2>{t.previewUnavailable}</h2>
            <p>{t.sourceUnavailable}</p>
          </div>
        )}

        {notice && <p className="project-preview-notice" role="status">{notice}</p>}
        <p className="project-preview-help">{t.previewHelp}</p>
      </section>

      {(project.externalUrl || project.sourceUrl) && (
        <details className="project-source-details">
          <summary>{t.sourceDisclosure}</summary>
          <div>
            {project.externalUrl && (
              <a href={project.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
                <ExternalLink size={14} /> {t.originalSite}
              </a>
            )}
            {project.sourceUrl && (
              <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> {t.publishedSource}
              </a>
            )}
          </div>
        </details>
      )}
    </main>
  );
}
