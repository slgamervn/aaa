"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BadgeCheck, BookOpen, Check, CircleHelp,
  Clock3, FileCode2, FileUp, Github, Globe2, Languages, Layers3,
  LockKeyhole, Menu, Moon, Search, ShieldAlert, ShieldCheck, Sun,
  Type, UploadCloud, X
} from "lucide-react";

type Language = "vi" | "en";
type Theme = "paper" | "night";
type Genre = "all" | "arcade" | "strategy" | "puzzle";
type Finding = { label: string; severity: "high" | "medium" | "low"; detail: string };
type ScanResult = { mode: string; verdict: string; score: number; findings: Finding[]; message: string; bytes?: number };
type Submission = { id: string; title: string; source: string; kind: "HTML" | "URL"; status: "pending"; createdAt: string; result: ScanResult };

const copy = {
  vi: {
    navLibrary: "Thư viện", navProcess: "Cách hoạt động", navSafety: "An toàn & chính sách",
    submit: "Gửi game", switchLanguage: "Switch to English", darkMode: "Giao diện tối",
    lightMode: "Giao diện sáng", largerText: "Tăng cỡ chữ", smallerText: "Cỡ chữ mặc định",
    reduceMotion: "Giảm chuyển động", restoreMotion: "Bật chuyển động",
    openMenu: "Mở điều hướng", closeMenu: "Đóng điều hướng",
    eyebrow: "MỘT KHO NHỎ CHO NHỮNG TRÒ CHƠI TRÊN WEB",
    heroLine1: "Game hay", heroLine2: "đáng được", heroAccent: "lưu lại.",
    heroLede: "Một góc nhỏ để khám phá những trò chơi chạy trên trình duyệt. Gửi game của bạn, kiểm tra sơ bộ và chờ người quản lý xem xét trước khi xuất bản.",
    discover: "Dạo quanh thư viện", sendOne: "Gửi một trò chơi",
    proofOne: "Không chạy HTML khi quét", proofTwo: "Duyệt thủ công", proofThree: "Nói rõ điều đã kiểm tra",
    artworkLabel: "MỘT THẾ GIỚI NHỎ", artworkReady: "BẢN MINH HOẠ", artworkFoot: "MỘT TRÒ CHƠI · MỘT CÂU CHUYỆN",
    artCaption: "Không cần hào nhoáng để đáng nhớ.",
    statOne: "HTML / URL", statOneDesc: "Hai cách gửi nội dung",
    statTwo: "QUÉT TĨNH", statTwoDesc: "Không thực thi file tải lên",
    statThree: "DUYỆT TAY", statThreeDesc: "Không tự động xuất bản",
    statFour: "BẢN THỬ NGHIỆM", statFourDesc: "Thẻ game mẫu được ghi rõ",
    libraryKicker: "GÓC KHÁM PHÁ · 01", libraryTitle: "Tìm trò tiếp theo.", librarySubtitle: "Những thẻ bên dưới là minh hoạ giao diện, chưa phải game được lưu trữ.",
    searchPlaceholder: "Tìm tên hoặc thể loại…", searchLabel: "Tìm game",
    all: "Tất cả", arcade: "Arcade", strategy: "Chiến thuật", puzzle: "Giải đố",
    sample: "MẪU", unlisted: "Chưa xuất bản", sampleArtwork: "ARTWORK MẪU",
    neonCategory: "Arcade · Nhịp độ", neonDescription: "Một đường đua nhỏ, vài khúc cua và cảm giác vừa đủ nhanh.",
    kingdomCategory: "Chiến thuật · Xây dựng", kingdomDescription: "Xếp từng mảnh đất và chăm chút cho một vương quốc tí hon.",
    orbitCategory: "Giải đố · Vật lý", orbitDescription: "Những quỹ đạo đơn giản dẫn đến các câu đố khó đoán.",
    submitSimilar: "Gửi game tương tự", noResults: "Không thấy kết quả. Thử từ khoá hoặc thể loại khác.",
    demoNotice: "Ảnh bìa và tên game ở đây chỉ là bản mẫu. Không có game nào được giả vờ là đã xuất bản.",
    submitKicker: "GÓC ĐÓNG GÓP · 02", submitTitle: "Có trò chơi muốn chia sẻ?",
    submitLede: "Gửi file HTML hoặc đường dẫn gốc. Bản thử nghiệm sẽ quét tĩnh sơ bộ rồi hiển thị kết quả để người quản lý xem xét.",
    stepOne: "Gửi nội dung", stepOneDesc: "File .html / .htm hoặc URL",
    stepTwo: "Quét sơ bộ", stepTwoDesc: "Tìm một số mẫu code cần xem lại",
    stepThree: "Chờ duyệt", stepThreeDesc: "Không tự động đưa lên GitHub",
    formKicker: "BIỂU MẪU GỬI GAME", formTitle: "Gửi game mới", safeFlow: "QUY TRÌNH RÕ RÀNG",
    htmlTab: "File HTML", urlTab: "Link game", titleLabel: "Tên game",
    optional: "(không bắt buộc)", titlePlaceholder: "Ví dụ: Pixel Adventure",
    fileLabel: "Tệp trò chơi", fileHint: ".html / .htm · tối đa 1 MB",
    dropTitle: "Thả file HTML vào đây", dropOr: "hoặc nhấn để chọn từ thiết bị",
    browse: "Chọn file", changeFile: "Nhấn để đổi tệp",
    urlLabel: "Đường dẫn game", urlPlaceholder: "https://example.com/game",
    urlNote: "Chỉ kiểm tra định dạng URL. Game bên ngoài không được tải hay chạy trong bước này.",
    consent: "Tôi có quyền chia sẻ nội dung này hoặc đã kiểm tra giấy phép phù hợp.",
    consentError: "Vui lòng xác nhận quyền chia sẻ nội dung trước khi gửi.",
    fileError: "Hãy chọn file .html hoặc .htm.",
    invalidFile: "Chỉ nhận file .html hoặc .htm.",
    tooLarge: "File quá lớn. Bản thử nghiệm giới hạn 1 MB.",
    urlError: "Nhập đường dẫn game cần kiểm tra.", scanFailed: "Không thể quét nội dung.",
    scanButton: "Quét và gửi chờ duyệt", scanning: "Đang quét…",
    scanResult: "Kết quả quét sơ bộ", manualReview: "Cần xem xét thủ công",
    noFindings: "Không khớp mẫu kiểm tra đã định nghĩa. Điều này không có nghĩa là file an toàn.",
    scanDisclaimer: "Quét tĩnh không chứng minh file vô hại hoặc tuân thủ chính sách.",
    reset: "Quét nội dung khác", footnote: "Nội dung chưa được tự động đưa lên GitHub.",
    workflowKicker: "RÕ RÀNG TỪ ĐẦU · 03", workflowTitle: "Kiểm tra trước. Xuất bản sau.",
    workflowLede: "Không một công cụ quét tự động nào có thể thay thế việc xem xét quyền sử dụng, bản quyền và nội dung thực tế.",
    receive: "Tiếp nhận", receiveDesc: "Nhận file HTML hoặc lưu URL làm nguồn tham khảo. File không chạy trong lúc quét.",
    staticScan: "Quét tĩnh", staticScanDesc: "Tìm dấu hiệu cần xem xét. Kết quả có thể bỏ sót hoặc cảnh báo nhầm.",
    policyCheck: "Kiểm tra chính sách", policyCheckDesc: "Xem giấy phép, bản quyền, quyền riêng tư và quy tắc sử dụng GitHub.",
    manualApproval: "Duyệt thủ công", manualApprovalDesc: "Chủ dự án quyết định. Kết quả quét không tự phê duyệt nội dung.",
    safetyKicker: "GIỚI HẠN ĐƯỢC NÓI RÕ · 04", safetyTitle: "Quét không đồng nghĩa với an toàn.",
    safetyText: "GameVault đang trong giai đoạn khởi tạo. Hàng đợi hiện chỉ nằm trong trình duyệt; kết nối lưu trữ dùng chung, xác thực quản trị và luồng xuất bản cần được hoàn thiện trước khi mở công khai.",
    readPolicy: "Đọc chính sách sử dụng GitHub", recentTitle: "Lần gửi trên thiết bị này",
    clearHistory: "Xoá lịch sử cục bộ", pendingReview: "Chờ chủ dự án duyệt",
    localWarning: "Lịch sử này chỉ nằm trên trình duyệt đang dùng. Nó không phải bằng chứng duyệt thật hoặc dữ liệu dùng chung.",
    footerLine: "Một kho nhỏ, được chăm chút từng trò.", footerPolicy: "Chính sách",
    footerProcess: "Quy trình", source: "Mã nguồn", footerStatus: "Bản thử nghiệm · chưa phải thư viện công khai",
    modalKicker: "BẮT ĐẦU ĐÓNG GÓP", modalTitle: "Bạn muốn gửi theo cách nào?",
    modalText: "Chọn file HTML hoặc giữ lại URL gốc. Kết quả sẽ chờ người quản lý xem xét.",
    modalHtml: "Tải file HTML", modalHtmlDesc: "Chọn file từ thiết bị của bạn",
    modalUrl: "Gửi đường dẫn", modalUrlDesc: "Giữ nguyên nguồn game bên ngoài",
    modalFoot: "Mọi nội dung đều phải qua bước duyệt thủ công.",
    urlFinding: "Chưa phân tích nội dung URL",
    severityHigh: "Cao", severityMedium: "Trung bình", severityLow: "Thấp",
    findingObfuscated: "JavaScript có dấu hiệu bị làm rối", detailObfuscated: "Có cấu trúc thường xuất hiện trong mã động hoặc bị làm rối. Cần xem xét thủ công; chưa thể kết luận mã độc.",
    findingInput: "Có thể gửi dữ liệu nhập nhạy cảm", detailInput: "Có tổ hợp từ khoá nhạy cảm và thao tác gửi dữ liệu cần được kiểm tra.",
    findingRedirect: "Có thao tác chuyển hướng", detailRedirect: "Kiểm tra đích đến và ngữ cảnh của thao tác chuyển hướng hoặc mở cửa sổ.",
    findingExternal: "Có tải tài nguyên bên ngoài", detailExternal: "Xác minh nguồn tài nguyên, giấy phép và tác động đến quyền riêng tư.",
    findingClipboard: "Có thao tác với clipboard", detailClipboard: "Kiểm tra lý do truy cập clipboard và cách giải thích với người chơi.",
    findingIframe: "Có nhúng iframe", detailIframe: "Kiểm tra nguồn iframe, sandbox và chính sách nhúng.",
    urlFindingDetail: "Đã kiểm tra cú pháp URL. Nội dung chưa được tải hay thực thi; cần kiểm tra nguồn, giấy phép và game thủ công.",
    scanMessageUrl: "Không thể xác nhận an toàn chỉ từ đường dẫn.",
    scanMessageHtml: "Đây là quét tĩnh theo mẫu, không phải chứng nhận không có mã độc hoặc xác nhận tuân thủ điều khoản GitHub."
  },
  en: {
    navLibrary: "Library", navProcess: "How it works", navSafety: "Safety & policy",
    submit: "Submit a game", switchLanguage: "Chuyển sang tiếng Việt", darkMode: "Dark appearance",
    lightMode: "Light appearance", largerText: "Increase text size", smallerText: "Default text size",
    reduceMotion: "Reduce motion", restoreMotion: "Enable motion",
    openMenu: "Open navigation", closeMenu: "Close navigation",
    eyebrow: "A SMALL INDEX OF LITTLE WEB GAMES",
    heroLine1: "Good games", heroLine2: "deserve to be", heroAccent: "kept.",
    heroLede: "A small place to discover browser games. Submit a game, run a preliminary check, and wait for a person to review it before anything is published.",
    discover: "Browse the collection", sendOne: "Submit a game",
    proofOne: "HTML is never executed during scanning", proofTwo: "Human review", proofThree: "Clear about what was checked",
    artworkLabel: "A LITTLE WORLD", artworkReady: "SAMPLE ARTWORK", artworkFoot: "ONE GAME · ONE STORY",
    artCaption: "It doesn't need to shout to be memorable.",
    statOne: "HTML / URL", statOneDesc: "Two ways to submit",
    statTwo: "STATIC CHECK", statTwoDesc: "Uploaded files are not executed",
    statThree: "HUMAN REVIEW", statThreeDesc: "Nothing is published automatically",
    statFour: "EARLY BUILD", statFourDesc: "Sample cards are clearly labelled",
    libraryKicker: "THE DISCOVERY SHELF · 01", libraryTitle: "Find your next game.", librarySubtitle: "The cards below are interface samples, not stored or published games.",
    searchPlaceholder: "Search titles or genres…", searchLabel: "Search games",
    all: "All", arcade: "Arcade", strategy: "Strategy", puzzle: "Puzzle",
    sample: "SAMPLE", unlisted: "Not published", sampleArtwork: "SAMPLE ARTWORK",
    neonCategory: "Arcade · Action", neonDescription: "A small track, a few turns, and just enough speed.",
    kingdomCategory: "Strategy · Building", kingdomDescription: "Place each patch of land and tend to a tiny kingdom.",
    orbitCategory: "Puzzle · Physics", orbitDescription: "Simple orbits lead to surprisingly tricky puzzles.",
    submitSimilar: "Submit something similar", noResults: "Nothing found. Try another search term or genre.",
    demoNotice: "The covers and game titles here are examples only. None are presented as already published.",
    submitKicker: "YOUR CONTRIBUTION · 02", submitTitle: "Have a game to share?",
    submitLede: "Send an HTML file or its original URL. The prototype runs a static check and shows the result for a person to review.",
    stepOne: "Submit content", stepOneDesc: ".html / .htm file or URL",
    stepTwo: "Preliminary scan", stepTwoDesc: "Look for patterns worth reviewing",
    stepThree: "Wait for approval", stepThreeDesc: "Never publish to GitHub automatically",
    formKicker: "GAME SUBMISSION", formTitle: "Submit a game", safeFlow: "CLEAR PROCESS",
    htmlTab: "HTML file", urlTab: "Game link", titleLabel: "Game title",
    optional: "(optional)", titlePlaceholder: "For example: Pixel Adventure",
    fileLabel: "Game file", fileHint: ".html / .htm · up to 1 MB",
    dropTitle: "Drop an HTML file here", dropOr: "or choose one from your device",
    browse: "Choose file", changeFile: "Select a different file",
    urlLabel: "Game URL", urlPlaceholder: "https://example.com/game",
    urlNote: "Only the URL format is checked. External pages are not fetched or executed at this stage.",
    consent: "I have permission to share this content or have checked its licence.",
    consentError: "Please confirm that you have permission to share this content.",
    fileError: "Choose an .html or .htm file first.",
    invalidFile: "Only .html and .htm files are accepted.",
    tooLarge: "The file is too large. The prototype limit is 1 MB.",
    urlError: "Enter the game URL to check.", scanFailed: "The content could not be scanned.",
    scanButton: "Scan and submit for review", scanning: "Scanning…",
    scanResult: "Preliminary scan result", manualReview: "Manual review needed",
    noFindings: "No defined patterns matched. That does not mean the file is safe.",
    scanDisclaimer: "A static scan cannot prove a file is harmless or policy-compliant.",
    reset: "Scan another item", footnote: "Nothing is published to GitHub automatically.",
    workflowKicker: "THE PROCESS, UP FRONT · 03", workflowTitle: "Check first. Publish later.",
    workflowLede: "No automated scanner can replace a review of usage rights, copyright, and the actual content.",
    receive: "Receive", receiveDesc: "Accept an HTML file or keep a URL as a reference. The file is not run during scanning.",
    staticScan: "Static scan", staticScanDesc: "Look for signals worth reviewing. Results can miss issues or flag harmless code.",
    policyCheck: "Policy review", policyCheckDesc: "Review the licence, copyright, privacy, and GitHub rules.",
    manualApproval: "Manual approval", manualApprovalDesc: "The project owner decides. A scan never approves content by itself.",
    safetyKicker: "LIMITATIONS, MADE CLEAR · 04", safetyTitle: "A scan is not a safety certificate.",
    safetyText: "GameVault is still a starter build. The queue currently lives only in this browser; shared storage, administrator authentication, and the publishing workflow must be completed before a public launch.",
    readPolicy: "Read GitHub's Acceptable Use Policies", recentTitle: "Recent submissions on this device",
    clearHistory: "Clear local history", pendingReview: "Waiting for owner review",
    localWarning: "This history stays in the current browser. It is not proof of review and is not shared with other users.",
    footerLine: "A small collection, cared for one game at a time.", footerPolicy: "Policy",
    footerProcess: "Process", source: "Source code", footerStatus: "Prototype · not a public game library",
    modalKicker: "START A SUBMISSION", modalTitle: "How would you like to submit?",
    modalText: "Choose an HTML file or keep the original URL. The result will wait for a human review.",
    modalHtml: "Upload an HTML file", modalHtmlDesc: "Choose a file from your device",
    modalUrl: "Submit a link", modalUrlDesc: "Keep the game at its original source",
    modalFoot: "Every submission must be reviewed manually.",
    urlFinding: "URL content has not been analysed",
    severityHigh: "High", severityMedium: "Medium", severityLow: "Low",
    findingObfuscated: "JavaScript may be obfuscated", detailObfuscated: "This pattern can appear in dynamic or obfuscated code. It needs manual review; it is not proof of malware.",
    findingInput: "Possible transmission of sensitive input", detailInput: "A combination of sensitive keywords and data transmission needs inspection.",
    findingRedirect: "Redirect or new-window behaviour", detailRedirect: "Review the destination and context of the redirect or window-opening behaviour.",
    findingExternal: "External resources referenced", detailExternal: "Verify resource origin, licensing, and privacy implications.",
    findingClipboard: "Clipboard access pattern", detailClipboard: "Review why clipboard access is needed and how it is explained to players.",
    findingIframe: "Embedded iframe found", detailIframe: "Review the iframe origin, sandbox attributes, and embedding policy.",
    urlFindingDetail: "The URL syntax was checked. The page was not fetched or executed; its origin, licence, and content need manual review.",
    scanMessageUrl: "A URL alone cannot establish that a game is safe.",
    scanMessageHtml: "This is a pattern-based static scan, not a malware-free certificate or confirmation of GitHub policy compliance."
  }
} as const;

