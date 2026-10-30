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
    urlFallback: "Bản xem trước sẽ chạy trực tiếp tại đây nếu website nguồn cho phép nhúng.",
    publishedSource: "Mã nguồn đã lưu trên GitHub",
    downloadProject: "Tải tệp HTML",
    reviewed: "Đã qua kiểm duyệt",
    backHome: "Quay lại danh sách dự án",
    switchLanguage: "Chuyển sang tiếng Anh",
    previewLabel: "Đang chạy trong GameVault",
    previewUnavailable: "Dự án này hiện không có bản xem trước để chạy trong GameVault.",
    previewHelp: "Nếu khung xem trước trống, website nguồn có thể đang từ chối nhúng. GameVault không thể ghi đè giới hạn do website đó đặt ra.",
    sourceDisclosure: "Nguồn dự án (tùy chọn)",
    originalSite: "Mở website gốc",
    sourceUnavailable: "Không có liên kết nguồn."
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
    previewUnavailable: "This project does not currently have an in-app preview.",
    previewHelp: "If the preview is blank, the source website may be refusing embedding. GameVault cannot override restrictions set by that website.",
    sourceDisclosure: "Project source (optional)",
    originalSite: "Open original website",
    sourceUnavailable: "No source link is available."
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
        {project.downloadUrl && (
          <div className="project-detail-actions">
            <a className="project-download-button" href={project.downloadUrl} download>
              <Download size={17} /> {t.downloadProject}
            </a>
          </div>
        )}
      </section>

      <section className="project-preview-shell" aria-label={t.previewLabel}>
        <div className="project-preview-toolbar">
          <span className="project-preview-dot" aria-hidden="true" />
          <span>{t.previewLabel}</span>
        </div>
        {project.embeddedUrl ? (
          <iframe
            className="project-preview-frame"
            title={project.title}
            src={project.embeddedUrl}
            sandbox={project.kind === "html"
              ? "allow-scripts allow-pointer-lock allow-orientation-lock"
              : "allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-orientation-lock"}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope"
            loading="eager"
          />
        ) : (
          <div className="project-preview-blocked">
            <h2>{t.previewUnavailable}</h2>
            <p>{t.sourceUnavailable}</p>
          </div>
        )}
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
