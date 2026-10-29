import { isIP } from "node:net";

export const MAX_HTML_BYTES = 1_000_000;
export const SCAN_VERSION = "gv-static-2";

export type ScanSeverity = "high" | "medium" | "low";
export type ScanFinding = { label: string; severity: ScanSeverity; detail: string };
export type ScanResult = {
  mode: "html" | "url";
  verdict: "NEEDS_REVIEW" | "WARNING";
  score: number;
  findings: ScanFinding[];
  message: string;
  bytes?: number;
};

const patterns: Array<{ label: string; severity: ScanSeverity; regex: RegExp; detail: string }> = [
  {
    label: "Mã JavaScript bị làm rối",
    severity: "medium",
    regex: /(?:eval\s*\(|new\s+Function\s*\(|atob\s*\(|String\.fromCharCode\s*\()/i,
    detail: "Có cấu trúc thường xuất hiện trong mã động hoặc bị làm rối. Cần xem xét thủ công; chưa thể kết luận mã độc."
  },
  {
    label: "Có thể thu thập thông tin nhập",
    severity: "high",
    regex: /(?:password|passwd|credit.?card|token|seed.?phrase)[\s\S]{0,180}(?:fetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\/)/i,
    detail: "Có tổ hợp từ khoá nhạy cảm và thao tác gửi dữ liệu cần được kiểm tra."
  },
  {
    label: "Có dấu hiệu khai thác tài nguyên bất thường",
    severity: "high",
    regex: /(?:coinhive|cryptonight|stratum:\/\/|navigator\.hardwareConcurrency[\s\S]{0,180}WebAssembly\.instantiate)/i,
    detail: "Phát hiện mẫu thường gắn với hoạt động sử dụng tài nguyên nền bất thường; cần kiểm tra ngữ cảnh."
  },
  {
    label: "Có thao tác chuyển hướng",
    severity: "medium",
    regex: /(?:location\.(?:href|replace|assign)\s*=|window\.open\s*\()/i,
    detail: "Kiểm tra đích đến và ngữ cảnh của thao tác chuyển hướng hoặc mở cửa sổ."
  },
  {
    label: "Có tải tài nguyên từ bên ngoài",
    severity: "low",
    regex: /(?:src|href)\s*=\s*["']https?:\/\//i,
    detail: "Game tham chiếu tài nguyên ngoài; xác minh nguồn, giấy phép và quyền riêng tư."
  },
  {
    label: "Có hành vi clipboard",
    severity: "medium",
    regex: /navigator\.clipboard|document\.execCommand\s*\(\s*["']copy/i,
    detail: "Kiểm tra lý do truy cập clipboard và cách giải thích với người chơi."
  },
  {
    label: "Có nhúng iframe",
    severity: "low",
    regex: /<iframe\b/i,
    detail: "Kiểm tra nguồn iframe, thuộc tính sandbox và chính sách nhúng."
  },
  {
    label: "Có đăng ký Service Worker",
    severity: "medium",
    regex: /navigator\.serviceWorker\.register\s*\(/i,
    detail: "Service Worker có thể kiểm soát yêu cầu mạng; xác minh mã và lý do đăng ký."
  },
  {
    label: "Có biểu mẫu gửi dữ liệu",
    severity: "low",
    regex: /<form\b[\s\S]{0,500}(?:action\s*=\s*["']https?:|method\s*=\s*["']post)/i,
    detail: "Kiểm tra dữ liệu gửi đi và đích nhận của biểu mẫu."
  }
];

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  const version = isIP(host);
  if (version === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
  }

  if (version === 6) {
    if (host === "::" || host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
    if (host.startsWith("::ffff:")) {
      const mapped = host.slice(7);
      if (isIP(mapped) === 4) return isPrivateOrLocalHost(mapped);
    }
  }
  return false;
}

export function scanHtml(html: string): ScanResult {
  const findings = patterns
    .filter((pattern) => pattern.regex.test(html))
    .map(({ label, severity, detail }) => ({ label, severity, detail }));

  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  const low = findings.filter((finding) => finding.severity === "low").length;

  return {
    mode: "html",
    bytes: Buffer.byteLength(html, "utf8"),
    verdict: high > 0 || medium > 1 ? "WARNING" : "NEEDS_REVIEW",
    score: Math.min(100, high * 55 + medium * 24 + low * 8),
    findings,
    message: "Điểm chỉ biểu thị mức ưu tiên xem xét theo mẫu tĩnh. Đây không phải chứng nhận không có mã độc hoặc xác nhận tuân thủ chính sách GitHub."
  };
}

export function scanUrl(value: string): { url: string; host: string; result: ScanResult } {
  if (value.length > 2048) throw new Error("URL is too long.");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("URL is invalid.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are accepted.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs must not contain embedded credentials.");
  }
  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error("Local or private network URLs are not accepted.");
  }

  return {
    url: parsed.toString(),
    host: parsed.hostname,
    result: {
      mode: "url",
      verdict: "NEEDS_REVIEW",
      score: 0,
      findings: [{
        label: "Chưa phân tích nội dung URL",
        severity: "medium",
        detail: "Đã kiểm tra cú pháp URL. Game bên ngoài không được tải hay thực thi; cần xem xét nguồn, giấy phép và nội dung thủ công."
      }],
      message: "Không thể xác nhận an toàn chỉ từ đường dẫn. URL chỉ được lưu làm tham chiếu."
    }
  };
}
