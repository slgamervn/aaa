"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ username: username.trim(), password })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "Tên đăng nhập hoặc mật khẩu không đúng.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Không thể kết nối để đăng nhập. Hãy kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <a href="/" className="admin-back"><ArrowLeft size={15} /> Quay lại GameVault</a>
      <section className="admin-auth-card">
        <div className="admin-auth-mark"><KeyRound size={22} /></div>
        <div className="section-kicker">GAMEVAULT / TRUY CẬP QUẢN TRỊ</div>
        <h1>Đăng nhập quản trị</h1>
        <p>Nhập tên đăng nhập và mật khẩu quản trị để tiếp tục. Không có chức năng tự đăng ký.</p>
        <form onSubmit={signIn} className="admin-auth-form">
          <label htmlFor="admin-username">Tên đăng nhập</label>
          <input
            id="admin-username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label htmlFor="admin-password">Mật khẩu</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={256}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && <p className="admin-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Đang xác thực…" : <><LockKeyhole size={16} /> Đăng nhập an toàn</>}
          </button>
        </form>
        <p className="admin-auth-foot">Chỉ tài khoản quản trị đã cấu hình mới có thể xem hàng chờ, duyệt hoặc xuất bản dự án.</p>
      </section>
    </main>
  );
}
