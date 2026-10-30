"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BadgeCheck, BookOpen, Check,
  Clock3, Download, ExternalLink, FileCode2, FileUp, Github, Globe2, Languages, Layers3,
  LockKeyhole, Moon, Search, ShieldAlert, ShieldCheck, Sun,
  Type, UploadCloud, X
} from "lucide-react";

type Language = "vi" | "en";
type Theme = "paper" | "night";
type Genre = "all" | "arcade" | "strategy" | "puzzle" | "action" | "simulation" | "educational" | "other";
type Finding = { label: string; severity: "high" | "medium" | "low"; detail: string };
type ScanResult = { mode: string; verdict: string; score: number; findings: Finding[]; message: string; bytes?: number; contentScanned?: boolean; scannedResources?: number; submitted?: boolean; submissionId?: string };
type Submission = { id: string; title: string; source: string; kind: "HTML" | "URL"; status: "pending"; createdAt: string; result: ScanResult };
type PublishedProject = { id: string; title: string; description: string; genre: string; kind: "html" | "url"; sourceUrl: string | null; originalFilename: string | null; publishedAt: string | null };

const copy = {
  vi: {
    navLibrary: "Dự án", navProcess: "Giới thiệu", navSafety: "An toàn & chính sách",
    submit: "Đóng góp dự án", switchLanguage: "Switch to English", darkMode: "Giao diện tối",
    lightMode: "Giao diện sáng", largerText: "Tăng cỡ chữ", smallerText: "Cỡ chữ mặc định",
    reduceMotion: "Giảm chuyển động", restoreMotion: "Bật chuyển động",
    openMenu: "Mở điều hướng", closeMenu: "Đóng điều hướng",
    eyebrow: "BỘ SƯU TẬP DỰ ÁN TRÒ CHƠI TRÊN WEB",
    heroLine1: "Dự án hay", heroLine2: "đáng được", heroAccent: "khám phá.",
    heroLede: "Một nơi để khám phá và tải về các dự án trò chơi trên web. Tệp HTML có thể tải trực tiếp; dự án dạng liên kết sẽ mở tại trang nguồn. Mọi nội dung đều được kiểm tra và duyệt trước khi công khai.",
    discover: "Khám phá dự án", sendOne: "Gửi dự án",
    proofOne: "Không chạy HTML khi quét", proofTwo: "Kiểm duyệt thủ công", proofThree: "Nói rõ điều đã kiểm tra",
    artworkLabel: "MỘT THẾ GIỚI NHỎ", artworkReady: "BẢN MINH HOẠ", artworkFoot: "MỘT DỰ ÁN · MỘT Ý TƯỞNG",
    artCaption: "Không cần hào nhoáng để đáng nhớ.",
    statOne: "HTML / URL", statOneDesc: "Tệp HTML hoặc đường dẫn",
    statTwo: "QUÉT TĨNH", statTwoDesc: "Không thực thi file tải lên",
    statThree: "DUYỆT TAY", statThreeDesc: "Không tự động xuất bản",
    statFour: "CHỈ DỰ ÁN ĐÃ DUYỆT", statFourDesc: "Dự án chỉ hiện sau khi được công khai",
    libraryKicker: "KHO DỰ ÁN · 01", libraryTitle: "Khám phá các dự án.", librarySubtitle: "Tải tệp HTML đã được duyệt hoặc mở trang nguồn của dự án. Chỉ nội dung đã qua kiểm duyệt mới xuất hiện tại đây.",
    searchPlaceholder: "Tìm tên hoặc thể loại…", searchLabel: "Tìm dự án",
    all: "Tất cả", arcade: "Arcade", strategy: "Chiến thuật", puzzle: "Giải đố", action: "Hành động", simulation: "Mô phỏng", educational: "Giáo dục", other: "Khác",
    genreLabel: "Thể loại", descriptionLabel: "Mô tả dự án", descriptionPlaceholder: "Giới thiệu ngắn về dự án (tối đa 240 ký tự)", publishedOnly: "Đã được duyệt và xuất bản", loadingGames: "Đang tải danh sách dự án…", catalogLoadFailed: "Chưa thể tải danh sách dự án. Hãy thử tải lại trang.", emptyLibraryTitle: "Chưa có dự án nào được công khai.", emptyLibraryText: "Các dự án sẽ xuất hiện tại đây sau khi được kiểm tra và phê duyệt. Bạn cũng có thể gửi một dự án để đề nghị xem xét.", downloadProject: "Tải tệp HTML", openProject: "Mở trang nguồn", sourceUnavailable: "Nguồn hiện không khả dụng", riskScore: "TÍN HIỆU KIỂM TRA", htmlProjectFallback: "Tệp HTML đã được kiểm tra và công khai.", urlProjectFallback: "Dự án này được chia sẻ qua trang web gốc.",
    sample: "MẪU", unlisted: "Chưa xuất bản", sampleArtwork: "ARTWORK MẪU",
    neonCategory: "Arcade · Nhịp độ", neonDescription: "Một đường đua nhỏ, vài khúc cua và cảm giác vừa đủ nhanh.",
    kingdomCategory: "Chiến thuật · Xây dựng", kingdomDescription: "Xếp từng mảnh đất và chăm chút cho một vương quốc tí hon.",
    orbitCategory: "Giải đố · Vật lý", orbitDescription: "Những quỹ đạo đơn giản dẫn đến các câu đố khó đoán.",
    submitSimilar: "Gửi dự án tương tự", noResults: "Không tìm thấy kết quả. Hãy thử từ khóa hoặc thể loại khác.",
    demoNotice: "Ảnh bìa và tên hiển thị là hình minh họa. Dự án chỉ xuất hiện trong danh sách sau khi được duyệt công khai.",
    submitKicker: "ĐÓNG GÓP DỰ ÁN · 02", submitTitle: "Bạn có dự án muốn chia sẻ?",
    submitLede: "Gửi tệp HTML hoặc đường dẫn đến dự án. Hệ thống sẽ quét tĩnh sơ bộ, sau đó người quản lý kiểm tra trước khi quyết định công khai.",
    stepOne: "Gửi dự án", stepOneDesc: "Tệp .html / .htm hoặc đường dẫn",
    stepTwo: "Kiểm tra sơ bộ", stepTwoDesc: "Tìm một số mẫu code cần xem lại",
    stepThree: "Chờ phê duyệt", stepThreeDesc: "Chỉ công khai sau khi được duyệt",
    formKicker: "BIỂU MẪU GỬI DỰ ÁN", formTitle: "Gửi dự án mới", safeFlow: "QUY TRÌNH RÕ RÀNG",
    htmlTab: "Tệp HTML", urlTab: "Liên kết", titleLabel: "Tên dự án",
    optional: "(không bắt buộc)", titlePlaceholder: "Ví dụ: Pixel Adventure",
    fileLabel: "Tệp dự án", fileHint: ".html / .htm · tối đa 1 MB",
    dropTitle: "Thả file HTML vào đây", dropOr: "hoặc nhấn để chọn từ thiết bị",
    browse: "Chọn file", changeFile: "Nhấn để đổi tệp",
    urlLabel: "Đường dẫn dự án", urlPlaceholder: "https://example.com/project",
    urlNote: "Máy quét tải trang công khai trong giới hạn an toàn, sau đó kiểm tra tĩnh HTML và tối đa 4 script bên ngoài. Mã dự án không được thực thi. Một số website có thể chặn máy quét.",
    consent: "Tôi có quyền chia sẻ dự án này hoặc đã kiểm tra giấy phép phù hợp.",
    consentError: "Vui lòng xác nhận bạn có quyền chia sẻ dự án này.",
    fileError: "Vui lòng chọn tệp .html hoặc .htm.",
    invalidFile: "Chỉ chấp nhận tệp .html hoặc .htm.",
    tooLarge: "Tệp quá lớn. Giới hạn hiện tại là 1 MB.",
    urlError: "Nhập đường dẫn dự án cần kiểm tra.", scanFailed: "Không thể quét nội dung.",
    scanButton: "Kiểm tra và gửi duyệt", submittedButton: "Đã gửi chờ duyệt", submittedNotice: "Đã nhận dự án và đưa vào hàng chờ kiểm duyệt. Dự án chưa được công khai.", submittedNeedsReview: "Đã nhận đường dẫn và đưa vào hàng chờ kiểm duyệt, nhưng hệ thống chưa tải được nội dung để quét. Người quản lý cần kiểm tra thủ công trước khi công khai.", scanIncompleteStatus: "Chưa thể kiểm tra nội dung", scanning: "Đang quét…",
    scanResult: "Kết quả quét sơ bộ", manualReview: "Cần xem xét thủ công",
    noFindings: "Không phát hiện mẫu trùng khớp trong nội dung đã quét. Điều này không chứng minh dự án an toàn.",
    scanDisclaimer: "Quét tĩnh không chứng minh file vô hại hoặc tuân thủ chính sách.",
    reset: "Kiểm tra dự án khác", footnote: "Nội dung chưa được tự động đưa lên GitHub.",
    workflowKicker: "RÕ RÀNG TỪ ĐẦU · 03", workflowTitle: "Kiểm tra trước. Xuất bản sau.",
    workflowLede: "Không một công cụ quét tự động nào có thể thay thế việc xem xét quyền sử dụng, bản quyền và nội dung thực tế.",
    receive: "Tiếp nhận dự án", receiveDesc: "Nhận tệp HTML hoặc lưu đường dẫn làm nguồn tham khảo. Tệp không được chạy trong lúc quét.",
    staticScan: "Quét tĩnh", staticScanDesc: "Tìm dấu hiệu cần xem xét. Kết quả có thể bỏ sót hoặc cảnh báo nhầm.",
    policyCheck: "Kiểm tra chính sách", policyCheckDesc: "Xem giấy phép, bản quyền, quyền riêng tư và quy tắc sử dụng GitHub.",
    manualApproval: "Duyệt thủ công", manualApprovalDesc: "Chủ dự án quyết định. Kết quả quét không tự phê duyệt nội dung.",
    safetyKicker: "GIỚI HẠN ĐƯỢC NÓI RÕ · 04", safetyTitle: "Quét không đồng nghĩa với an toàn.",
    safetyText: "Bài gửi được lưu phía máy chủ trong cơ sở dữ liệu và kho riêng tư. Quyền quản trị và xuất bản GitHub phải được cấu hình; không nội dung nào được tự động công khai.",
    readPolicy: "Đọc chính sách sử dụng GitHub", recentTitle: "Dự án đã gửi trên thiết bị này",
    clearHistory: "Xoá lịch sử cục bộ", pendingReview: "Chờ kiểm duyệt",
    localWarning: "Đây chỉ là nhật ký hoạt động cục bộ để tiện theo dõi. Bản ghi có thẩm quyền nằm trong cơ sở dữ liệu máy chủ; trạng thái duyệt thật chỉ có trong trang quản trị.",
    footerLine: "Một bộ sưu tập dự án được tuyển chọn và kiểm duyệt.", footerPolicy: "Chính sách",
    footerProcess: "Quy trình", source: "Mã nguồn", footerStatus: "Chỉ công khai dự án sau khi được duyệt",
    modalKicker: "BẮT ĐẦU ĐÓNG GÓP", modalTitle: "Bạn muốn gửi dự án theo cách nào?",
    modalText: "Chọn tệp HTML hoặc gửi đường dẫn gốc. Dự án sẽ được kiểm tra trước khi công khai.",
    modalHtml: "Chọn tệp HTML", modalHtmlDesc: "Chọn tệp dự án từ thiết bị",
    modalUrl: "Gửi đường dẫn", modalUrlDesc: "Giữ dự án tại website gốc",
    modalFoot: "Mọi dự án đều được kiểm tra thủ công trước khi công khai.",
    urlFinding: "Chưa phân tích nội dung đường dẫn",
    severityHigh: "Cao", severityMedium: "Trung bình", severityLow: "Thấp",
    findingObfuscated: "JavaScript có dấu hiệu bị làm rối", detailObfuscated: "Có cấu trúc thường xuất hiện trong mã động hoặc bị làm rối. Cần xem xét thủ công; chưa thể kết luận mã độc.",
    findingInput: "Có thể gửi dữ liệu nhập nhạy cảm", detailInput: "Có tổ hợp từ khoá nhạy cảm và thao tác gửi dữ liệu cần được kiểm tra.",
    findingRedirect: "Có thao tác chuyển hướng", detailRedirect: "Kiểm tra đích đến và ngữ cảnh của thao tác chuyển hướng hoặc mở cửa sổ.",
    findingExternal: "Có tải tài nguyên bên ngoài", detailExternal: "Xác minh nguồn tài nguyên, giấy phép và tác động đến quyền riêng tư.",
    findingClipboard: "Có thao tác với bộ nhớ tạm", detailClipboard: "Kiểm tra lý do truy cập bộ nhớ tạm và cách thông báo cho người dùng.",
    findingIframe: "Có nhúng iframe", detailIframe: "Kiểm tra nguồn iframe, thuộc tính sandbox và chính sách nhúng.",
    urlFindingDetail: "Đã kiểm tra cú pháp URL. Nội dung chưa được tải hoặc thực thi; cần kiểm tra thủ công nguồn và giấy phép của dự án.",
    scanMessageUrl: "Đã tải và quét tĩnh nội dung trang công khai; mã dự án không được thực thi. Một số tài nguyên có thể bị bỏ qua, vì vậy vẫn cần kiểm tra thủ công.",
    scanMessageUrlFailed: "Không thể tải nội dung trang để quét. Không thể đưa ra kết luận về độ an toàn; hãy xem xét thủ công.",
    scanMessageHtml: "Đây là quét tĩnh theo mẫu, không phải chứng nhận không có mã độc hoặc xác nhận tuân thủ điều khoản GitHub."
  },
  en: {
    navLibrary: "Projects", navProcess: "About", navSafety: "Safety & policy",
    submit: "Contribute a project", switchLanguage: "Chuyển sang tiếng Việt", darkMode: "Dark appearance",
    lightMode: "Light appearance", largerText: "Increase text size", smallerText: "Default text size",
    reduceMotion: "Reduce motion", restoreMotion: "Enable motion",
    openMenu: "Open navigation", closeMenu: "Close navigation",
    eyebrow: "A CURATED COLLECTION OF WEB-GAME PROJECTS",
    heroLine1: "Good projects", heroLine2: "deserve to be", heroAccent: "discovered.",
    heroLede: "A place to discover and download web-game projects. HTML files can be downloaded directly; link-based projects open at their original website. Every submission is checked and reviewed before publication.",
    discover: "Explore projects", sendOne: "Submit a project",
    proofOne: "HTML is never executed during scanning", proofTwo: "Human review", proofThree: "Clear about what was checked",
    artworkLabel: "A LITTLE WORLD", artworkReady: "SAMPLE ARTWORK", artworkFoot: "ONE PROJECT · ONE IDEA",
    artCaption: "It doesn't need to shout to be memorable.",
    statOne: "HTML / URL", statOneDesc: "Two ways to submit",
    statTwo: "STATIC CHECK", statTwoDesc: "Uploaded files are not executed",
    statThree: "HUMAN REVIEW", statThreeDesc: "Nothing is published automatically",
    statFour: "REVIEWED PROJECTS", statFourDesc: "Projects appear after approval",
    libraryKicker: "PROJECT COLLECTION · 01", libraryTitle: "Explore the projects.", librarySubtitle: "Download approved HTML files or open a project at its original website. Only reviewed projects appear here.",
    searchPlaceholder: "Search titles or genres…", searchLabel: "Search projects",
    all: "All", arcade: "Arcade", strategy: "Strategy", puzzle: "Puzzle", action: "Action", simulation: "Simulation", educational: "Educational", other: "Other",
    genreLabel: "Genre", descriptionLabel: "Project description", descriptionPlaceholder: "Briefly describe the project (up to 240 characters)", publishedOnly: "Reviewed and published", loadingGames: "Loading the library…", catalogLoadFailed: "The library could not be loaded. Try refreshing the page.", emptyLibraryTitle: "No projects published yet.", emptyLibraryText: "Projects will appear here after review and approval. You can also submit a project for consideration.", downloadProject: "Download HTML file", openProject: "Open source website", sourceUnavailable: "Source unavailable", riskScore: "REVIEW SIGNAL", htmlProjectFallback: "This HTML project has been reviewed and published.", urlProjectFallback: "This project is provided through its original website.",
    sample: "SAMPLE", unlisted: "Not published", sampleArtwork: "SAMPLE ARTWORK",
    neonCategory: "Arcade · Action", neonDescription: "A small track, a few turns, and just enough speed.",
    kingdomCategory: "Strategy · Building", kingdomDescription: "Place each patch of land and tend to a tiny kingdom.",
    orbitCategory: "Puzzle · Physics", orbitDescription: "Simple orbits lead to surprisingly tricky puzzles.",
    submitSimilar: "Submit a similar project", noResults: "No results found. Try another search term or genre.",
    demoNotice: "Cover artwork and names are illustrative. A project only appears in the collection after approval and publication.",
    submitKicker: "PROJECT CONTRIBUTIONS · 02", submitTitle: "Have a project to share?",
    submitLede: "Submit an HTML file or a link to the project. The system performs a preliminary static scan, then a person reviews it before publication.",
    stepOne: "Submit a project", stepOneDesc: ".html / .htm file or URL",
    stepTwo: "Preliminary scan", stepTwoDesc: "Look for patterns worth reviewing",
    stepThree: "Await approval", stepThreeDesc: "Projects are published only after review",
    formKicker: "PROJECT SUBMISSION", formTitle: "Submit a project", safeFlow: "CLEAR PROCESS",
    htmlTab: "HTML file", urlTab: "Project link", titleLabel: "Project name",
    optional: "(optional)", titlePlaceholder: "For example: Pixel Adventure",
    fileLabel: "Project file", fileHint: ".html / .htm · up to 1 MB",
    dropTitle: "Drop an HTML file here", dropOr: "or choose one from your device",
    browse: "Choose file", changeFile: "Select a different file",
    urlLabel: "Project URL", urlPlaceholder: "https://example.com/project",
    urlNote: "The scanner fetches a public page within safety limits, then statically checks its HTML and up to 4 external scripts. Project code is never executed. Some websites may block scanners.",
    consent: "I have permission to share this project or have checked its licence.",
    consentError: "Please confirm that you have permission to share this content.",
    fileError: "Choose an .html or .htm file first.",
    invalidFile: "Only .html and .htm files are accepted.",
    tooLarge: "The file is too large. The prototype limit is 1 MB.",
    urlError: "Enter the project URL to check.", scanFailed: "The content could not be scanned.",
    scanButton: "Scan and submit for review", submittedButton: "Submitted for review", submittedNotice: "Your submission has been received and queued for human review. It has not been published automatically.", submittedNeedsReview: "The URL was received and queued for review, but its content could not be fetched for scanning. A person must review it before publication.", scanIncompleteStatus: "Content scan incomplete", scanning: "Scanning…",
    scanResult: "Preliminary scan result", manualReview: "Manual review needed",
    noFindings: "No defined patterns matched in the scanned content. This does not prove the project is safe.",
    scanDisclaimer: "A static scan cannot prove a file is harmless or policy-compliant.",
    reset: "Scan another item", footnote: "Nothing is published to GitHub automatically.",
    workflowKicker: "THE PROCESS, UP FRONT · 03", workflowTitle: "Check first. Publish later.",
    workflowLede: "No automated scanner can replace a review of usage rights, copyright, and the actual content.",
    receive: "Receive", receiveDesc: "Accept an HTML file or keep a URL as a reference. The file is not run during scanning.",
    staticScan: "Static scan", staticScanDesc: "Look for signals worth reviewing. Results can miss issues or flag harmless code.",
    policyCheck: "Policy review", policyCheckDesc: "Review the licence, copyright, privacy, and GitHub rules.",
    manualApproval: "Manual approval", manualApprovalDesc: "The project owner decides. A scan never approves content by itself.",
    safetyKicker: "LIMITATIONS, MADE CLEAR · 04", safetyTitle: "A scan is not a safety certificate.",
    safetyText: "Submissions are stored server-side in a database and private quarantine. Administrator access and GitHub publishing must be configured; nothing is published automatically.",
    readPolicy: "Read GitHub's Acceptable Use Policies", recentTitle: "Recent submissions on this device",
    clearHistory: "Clear local history", pendingReview: "Waiting for owner review",
    localWarning: "This is only a local activity log for convenience. The server database is authoritative; verified review status is available only in the admin console.",
    footerLine: "A curated collection of projects, reviewed with care.", footerPolicy: "Policy",
    footerProcess: "Process", source: "Source code", footerStatus: "Projects are published only after review",
    modalKicker: "START A SUBMISSION", modalTitle: "How would you like to submit your project?",
    modalText: "Choose an HTML file or submit the original link. The project will be reviewed before publication.",
    modalHtml: "Upload an HTML file", modalHtmlDesc: "Choose a file from your device",
    modalUrl: "Submit a link", modalUrlDesc: "Keep the project at its original website",
    modalFoot: "Every submission must be reviewed manually.",
    urlFinding: "URL content has not been analysed",
    severityHigh: "High", severityMedium: "Medium", severityLow: "Low",
    findingObfuscated: "JavaScript may be obfuscated", detailObfuscated: "This pattern can appear in dynamic or obfuscated code. It needs manual review; it is not proof of malware.",
    findingInput: "Possible transmission of sensitive input", detailInput: "A combination of sensitive keywords and data transmission needs inspection.",
    findingRedirect: "Redirect or new-window behaviour", detailRedirect: "Review the destination and context of the redirect or window-opening behaviour.",
    findingExternal: "External resources referenced", detailExternal: "Verify resource origin, licensing, and privacy implications.",
    findingClipboard: "Clipboard access pattern", detailClipboard: "Review why clipboard access is needed and how it is explained to users.",
    findingIframe: "Embedded iframe found", detailIframe: "Review the iframe origin, sandbox attributes, and embedding policy.",
    urlFindingDetail: "The URL syntax was checked. The page was not fetched or executed; its source and licence still need manual review.",
    scanMessageUrl: "The public page was fetched and scanned statically; project code was not executed. Some resources may be omitted, so manual review is still required.",
    scanMessageUrlFailed: "The page content could not be fetched. No safety conclusion can be drawn; manual review is required.",
    scanMessageHtml: "This is a pattern-based static scan, not a malware-free certificate or confirmation of GitHub policy compliance."
  }
} as const;


