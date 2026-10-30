"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (signInError) {
        setError("Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được tạo trong Supabase Auth.");
        return;
      }

      const response = await fetch("/api/admin/submissions", { cache: "no-store" });
      if (response.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      if (response.status === 503) {
        setError("Quyền quản trị chưa được cấu hình. Chủ dự án cần đặt GAMEVAULT_ADMIN_EMAILS trong Vercel và redeploy.");
      } else {
        setError("Tài khoản này không nằm trong danh sách quản trị GameVault.");
      }
    } catch {
      setError("Không thể đăng nhập lúc này. Kiểm tra kết nối và cấu hình Supabase.");
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
        <p>Trang này chỉ dành cho email đã được chủ dự án thêm vào danh sách quản trị và tạo tài khoản trong Supabase Auth.</p>
        <form onSubmit={signIn} className="admin-auth-form">
          <label htmlFor="admin-email">Email quản trị</label>
          <input id="admin-email" type="email" autoComplete="username" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="admin-password">Mật khẩu</label>
          <input id="admin-password" type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="admin-error" role="alert">{error}</p>}
          {notice && <p className="admin-notice" role="status">{notice}</p>}
          <button type="submit" disabled={loading}>{loading ? "Đang xác thực…" : <><LockKeyhole size={16} /> Đăng nhập an toàn</>}</button>
        </form>
        <p className="admin-auth-foot">Không có chức năng tự đăng ký. Chỉ tài khoản nằm trong danh sách cho phép mới được duyệt hoặc xuất bản game.</p>
      </section>
    </main>
  );
}