const samples = [
  { title: "Neon Drift", genre: "arcade" as const, category: { vi: copy.vi.neonCategory, en: copy.en.neonCategory }, description: { vi: copy.vi.neonDescription, en: copy.en.neonDescription }, color: "mint", icon: "↗", index: "01" },
  { title: "Tiny Kingdom", genre: "strategy" as const, category: { vi: copy.vi.kingdomCategory, en: copy.en.kingdomCategory }, description: { vi: copy.vi.kingdomDescription, en: copy.en.kingdomDescription }, color: "rust", icon: "♜", index: "02" },
  { title: "Orbit Lab", genre: "puzzle" as const, category: { vi: copy.vi.orbitCategory, en: copy.en.orbitCategory }, description: { vi: copy.vi.orbitDescription, en: copy.en.orbitDescription }, color: "blue", icon: "◎", index: "03" }
];

function localizeScan(scan: ScanResult, language: Language): ScanResult {
  if (language === "vi") return scan;
  const translations: Record<string, { label: string; detail: string }> = {
    "Mã JavaScript bị làm rối": { label: copy.en.findingObfuscated, detail: copy.en.detailObfuscated },
    "Có thể thu thập thông tin nhập": { label: copy.en.findingInput, detail: copy.en.detailInput },
    "Có thao tác chuyển hướng": { label: copy.en.findingRedirect, detail: copy.en.detailRedirect },
    "Có tải tài nguyên từ bên ngoài": { label: copy.en.findingExternal, detail: copy.en.detailExternal },
    "Có hành vi clipboard": { label: copy.en.findingClipboard, detail: copy.en.detailClipboard },
    "Có nhúng iframe": { label: copy.en.findingIframe, detail: copy.en.detailIframe },
    "Chưa phân tích nội dung URL": { label: copy.en.urlFinding, detail: copy.en.urlFindingDetail }
  };
  return {
    ...scan,
    findings: scan.findings.map((finding) => ({ ...finding, ...(translations[finding.label] ?? {}) })),
    message: scan.mode === "url" ? copy.en.scanMessageUrl : copy.en.scanMessageHtml
  };
}

