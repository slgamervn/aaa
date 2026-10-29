import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 1_000_000;
const patterns: Array<{ label: string; severity: "high" | "medium" | "low"; regex: RegExp; detail: string }> = [
  { label: "Mã JavaScript bị làm rối", severity: "medium", regex: /(?:eval\s*\(|new\s+Function\s*\(|atob\s*\(|String\.fromCharCode\s*\()/i, detail: "Có cấu trúc thường xuất hiện trong mã động hoặc bị làm rối. Cần xem xét thủ công; không tự động kết luận mã độc." },
  { label: "Có thể thu thập thông tin nhập", severity: "high", regex: /(?:password|passwd|credit.?card|token|seed.?phrase)[\s\S]{0,180}(?:fetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\/)/i, detail: "Có tổ hợp từ khóa nhạy cảm và thao tác gửi dữ liệu cần được kiểm tra." },
  { label: "Có thao tác chuyển hướng", severity: "medium", regex: /(?:location\.(?:href|replace|assign)\s*=|window\.open\s*\()/i, detail: "Phát hiện mẫu chuyển hướng hoặc mở cửa sổ. Kiểm tra đích đến và ngữ cảnh." },
  { label: "Có tải tài nguyên từ bên ngoài", severity: "low", regex: /(?:src|href)\s*=\s*["']https?:\/\//i, detail: "Game tham chiếu tài nguyên ngoài; xác minh nguồn, giấy phép và quyền riêng tư." },
  { label: "Có hành vi clipboard", severity: "medium", regex: /navigator\.clipboard|document\.execCommand\s*\(\s*["']copy/i, detail: "Kiểm tra lý do truy cập clipboard và cách giải thích với người chơi." },
  { label: "Có nhúng iframe", severity: "low", regex: /<iframe\b/i, detail: "Kiểm tra nguồn iframe, sandbox và chính sách nhúng." }
];

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_HTML_BYTES + 20_000) {
    return NextResponse.json({ error: "Nội dung vượt giới hạn 1 MB." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Thiếu nội dung cần quét." }, { status: 400 });
  }

  const html = "html" in body && typeof body.html === "string" ? body.html : "";
  const url = "url" in body && typeof body.url === "string" ? body.url.trim() : "";

  if (html) {
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return NextResponse.json({ error: "File HTML vượt giới hạn 1 MB." }, { status: 413 });
    }
  } else if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "Chỉ chấp nhận URL HTTP/HTTPS." }, { status: 400 });
    }
    if (parsed.username || parsed.password) {
      return NextResponse.json({ error: "URL không được chứa thông tin đăng nhập." }, { status: 400 });
    }
    // Intentionally do not fetch user-supplied URLs: avoids SSRF, redirect and DNS-rebinding risks.
    return NextResponse.json({
      mode: "url",
      verdict: "NEEDS_REVIEW",
      score: 0,
      findings: [{ label: "Chưa phân tích nội dung URL", severity: "medium", detail: "Đã kiểm tra cú pháp URL. Game bên ngoài chưa được tải hoặc thực thi; cần kiểm tra nguồn, giấy phép và nội dung thủ công." }],
      message: "Không thể xác nhận an toàn chỉ từ đường dẫn."
    });
  } else {
    return NextResponse.json({ error: "Hãy chọn file HTML hoặc nhập URL." }, { status: 400 });
  }

  const findings = patterns
    .filter((item) => item.regex.test(html))
    .map(({ label, severity, detail }) => ({ label, severity, detail }));

  const severeCount = findings.filter((item) => item.severity === "high").length;
  const mediumCount = findings.filter((item) => item.severity === "medium").length;
  const verdict = severeCount > 0 ? "NEEDS_REVIEW" : mediumCount > 1 ? "WARNING" : "NEEDS_REVIEW";

  return NextResponse.json({
    mode: "html",
    bytes: Buffer.byteLength(html, "utf8"),
    verdict,
    score: Math.max(0, 100 - severeCount * 35 - mediumCount * 12 - findings.filter((x) => x.severity === "low").length * 4),
    findings,
    message: "Đây là quét tĩnh theo mẫu, không phải chứng nhận không có mã độc hoặc xác nhận tuân thủ điều khoản GitHub."
  });
}