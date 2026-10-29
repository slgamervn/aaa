import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export const MAX_HTML_BYTES = 1_000_000;
export const SCAN_VERSION = "gv-static-3-url-content";

export type ScanSeverity = "high" | "medium" | "low";
export type ScanFinding = { label: string; severity: ScanSeverity; detail: string };
export type ScanResult = {
  mode: "html" | "url";
  verdict: "NEEDS_REVIEW" | "WARNING";
  score: number;
  findings: ScanFinding[];
  message: string;
  bytes?: number;
  contentScanned?: boolean;
  scannedResources?: number;
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

function isPublicIPv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;

  // Reject non-routable, private, loopback, link-local, shared, documentation,
  // benchmark, multicast and reserved IPv4 ranges.
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function ipv6ToBytes(host: string): number[] | null {
  let value = host.toLowerCase();
  if (value.includes(".")) {
    const splitAt = value.lastIndexOf(":");
    if (splitAt < 0) return null;
    const ipv4 = value.slice(splitAt + 1);
    if (isIP(ipv4) !== 4) return null;
    const [a, b, c, d] = ipv4.split(".").map(Number);
    value = value.slice(0, splitAt + 1) +
      (((a << 8) | b).toString(16)) + ":" + (((c << 8) | d).toString(16));
  }

  const doubleColon = value.indexOf("::");
  if (doubleColon !== value.lastIndexOf("::")) return null;
  let groups: string[];
  if (doubleColon >= 0) {
    const left = value.slice(0, doubleColon) ? value.slice(0, doubleColon).split(":") : [];
    const right = value.slice(doubleColon + 2) ? value.slice(doubleColon + 2).split(":") : [];
    const missing = 8 - left.length - right.length;
    if (missing < 1) return null;
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = value.split(":");
    if (groups.length !== 8) return null;
  }

  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.flatMap((group) => {
    const number = Number.parseInt(group, 16);
    return [(number >> 8) & 0xff, number & 0xff];
  });
}

function isPublicIPv6(host: string): boolean {
  const bytes = ipv6ToBytes(host);
  if (!bytes) return false;

  // IPv4-mapped IPv6 must follow the IPv4 policy too.
  if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    const mapped = bytes.slice(12).join(".");
    return isPublicIPv4(mapped);
  }

  // Accept only global-unicast 2000::/3; block documentation, 6to4 and Teredo.
  if ((bytes[0] & 0xe0) !== 0x20) return false;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return false;
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return false;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) return false;
  return true;
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".lan") || host.endsWith(".internal") ||
      host.endsWith(".test") || host.endsWith(".invalid") || host.endsWith(".example")) {
    return true;
  }

  const version = isIP(host);
  if (version === 4) return !isPublicIPv4(host);
  if (version === 6) return !isPublicIPv6(host);
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


type ResolvedAddress = { address: string; family: 4 | 6 };
type RemoteResponse = {
  status: number;
  headers: import("node:http").IncomingHttpHeaders;
  body: Buffer;
  finalUrl: string;
};

const MAX_REMOTE_HTML_BYTES = 1_000_000;
const MAX_REMOTE_SCRIPT_BYTES = 250_000;
const MAX_EXTERNAL_SCRIPTS = 4;
const MAX_REDIRECTS = 3;
const REMOTE_TIMEOUT_MS = 6_000;