const severityText = (severity: Finding["severity"], language: Language) => {
  const labels = copy[language];
  return severity === "high" ? labels.severityHigh : severity === "medium" ? labels.severityMedium : labels.severityLow;
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("vi");
  const [theme, setTheme] = useState<Theme>("paper");
  const [largeText, setLargeText] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"html" | "url">("html");
  const [activeGenre, setActiveGenre] = useState<Genre>("all");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [query, setQuery] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [consent, setConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = copy[language];

  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem("gamevault-submissions-v1");
      if (savedQueue) setSubmissions(JSON.parse(savedQueue) as Submission[]);
      const saved = localStorage.getItem("gamevault-preferences-v1");
      if (saved) {
        const preferences = JSON.parse(saved) as { language?: Language; theme?: Theme; largeText?: boolean; motionReduced?: boolean };
        if (preferences.language === "vi" || preferences.language === "en") setLanguage(preferences.language);
        if (preferences.theme === "paper" || preferences.theme === "night") setTheme(preferences.theme);
        if (typeof preferences.largeText === "boolean") setLargeText(preferences.largeText);
        if (typeof preferences.motionReduced === "boolean") setMotionReduced(preferences.motionReduced);
      }
    } catch { /* Ignore damaged local preferences or demo data. */ }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem("gamevault-preferences-v1", JSON.stringify({ language, theme, largeText, motionReduced }));
    } catch { /* Preferences can remain in component state if storage is unavailable. */ }
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.scale = largeText ? "large" : "normal";
    document.documentElement.dataset.motion = motionReduced ? "reduced" : "normal";
  }, [language, theme, largeText, motionReduced, preferencesLoaded]);

  const filteredSamples = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(language === "vi" ? "vi-VN" : "en");
    return samples.filter((game) => {
      const visibleText = [game.title, game.category[language], game.description[language]].join(" ").toLocaleLowerCase(language === "vi" ? "vi-VN" : "en");
      return (activeGenre === "all" || game.genre === activeGenre) && (!term || visibleText.includes(term));
    });
  }, [activeGenre, language, query]);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    if (!/\.html?$/i.test(candidate.name)) { setError(t.invalidFile); return; }
    if (candidate.size > 1_000_000) { setError(t.tooLarge); return; }
    setFile(candidate);
    setError("");
    setResult(null);
  }

  async function runScan() {
    setError("");
    setResult(null);
    if (!consent) { setError(t.consentError); return; }
    if (activeTab === "html" && !file) { setError(t.fileError); return; }
    if (activeTab === "url" && !url.trim()) { setError(t.urlError); return; }
    if (file && file.size > 1_000_000) { setError(t.tooLarge); return; }

    setScanning(true);
    try {
      const payload: { html?: string; url?: string } = activeTab === "html" && file
        ? { html: await file.text() }
        : { url: url.trim() };
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.scanFailed);
      const scan = data as ScanResult;
      setResult(scan);
      const newItem: Submission = {
        id: crypto.randomUUID(),
        title: title.trim() || (activeTab === "html" ? file?.name ?? "HTML" : new URL(url).hostname),
        source: activeTab === "html" ? file?.name ?? "HTML" : url.trim(),
        kind: activeTab === "html" ? "HTML" : "URL",
        status: "pending",
        createdAt: new Date().toISOString(),
        result: scan
      };
      setSubmissions((previous) => {
        const updated = [newItem, ...previous].slice(0, 20);
        try { localStorage.setItem("gamevault-submissions-v1", JSON.stringify(updated)); } catch { /* The local queue is best-effort only. */ }
        return updated;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.scanFailed);
    } finally {
      setScanning(false);
    }
  }

  function resetForm() {
    setFile(null);
    setUrl("");
    setTitle("");
    setResult(null);
    setError("");
    setConsent(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openSubmit(tab: "html" | "url" = "html") {
    setActiveTab(tab);
    setShowSubmit(true);
    setMenuOpen(false);
  }

  function clearQueue() {
    setSubmissions([]);
    try { localStorage.removeItem("gamevault-submissions-v1"); } catch { /* Ignore unavailable browser storage. */ }
  }

  const displayResult = result ? localizeScan(result, language) : null;

  return (
    <main className="app-shell" data-theme={theme} data-scale={largeText ? "large" : "normal"} data-motion={motionReduced ? "reduced" : "normal"}>
      <a className="skip-link" href="#main-content">{language === "vi" ? "Bỏ qua điều hướng" : "Skip to content"}</a>
      <header className="topbar">
        <a className="brand" href="#" aria-label="GameVault home">
          <span className="brand-mark"><Layers3 size={19} strokeWidth={2.2} /></span>
          <span>gamevault<span className="brand-dot">.</span></span>
        </a>
        <nav className={"nav-links " + (menuOpen ? "nav-open" : "")} aria-label={language === "vi" ? "Điều hướng" : "Main navigation"}>
          <a className="nav-active" href="#library" onClick={() => setMenuOpen(false)}>{t.navLibrary}</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>{t.navProcess}</a>
          <a href="#safety" onClick={() => setMenuOpen(false)}>{t.navSafety}</a>
        </nav>
        <div className="header-controls" aria-label={language === "vi" ? "Tuỳ chỉnh giao diện" : "Appearance preferences"}>
          <button className="utility-button language-button" onClick={() => setLanguage(language === "vi" ? "en" : "vi")} aria-label={t.switchLanguage} title={t.switchLanguage}>
            <Languages size={15} /><span>{language === "vi" ? "EN" : "VI"}</span>
          </button>
          <button className="utility-button theme-button" onClick={() => setTheme(theme === "paper" ? "night" : "paper")} aria-label={theme === "paper" ? t.darkMode : t.lightMode} title={theme === "paper" ? t.darkMode : t.lightMode}>
            {theme === "paper" ? <Moon size={15} /> : <Sun size={15} />}<span>{theme === "paper" ? (language === "vi" ? "Tối" : "Dark") : (language === "vi" ? "Sáng" : "Light")}</span>
          </button>
          <button className="utility-button text-button" onClick={() => setLargeText(!largeText)} aria-pressed={largeText} aria-label={largeText ? t.smallerText : t.largerText} title={largeText ? t.smallerText : t.largerText}>
            <Type size={15} /><span>{largeText ? "A−" : "A+"}</span>
          </button>
          <button className="utility-button motion-button" onClick={() => setMotionReduced(!motionReduced)} aria-pressed={motionReduced} aria-label={motionReduced ? t.restoreMotion : t.reduceMotion} title={motionReduced ? t.restoreMotion : t.reduceMotion}>
            <span className="motion-symbol" aria-hidden="true">{motionReduced ? "Ⅱ" : "↝"}</span><span>{motionReduced ? (language === "vi" ? "Tĩnh" : "Still") : (language === "vi" ? "Chuyển động" : "Motion")}</span>
          </button>
        </div>
        <button className="top-cta" onClick={() => openSubmit("html")}>{t.submit}<ArrowDownRight size={15} /></button>
        <button className="mobile-menu" aria-label={menuOpen ? t.closeMenu : t.openMenu} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu size={20} /></button>
      </header>

      <div id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" />{t.eyebrow}</div>
            <h1 id="hero-title">{t.heroLine1}<br />{t.heroLine2}<br /><span>{t.heroAccent}</span></h1>
            <p className="hero-lede">{t.heroLede}</p>
            <div className="hero-actions">
              <a className="button-primary" href="#library">{t.discover}<ArrowRight size={16} /></a>
              <button className="button-quiet" onClick={() => openSubmit("html")}>{t.sendOne}<ArrowDownRight size={16} /></button>
            </div>
            <div className="hero-proof">
              <span><Check size={14} />{t.proofOne}</span>
              <span><Check size={14} />{t.proofTwo}</span>
              <span><Check size={14} />{t.proofThree}</span>
            </div>
          </div>
          <div className="hero-art" aria-label={t.artworkLabel}>
            <article className="art-panel">
              <div className="art-panel-head"><span className="art-window-dots"><i /><i /><i /></span><span>FIELD NOTES / 001</span><span className="art-live">{t.artworkReady}</span></div>
              <div className="art-landscape cover-mint">
                <span className="cover-index">{t.sampleArtwork}</span>
                <div className="sun" />
                <div className="mountain mountain-back" />
                <div className="mountain mountain-front" />
                <div className="land-grid" />
                <div className="pixel-player">✦</div>
                <span className="art-landscape-caption">{t.artworkLabel}</span>
              </div>
              <div className="art-panel-foot">
                <div><span className="mini-label">GV / NOTE 001</span><strong><span className="check-circle"><Check size={11} /></span>{t.artworkFoot}</strong></div>
                <span className="art-index-stamp">HTML<br />GAME</span>
              </div>
            </article>
            <p className="hero-caption">{t.artCaption}</p>
          </div>
          <div className="hero-bottomline"><span>GAMEVAULT FIELD NOTES</span><span>AN OPEN-ENDED COLLECTION</span></div>
        </section>

        <section className="stats-row" aria-label={language === "vi" ? "Tóm tắt quy trình" : "Process summary"}>
          <div><strong>{t.statOne}</strong><span>{t.statOneDesc}</span></div>
          <div><strong>{t.statTwo}</strong><span>{t.statTwoDesc}</span></div>
          <div><strong>{t.statThree}</strong><span>{t.statThreeDesc}</span></div>
          <div><strong>{t.statFour}</strong><span>{t.statFourDesc}</span></div>
        </section>

        <section className="section library-section" id="library">
          <div className="section-heading">
            <div><div className="section-kicker">{t.libraryKicker}</div><h2>{t.libraryTitle}</h2><p>{t.librarySubtitle}</p></div>
            <label className="library-search"><Search size={17} aria-hidden="true" /><input aria-label={t.searchLabel} placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>/</kbd></label>
          </div>
          <div className="filter-row" role="group" aria-label={language === "vi" ? "Lọc thể loại" : "Filter by genre"}>
            <button className={activeGenre === "all" ? "filter-active" : ""} aria-pressed={activeGenre === "all"} onClick={() => setActiveGenre("all")}>{t.all}<b>03</b></button>
            <button className={activeGenre === "arcade" ? "filter-active" : ""} aria-pressed={activeGenre === "arcade"} onClick={() => setActiveGenre("arcade")}>{t.arcade}</button>
            <button className={activeGenre === "strategy" ? "filter-active" : ""} aria-pressed={activeGenre === "strategy"} onClick={() => setActiveGenre("strategy")}>{t.strategy}</button>
            <button className={activeGenre === "puzzle" ? "filter-active" : ""} aria-pressed={activeGenre === "puzzle"} onClick={() => setActiveGenre("puzzle")}>{t.puzzle}</button>
            <span className="filter-note"><CircleHelp size={14} />{t.sample}</span>
          </div>
          <div className="game-grid">
            {filteredSamples.map((game) => (
              <article className="game-card" key={game.title}>
                <div className={"game-cover cover-" + game.color} role="img" aria-label={game.title + " — " + t.sampleArtwork}>
                  <div className="cover-grain" aria-hidden="true" />
                  <span className="cover-index">GV / {game.index}</span>
                  <div className="cover-symbol" aria-hidden="true">{game.icon}</div>
                  <div className="cover-rings" aria-hidden="true" />
                  <span className="demo-pill">{t.sample}</span>
                </div>
                <div className="game-info">
                  <div className="game-meta"><span>{game.category[language]}</span><span className="demo-dot" /><span>{t.unlisted}</span></div>
                  <h3>{game.title}</h3>
                  <p>{game.description[language]}</p>
                  <button className="card-link" onClick={() => openSubmit("html")}>{t.submitSimilar}<ArrowDownRight size={15} /></button>
                </div>
              </article>
            ))}
            {filteredSamples.length === 0 && <p className="empty-search">{t.noResults}</p>}
          </div>
          <div className="demo-notice"><CircleHelp size={16} /><span>{t.demoNotice}</span></div>
        </section>

        <section className="submission-section" id="submit">
          <div className="submission-intro">
            <div className="section-kicker">{t.submitKicker}</div>
            <h2>{t.submitTitle}</h2>
            <p>{t.submitLede}</p>
            <div className="steps-list">
              <div><span>01</span><div><b>{t.stepOne}</b><small>{t.stepOneDesc}</small></div></div>
              <div><span>02</span><div><b>{t.stepTwo}</b><small>{t.stepTwoDesc}</small></div></div>
              <div><span>03</span><div><b>{t.stepThree}</b><small>{t.stepThreeDesc}</small></div></div>
            </div>
          </div>

          <div className="submit-card">
            <div className="submit-card-header"><div><span className="card-kicker">{t.formKicker}</span><h3>{t.formTitle}</h3></div><span className="secure-badge"><ShieldCheck size={15} />{t.safeFlow}</span></div>
            <div className="tab-switch" role="tablist" aria-label={language === "vi" ? "Cách gửi game" : "Submission method"}>
              <button role="tab" aria-selected={activeTab === "html"} className={activeTab === "html" ? "tab-selected" : ""} onClick={() => { setActiveTab("html"); setResult(null); setError(""); }}><FileCode2 size={16} />{t.htmlTab}</button>
              <button role="tab" aria-selected={activeTab === "url"} className={activeTab === "url" ? "tab-selected" : ""} onClick={() => { setActiveTab("url"); setResult(null); setError(""); }}><Globe2 size={16} />{t.urlTab}</button>
            </div>

            <label className="field-label" htmlFor="game-title">{t.titleLabel} <span>{t.optional}</span></label>
            <input id="game-title" className="text-field" placeholder={t.titlePlaceholder} maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />

            {activeTab === "html" ? (
              <>
                <label className="field-label" htmlFor="game-html-file">{t.fileLabel} <span>{t.fileHint}</span></label>
                <input ref={fileRef} id="game-html-file" className="file-input-hidden" type="file" accept=".html,.htm,text/html" onChange={(event) => acceptFile(event.target.files?.[0])} />
                <label
                  className={"dropzone " + (file ? "dropzone-has-file" : "")}
                  htmlFor="game-html-file"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}
                >
                  {file ? <><span className="drop-icon"><FileCode2 size={21} /></span><b>{file.name}</b><small>{(file.size / 1024).toFixed(1)} KB · {t.changeFile}</small></> : <><span className="drop-icon"><FileUp size={21} /></span><b>{t.dropTitle}</b><small>{t.dropOr}</small><span className="browse-button">{t.browse}<ArrowRight size={13} /></span></>}
                </label>
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="game-url">{t.urlLabel}</label>
                <div className="url-field"><Globe2 size={17} /><input id="game-url" type="url" inputMode="url" autoComplete="url" maxLength={2048} placeholder={t.urlPlaceholder} value={url} onChange={(event) => setUrl(event.target.value)} /></div>
                <p className="field-hint">{t.urlNote}</p>
              </>
            )}

            <label className="consent-row"><input type="checkbox" id="rights-consent" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t.consent}</span></label>
            {error && <div className="inline-error" role="alert"><ShieldAlert size={16} />{error}</div>}
            {displayResult && (
              <div className="scan-result" aria-live="polite">
                <div className="scan-result-head"><span className="result-icon"><ShieldAlert size={17} /></span><div><b>{t.scanResult}</b><small>{displayResult.verdict === "WARNING" ? (language === "vi" ? "Có dấu hiệu cần xem lại" : "Some signals need a closer look") : t.manualReview}</small></div><strong>{displayResult.score}/100</strong></div>
                {displayResult.findings.length ? displayResult.findings.map((finding, index) => (
                  <div className="finding" key={finding.label + index}><span className={"severity severity-" + finding.severity}>{severityText(finding.severity, language)}</span><div><b>{finding.label}</b><small>{finding.detail}</small></div></div>
                )) : <p className="no-findings">{t.noFindings}</p>}
                <p className="scan-disclaimer">{displayResult.message}</p>
                <button className="reset-button" onClick={resetForm}>{t.reset}</button>
              </div>
            )}
            <button className="scan-button" onClick={runScan} disabled={scanning}>{scanning ? <><span className="spinner" />{t.scanning}</> : <><ShieldCheck size={17} />{t.scanButton}<ArrowRight size={16} /></>}</button>
            <p className="form-footnote"><LockKeyhole size={13} />{t.footnote}</p>
          </div>
        </section>

        <section className="workflow-section" id="how-it-works">
          <div className="section-heading">
            <div><div className="section-kicker">{t.workflowKicker}</div><h2>{t.workflowTitle}</h2></div>
            <p className="workflow-lede">{t.workflowLede}</p>
          </div>
          <div className="workflow-grid">
            <article className="workflow-card"><span className="workflow-number">01</span><div className="workflow-icon"><FileCode2 size={21} /></div><h3>{t.receive}</h3><p>{t.receiveDesc}</p><span className="workflow-tag">INPUT</span></article>
            <article className="workflow-card"><span className="workflow-number">02</span><div className="workflow-icon"><ShieldAlert size={21} /></div><h3>{t.staticScan}</h3><p>{t.staticScanDesc}</p><span className="workflow-tag">STATIC CHECK</span></article>
            <article className="workflow-card"><span className="workflow-number">03</span><div className="workflow-icon"><BookOpen size={21} /></div><h3>{t.policyCheck}</h3><p>{t.policyCheckDesc}</p><span className="workflow-tag">POLICY REVIEW</span></article>
            <article className="workflow-card"><span className="workflow-number">04</span><div className="workflow-icon"><BadgeCheck size={21} /></div><h3>{t.manualApproval}</h3><p>{t.manualApprovalDesc}</p><span className="workflow-tag">HUMAN APPROVAL</span></article>
          </div>
        </section>

        <section className="safety-section" id="safety">
          <div className="safety-icon"><ShieldCheck size={23} /></div>
          <div><div className="section-kicker">{t.safetyKicker}</div><h2>{t.safetyTitle}</h2><p>{t.safetyText}</p><a href="https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies" target="_blank" rel="noreferrer">{t.readPolicy}<ArrowRight size={15} /></a></div>
        </section>

        {submissions.length > 0 && (
          <section className="queue-section" aria-labelledby="queue-title">
            <div className="section-heading"><div><div className="section-kicker">{language === "vi" ? "CHỈ TRÊN THIẾT BỊ NÀY" : "THIS DEVICE ONLY"}</div><h2 id="queue-title">{t.recentTitle}</h2></div><button className="clear-queue" onClick={clearQueue}>{t.clearHistory}</button></div>
            <div className="queue-list">{submissions.map((item) => <div className="queue-item" key={item.id}><span className="queue-file">{item.kind === "HTML" ? <FileCode2 size={18} /> : <Globe2 size={18} />}</span><div className="queue-details"><b>{item.title}</b><small>{item.source}</small></div><span className="queue-status"><Clock3 size={13} />{t.pendingReview}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB")}</time></div>)}</div>
            <p className="queue-warning">{t.localWarning}</p>
          </section>
        )}

        <footer className="footer">
          <a className="brand footer-brand" href="#"><span className="brand-mark"><Layers3 size={17} /></span><span>gamevault<span className="brand-dot">.</span></span></a>
          <span>{t.footerLine}</span>
          <div><a href="#safety">{t.footerPolicy}</a><a href="#how-it-works">{t.footerProcess}</a><a href="https://github.com/slgamervn/aaa" target="_blank" rel="noreferrer"><Github size={15} />{t.source}</a></div>
          <small>© 2026 GameVault · {t.footerStatus}</small>
        </footer>
      </div>

      {showSubmit && (
        <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowSubmit(false); }}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title">
            <button className="modal-close" aria-label={language === "vi" ? "Đóng" : "Close"} onClick={() => setShowSubmit(false)}><X size={19} /></button>
            <div className="modal-mark"><UploadCloud size={22} /></div>
            <div className="section-kicker">{t.modalKicker}</div><h2 id="submit-modal-title">{t.modalTitle}</h2><p>{t.modalText}</p>
            <div className="modal-choice">
              <button onClick={() => { setActiveTab("html"); setShowSubmit(false); document.getElementById("submit")?.scrollIntoView({ behavior: motionReduced ? "auto" : "smooth" }); }}><FileCode2 size={20} /><span><b>{t.modalHtml}</b><small>{t.modalHtmlDesc}</small></span><ArrowRight size={16} /></button>
              <button onClick={() => { setActiveTab("url"); setShowSubmit(false); document.getElementById("submit")?.scrollIntoView({ behavior: motionReduced ? "auto" : "smooth" }); }}><Globe2 size={20} /><span><b>{t.modalUrl}</b><small>{t.modalUrlDesc}</small></span><ArrowRight size={16} /></button>
            </div>
            <div className="modal-note"><ShieldCheck size={15} />{t.modalFoot}</div>
          </div>
        </div>
      )}
    </main>
  );
}
