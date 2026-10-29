"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BadgeCheck, BookOpen, Check, ChevronDown, CircleHelp,
  Clock3, FileCode2, FileUp, Fingerprint, Gamepad2, Globe2, Github, Layers3, LockKeyhole,
  Menu, Search, ShieldAlert, ShieldCheck, Sparkles, UploadCloud, X
} from "lucide-react";

type Finding = { label: string; severity: "high" | "medium" | "low"; detail: string };
type ScanResult = { mode: string; verdict: string; score: number; findings: Finding[]; message: string; bytes?: number };
type Submission = { id: string; title: string; source: string; kind: "HTML" | "URL"; status: string; createdAt: string; result: ScanResult };

const examples = [
  { title: "Neon Drift", category: "Arcade · Demo", description: "Đua tốc độ trong một thế giới neon tối giản.", color: "mint", icon: "✦", status: "Demo" },
  { title: "Tiny Kingdom", category: "Strategy · Demo", description: "Xây dựng vương quốc nhỏ qua từng lượt chơi.", color: "violet", icon: "♜", status: "Demo" },
  { title: "Orbit Lab", category: "Puzzle · Demo", description: "Thử nghiệm quỹ đạo và giải câu đố vật lý.", color: "orange", icon: "◎", status: "Demo" }
];