function validatePublicFetchUrl(value: string): URL {
  const checked = scanUrl(value);
  const parsed = new URL(checked.url);
  if (parsed.port && !((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443"))) {
    throw new Error("Only standard HTTP and HTTPS ports are accepted.");
  }
  return parsed;
}

async function resolvePublicAddress(hostnameInput: string): Promise<ResolvedAddress> {
  const hostname = hostnameInput.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const literalFamily = isIP(hostname);
  if (literalFamily === 4 || literalFamily === 6) {
    if (isPrivateOrLocalHost(hostname)) throw new Error("The destination is not a public IP address.");
    return { address: hostname, family: literalFamily };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The destination hostname could not be resolved.");
  }
  if (!addresses.length) throw new Error("The destination hostname has no IP addresses.");
  // Fail closed on mixed public/private answers to prevent DNS rebinding and
  // public-to-private fallback tricks. Connect to the exact address checked.
  if (addresses.some((item) => (item.family !== 4 && item.family !== 6) || isPrivateOrLocalHost(item.address))) {
    throw new Error("The destination resolves to a private or non-public address.");
  }
  const preferred = addresses.find((item) => item.family === 4) ?? addresses[0];
  return { address: preferred.address, family: preferred.family as 4 | 6 };
}

async function resolvePublicAddressWithin(hostname: string, timeoutMs: number): Promise<ResolvedAddress> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolvePublicAddress(hostname),
      new Promise<ResolvedAddress>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("The destination hostname lookup timed out.")), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function requestPinnedAddress(url: URL, address: ResolvedAddress, maxBytes: number, timeoutMs: number): Promise<RemoteResponse> {
  return new Promise((resolve, reject) => {
    const useHttps = url.protocol === "https:";
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    let settled = false;
    const finish = (error?: Error, value?: RemoteResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else if (value) resolve(value);
      else reject(new Error("The remote response could not be read."));
    };

    const pinnedLookup = ((
      _requestedHost: string,
      _options: unknown,
      callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void
    ) => callback(null, address.address, address.family)) as never;

    const requester = useHttps ? httpsRequest : httpRequest;
    const request = requester({
      protocol: url.protocol,
      hostname,
      port: url.port ? Number(url.port) : (useHttps ? 443 : 80),
      method: "GET",
      path: url.pathname + url.search,
      agent: false,
      lookup: pinnedLookup,
      ...(useHttps && isIP(hostname) === 0 ? { servername: hostname } : {}),
      headers: {
        "Host": url.host,
        "User-Agent": "GameVault-Static-Scanner/1.0 (+https://github.com/slgamervn/aaa)",
        "Accept": "text/html,application/xhtml+xml,application/javascript,text/javascript,*/*;q=0.1",
        "Accept-Encoding": "identity",
        "Connection": "close"
      }
    });

    const timer = setTimeout(() => request.destroy(new Error("The remote server timed out.")), timeoutMs);
    request.on("error", (error) => finish(error instanceof Error ? error : new Error("The remote request failed.")));
    request.on("response", (response) => {
      const status = response.statusCode ?? 0;
      const headers = response.headers;
      const location = headers.location;
      if (status >= 300 && status < 400 && location) {
        response.destroy();
        finish(undefined, { status, headers, body: Buffer.alloc(0), finalUrl: url.toString() });
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;
      const declaredLength = Number(headers["content-length"] ?? 0);
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        response.destroy(new Error("The remote response exceeds the scan-size limit."));
        finish(new Error("The remote response exceeds the scan-size limit."));
        return;
      }
      response.on("data", (chunk: Buffer | string) => {
        if (settled) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.byteLength;
        if (size > maxBytes) {
          finish(new Error("The remote response exceeds the scan-size limit."));
          response.destroy();
          request.destroy();
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => finish(undefined, {
        status,
        headers,
        body: Buffer.concat(chunks, size),
        finalUrl: url.toString()
      }));
      response.on("aborted", () => finish(new Error("The remote response was interrupted.")));
      response.on("error", (error) => finish(error instanceof Error ? error : new Error("The remote response failed.")));
    });
    request.end();
  });
}

async function fetchPublicResource(startUrl: string, maxBytes: number, totalTimeoutMs: number): Promise<RemoteResponse> {
  const deadline = Date.now() + totalTimeoutMs;
  let currentUrl = startUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (Date.now() >= deadline) throw new Error("The remote scan timed out.");
    const parsed = validatePublicFetchUrl(currentUrl);
    const beforeLookup = deadline - Date.now();
    if (beforeLookup <= 0) throw new Error("The remote scan timed out.");
    const pinnedAddress = await resolvePublicAddressWithin(parsed.hostname, Math.min(1_500, beforeLookup));
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("The remote scan timed out.");
    const response = await requestPinnedAddress(parsed, pinnedAddress, maxBytes, Math.min(2_500, remaining));

    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      if (redirects === MAX_REDIRECTS) throw new Error("The destination redirected too many times.");
      let next: URL;
      try {
        next = new URL(response.headers.location, parsed);
      } catch {
        throw new Error("The destination returned an invalid redirect.");
      }
      // The next loop re-validates the URL, resolves DNS again and pins the
      // validated address; redirects are never followed automatically.
      currentUrl = next.toString();
      continue;
    }
    return response;
  }

  throw new Error("The destination redirected too many times.");
}

function failedRemoteScan(message: string): ScanResult {
  return {
    mode: "url",
    verdict: "WARNING",
    score: 24,
    contentScanned: false,
    scannedResources: 0,
    findings: [{
      label: "Không thể tải nội dung để quét",
      severity: "medium",
      detail: "Máy quét không lấy được trang HTML công khai trong giới hạn an toàn. Không có kết luận nào về độ an toàn của game."
    }],
    message,
    bytes: 0
  };
}

export async function scanRemoteUrl(value: string): Promise<ScanResult> {
  // Validate before any outbound network connection; invalid, local and private
  // user-supplied destinations are rejected by scanUrl().
  const validated = scanUrl(value);

  try {
    const page = await fetchPublicResource(validated.url, MAX_REMOTE_HTML_BYTES, REMOTE_TIMEOUT_MS);
    if (page.status < 200 || page.status >= 300) {
      return failedRemoteScan("Trang đích trả về HTTP " + page.status + ". Nội dung chưa được quét.");
    }

    const contentType = String(page.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    const contentEncoding = String(page.headers["content-encoding"] ?? "").trim().toLowerCase();
    if (contentEncoding && contentEncoding !== "identity") {
      return failedRemoteScan("Trang đích dùng kiểu nén không được hỗ trợ; nội dung chưa được quét.");
    }
    if (contentType && contentType !== "text/html" && contentType !== "application/xhtml+xml") {
      return failedRemoteScan("URL không trả về tài liệu HTML; nội dung chưa được quét.");
    }

    const html = page.body.toString("utf8");
    if (!contentType && !/<(?:!doctype\s+html|html\b|head\b|body\b|script\b|meta\b|title\b)/i.test(html.slice(0, 4096))) {
      return failedRemoteScan("Không xác định được nội dung HTML từ phản hồi URL; nội dung chưa được quét.");
    }
    const scriptPattern = /<script\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1[^>]*>/gi;
    const scriptUrls = new Set<string>();
    let match: RegExpExecArray | null;
    let partial = false;
    while ((match = scriptPattern.exec(html)) !== null) {
      const source = (match[2] ?? "").trim().replace(/&amp;/gi, "&");
      if (!source) continue;
      try {
        const target = new URL(source, page.finalUrl);
        if (target.protocol !== "http:" && target.protocol !== "https:") {
          partial = true;
          continue;
        }
        scriptUrls.add(target.toString());
      } catch {
        partial = true;
      }
    }

    const allScriptUrls = [...scriptUrls];
    if (allScriptUrls.length > MAX_EXTERNAL_SCRIPTS) partial = true;
    const selectedScripts = allScriptUrls.slice(0, MAX_EXTERNAL_SCRIPTS);
    const scriptResults = await Promise.all(selectedScripts.map(async (scriptUrl) => {
      try {
        const response = await fetchPublicResource(scriptUrl, MAX_REMOTE_SCRIPT_BYTES, 2_500);
        if (response.status < 200 || response.status >= 300) throw new Error("Script request failed.");
        const type = String(response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        const encoding = String(response.headers["content-encoding"] ?? "").trim().toLowerCase();
        const isScript = !type || /(?:javascript|ecmascript|text\/plain|application\/octet-stream)/i.test(type);
        if ((encoding && encoding !== "identity") || !isScript) throw new Error("Unsupported external script response.");
        return response.body.toString("utf8");
      } catch {
        partial = true;
        return "";
      }
    }));

    const fetchedScripts = scriptResults.filter((source) => source.length > 0);
    const combined = html + "\n" + fetchedScripts.join("\n");
    const scanned = scanHtml(combined);
    const findings = [...scanned.findings];
    if (partial) {
      findings.push({
        label: "Không thể quét đầy đủ tài nguyên ngoài",
        severity: "medium",
        detail: "Một số script ngoài bị bỏ qua, vượt giới hạn hoặc không thể tải. Cần xem xét thủ công; không tải hay thực thi game."
      });
    }

    const high = findings.filter((finding) => finding.severity === "high").length;
    const medium = findings.filter((finding) => finding.severity === "medium").length;
    const low = findings.filter((finding) => finding.severity === "low").length;
    const result: ScanResult = {
      mode: "url",
      verdict: high > 0 || medium > 1 ? "WARNING" : "NEEDS_REVIEW",
      score: Math.min(100, high * 55 + medium * 24 + low * 8),
      findings,
      contentScanned: true,
      scannedResources: 1 + fetchedScripts.length,
      bytes: Buffer.byteLength(combined, "utf8"),
      message: "Đã tải và quét tĩnh HTML" + (fetchedScripts.length ? " cùng " + fetchedScripts.length + " script ngoài" : "") +
        ". Game không được thực thi. Kết quả có thể bỏ sót hành vi động, tài nguyên chưa tải hoặc mã được tạo lúc chạy; cần duyệt thủ công."
    };
    return result;
  } catch {
    return failedRemoteScan("Không thể tải nội dung từ URL trong giới hạn an toàn. Trang có thể chặn máy quét, không phản hồi, vượt giới hạn hoặc dùng đích chuyển hướng không được phép. Nội dung chưa được quét.");
  }
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
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    throw new Error("Only standard HTTP and HTTPS ports are accepted.");
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