function localizeScan(scan: ScanResult, language: Language): ScanResult {
  if (language === "vi") return scan;
  const translations: Record<string, { label: string; detail: string }> = {
    "Mã JavaScript bị làm rối": { label: copy.en.findingObfuscated, detail: copy.en.detailObfuscated },
    "Có thể thu thập thông tin nhập": { label: copy.en.findingInput, detail: copy.en.detailInput },
    "Có thao tác chuyển hướng": { label: copy.en.findingRedirect, detail: copy.en.detailRedirect },
    "Có tải tài nguyên từ bên ngoài": { label: copy.en.findingExternal, detail: copy.en.detailExternal },
    "Có hành vi clipboard": { label: copy.en.findingClipboard, detail: copy.en.detailClipboard },
    "Có nhúng iframe": { label: copy.en.findingIframe, detail: copy.en.detailIframe },
    "Chưa phân tích nội dung URL": { label: copy.en.urlFinding, detail: copy.en.urlFindingDetail },
    "Không thể tải nội dung để quét": { label: "Could not retrieve content for scanning", detail: "The scanner could not retrieve public HTML within its safety limits. No safety conclusion can be drawn." },
    "Không thể quét đầy đủ tài nguyên ngoài": { label: "Some external resources could not be scanned", detail: "Some external scripts were skipped, exceeded limits, or could not be fetched. Manual review is required." }
  };
  return {
    ...scan,
    findings: scan.findings.map((finding) => ({ ...finding, ...(translations[finding.label] ?? {}) })),
    message: scan.mode === "url" ? (scan.contentScanned ? copy.en.scanMessageUrl : copy.en.scanMessageUrlFailed) : copy.en.scanMessageHtml
  };
}

