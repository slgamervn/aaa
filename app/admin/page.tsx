"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, BadgeCheck, Clock3, ExternalLink, FileCode2, Globe2, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AdminFinding = { label: string; severity: "high" | "medium" | "low"; detail: string };
type AdminSubmission = {
  id: string;
  title: string;
  description: string;
  genre: string;
  kind: "html" | "url";
  source_url: string | null;
  original_filename: string | null;
  file_size: number;
  content_sha256: string | null;
  scan_verdict: string;
  scan_score: number;
  scan_findings: AdminFinding[];
  scan_version: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  published_at: string | null;
  published_path: string | null;
  published_commit_sha: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt — chờ xuất bản",
  rejected: "Đã từ chối",
  publishing: "Đang xuất bản",
  publish_failed: "Xuất bản lỗi — có thể thử lại",
  published: "Đã xuất bản",
  scan_failed: "Lỗi lưu/quét"
};

export default function AdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminSubmission[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/submissions", { cache: "no-store" });
      const body = await response.json();
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(body.error || "Không thể tải hàng đợi duyệt.");
        return;
      }
      setItems(body.submissions ?? []);
      setAdminEmail(body.adminEmail ?? "");
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function logout() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  async function act(item: AdminSubmission, action: "approve" | "reject" | "publish") {
    const note = (notes[item.id] ?? "").trim();
    if (action === "reject" && !note) {
      setError("Hãy ghi lý do từ chối để lưu lại lịch sử kiểm duyệt.");
      return;
    }
    if (action === "publish" && !window.confirm("Xác nhận xuất bản nội dung này lên GitHub? Hành động này tạo commit công khai trong repository đã cấu hình.")) return;

    setBusy(item.id + ":" + action);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/submissions/" + item.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Thao tác không thành công.");
        return;
      }
      setNotice(action === "approve" ? "Đã duyệt. Nội dung vẫn chưa công khai." : action === "reject" ? "Đã từ chối và lưu lý do." : "Đã xuất bản lên GitHub sau khi bạn xác nhận.");
      await load();
    } catch {
      setError("Máy chủ không phản hồi. Hãy tải lại hàng đợi trước khi thử lần nữa.");
    } finally {
      setBusy("");
    }
  }

  async function toggleSource(item: AdminSubmission) {
    const next = !expanded[item.id];
    setExpanded((previous) => ({ ...previous, [item.id]: next }));
    if (!next || sources[item.id] !== undefined || item.kind !== "html") return;
    setBusy(item.id + ":source");
    try {
      const response = await fetch("/api/admin/submissions/" + item.id + "/source", { cache: "no-store" });
      if (!response.ok) throw new Error("Source unavailable");
      const sourceText = await response.text();
      setSources((previous) => ({ ...previous, [item.id]: sourceText }));
    } catch {
      setSources((previous) => ({ ...previous, [item.id]: "Không thể đọc tệp nguồn. Kiểm tra bucket lưu trữ riêng tư." }));
    } finally {
      setBusy("");
    }
  }

  const pendingCount = items.filter((item) => item.status === "pending_review").length;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a href="/" className="brand"><span className="brand-mark"><ShieldCheck size={18} /></span><span>gamevault<span className="brand-dot">.</span></span></a>
        <div className="admin-user"><span>{adminEmail}</span><button onClick={logout}><LogOut size={15} /> Đăng xuất</button></div>
      </header>

      <section className="admin-content">
        <div className="admin-heading">
          <div><div className="section-kicker">OWNER CONSOLE / REVIEW QUEUE</div><h1>Kiểm duyệt nội dung</h1><p>Đọc nguồn, kiểm tra giấy phép, rồi quyết định. Quét tĩnh chỉ hỗ trợ việc xem xét.</p></div>
          <button className="admin-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Làm mới</button>
        </div>

        <div className="admin-stats">
          <div><strong>{items.length}</strong><span>Tổng lượt gửi</span></div>
          <div><strong>{pendingCount}</strong><span>Chờ bạn xem xét</span></div>
          <div><strong>{items.filter((item) => item.status === "approved").length}</strong><span>Đã duyệt, chưa xuất bản</span></div>
          <div><strong>{items.filter((item) => item.status === "published").length}</strong><span>Đã công khai</span></div>
        </div>

        {error && <div className="admin-banner admin-banner-error" role="alert"><AlertCircle size={17} />{error}</div>}
        {notice && <div className="admin-banner admin-banner-success" role="status"><BadgeCheck size={17} />{notice}</div>}
        {loading ? <div className="admin-empty">Đang tải hàng đợi…</div> : items.length === 0 ? (
          <div className="admin-empty"><FileCode2 size={28} /><h2>Chưa có nội dung nào được gửi</h2><p>Khi có người gửi game, nội dung sẽ xuất hiện ở đây để bạn xem xét.</p></div>
        ) : (
          <div className="admin-queue">
            {items.map((item) => (
              <article className="admin-submission" key={item.id}>
                <div className="admin-submission-header">
                  <span className="queue-file">{item.kind === "html" ? <FileCode2 size={18} /> : <Globe2 size={18} />}</span>
                  <div className="admin-submission-title"><h2>{item.title}</h2><p>{item.kind === "html" ? item.original_filename : item.source_url}</p>{item.kind === "url" && item.source_url && <a className="admin-original-link" href={item.source_url} target="_blank" rel="noopener noreferrer nofollow">Mở trang gốc để xem xét <ExternalLink size={13} /></a>}</div>
                  <span className={"admin-status admin-status-" + item.status}><Clock3 size={13} />{STATUS_LABEL[item.status] ?? item.status}</span>
                </div>
                {item.description && <p className="admin-description">{item.description}</p>}
                <div className="admin-metadata">
                  <span>Loại: {item.genre}</span>
                  <span>Ngày gửi: {new Date(item.submitted_at).toLocaleString("vi-VN")}</span>
                  <span>Quét: {item.scan_version}</span>
                  {item.kind === "html" && <span>Kích thước: {(item.file_size / 1024).toFixed(1)} KB</span>}
                  {item.content_sha256 && <span>SHA-256: <code>{item.content_sha256.slice(0, 16)}…</code></span>}
                </div>
                <div className="admin-scan-summary">
                  <div><strong>{item.scan_score}/100</strong><span>Điểm ưu tiên xem xét (cao hơn = đáng chú ý hơn)</span></div>
                  <div><strong>{item.scan_findings.length}</strong><span>Dấu hiệu được phát hiện</span></div>
                </div>
                {item.scan_findings.length > 0 ? (
                  <div className="admin-findings">{item.scan_findings.map((finding, index) => (
                    <div className={"admin-finding admin-finding-" + finding.severity} key={finding.label + index}>
                      <b>{finding.severity === "high" ? "Cao" : finding.severity === "medium" ? "Trung bình" : "Thấp"} · {finding.label}</b><p>{finding.detail}</p>
                    </div>
                  ))}</div>
                ) : <p className="admin-no-findings">Không khớp mẫu quét đã định nghĩa. Không có nghĩa là file an toàn.</p>}

                {item.kind === "html" && <button className="admin-source-toggle" onClick={() => void toggleSource(item)}>{expanded[item.id] ? "Ẩn nội dung nguồn" : "Đọc nguồn dạng văn bản"} <FileCode2 size={15} /></button>}
                {expanded[item.id] && item.kind === "html" && <pre className="admin-source-preview">{sources[item.id] ?? "Đang tải nguồn văn bản…"}</pre>}

                {(item.status === "pending_review" || item.status === "scan_failed") && (
                  <div className="admin-actions">
                    <label className="admin-note-field">Ghi chú kiểm duyệt (bắt buộc nếu từ chối)<textarea rows={2} maxLength={1000} value={notes[item.id] ?? ""} onChange={(event) => setNotes((previous) => ({ ...previous, [item.id]: event.target.value }))} placeholder="Ví dụ: chưa xác minh giấy phép hoặc nguồn tài nguyên…" /></label>
                    <div className="admin-action-buttons">
                      <button className="admin-button admin-button-danger" disabled={busy === item.id + ":reject"} onClick={() => void act(item, "reject")}><XCircle size={15} /> Từ chối</button>
                      {item.status === "pending_review" && <button className="admin-button admin-button-primary" disabled={busy === item.id + ":approve"} onClick={() => void act(item, "approve")}><BadgeCheck size={15} /> Duyệt (chưa xuất bản)</button>}
                    </div>
                  </div>
                )}
                {(item.status === "approved" || item.status === "publish_failed") && (
                  <div className="admin-actions">
                    <p className="admin-publish-warning">Nội dung đã qua bước duyệt của bạn nhưng vẫn chưa công khai. Nút xuất bản bên dưới sẽ tạo commit trên GitHub.</p>
                    <label className="admin-note-field">Ghi chú xuất bản (không bắt buộc)<textarea rows={2} maxLength={1000} value={notes[item.id] ?? ""} onChange={(event) => setNotes((previous) => ({ ...previous, [item.id]: event.target.value }))} placeholder="Ghi chú để lưu trong lịch sử…" /></label>
                    <div className="admin-action-buttons"><button className="admin-button admin-button-primary" disabled={busy === item.id + ":publish"} onClick={() => void act(item, "publish")}><ExternalLink size={15} /> {busy === item.id + ":publish" ? "Đang xuất bản…" : "Xuất bản lên GitHub"}</button></div>
                  </div>
                )}
                {item.status === "publishing" && <p className="admin-publish-warning">Đang xử lý commit GitHub. Nếu trạng thái này kéo dài hơn 10 phút, tải lại rồi thử xuất bản lại.</p>}
                {item.status === "published" && item.published_path && (
                  <div className="admin-published"><BadgeCheck size={16} /><span>Đã xuất bản · <code>{item.published_path}</code></span>{item.published_commit_sha && <a href={"https://github.com/slgamervn/aaa/commit/" + item.published_commit_sha} target="_blank" rel="noopener noreferrer">Xem commit <ExternalLink size={13} /></a>}</div>
                )}
                {item.status === "rejected" && item.review_note && <p className="admin-review-note">Lý do từ chối: {item.review_note}</p>}
              </article>
            ))}
          </div>
        )}
        <p className="admin-footer-note"><ShieldCheck size={14} /> Không chạy HTML trong trang quản trị. Nội dung nguồn chỉ được hiển thị dưới dạng văn bản, không thực thi.</p>
      </section>
    </main>
  );
}
