"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Languages, ShieldCheck } from "lucide-react";

type Language = "vi" | "en";
type ProjectDetailsData = {
  title: string;
  description: string;
  kind: "html" | "url";
  externalUrl: string | null;
  embeddedUrl: string | null;
  sourceUrl: string | null;
  downloadUrl: string | null;
};

const PREFERENCES_KEY = "gamevault-preferences-v1";

const copy = {
  vi: {
    htmlKicker: "DỰ ÁN HTML ĐÃ CÔNG KHAI",
    urlKicker: "DỰ ÁN LIÊN KẾT",
    htmlFallback: "Dự án HTML đã được kiểm tra và phê duyệt trước khi công khai.",
    urlFallback: "Dự án được mở ngay trong GameVault nếu website gốc cho phép nhúng.",
    originalSite: "Mở website gốc",
    publishedSource: "Xem mã nguồn đã lưu",
    downloadProject: "Tải tệp HTML",
    reviewed: "Đã qua kiểm duyệt",
    backHome: "Quay lại danh sách dự án",
    switchLanguage: "Chuyển sang tiếng Anh",
    previewLabel: "Bản xem trước dự án",
    blockedTitle: "Website không cho phép nhúng",
    blockedText: "Một số website chặn chế độ xem trước trong trang khác. Bạn vẫn có thể mở website gốc.",
    previewUnavailable: "Không có bản xem trước cho dự án này.",
    openNewTab: "Mở website gốc trong tab mới"
  },
  en: {
    htmlKicker: "PUBLISHED HTML PROJECT",
    urlKicker: "LINKED PROJECT",
    htmlFallback: "This HTML project was reviewed and approved before publication.",
    urlFallback: "The project opens inside GameVault when its original website permits embedding.",
    originalSite: "Open original website",
    publishedSource: "View archived source",
    downloadProject: "Download HTML file",
    reviewed: "Reviewed",
    backHome: "Back to project library",
    switchLanguage: "Switch to Vietnamese",
    previewLabel: "Project preview",
    blockedTitle: "This website blocks embedding",
    blockedText: "Some websites prevent previews inside other pages. You can still open the original website.",
    previewUnavailable: "No preview is available for this project.",
    openNewTab: "Open original website in a new tab"
  }
} as const;

function readSavedPreferences(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // Keep the page usable when storage is unavailable.
  }
  return {};
}

export default function ProjectDetails({ project }: { project: ProjectDetailsData }) {
  const [language, setLanguage] = useState<Language>("vi");
  const [showExternalFallback, setShowExternalFallback] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const savedLanguage = readSavedPreferences().language;
    if (savedLanguage === "vi" || savedLanguage === "en") setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function toggleLanguage() {
    const nextLanguage: Language = language === "vi" ? "en" : "vi";
    setLanguage(nextLanguage);
    try {
      const preferences = readSavedPreferences();
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...preferences, language: nextLanguage }));
    } catch {
      // The selected language remains active for this page.
    }
  }

  const isEmbeddablePreview = Boolean(project.embeddedUrl) && !showExternalFallback;

  return (
    <main className="play-page project-detail-page">
      <header className="play-header">
        <a href="/" className="play-back"><ArrowLeft size={16} /> {t.backHome}</a>
        <div className="play-header-actions">
          <button type="button" className="play-language-button" onClick={toggleLanguage} aria-label={t.switchLanguage} title={t.switchLanguage}>
            <Languages size={15} /><span>{language === "vi" ? "EN" : "VI"}</span>
          </button>
          <span className="play-safe"><ShieldCheck size={15} /> {t.reviewed}</span>
        </div>
      </header>

      <section className="play-intro project-detail-intro">
        <div className="section-kicker">{project.kind === "html" ? t.htmlKicker : t.urlKicker}</div>
        <h1>{project.title}</h1>
        <p>{project.description || (project.kind === "html" ? t.htmlFallback : t.urlFallback)}</p>
        <div className="project-detail-actions">
          {project.downloadUrl && (
            <a className="project-download-button" href={project.downloadUrl} download>
              <Download size={17} /> {t.downloadProject}
            </a>
          )}
          {project.externalUrl && (
            <a className="play-open-source" href={project.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
              <ExternalLink size={15} /> {t.originalSite}
            </a>
          )}
          {project.sourceUrl && (
            <a className="play-open-source" href={project.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> {t.publishedSource}
            </a>
          )}
        </div>
      </section>

      <section className="project-preview-shell" aria-label={t.previewLabel}>
        <div className="project-preview-toolbar">
          <span className="project-preview-dot" aria-hidden="true" />
          <span>{t.previewLabel}</span>
          {project.kind === "url" && project.externalUrl && (
            <button type="button" className="project-preview-fallback" onClick={() => setShowExternalFallback(true)}>
              {t.openNewTab} <ExternalLink size={13} />
            </button>
          )}
        </div>
        {isEmbeddablePreview ? (
          <iframe
            className="project-preview-frame"
            title={project.title}
            src={project.embeddedUrl ?? undefined}
            sandbox={project.kind === "html" ? "allow-scripts" : "allow-scripts allow-forms allow-same-origin"}
            referrerPolicy="no-referrer"
            allow="fullscreen; autoplay"
          />
        ) : (
          <div className="project-preview-blocked">
            <h2>{t.blockedTitle}</h2>
            <p>{project.kind === "url" ? t.blockedText : t.previewUnavailable}</p>
            {project.externalUrl && (
              <a className="project-download-button" href={project.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
                <ExternalLink size={16} /> {t.openNewTab}
              </a>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