const severityText = (severity: Finding["severity"], language: Language) => {
  const labels = copy[language];
  return severity === "high" ? labels.severityHigh : severity === "medium" ? labels.severityMedium : labels.severityLow;
};

function localizeErrorMessage(message: string, language: Language): string {
  if (language === "vi") return message;
  const translations: Record<string, string> = {
    "Nội dung vượt giới hạn 1 MB.": "The request exceeds the 1 MB limit.",
    "Dữ liệu JSON không hợp lệ.": "The request body is not valid JSON.",
    "Thiếu nội dung cần quét.": "No content was provided to scan.",
    "File HTML vượt giới hạn 1 MB.": "The HTML file exceeds the 1 MB limit.",
    "URL không hợp lệ.": "The URL is invalid.",
    "URL is invalid.": "The URL is invalid.",
    "Only HTTP and HTTPS URLs are accepted.": "Only HTTP and HTTPS URLs are accepted.",
    "Only standard HTTP and HTTPS ports are accepted.": "Only standard HTTP and HTTPS ports are accepted.",
    "URLs must not contain embedded credentials.": "The URL must not contain embedded credentials.",
    "Local or private network URLs are not accepted.": "Local or private network URLs are not accepted.",
    "Chỉ chấp nhận URL HTTP/HTTPS.": "Only HTTP and HTTPS URLs are accepted.",
    "URL không được chứa thông tin đăng nhập.": "The URL must not contain embedded credentials.",
    "Hãy chọn file HTML hoặc nhập URL.": "Choose an HTML file or enter a URL."
  };
  return translations[message] ?? copy.en.scanFailed;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("vi");
  const [theme, setTheme] = useState<Theme>("paper");
  const [largeText, setLargeText] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [activePageTab, setActivePageTab] = useState<"home" | "library" | "submit" | "info">("home");
  const [activeTab, setActiveTab] = useState<"html" | "url">("html");
  const [activeGenre, setActiveGenre] = useState<Genre>("all");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<Exclude<Genre, "all">>("other");
  const [publishedProjects, setPublishedProjects] = useState<PublishedProject[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogLoadError, setCatalogLoadError] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [query, setQuery] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [consent, setConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "paper" ? "#f3f0e7" : "#171c18");
  }, [language, theme, largeText, motionReduced, preferencesLoaded]);

  useEffect(() => {
    let active = true;
    async function loadPublishedProjects() {
      setCatalogLoading(true);
      try {
        const response = await fetch("/api/games", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error("catalog-unavailable");
        if (active) {
          setPublishedProjects(Array.isArray(body.games) ? body.games as PublishedProject[] : []);
          setCatalogLoadError(false);
        }
      } catch {
        if (active) setCatalogLoadError(true);
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    void loadPublishedProjects();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if (showSubmit || event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [showSubmit]);

  useEffect(() => {
    if (!showSubmit) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowSubmit(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSubmit]);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(language === "vi" ? "vi-VN" : "en");
    return publishedProjects.filter((game) => {
      const visibleText = [game.title, game.genre, game.description, game.sourceUrl ?? "", game.originalFilename ?? ""]
        .join(" ")
        .toLocaleLowerCase(language === "vi" ? "vi-VN" : "en");
      return (activeGenre === "all" || game.genre === activeGenre) && (!term || visibleText.includes(term));
    });
  }, [activeGenre, language, query, publishedProjects]);

  function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    if (!/\.html?$/i.test(candidate.name)) { setFile(null); if (fileRef.current) fileRef.current.value = ""; setError(t.invalidFile); return; }
    if (candidate.size > 1_000_000) { setFile(null); if (fileRef.current) fileRef.current.value = ""; setError(t.tooLarge); return; }
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
      const payload = new FormData();
      payload.set("kind", activeTab);
      payload.set("title", title.trim());
      payload.set("description", description.trim());
      payload.set("genre", genre);
      payload.set("rightsConfirmed", String(consent));
      payload.set("website", "");
      if (activeTab === "html" && file) payload.set("file", file, file.name);
      else payload.set("url", url.trim());

      const response = await fetch("/api/scan", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.scanFailed);
      const scan = data as ScanResult;
      const submissionId = typeof data.submission?.id === "string" ? data.submission.id : undefined;
      const acceptedResult: ScanResult = { ...scan, submitted: Boolean(submissionId), ...(submissionId ? { submissionId } : {}) };
      setResult(acceptedResult);
      const newItem: Submission = {
        id: typeof data.submission?.id === "string" ? data.submission.id : crypto.randomUUID(),
        title: typeof data.submission?.title === "string" ? data.submission.title : (title.trim() || (activeTab === "html" ? file?.name ?? "HTML" : new URL(url).hostname)),
        source: activeTab === "html" ? file?.name ?? "HTML" : url.trim(),
        kind: activeTab === "html" ? "HTML" : "URL",
        status: "pending",
        createdAt: typeof data.submission?.submittedAt === "string" ? data.submission.submittedAt : new Date().toISOString(),
        result: acceptedResult
      };
      setSubmissions((previous) => {
        const updated = [newItem, ...previous].slice(0, 20);
        try { localStorage.setItem("gamevault-submissions-v1", JSON.stringify(updated)); } catch { /* The local queue is best-effort only. */ }
        return updated;
      });
    } catch (caught) {
      setError(caught instanceof Error ? localizeErrorMessage(caught.message, language) : t.scanFailed);
    } finally {
      setScanning(false);
    }
  }

  function resetForm() {
    setFile(null);
    setUrl("");
    setTitle("");
    setDescription("");
    setGenre("other");
    setResult(null);
    setError("");
    setConsent(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openSubmit(tab: "html" | "url" = "html") {
    setActivePageTab("submit");
    setActiveTab(tab);
    setShowSubmit(true);
  }

  function clearQueue() {
    setSubmissions([]);
    try { localStorage.removeItem("gamevault-submissions-v1"); } catch { /* Ignore unavailable browser storage. */ }
  }

  const displayResult = result ? localizeScan(result, language) : null;

  return (
    <div className="app-shell" data-theme={theme} data-scale={largeText ? "large" : "normal"} data-motion={motionReduced ? "reduced" : "normal"}>
      <a className="skip-link" href="#main-content">{language === "vi" ? "Bỏ qua điều hướng" : "Skip to content"}</a>
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActivePageTab("home"); }} aria-label="GameVault home">
          <span className="brand-mark"><Layers3 size={19} strokeWidth={2.2} /></span>
          <span>gamevault<span className="brand-dot">.</span></span>
        </a>
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
      </header>

      <nav className="browser-tabbar" role="tablist" aria-label={language === "vi" ? "Các trang GameVault" : "GameVault pages"} onKeyDown={(event) => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".browser-tab")); const currentIndex = tabs.indexOf(event.target as HTMLButtonElement); if (currentIndex < 0) return; event.preventDefault(); const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; tabs[nextIndex].focus(); tabs[nextIndex].click(); }}>
        <button id="gv-tab-home" className={"browser-tab " + (activePageTab === "home" ? "browser-tab-active" : "")} type="button" role="tab" aria-selected={activePageTab === "home"} aria-controls="gv-panel-home" tabIndex={activePageTab === "home" ? 0 : -1} onClick={() => setActivePageTab("home")}><Layers3 size={15} /><span>{language === "vi" ? "Trang chủ" : "Home"}</span></button>
        <button id="gv-tab-library" className={"browser-tab " + (activePageTab === "library" ? "browser-tab-active" : "")} type="button" role="tab" aria-selected={activePageTab === "library"} aria-controls="gv-panel-library" tabIndex={activePageTab === "library" ? 0 : -1} onClick={() => setActivePageTab("library")}><BookOpen size={15} /><span>{t.navLibrary}</span></button>
        <button id="gv-tab-submit" className={"browser-tab " + (activePageTab === "submit" ? "browser-tab-active" : "")} type="button" role="tab" aria-selected={activePageTab === "submit"} aria-controls="gv-panel-submit" tabIndex={activePageTab === "submit" ? 0 : -1} onClick={() => setActivePageTab("submit")}><FileCode2 size={15} /><span>{t.submit}</span></button>
        <button id="gv-tab-info" className={"browser-tab " + (activePageTab === "info" ? "browser-tab-active" : "")} type="button" role="tab" aria-selected={activePageTab === "info"} aria-controls="gv-panel-info" tabIndex={activePageTab === "info" ? 0 : -1} onClick={() => setActivePageTab("info")}><ShieldCheck size={15} /><span>{t.navProcess}</span></button>
      </nav>

      <main id="main-content">
        <section id="gv-panel-home" role="tabpanel" aria-labelledby="gv-tab-home" className="hero" style={{ display: activePageTab === "home" ? undefined : "none" }}>
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" />{t.eyebrow}</div>
            <h1 id="hero-title">{t.heroLine1}<br />{t.heroLine2}<br /><span>{t.heroAccent}</span></h1>
            <p className="hero-lede">{t.heroLede}</p>
            <div className="hero-actions">
              <button className="button-primary" type="button" onClick={() => setActivePageTab("library")}>{t.discover}<ArrowRight size={16} /></button>
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

        <section className="stats-row" style={{ display: activePageTab === "home" ? undefined : "none" }} aria-label={language === "vi" ? "Tóm tắt quy trình" : "Process summary"}>
          <div><strong>{t.statOne}</strong><span>{t.statOneDesc}</span></div>
          <div><strong>{t.statTwo}</strong><span>{t.statTwoDesc}</span></div>
          <div><strong>{t.statThree}</strong><span>{t.statThreeDesc}</span></div>
          <div><strong>{t.statFour}</strong><span>{t.statFourDesc}</span></div>
        </section>

        <section className="section library-section" id="gv-panel-library" role="tabpanel" aria-labelledby="gv-tab-library" style={{ display: activePageTab === "library" ? undefined : "none" }}>
          <div className="section-heading">
            <div><div className="section-kicker">{t.libraryKicker}</div><h2>{t.libraryTitle}</h2><p>{t.librarySubtitle}</p></div>
            <label className="library-search"><Search size={17} aria-hidden="true" /><input ref={searchRef} aria-label={t.searchLabel} placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>/</kbd></label>
          </div>
          <div className="filter-row" role="group" aria-label={language === "vi" ? "Lọc thể loại" : "Filter by genre"}>
            {(["all", "arcade", "strategy", "puzzle", "action", "simulation", "educational", "other"] as Genre[]).map((value) => (
              <button key={value} className={activeGenre === value ? "filter-active" : ""} aria-pressed={activeGenre === value} onClick={() => setActiveGenre(value)}>
                {value === "all" ? t.all : value === "arcade" ? t.arcade : value === "strategy" ? t.strategy : value === "puzzle" ? t.puzzle : value === "action" ? t.action : value === "simulation" ? t.simulation : value === "educational" ? t.educational : t.other}
              </button>
            ))}
            <span className="filter-note"><ShieldCheck size={14} />{t.publishedOnly}</span>
          </div>
          {catalogLoading && <p className="catalog-loading" role="status">{t.loadingGames}</p>}
          {catalogLoadError && <p className="catalog-load-error" role="alert">{t.catalogLoadFailed}</p>}
          <div className="game-grid">
            {filteredProjects.map((game, index) => {
              const color = game.genre === "strategy" ? "rust" : game.genre === "puzzle" || game.genre === "educational" ? "blue" : "mint";
              const coverSymbol = game.genre === "strategy" ? "♜" : game.genre === "puzzle" ? "◎" : game.kind === "url" ? "↗" : "✦";
              const genreLabel = game.genre === "arcade" ? t.arcade : game.genre === "strategy" ? t.strategy : game.genre === "puzzle" ? t.puzzle : game.genre === "action" ? t.action : game.genre === "simulation" ? t.simulation : game.genre === "educational" ? t.educational : t.other;
              const gameHref = "/games/" + game.id;
              return (
                <article className="game-card" key={game.id}>
                  <div className={"game-cover cover-" + color} role="img" aria-label={game.title}>
                    <div className="cover-grain" aria-hidden="true" />
                    <span className="cover-index">GV / {String(index + 1).padStart(2, "0")}</span>
                    <div className="cover-symbol" aria-hidden="true">{coverSymbol}</div>
                    <div className="cover-rings" aria-hidden="true" />
                    <span className="demo-pill">{game.kind === "html" ? t.htmlTab : t.urlTab}</span>
                  </div>
                  <div className="game-info">
                    <div className="game-meta"><span>{genreLabel}</span><span className="demo-dot" /><span>{t.publishedOnly}</span></div>
                    <h3>{game.title}</h3>
                    <p>{game.description || (game.kind === "html" ? t.htmlGameFallback : t.urlGameFallback)}</p>
                    <a className="card-link" href={gameHref}>
                      {t.playGame}<ArrowDownRight size={15} />
                    </a>
                  </div>
                </article>
              );
            })}
            {!catalogLoading && !catalogLoadError && filteredProjects.length === 0 && (
              <div className="empty-search">
                <h3>{query || activeGenre !== "all" ? t.noResults : t.emptyLibraryTitle}</h3>
                <p>{query || activeGenre !== "all" ? t.noResults : t.emptyLibraryText}</p>
                {!query && activeGenre === "all" && <button className="reset-button" onClick={() => openSubmit("html")}>{t.submit}<ArrowDownRight size={15} /></button>}
              </div>
            )}
          </div>
        </section>

        <section className="submission-section" id="gv-panel-submit" role="tabpanel" aria-labelledby="gv-tab-submit" style={{ display: activePageTab === "submit" ? undefined : "none" }}>
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
            <div className="tab-switch" role="group" aria-label={language === "vi" ? "Cách gửi game" : "Submission method"}>
              <button type="button" aria-pressed={activeTab === "html"} className={activeTab === "html" ? "tab-selected" : ""} onClick={() => { setActiveTab("html"); setResult(null); setError(""); }}><FileCode2 size={16} />{t.htmlTab}</button>
              <button type="button" aria-pressed={activeTab === "url"} className={activeTab === "url" ? "tab-selected" : ""} onClick={() => { setActiveTab("url"); setResult(null); setError(""); }}><Globe2 size={16} />{t.urlTab}</button>
            </div>

            <label className="field-label" htmlFor="game-title">{t.titleLabel} <span>{t.optional}</span></label>
            <input id="game-title" className="text-field" placeholder={t.titlePlaceholder} maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
            <label className="field-label" htmlFor="game-description">{t.descriptionLabel} <span>{t.optional}</span></label>
            <textarea id="game-description" className="textarea-field" rows={2} maxLength={240} placeholder={t.descriptionPlaceholder} value={description} onChange={(event) => setDescription(event.target.value)} />
            <label className="field-label" htmlFor="game-genre">{t.genreLabel}</label>
            <select id="game-genre" className="select-field" value={genre} onChange={(event) => setGenre(event.target.value as Exclude<Genre, "all">)}>
              <option value="arcade">{t.arcade}</option><option value="strategy">{t.strategy}</option><option value="puzzle">{t.puzzle}</option><option value="action">{t.action}</option><option value="simulation">{t.simulation}</option><option value="educational">{t.educational}</option><option value="other">{t.other}</option>
            </select>

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
                <div className="scan-result-head"><span className="result-icon"><ShieldAlert size={17} /></span><div><b>{t.scanResult}</b><small>{displayResult.mode === "url" && !displayResult.contentScanned ? t.scanIncompleteStatus : displayResult.verdict === "WARNING" ? (language === "vi" ? "Có dấu hiệu cần xem lại" : "Some signals need a closer look") : t.manualReview}</small></div><strong><small>{displayResult.mode === "url" ? (displayResult.contentScanned ? (language === "vi" ? "ĐÃ QUÉT TĨNH NỘI DUNG" : "STATIC CONTENT SCAN") : (language === "vi" ? "QUÉT CHƯA HOÀN TẤT" : "SCAN INCOMPLETE")) : t.riskScore}</small>{displayResult.mode === "url" ? (displayResult.contentScanned ? `${displayResult.score}/100` : "—") : `${displayResult.score}/100`}</strong></div>
                {displayResult.findings.length ? displayResult.findings.map((finding, index) => (
                  <div className="finding" key={finding.label + index}><span className={"severity severity-" + finding.severity}>{severityText(finding.severity, language)}</span><div><b>{finding.label}</b><small>{finding.detail}</small></div></div>
                )) : <p className="no-findings">{t.noFindings}</p>}
                <p className="scan-disclaimer">{displayResult.message}</p>
                {displayResult.submitted && <p className="scan-disclaimer" role="status">{displayResult.mode === "url" && !displayResult.contentScanned ? t.submittedNeedsReview : t.submittedNotice}</p>}
                <button className="reset-button" onClick={resetForm}>{t.reset}</button>
              </div>
            )}
            <button className="scan-button" onClick={runScan} disabled={scanning || Boolean(result?.submitted)}>{scanning ? <><span className="spinner" />{t.scanning}</> : result?.submitted ? <><Check size={17} />{t.submittedButton}</> : <><ShieldCheck size={17} />{t.scanButton}<ArrowRight size={16} /></>}</button>
            <p className="form-footnote"><LockKeyhole size={13} />{t.footnote}</p>
          </div>
        </section>

        <section className="workflow-section" id="gv-panel-info" role="tabpanel" aria-labelledby="gv-tab-info" style={{ display: activePageTab === "info" ? undefined : "none" }}>
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

        <section className="safety-section" style={{ display: activePageTab === "info" ? undefined : "none" }} id="safety">
          <div className="safety-icon"><ShieldCheck size={23} /></div>
          <div><div className="section-kicker">{t.safetyKicker}</div><h2>{t.safetyTitle}</h2><p>{t.safetyText}</p><a href="https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies" target="_blank" rel="noreferrer">{t.readPolicy}<ArrowRight size={15} /></a></div>
        </section>

        {submissions.length > 0 && activePageTab === "submit" && (
          <section className="queue-section" aria-labelledby="queue-title">
            <div className="section-heading"><div><div className="section-kicker">{language === "vi" ? "CHỈ TRÊN THIẾT BỊ NÀY" : "THIS DEVICE ONLY"}</div><h2 id="queue-title">{t.recentTitle}</h2></div><button className="clear-queue" onClick={clearQueue}>{t.clearHistory}</button></div>
            <div className="queue-list">{submissions.map((item) => <div className="queue-item" key={item.id}><span className="queue-file">{item.kind === "HTML" ? <FileCode2 size={18} /> : <Globe2 size={18} />}</span><div className="queue-details"><b>{item.title}</b><small>{item.source}</small></div><span className="queue-status"><Clock3 size={13} />{t.pendingReview}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB")}</time></div>)}</div>
            <p className="queue-warning">{t.localWarning}</p>
          </section>
        )}

        </main>

        <footer className="footer">
          <a className="brand footer-brand" href="#"><span className="brand-mark"><Layers3 size={17} /></span><span>gamevault<span className="brand-dot">.</span></span></a>
          <span>{t.footerLine}</span>
          <div><a href="#safety" onClick={(event) => { event.preventDefault(); setActivePageTab("info"); }}>{t.footerPolicy}</a><a href="#how-it-works" onClick={(event) => { event.preventDefault(); setActivePageTab("info"); }}>{t.footerProcess}</a><a href="https://github.com/slgamervn/aaa" target="_blank" rel="noreferrer"><Github size={15} />{t.source}</a></div>
          <small>© 2026 GameVault · {t.footerStatus}</small>
        </footer>

      {showSubmit && (
        <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowSubmit(false); }}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title">
            <button className="modal-close" aria-label={language === "vi" ? "Đóng" : "Close"} onClick={() => setShowSubmit(false)}><X size={19} /></button>
            <div className="modal-mark"><UploadCloud size={22} /></div>
            <div className="section-kicker">{t.modalKicker}</div><h2 id="submit-modal-title">{t.modalTitle}</h2><p>{t.modalText}</p>
            <div className="modal-choice">
              <button onClick={() => { setActiveTab("html"); setActivePageTab("submit"); setShowSubmit(false); }}><FileCode2 size={20} /><span><b>{t.modalHtml}</b><small>{t.modalHtmlDesc}</small></span><ArrowRight size={16} /></button>
              <button onClick={() => { setActiveTab("url"); setActivePageTab("submit"); setShowSubmit(false); }}><Globe2 size={20} /><span><b>{t.modalUrl}</b><small>{t.modalUrlDesc}</small></span><ArrowRight size={16} /></button>
            </div>
            <div className="modal-note"><ShieldCheck size={15} />{t.modalFoot}</div>
          </div>
        </div>
      )}
    </div>
  );
}
