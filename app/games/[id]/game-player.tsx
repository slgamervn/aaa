"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, ExternalLink, FileCode2, Globe2, Languages, ShieldCheck } from "lucide-react";

type Language = "vi" | "en";
type ProjectDetailsData = {
  title: string;
  description: string;
  kind: "html" | "url";
  externalUrl: string | null;
  sourceUrl: string | null;
  downloadUrl: string | null;
};

const PREFERENCES_KEY = "gamevault-preferences-v1";

const copy = {
  vi: {
    htmlKicker: "DỰ ÁN HTML ĐÃ CÔNG KHAI",
    urlKicker: "DỰ ÁN LIÊN KẾT",
    htmlFallback: "Tệp HTML của dự án đã được kiểm tra và phê duyệt trước khi công khai.",
    urlFallback: "Đây là dự án được chia sẻ qua website gốc. GameVault không lưu bản tải xuống của trang bên ngoài.",
    originalSite: "Mở website gốc",
    publishedSource: "Xem bản lưu trên GitHub",
    downloadProject: "Tải tệp HTML",
    downloadInfo: "Tệp HTML sẽ được tải trực tiếp về thiết bị của bạn.",
    urlInfo: "Đây là đường dẫn đến website gốc. Hãy kiểm tra tùy chọn tải xuống tại website đó.",
    reviewed: "Đã qua kiểm duyệt",
    sourceUnavailable: "Hiện không có đường dẫn nguồn cho dự án này.",
    backHome: "Quay lại GameVault",
    switchLanguage: "Switch to English",
    projectFile: "Tệp dự án",
    projectLink: "Liên kết dự án"
  },
  en: {
    htmlKicker: "PUBLISHED HTML PROJECT",
    urlKicker: "LINKED PROJECT",
    htmlFallback: "This project's HTML file was checked and approved before publication.",
    urlFallback: "This project is shared through its original website. GameVault does not host a downloadable copy of the external page.",
    originalSite: "Open original website",
    publishedSource: "View archived copy on GitHub",
    downloadProject: "Download HTML file",
    downloadInfo: "The HTML file will be downloaded directly to your device.",
    urlInfo: "This is a link to the original website. Check that website for its own download options.",
    reviewed: "Reviewed",
    sourceUnavailable: "No source link is currently available for this project.",
    backHome: "Back to GameVault",
    switchLanguage: "Chuyển sang tiếng Việt",
    projectFile: "Project file",
    projectLink: "Project link"
  }
} as const;

function readSavedPreferences(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Keep this page usable if browser storage is disabled or invalid.
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

        <div className="project-detail-meta">
          {project.kind === "html" ? <><FileCode2 size={15} /> {t.projectFile} · HTML</> : <><Globe2 size={15} /> {t.projectLink} · URL</>}
        </div>

        <div className="project-detail-actions">
          {project.downloadUrl ? (
            <a className="project-download-button" href={project.downloadUrl} download>
              <Download size={17} /> {t.downloadProject}
            </a>
          ) : project.externalUrl ? (
            <a className="project-download-button" href={project.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
              <ExternalLink size={17} /> {t.originalSite}
            </a>
          ) : (
            <p className="project-detail-note">{t.sourceUnavailable}</p>
          )}

          {project.sourceUrl && (
            <a className="play-open-source" href={project.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> {t.publishedSource}
            </a>
          )}
        </div>

        <p className="project-detail-note">
          {project.kind === "html" ? t.downloadInfo : t.urlInfo}
        </p>
      </section>
    </main>
  );
}