const severityLabel = (severity: string) => severity === "high" ? "Cao" : severity === "medium" ? "Trung bình" : "Thấp";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"html" | "url">("html");
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gamevault-submissions-v1");
      if (saved) setSubmissions(JSON.parse(saved) as Submission[]);
    } catch { /* Ignore damaged local demo data. */ }
  }, []);

  const saveSubmissions = (items: Submission[]) => {
    setSubmissions(items);
    try { localStorage.setItem("gamevault-submissions-v1", JSON.stringify(items)); } catch { /* Browser storage may be unavailable. */ }
  };

  const filteredExamples = useMemo(() => examples.filter((game) =>
    (game.title + " " + game.category + " " + game.description).toLowerCase().includes(query.toLowerCase())
  ), [query]);

  async function runScan() {
    setError("");
    setResult(null);
    if (!consent) { setError("Vui lòng xác nhận quyền chia sẻ nội dung trước khi gửi."); return; }
    if (activeTab === "html" && !file) { setError("Chọn file .html trước khi quét."); return; }
    if (activeTab === "url" && !url.trim()) { setError("Nhập đường dẫn game cần kiểm tra."); return; }
    if (file && file.size > 1_000_000) { setError("File quá lớn. Bản thử nghiệm giới hạn 1 MB."); return; }

    setScanning(true);
    try {
      let payload: { html?: string; url?: string };
      if (activeTab === "html" && file) {
        if (!/\.html?$/i.test(file.name)) { setError("Chỉ nhận file .html hoặc .htm."); setScanning(false); return; }
        payload = { html: await file.text() };
      } else {
        payload = { url: url.trim() };
      }
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể quét nội dung.");
      const scan = data as ScanResult;
      setResult(scan);
      const newItem: Submission = {
        id: crypto.randomUUID(),
        title: title.trim() || (file?.name ?? new URL(url).hostname),
        source: activeTab === "html" ? file?.name ?? "HTML" : url.trim(),
        kind: activeTab === "html" ? "HTML" : "URL",
        status: "Chờ chủ dự án duyệt",
        createdAt: new Date().toISOString(),
        result: scan
      };
      saveSubmissions([newItem, ...submissions].slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.");
    } finally {
      setScanning(false);
    }
  }

  function resetForm() {
    setFile(null); setUrl(""); setTitle(""); setResult(null); setError(""); setConsent(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="GameVault trang chủ">
          <span className="brand-mark"><Layers3 size={20} strokeWidth={2.4} /></span>
          <span>gamevault<span className="brand-dot">.</span></span>
        </a>
        <nav className="nav-links" aria-label="Điều hướng">
          <a className="nav-active" href="#library">Thư viện</a>
          <a href="#how-it-works">Cách hoạt động</a>
          <a href="#safety">An toàn & chính sách</a>
        </nav>
        <button className="top-cta" onClick={() => setShowSubmit(true)}>Gửi game <ArrowUpRightIcon /></button>
        <button className="mobile-menu" aria-label="Mở menu"><Menu size={21} /></button>
      </header>

      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> GAME LIBRARY <span className="eyebrow-divider">/</span> CURATED WITH CARE</div>
          <h1>Game hay.<br /><span>Chơi an tâm.</span></h1>
          <p className="hero-lede">Một nơi lưu trữ và khám phá game HTML thú vị — mỗi nội dung gửi lên đều cần được kiểm tra và duyệt thủ công trước khi xuất bản.</p>
          <div className="hero-actions">
            <a className="button-primary" href="#library">Khám phá thư viện <ArrowRight size={17} /></a>
            <button className="button-quiet" onClick={() => setShowSubmit(true)}><UploadCloud size={17} /> Gửi game của bạn</button>
          </div>
          <div className="hero-proof">
            <span><ShieldCheck size={15} /> Có bước kiểm tra</span>
            <span><LockKeyhole size={15} /> Chờ duyệt thủ công</span>
            <span><Fingerprint size={15} /> Không chạy file khi quét</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Minh họa thư viện game">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-panel">
            <div className="art-panel-head"><span className="art-window-dots"><i /><i /><i /></span><span>GAME / 001</span><span className="art-live">READY</span></div>
            <div className="art-landscape"><div className="sun" /><div className="mountain mountain-back" /><div className="mountain mountain-front" /><div className="land-grid" /><div className="pixel-player">✦</div></div>
            <div className="art-panel-foot"><div><span className="mini-label">SCAN STATUS</span><strong><span className="check-circle"><Check size={11} /></span> Awaiting review</strong></div><div className="art-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
          </div>
          <div className="float-card float-top"><span className="float-icon"><ShieldCheck size={17} /></span><div><b>Static scan</b><small>Không thực thi HTML</small></div><span className="float-status" /></div>
          <div className="float-card float-bottom"><span className="float-icon violet-icon"><Clock3 size={17} /></span><div><b>Human review</b><small>Chủ dự án duyệt cuối</small></div></div>
          <div className="hero-caption">SUBMIT <span>→</span> SCAN <span>→</span> REVIEW <span>→</span> PUBLISH</div>
        </div>
        <div className="hero-bottomline"><span>INDEPENDENT GAME DISCOVERY</span><span>EST. 2026</span></div>
      </section>

      <section className="stats-row">
        <div><strong>01<span>—</span>04</strong><span>Quy trình rõ ràng</span></div>
        <div><strong>HTML<span> / </span>URL</strong><span>Hai cách gửi game</span></div>
        <div><strong>0<span>×</span></strong><span>Không tự chạy file tải lên</span></div>
        <div><strong>100<span>%</span></strong><span>Chờ duyệt trước khi xuất bản</span></div>
      </section>

      <section className="section library-section" id="library">
        <div className="section-heading">
          <div><div className="section-kicker">THE COLLECTION <span>01 / DISCOVER</span></div><h2>Khám phá thư viện<span className="heading-period">.</span></h2><p>Những góc nhỏ để bắt đầu cuộc phiêu lưu tiếp theo.</p></div>
          <div className="library-search"><Search size={17} /><input aria-label="Tìm game" placeholder="Tìm theo tên, thể loại..." value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌕</kbd></div>
        </div>
        <div className="filter-row"><span className="filter-active">Tất cả <b>03</b></span><span>Arcade</span><span>Puzzle</span><span>Strategy</span><span className="filter-note"><Sparkles size={14} /> Bản minh họa giao diện</span></div>
        <div className="game-grid">
          {filteredExamples.map((game, i) => <article className="game-card" key={game.title}>
            <div className={"game-cover cover-" + game.color}><div className="cover-grain" /><span className="cover-index">GV / 00{i + 1}</span><div className="cover-symbol">{game.icon}</div><div className="cover-rings" /><span className="demo-pill">SAMPLE</span></div>
            <div className="game-info"><div className="game-meta">{game.category}<span>·</span><span className="demo-dot" /> Chưa xuất bản</div><h3>{game.title}</h3><p>{game.description}</p><button className="card-link" onClick={() => { setShowSubmit(true); }} >Gửi game tương tự <ArrowDownRight size={15} /></button></div>
          </article>)}
          {filteredExamples.length === 0 && <div className="empty-search">Không tìm thấy game phù hợp. Thử từ khóa khác nhé.</div>}
        </div>
        <div className="demo-notice"><CircleHelp size={16} /><span>Thẻ game phía trên là nội dung minh họa giao diện, không phải game đã được lưu trữ hoặc xác minh.</span></div>
      </section>

      <section className="submission-section" id="submit">
        <div className="submission-intro"><div className="section-kicker">YOUR NEXT STEP <span>02 / SUBMIT</span></div><h2>Có game muốn<br /><span>chia sẻ?</span></h2><p>Gửi file HTML hoặc đường dẫn game. Nội dung sẽ được kiểm tra sơ bộ rồi đưa vào trạng thái chờ chủ dự án duyệt.</p><div className="steps-list"><div><span>01</span><div><b>Gửi nội dung</b><small>File .html hoặc URL HTTP/HTTPS</small></div></div><div><span>02</span><div><b>Quét tĩnh sơ bộ</b><small>Tìm dấu hiệu cần xem xét</small></div></div><div><span>03</span><div><b>Chờ duyệt</b><small>Không tự động xuất bản lên GitHub</small></div></div></div></div>
        <div className="submit-card">
          <div className="submit-card-header"><div><span className="card-kicker">SUBMISSION FORM</span><h3>Gửi game mới</h3></div><span className="secure-badge"><ShieldCheck size={15} /> SAFE FLOW</span></div>
          <div className="tab-switch"><button className={activeTab === "html" ? "tab-selected" : ""} onClick={() => { setActiveTab("html"); setResult(null); setError(""); }}><FileCode2 size={16} /> File HTML</button><button className={activeTab === "url" ? "tab-selected" : ""} onClick={() => { setActiveTab("url"); setResult(null); setError(""); }}><Globe2 size={16} /> Link game</button></div>
          <label className="field-label" htmlFor="game-title">Tên game <span>(không bắt buộc)</span></label><input id="game-title" className="text-field" placeholder="Ví dụ: Pixel Adventure" value={title} onChange={(e) => setTitle(e.target.value)} />
          {activeTab === "html" ? <><label className="field-label">Tệp game <span>.html / .htm · tối đa 1 MB</span></label><button className={"dropzone " + (file ? "dropzone-has-file" : "")} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const dropped = e.dataTransfer.files[0]; if (dropped) setFile(dropped); }}><input ref={fileRef} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{file ? <><span className="drop-icon"><FileCode2 size={21} /></span><b>{file.name}</b><small>{(file.size / 1024).toFixed(1)} KB · Nhấn để đổi tệp</small></> : <><span className="drop-icon"><FileUp size={21} /></span><b>Kéo thả file vào đây</b><small>hoặc nhấn để chọn từ thiết bị</small><span className="browse-button">Chọn file <ArrowRight size={13} /></span></>}</button></> : <><label className="field-label" htmlFor="game-url">Đường dẫn game</label><div className="url-field"><Globe2 size={17} /><input id="game-url" type="url" placeholder="https://example.com/game" value={url} onChange={(e) => setUrl(e.target.value)} /></div><p className="field-hint">Bản hiện tại chỉ kiểm tra định dạng URL, không tải hoặc chạy trang ngoài.</p></>}
          <label className="consent-row"><input type="checkbox" id="rights-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Tôi có quyền chia sẻ nội dung này hoặc đã kiểm tra giấy phép phù hợp.</span></label>
          {error && <div className="inline-error" role="alert"><ShieldAlert size={16} />{error}</div>}
          {result && <div className="scan-result" aria-live="polite"><div className="scan-result-head"><span className="result-icon"><ShieldAlert size={17} /></span><div><b>Kết quả quét sơ bộ</b><small>{result.verdict === "NEEDS_REVIEW" ? "Cần xem xét thủ công" : result.verdict}</small></div><strong>{result.score}/100</strong></div>{result.findings.length ? result.findings.map((f, i) => <div className="finding" key={f.label + i}><span className={"severity severity-" + f.severity}>{severityLabel(f.severity)}</span><div><b>{f.label}</b><small>{f.detail}</small></div></div>) : <p className="no-findings">Không khớp mẫu kiểm tra đã định nghĩa. Điều này không có nghĩa là file an toàn.</p>}<p className="scan-disclaimer">{result.message}</p><button className="reset-button" onClick={resetForm}>Quét nội dung khác</button></div>}
          <button className="scan-button" onClick={runScan} disabled={scanning}>{scanning ? <><span className="spinner" /> Đang quét...</> : <><ShieldCheck size={17} /> Quét & gửi chờ duyệt <ArrowRight size={16} /></>}</button>
          <p className="form-footnote"><LockKeyhole size={13} /> Chưa có nội dung nào được tự động đưa lên GitHub.</p>
        </div>
      </section>

      <section className="workflow-section" id="how-it-works"><div className="section-heading"><div><div className="section-kicker">BUILT AROUND TRUST <span>03 / PROCESS</span></div><h2>Kiểm tra trước.<br />Xuất bản sau<span className="heading-period">.</span></h2></div><p className="workflow-lede">Một bước quét không thể thay thế việc kiểm duyệt. Mỗi nội dung cần được xem xét trước khi có bất kỳ hành động xuất bản nào.</p></div><div className="workflow-grid"><div className="workflow-card"><span className="workflow-number">01</span><div className="workflow-icon"><FileCode2 size={21} /></div><h3>Tiếp nhận</h3><p>Nhận file HTML hoặc lưu URL làm nguồn tham khảo. File không được thực thi trong lúc quét.</p><span className="workflow-tag">INPUT</span></div><div className="workflow-card"><span className="workflow-number">02</span><div className="workflow-icon"><ShieldAlert size={21} /></div><h3>Quét sơ bộ</h3><p>Tìm mẫu code đáng ngờ và dấu hiệu cần xem xét. Kết quả có thể sai hoặc bỏ sót.</p><span className="workflow-tag">STATIC CHECK</span></div><div className="workflow-card"><span className="workflow-number">03</span><div className="workflow-icon"><BookOpen size={21} /></div><h3>Kiểm tra chính sách</h3><p>Đối chiếu giấy phép, bản quyền, quyền riêng tư và quy tắc sử dụng GitHub.</p><span className="workflow-tag">POLICY REVIEW</span></div><div className="workflow-card"><span className="workflow-number">04</span><div className="workflow-icon"><BadgeCheck size={21} /></div><h3>Duyệt thủ công</h3><p>Chỉ chủ dự án mới quyết định chấp thuận. Không có cơ chế tự xuất bản từ kết quả quét.</p><span className="workflow-tag">HUMAN APPROVAL</span></div></div></section>

      <section className="safety-section" id="safety"><div className="safety-icon"><ShieldCheck size={23} /></div><div><div className="section-kicker">SAFETY IS A PROCESS <span>04 / TRANSPARENCY</span></div><h2>Quét không đồng nghĩa với an toàn.</h2><p>GameVault hiện là bản khởi tạo giao diện. Hàng đợi được lưu trong trình duyệt hiện tại, chưa phải kho dữ liệu dùng chung; xác thực chủ dự án, lưu trữ server và luồng xuất bản GitHub cần được cấu hình trước khi dùng công khai.</p><a href="https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies" target="_blank" rel="noreferrer">Đọc chính sách sử dụng GitHub <ArrowRight size={15} /></a></div></section>

      {submissions.length > 0 && <section className="queue-section"><div className="section-heading"><div><div className="section-kicker">THIS BROWSER ONLY <span>LOCAL QUEUE</span></div><h2>Lần gửi gần đây<span className="heading-period">.</span></h2></div><button className="clear-queue" onClick={() => { saveSubmissions([]); }}>Xóa lịch sử cục bộ</button></div><div className="queue-list">{submissions.map((item) => <div className="queue-item" key={item.id}><span className="queue-file">{item.kind === "HTML" ? <FileCode2 size={18} /> : <Globe2 size={18} />}</span><div className="queue-details"><b>{item.title}</b><small>{item.source}</small></div><span className="queue-status"><Clock3 size={13} /> {item.status}</span><time>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</time></div>)}</div><p className="queue-warning">Lịch sử này chỉ nằm trên thiết bị/trình duyệt đang dùng. Không dùng hàng đợi này làm bằng chứng duyệt thật.</p></section>}

      <footer className="footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><Layers3 size={18} /></span><span>gamevault<span className="brand-dot">.</span></span></a><span>Curated with care. Built for discovery.</span><div><a href="#safety">Chính sách</a><a href="#how-it-works">Quy trình</a><a href="https://github.com/slgamervn/aaa" target="_blank" rel="noreferrer"><Github size={15} /> Source</a></div><small>© 2026 GameVault · Bản khởi tạo</small></footer>

      {showSubmit && <div className="modal-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setShowSubmit(false); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title"><button className="modal-close" aria-label="Đóng" onClick={() => setShowSubmit(false)}><X size={19} /></button><div className="modal-mark"><UploadCloud size={22} /></div><div className="section-kicker">START A SUBMISSION</div><h2 id="submit-modal-title">Gửi game để kiểm tra</h2><p>Chọn cách gửi phù hợp. Sau khi quét, kết quả sẽ ở trạng thái chờ xem xét; bản này chưa xuất bản file lên GitHub.</p><div className="modal-choice"><button onClick={() => { setActiveTab("html"); setShowSubmit(false); document.getElementById("submit")?.scrollIntoView({ behavior: "smooth" }); }}><FileCode2 size={20} /><span><b>Tải file HTML</b><small>Chọn file từ thiết bị của bạn</small></span><ArrowRight size={16} /></button><button onClick={() => { setActiveTab("url"); setShowSubmit(false); document.getElementById("submit")?.scrollIntoView({ behavior: "smooth" }); }}><Globe2 size={20} /><span><b>Gửi đường dẫn</b><small>Giữ nguyên nguồn game bên ngoài</small></span><ArrowRight size={16} /></button></div><div className="modal-note"><ShieldCheck size={15} /> Mọi nội dung cần được chủ dự án duyệt thủ công.</div></div></div>}
    </main>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}