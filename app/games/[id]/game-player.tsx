"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Languages, ShieldCheck } from "lucide-react";
import GameFrame from "./game-frame";

type Language = "vi" | "en";

type GamePlayerData = {
  title: string;
  description: string;
  kind: "html" | "url";
  externalUrl: string | null;
  embeddedUrl: string | null;
  sourceUrl: string | null;
};

const PREFERENCES_KEY = "gamevault-preferences-v1";

const copy = {
  vi: {
    safeMode: "Game đang chạy trong khung cô lập",
    htmlKicker: "GAME HTML ĐÃ XUẤT BẢN",
    urlKicker: "GAME WEB BÊN NGOÀI",
    htmlFallback: "Game HTML này đã được chủ dự án xem xét và xuất bản.",
    urlFallback: "Trò chơi được mở trong trang chơi riêng của GameVault.",
    externalLimit: "Trò chơi này được hiển thị trong một khung có giới hạn. Website bên ngoài có thể chặn nhúng hoặc yêu cầu những tính năng mà khung bảo vệ không cho phép.",
    originalSite: "Mở trang gốc",
    publishedSource: "Xem mã nguồn đã xuất bản trên GitHub",
    unavailable: "GameVault chỉ nhúng đường dẫn HTTPS. Bạn vẫn có thể mở trang gốc bằng nút phía trên.",
    htmlDisclaimer: "Tệp HTML đã tải lên chạy trong môi trường cô lập với quyền hạn giới hạn. Một số game cần API bên ngoài hoặc bộ nhớ trình duyệt lưu lâu dài có thể không hoạt động.",
    urlDisclaimer: "Game bên ngoài được hiển thị trong khung riêng. Nếu khung trắng hoặc game không nhận điều khiển, website gốc có thể chặn iframe hoặc yêu cầu quyền mà trình duyệt không cấp. Hãy dùng nút “Mở trang gốc” để chơi trực tiếp trên website đó.",
    switchLanguage: "Chuyển sang tiếng Anh",
  },
  en: {
    safeMode: "Game running in an isolated frame",
    htmlKicker: "PUBLISHED HTML GAME",
    urlKicker: "EXTERNAL WEB GAME",
    htmlFallback: "This HTML game has been reviewed and published by the project owner.",
    urlFallback: "This game opens in its own GameVault play page.",
    externalLimit: "This game is displayed in a restricted frame. The external site may block embedding or require features that the sandbox does not allow.",
    originalSite: "Open original site",
    publishedSource: "View published source on GitHub",
    unavailable: "GameVault only embeds HTTPS URLs. You can still open the original site using the link above.",
    htmlDisclaimer: "The uploaded HTML runs in a restricted sandbox. Some games that require external APIs or persistent browser storage may not work.",
    urlDisclaimer: "External games are shown in a separate frame. If the frame is blank or the game does not respond to controls, the original website may block iframe embedding or require permissions that the browser does not grant. Use “Open original site” to play directly on that website.",
    switchLanguage: "Switch to Vietnamese",
  },
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
    // Keep the page usable when local storage is unavailable or contains invalid data.
  }
  return {};
}

export default function GamePlayer({ game }: { game: GamePlayerData }) {
  const [language, setLanguage] = useState<Language>("vi");
  const t = copy[language];

  useEffect(() => {
    const savedLanguage = readSavedPreferences().language;
    if (savedLanguage === "vi" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function toggleLanguage() {
    const nextLanguage: Language = language === "vi" ? "en" : "vi";
    setLanguage(nextLanguage);
    try {
      const preferences = readSavedPreferences();
      window.localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ ...preferences, language: nextLanguage }),
      );
    } catch {
      // The language still changes for the current page when storage is unavailable.
    }
  }

  return (
    <main className="play-page">
      <header className="play-header">
        <a href="/" className="play-back"><ArrowLeft size={16} /> GameVault</a>
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
          <span className="play-safe"><ShieldCheck size={15} /> {t.safeMode}</span>
        </div>
      </header>
      <section className="play-intro">
        <div className="section-kicker">{game.kind === "html" ? t.htmlKicker : t.urlKicker}</div>
        <h1>{game.title}</h1>
        {game.description ? (
          <p>{game.description}</p>
        ) : (
          <p>{game.kind === "html" ? t.htmlFallback : t.externalLimit}</p>
        )}
        {game.externalUrl ? (
          <a className="play-open-source" href={game.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink size={15} /> {t.originalSite}
          </a>
        ) : null}
        {game.sourceUrl ? (
          <a className="play-open-source" href={game.sourceUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> {t.publishedSource}
          </a>
        ) : null}
      </section>
      <GameFrame
        title={game.title}
        src={game.embeddedUrl}
        sandbox={game.kind === "html" ? "allow-scripts allow-orientation-lock" : "allow-scripts allow-forms allow-pointer-lock allow-orientation-lock"}
        language={language}
        unavailableMessage={t.unavailable}
      />
      <p className="play-disclaimer">
        {game.kind === "html" ? t.htmlDisclaimer : t.urlDisclaimer}
      </p>
    </main>
  );
}
