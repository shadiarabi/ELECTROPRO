import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0a0f", surface: "#12121a", card: "#1a1a26", border: "#2a2a3e",
  accent: "#00e5ff", accentDim: "#00e5ff22", green: "#00ff9d",
  red: "#ff4466", yellow: "#ffcc00", text: "#e8e8f0", muted: "#6b6b8a",
  font: "'Syne', sans-serif", mono: "'DM Mono', monospace",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: ${T.font}; }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: ${T.surface}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
  input, select, textarea { background: ${T.surface}; color: ${T.text}; border: 1px solid ${T.border}; border-radius: 8px; padding: 8px 12px; font-family: ${T.font}; font-size: 13px; outline: none; width: 100%; }
  input:focus, select:focus { border-color: ${T.accent}; box-shadow: 0 0 0 2px ${T.accentDim}; }
  button { cursor: pointer; font-family: ${T.font}; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 14px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: ${T.muted}; border-bottom: 1px solid ${T.border}; }
  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid ${T.border}22; }
  tr:hover td { background: ${T.accentDim}08; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .page { animation: fadeIn .25s ease; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width:32px; height:32px; border:3px solid ${T.border}; border-top-color:${T.accent}; border-radius:50%; animation:spin .8s linear infinite; }
  @media print {
    .no-print { display: none !important; }
    body { background: white; color: black; }
    .print-invoice { display: block !important; }
  }
  @media (max-width: 768px) {
    .sidebar { width: 60px !important; }
    .sidebar .nav-label { display: none; }
    .sidebar .logo-text { display: none; }
    .main-content { padding: 16px !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .two-col { grid-template-columns: 1fr !important; }
    .hide-mobile { display: none !important; }
    table { font-size: 11px; }
    th, td { padding: 8px 6px !important; }
  }
  .table-wrap { overflow-x: auto; width: 100%; }
  .table-wrap table { min-width: 600px; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const uid = () => "INV-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const Badge = ({ children, color = T.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: T.mono, letterSpacing: 1 }}>{children}</span>
);

const StatCard = ({ label, value, sub, color = T.accent, icon, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, border: `1px solid ${onClick ? color+"66" : T.border}`, borderRadius: 12, padding: "20px 24px", position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default", transition: "transform .15s, box-shadow .15s" }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${color}33`; }}}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 12, color: T.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontFamily: T.mono }}>{sub}</div>}
    {onClick && <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: color, opacity: 0.6 }}>tap to view →</div>}
  </div>
);

// ─── DATE FILTER ─────────────────────────────────────────────────────────────
const DateFilter = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 14px", marginBottom: 20 }}>
    <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>📅 Filter:</span>
    {[["all","All Time"],["today","Today"],["this_week","This Week"],["this_month","This Month"],["last_month","Last Month"],["this_year","This Year"]].map(([v,l]) => (
      <button key={v} onClick={() => onChange(v)} style={{ background: value===v ? T.accent : "transparent", color: value===v ? "#000" : T.muted, border: `1px solid ${value===v ? T.accent : T.border}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: value===v ? 700 : 400, cursor: "pointer" }}>{l}</button>
    ))}
  </div>
);

const filterByDate = (items, period, dateKey = "date") => {
  if (period === "all") return items;
  const now = new Date();
  return items.filter(i => {
    const d = new Date(i[dateKey]);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "this_week") { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    if (period === "this_month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if (period === "last_month") { const lm=new Date(now.getFullYear(),now.getMonth()-1); return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear(); }
    if (period === "this_year") return d.getFullYear()===now.getFullYear();
    return true;
  });
};

const Btn = ({ children, onClick, color = T.accent, outline, small, disabled, loading }) => (
  <button onClick={onClick} disabled={disabled || loading} style={{
    background: outline ? "transparent" : color, color: outline ? color : "#000",
    border: `1px solid ${color}`, borderRadius: 8, padding: small ? "6px 14px" : "10px 20px",
    fontSize: small ? 12 : 13, fontWeight: 700, opacity: (disabled || loading) ? 0.5 : 1,
    transition: "all .15s", letterSpacing: .5, display: "inline-flex", alignItems: "center", gap: 6,
    whiteSpace: "nowrap",
  }}>{loading ? "Saving..." : children}</button>
);

const Loader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div className="spinner" />
  </div>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    if (isSignup) {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("user_profiles").insert({ id: data.user.id, email, full_name: name, role: "cashier" });
        setError("Account created! You can now log in.");
        setIsSignup(false);
      }
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", data.user.id).single();
        onLogin(data.user, profile || { role: "cashier", full_name: email });
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            <span style={{ color: T.accent }}>⚡</span> ElectroPro
          </div>
          <div style={{ color: T.muted, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>Business Manager</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{isSignup ? "Create Account" : "Sign In"}</h2>
          {isSignup && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Full Name</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          {error && <div style={{ background: T.red + "22", border: `1px solid ${T.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: T.red, marginBottom: 16 }}>{error}</div>}
          <Btn onClick={handleSubmit} loading={loading} style={{ width: "100%" }}>{isSignup ? "Create Account" : "Sign In"}</Btn>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.muted }}>
            {isSignup ? "Already have an account? " : "Need an account? "}
            <button onClick={() => setIsSignup(!isSignup)} style={{ background: "none", border: "none", color: T.accent, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>
              {isSignup ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── USERS MANAGEMENT (Admin only) ───────────────────────────────────────────
function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("user_profiles").select("*").then(({ data }) => {
      setUsers(data || []);
      setLoading(false);
    });
  }, []);

  const updateRole = async (id, role) => {
    await supabase.from("user_profiles").update({ role }).eq("id", id);
    setUsers(users.map(u => u.id === id ? { ...u, role } : u));
  };

  const roleColor = { admin: T.red, manager: T.accent, cashier: T.green };

  if (currentUser?.role !== "admin") return (
    <div className="page" style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Admin Access Only</div>
      <div style={{ color: T.muted, marginTop: 8 }}>Only admins can manage users.</div>
    </div>
  );

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>User Management</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>Manage staff access and roles</p>
      {loading ? <Loader /> : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change Role</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                  <td style={{ color: T.muted, fontFamily: T.mono, fontSize: 12 }}>{u.email}</td>
                  <td><Badge color={roleColor[u.role] || T.accent}>{u.role.toUpperCase()}</Badge></td>
                  <td>
                    {u.id !== currentUser.id && (
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    )}
                    {u.id === currentUser.id && <span style={{ color: T.muted, fontSize: 12 }}>You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: T.accent, textTransform: "uppercase", letterSpacing: 1 }}>Role Permissions</h3>
        {[
          { role: "Admin", color: T.red, perms: "Full access — manage users, all branches, all data" },
          { role: "Manager", color: T.accent, perms: "View all branches, create invoices, manage inventory" },
          { role: "Cashier", color: T.green, perms: "Create invoices, view inventory — no financial reports" },
        ].map(r => (
          <div key={r.role} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}22` }}>
            <Badge color={r.color}>{r.role.toUpperCase()}</Badge>
            <span style={{ fontSize: 13, color: T.muted }}>{r.perms}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INVOICE PRINT VIEW ───────────────────────────────────────────────────────
function PrintInvoice({ inv, locations, onClose }) {
  const loc = locations.find(l => l.id === inv.location_id);
  const total = inv.total || 0;
  const subtotal = (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0);
  const discountAmt = inv.discount_value > 0 ? (inv.discount_type === "pct" ? subtotal * inv.discount_value / 100 : inv.discount_value) : 0;
  const shipAmt = inv.shipment_value > 0 ? (inv.shipment_type === "pct" ? subtotal * inv.shipment_value / 100 : inv.shipment_value) : 0;
  const pmLabel = { cash_usd: "💵 Cash USD", wallet_usdt: "💎 Wallet USDT", bank_transfer: "🏦 Bank Transfer" };

  const print = () => {
    const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.id}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; }
      h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 16px; }
      .right { text-align: right; }
      .title { font-size: 18px; font-weight: 800; }
      .sub { font-size: 13px; color: #666; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { text-align: left; padding: 8px 0; font-size: 12px; border-bottom: 2px solid #000; }
      th:not(:first-child) { text-align: right; }
      td { padding: 10px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      td:not(:first-child) { text-align: right; }
      .totals { display: flex; justify-content: flex-end; }
      .totals-box { width: 240px; border-top: 2px solid #000; padding-top: 12px; }
      .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
      .row.total { font-size: 16px; font-weight: 800; border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999; }
      .strike { text-decoration: line-through; color: #999; font-size: 11px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <h1>⚡ ElectroPro</h1>
      <div class="header">
        <div><div class="title">${inv.type === "sell" ? "SALES INVOICE" : "PURCHASE INVOICE"}</div><div class="sub">#${inv.id}</div></div>
        <div class="right">
          <div style="font-size:13px">Date: <strong>${inv.date}</strong></div>
          <div style="font-size:13px">Location: <strong>${loc?.name || ""}</strong></div>
          <div style="font-size:13px">${inv.type === "sell" ? "Customer" : "Supplier"}: <strong>${inv.customer}</strong></div>
        </div>
      </div>
      <table>
        <thead><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Disc</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${(inv.invoice_items || []).map(item => `<tr>
            <td>${item.product_name}</td>
            <td style="text-align:right">${item.quantity}</td>
            <td style="text-align:right">${item.discount_pct > 0 ? `<span class="strike">$${Number(item.original_price||item.price).toFixed(2)}</span><br>` : ""}$${Number(item.price).toFixed(2)}</td>
            <td style="text-align:right;color:red">${item.discount_pct > 0 ? item.discount_pct + "%" : "—"}</td>
            <td style="text-align:right;font-weight:700">$${Number(item.quantity * item.price).toFixed(2)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div class="totals"><div class="totals-box">
        <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
        ${discountAmt > 0 ? `<div class="row" style="color:red"><span>Discount${inv.discount_type==="pct"?` (${inv.discount_value}%)`:""}</span><span>−$${discountAmt.toFixed(2)}</span></div>` : ""}
        ${shipAmt > 0 ? `<div class="row" style="color:#0066cc"><span>Shipment${inv.shipment_type==="pct"?` (${inv.shipment_value}%)`:""}</span><span>+$${shipAmt.toFixed(2)}</span></div>` : ""}
        <div class="row total"><span>TOTAL</span><span>$${Number(total).toFixed(2)}</span></div>
        ${inv.payment_method ? `<div class="row"><span>Supplier Payment</span><span>${{cash_usd:"Cash USD",wallet_usdt:"Wallet USDT",bank_transfer:"Bank Transfer"}[inv.payment_method]||""}</span></div>` : ""}
        ${inv.payment_reference ? `<div class="row"><span>Reference</span><span>${inv.payment_reference}</span></div>` : ""}
        ${inv.shipment_company ? `<div class="row"><span>Shipping Co.</span><span>${inv.shipment_company}</span></div>` : ""}
        ${inv.shipment_payment_status ? `<div class="row"><span>Shipment Payment</span><span>${inv.shipment_payment_status === "paid" ? ({cash_usd:"Cash USD",wallet_usdt:"Wallet USDT",bank_transfer:"Bank Transfer"}[inv.shipment_payment_method]||"Paid") : "⏳ Pending"}</span></div>` : ""}
      </div></div>
      <div class="footer">Thank you for your business! • ElectroPro Business Manager</div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=700,height=900");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} className="no-print">
      <div style={{ background: "white", color: "#000", borderRadius: 12, padding: 40, width: "100%", maxWidth: 600, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>⚡ ElectroPro</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn small onClick={print} color="#000">🖨️ Print</Btn>
            <Btn small outline onClick={onClose} color="#666">Close</Btn>
          </div>
        </div>
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{inv.type === "sell" ? "SALES INVOICE" : "PURCHASE INVOICE"}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>#{inv.id}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13 }}>Date: <strong>{inv.date}</strong></div>
              <div style={{ fontSize: 13 }}>Location: <strong>{loc?.name || ""}</strong></div>
              <div style={{ fontSize: 13 }}>{inv.type === "sell" ? "Customer" : "Supplier"}: <strong>{inv.customer}</strong></div>
            </div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th style={{ textAlign: "left", padding: "8px 0", fontSize: 12 }}>Product</th>
              <th style={{ textAlign: "center", padding: "8px 0", fontSize: 12 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12 }}>Price</th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12 }}>Disc</th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(inv.invoice_items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 0", fontSize: 13 }}>{item.product_name}</td>
                <td style={{ textAlign: "center", padding: "10px 0", fontSize: 13 }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "10px 0", fontSize: 13 }}>
                  {item.discount_pct > 0 ? <><span style={{ textDecoration: "line-through", color: "#999", fontSize: 11 }}>{fmt(item.original_price || item.price)}</span><br/>{fmt(item.price)}</> : fmt(item.price)}
                </td>
                <td style={{ textAlign: "right", padding: "10px 0", fontSize: 12, color: "red" }}>{item.discount_pct > 0 ? `${item.discount_pct}%` : "—"}</td>
                <td style={{ textAlign: "right", padding: "10px 0", fontSize: 13, fontWeight: 700 }}>{fmt(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: "2px solid #000", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "red" }}>
                  <span>Discount {inv.discount_type === "pct" ? `(${inv.discount_value}%)` : ""}</span>
                  <span>− {fmt(discountAmt)}</span>
                </div>
              )}
              {shipAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#0066cc" }}>
                  <span>🚢 Shipment {inv.shipment_type === "pct" ? `(${inv.shipment_value}%)` : ""}</span>
                  <span>+ {fmt(shipAmt)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 16, fontWeight: 800, borderTop: "2px solid #000", marginTop: 8 }}>
                <span>TOTAL</span><span>{fmt(total)}</span>
              </div>
              {inv.payment_method && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, marginTop: 4, color: "#333" }}>
                  <span>{inv.type === "buy" ? "Supplier Payment" : "Payment"}</span><span style={{ fontWeight: 700 }}>{pmLabel[inv.payment_method] || ""}</span>
                </div>
              )}
              {inv.payment_reference && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: "#666" }}>
                  <span>Reference</span><span style={{ fontFamily: "monospace" }}>{inv.payment_reference}</span>
                </div>
              )}
              {inv.shipment_company && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#333" }}>
                  <span>🚢 Shipping Co.</span><span style={{ fontWeight: 700 }}>{inv.shipment_company}</span>
                </div>
              )}
              {inv.shipment_payment_status && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: inv.shipment_payment_status === "paid" ? "#007700" : "#cc4400" }}>
                  <span>Shipment Payment</span><span style={{ fontWeight: 700 }}>{inv.shipment_payment_status === "paid" ? (pmLabel[inv.shipment_payment_method] || "Paid") : "⏳ Pending"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #eee", textAlign: "center", fontSize: 11, color: "#999" }}>
          Thank you for your business! • ElectroPro Business Manager
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ invoices, products, locations, userProfile, setPage }) {
  const sells = invoices.filter(i => i.type === "sell");
  const buys = invoices.filter(i => i.type === "buy" && i.status === "paid");
  const paidSells = sells.filter(i => i.status === "paid");
  const revenue = sells.reduce((s, i) => s + i.total, 0);
  const paidRevenue = paidSells.reduce((s, i) => s + i.total, 0);
  const pendingRevenue = revenue - paidRevenue;
  const cogs = sells.reduce((s, i) => s + i.cogs, 0);
  const profit = revenue - cogs;
  const totalItems = products.reduce((s, p) => s + (p.totalStock || 0), 0);
  const maxRev = Math.max(...locations.map(l => l.revenue || 0), 1);
  const canSeeFinancials = ["admin", "manager"].includes(userProfile?.role);

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>
        Welcome back, <span style={{ color: T.accent, fontWeight: 700 }}>{userProfile?.full_name}</span>
        <span style={{ marginLeft: 8 }}><Badge color={userProfile?.role === "admin" ? T.red : userProfile?.role === "manager" ? T.accent : T.green}>{(userProfile?.role || "cashier").toUpperCase()}</Badge></span>
      </p>
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 24 }}>
        {canSeeFinancials && <StatCard label="Total Revenue" value={fmt(revenue)} icon="💰" color={T.green} sub={`${sells.length} invoices`} onClick={() => setPage("invoices")} />}
        {canSeeFinancials && <StatCard label="Collected" value={fmt(paidRevenue)} icon="✅" color={T.accent} sub={`${paidSells.length} paid`} onClick={() => setPage("invoices")} />}
        {canSeeFinancials && <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit >= 0 ? T.green : T.red} sub={`${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}% margin`} onClick={() => setPage("pl")} />}
        {canSeeFinancials && <StatCard label="Purchases" value={fmt(buys.reduce((s, i) => s + i.total, 0))} icon="🛒" color={T.accent} sub={`${buys.length} invoices`} onClick={() => setPage("invoices")} />}
        <StatCard label="Stock Items" value={totalItems} icon="📦" color={T.accent} sub={`${products.length} products`} onClick={() => setPage("inventory")} />
      </div>
      {canSeeFinancials && pendingRevenue > 0 && (
        <div style={{ background: T.yellow+"11", border: `1px solid ${T.yellow}44`, borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: T.yellow }}>⏳ You have <strong>{sellsPending.length} unpaid invoice{sellsPending.length > 1 ? "s" : ""}</strong> worth <strong>{fmt(pendingRevenue)}</strong> pending collection.</span>
        </div>
      )}
      {canSeeFinancials && (
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: T.muted, marginBottom: 20 }}>Revenue by Location</h3>
            {locations.map(l => (
              <div key={l.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span>{l.name}</span>
                  <span style={{ fontFamily: T.mono, color: T.accent }}>{fmt(l.revenue || 0)}</span>
                </div>
                <div style={{ background: T.border, borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${((l.revenue || 0) / maxRev) * 100}%`, height: "100%", background: `linear-gradient(90deg,${T.accent},${T.green})`, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: T.muted, marginBottom: 20 }}>P&L Summary</h3>
            {[
              { label: "Total Revenue", val: revenue, color: T.green },
              { label: "Collected", val: paidRevenue, color: T.accent },
              { label: "Pending Collection", val: pendingRevenue, color: T.yellow },
              { label: "Cost of Goods Sold", val: -cogs, color: T.red },
              { label: "Gross Profit", val: revenue - cogs, color: T.accent, bold: true },
              { label: "Net Profit / Loss", val: profit, color: profit >= 0 ? T.green : T.red, bold: true },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: row.bold ? T.text : T.muted, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                <span style={{ fontFamily: T.mono, fontSize: 13, color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.val >= 0 ? fmt(row.val) : `-${fmt(-row.val)}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ background: T.card, border: `1px solid ${T.yellow}44`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.yellow, textTransform: "uppercase", letterSpacing: 1 }}>⚠ Low Stock Alerts</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {products.filter(p => (p.totalStock || 0) < 10).map(p => (
            <div key={p.id} style={{ background: T.yellow + "11", border: `1px solid ${T.yellow}33`, borderRadius: 8, padding: "8px 14px", fontSize: 12 }}>
              <span style={{ color: T.yellow, fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: T.muted, marginLeft: 8 }}>{p.totalStock} units left</span>
            </div>
          ))}
          {products.filter(p => (p.totalStock || 0) < 10).length === 0 && <span style={{ color: T.muted, fontSize: 13 }}>All products well stocked ✓</span>}
        </div>
      </div>
    </div>
  );
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────
function Inventory({ products, locations, onRefresh, userProfile }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [editProduct, setEditProduct] = useState(null);
  const [adjustStock, setAdjustStock] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ newQty: "", reason: "correction", notes: "" });
  const [form, setForm] = useState({ name: "", sku: "", category: "", cost_price: "", sell_price: "" });
  const canEdit = ["admin", "manager"].includes(userProfile?.role);

  const resyncStock = async () => {
    if (!window.confirm("Recalculate all stock from invoices and transfers?")) return;
    setSyncing(true);
    setSyncMsg("Loading data...");

    // Fetch everything in parallel
    const [invRes, itemRes, transferRes, stockRes] = await Promise.all([
      supabase.from("invoices").select("id, type, location_id"),
      supabase.from("invoice_items").select("invoice_id, product_id, quantity"),
      supabase.from("stock_transfers").select("product_id, from_location_id, to_location_id, quantity"),
      supabase.from("stock").select("id, product_id, location_id"),
    ]);

    setSyncMsg("Calculating...");
    const invoices = invRes.data || [];
    const items = itemRes.data || [];
    const transfers = transferRes.data || [];
    const stockRows = stockRes.data || [];

    // Build invoice lookup map
    const invMap = {};
    for (const inv of invoices) invMap[inv.id] = inv;

    // Calculate stock per product+location
    const stockMap = {};
    const key = (pid, lid) => `${pid}_${lid}`;

    for (const item of items) {
      const inv = invMap[item.invoice_id];
      if (!inv) continue;
      const k = key(item.product_id, inv.location_id);
      if (!stockMap[k]) stockMap[k] = 0;
      if (inv.type === "buy") stockMap[k] += +item.quantity;
      if (inv.type === "sell") stockMap[k] -= +item.quantity;
    }

    for (const t of transfers) {
      const fk = key(t.product_id, t.from_location_id);
      const tk = key(t.product_id, t.to_location_id);
      if (!stockMap[fk]) stockMap[fk] = 0;
      if (!stockMap[tk]) stockMap[tk] = 0;
      stockMap[fk] -= +t.quantity;
      stockMap[tk] += +t.quantity;
    }

    setSyncMsg("Updating stock...");
    // Update existing stock rows in batches
    const updates = stockRows.map(row => {
      const k = key(row.product_id, row.location_id);
      const qty = Math.max(0, stockMap[k] || 0);
      return supabase.from("stock").update({ quantity: qty }).eq("id", row.id);
    });

    // Run in batches of 20
    for (let i = 0; i < updates.length; i += 20) {
      await Promise.all(updates.slice(i, i + 20));
    }

    // Recalculate weighted average cost for all products from purchase invoices
    setSyncMsg("Recalculating costs...");
    const { data: allProds } = await supabase.from("products").select("id");
    for (const prod of (allProds || [])) {
      const { data: invItems } = await supabase.from("invoice_items").select("quantity, price, invoice_id").eq("product_id", prod.id);
      const { data: invs } = await supabase.from("invoices").select("id, shipment_value, shipment_type, type").eq("type", "buy");
      const invMap = {};
      (invs || []).forEach(inv => { invMap[inv.id] = inv; });
      let totalQty = 0, totalCost = 0;
      (invItems || []).forEach(ii => {
        const inv = invMap[ii.invoice_id];
        if (!inv) return;
        const invSubtotal = (invItems || []).filter(x => x.invoice_id === ii.invoice_id).reduce((s, x) => s + x.quantity * x.price, 0);
        const invShipAmt = inv.shipment_type === "pct" ? invSubtotal * (inv.shipment_value || 0) / 100 : (inv.shipment_value || 0);
        const itemValue = ii.quantity * ii.price;
        const shipShare = invSubtotal > 0 ? invShipAmt * (itemValue / invSubtotal) : 0;
        const costPerUnit = ii.price + (ii.quantity > 0 ? shipShare / ii.quantity : 0);
        totalQty += +ii.quantity;
        totalCost += costPerUnit * +ii.quantity;
      });
      if (totalQty > 0) {
        const avgCost = totalCost / totalQty;
        await supabase.from("products").update({ cost_price: +avgCost.toFixed(4) }).eq("id", prod.id);
      }
    }

    setSyncMsg("");
    setSyncing(false);
    onRefresh();
    alert("✅ Stock and costs re-synced successfully!");
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = async () => {
    if (!form.name || !form.sku) return;
    setSaving(true);
    const { data: prod, error } = await supabase.from("products").insert({
      name: form.name, sku: form.sku, category: form.category,
      cost_price: +form.cost_price, sell_price: +form.sell_price
    }).select().single();
    if (!error && prod) {
      const stockRows = locations.map(l => ({ product_id: prod.id, location_id: l.id, quantity: 0 }));
      await supabase.from("stock").insert(stockRows);
      setForm({ name: "", sku: "", category: "", cost_price: "", sell_price: "" });
      setShowAdd(false);
      onRefresh();
    }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editProduct) return;
    setSaving(true);
    await supabase.from("products").update({
      name: editProduct.name, sku: editProduct.sku, category: editProduct.category,
      cost_price: +editProduct.cost_price, sell_price: +editProduct.sell_price
    }).eq("id", editProduct.id);
    setEditProduct(null);
    onRefresh();
    setSaving(false);
  };

  const saveAdjustment = async () => {
    if (adjustForm.newQty === "" || !adjustStock) return;
    setSaving(true);
    await supabase.from("stock")
      .update({ quantity: +adjustForm.newQty })
      .eq("product_id", adjustStock.product.id)
      .eq("location_id", adjustStock.location_id);
    setAdjustStock(null);
    setAdjustForm({ newQty: "", reason: "correction", notes: "" });
    onRefresh();
    setSaving(false);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    await supabase.from("stock").delete().eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Inventory</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{products.length} products · {locations.length} locations</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {canEdit && (
            <button onClick={resyncStock} disabled={syncing} style={{ background: T.yellow+"22", border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: "8px 16px", color: T.yellow, fontSize: 12, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer" }}>
              {syncing ? `🔄 ${syncMsg}` : "🔄 Re-Sync Stock"}
            </button>
          )}
          {canEdit && <Btn onClick={() => setShowAdd(!showAdd)}>+ Add Product</Btn>}
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustStock && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.card, border:`1px solid ${T.yellow}44`, borderRadius:16, padding:28, width:"100%", maxWidth:440 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6, color:T.yellow }}>📦 Adjust Stock</h3>
            <p style={{ fontSize:13, color:T.muted, marginBottom:20 }}>
              <strong style={{ color:T.text }}>{adjustStock.product.name}</strong> at <strong style={{ color:T.accent }}>{locations.find(l=>l.id===adjustStock.location_id)?.name}</strong>
            </p>
            <div style={{ background:T.surface, borderRadius:8, padding:12, marginBottom:16, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:T.muted, fontSize:13 }}>Current Stock</span>
              <span style={{ fontFamily:T.mono, fontWeight:700, color:adjustStock.currentQty<5?T.red:T.accent }}>{adjustStock.currentQty} units</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>New Quantity</div>
                <input type="number" value={adjustForm.newQty} onChange={e => setAdjustForm({...adjustForm, newQty:e.target.value})} placeholder="Enter new quantity" min="0" autoFocus />
              </div>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Reason</div>
                <select value={adjustForm.reason} onChange={e => setAdjustForm({...adjustForm, reason:e.target.value})}>
                  <option value="correction">Stock Correction</option>
                  <option value="damage">Damage / Loss</option>
                  <option value="theft">Theft</option>
                  <option value="return">Customer Return</option>
                  <option value="initial">Initial Count</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Notes (optional)</div>
                <input value={adjustForm.notes} onChange={e => setAdjustForm({...adjustForm, notes:e.target.value})} placeholder="e.g. Annual stock count" />
              </div>
            </div>
            {adjustForm.newQty !== "" && (
              <div style={{ background:T.accentDim, borderRadius:8, padding:12, marginBottom:16, fontFamily:T.mono, fontSize:13 }}>
                <span style={{ color:T.muted }}>Change: </span>
                <span style={{ color:+adjustForm.newQty > adjustStock.currentQty ? T.green : T.red, fontWeight:700 }}>
                  {+adjustForm.newQty > adjustStock.currentQty ? "+" : ""}{+adjustForm.newQty - adjustStock.currentQty} units
                </span>
                <span style={{ color:T.muted }}> → New total: </span>
                <span style={{ color:T.accent, fontWeight:700 }}>{adjustForm.newQty} units</span>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={saveAdjustment} loading={saving} disabled={adjustForm.newQty === ""}>Save Adjustment</Btn>
              <Btn outline onClick={() => { setAdjustStock(null); setAdjustForm({ newQty:"", reason:"correction", notes:"" }); }}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 500 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: T.accent }}>✏️ Edit Product</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["name","Product Name"],["sku","SKU"],["category","Category"],["cost_price","Cost Price ($)"],["sell_price","Sell Price ($)"]].map(([k,lbl]) => (
                <div key={k} style={{ gridColumn: k === "name" ? "1/-1" : "auto" }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>{lbl}</div>
                  <input value={editProduct[k] || ""} onChange={e => setEditProduct({...editProduct,[k]:e.target.value})} placeholder={lbl} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn onClick={saveEdit} loading={saving}>Save Changes</Btn>
              <Btn outline onClick={() => setEditProduct(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {showAdd && canEdit && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>New Product</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            {[["name","Product Name"],["sku","SKU"],["category","Category"],["cost_price","Cost Price ($)"],["sell_price","Sell Price ($)"]].map(([k,lbl]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>{lbl}</div>
                <input value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={lbl} />
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <Btn onClick={addProduct} loading={saving}>Save Product</Btn>
            <Btn outline onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ marginBottom: 20 }} />
      {canEdit && <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>💡 Click any stock number to adjust it</div>}
      {/* Summary cards for each product */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(p => {
          const margin = p.sell_price > 0 ? ((p.sell_price - p.cost_price) / p.sell_price * 100).toFixed(1) : 0;
          return (
            <div key={p.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {/* Product header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${T.border}`, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{p.sku} • <Badge>{p.category}</Badge></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Cost</div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700 }}>{fmt(p.cost_price)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Sell</div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.green }}>{fmt(p.sell_price)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Margin</div>
                    <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: +margin > 20 ? T.green : +margin > 10 ? T.yellow : T.red }}>{margin}%</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Total Stock</div>
                    <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.accent }}>{p.totalStock || 0}</div>
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditProduct(p)} style={{ background: T.accent+"22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 8px", color: T.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deleteProduct(p.id)} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
              {/* Stock by location grid */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                {locations.map((l, idx) => {
                  const s = p.stockByLocation?.[l.id] || 0;
                  return (
                    <div key={l.id} style={{ flex: "1 1 100px", padding: "10px 14px", borderRight: idx < locations.length-1 ? `1px solid ${T.border}` : "none", textAlign: "center", background: s > 0 ? "transparent" : T.surface+"44" }}>
                      <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
                      <button onClick={() => canEdit && setAdjustStock({ product: p, location_id: l.id, currentQty: s })}
                        style={{ background: canEdit ? (s===0?T.surface:s<3?T.red+"22":s<8?T.yellow+"22":T.accentDim) : "none", border: canEdit ? `1px solid ${s===0?T.border:s<3?T.red:s<8?T.yellow:T.accent}44` : "none", borderRadius: 8, padding: "4px 12px", color: s===0?T.muted:s<3?T.red:s<8?T.yellow:T.text, fontFamily: T.mono, fontSize: 14, fontWeight: 800, cursor: canEdit?"pointer":"default", minWidth: 36 }}>
                        {s}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
function Invoices({ invoices, setInvoices, products, locations, clients, suppliers, onRefresh, userProfile }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [datePeriod, setDatePeriod] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printInv, setPrintInv] = useState(null);
  const [editInv, setEditInv] = useState(null);
  const [newInv, setNewInv] = useState({ type: "sell", location_id: "", customer: "", client_id: "", supplier_id: "", date: new Date().toISOString().slice(0, 10), items: [], discountType: "fixed", discountValue: 0, shipmentType: "fixed", shipmentValue: 0, distributeShipment: false, shipmentCompany: "", shipmentPaymentStatus: "pending", shipmentPaymentMethod: "cash_usd", paymentStatus: "paid", amountPaid: "", paymentMethod: "cash_usd", paymentReference: "" });
  const [itemForm, setItemForm] = useState({ productId: "", qty: 1, customPrice: "", discountPct: 0 });

  const filtered = filterByDate(invoices, datePeriod)
    .filter(i => typeFilter === "all" || i.type === typeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const addItem = () => {
    const prod = products.find(p => p.id === +itemForm.productId);
    if (!prod) return;
    const defaultPrice = newInv.type === "sell" ? prod.sell_price : prod.cost_price;
    const price = itemForm.customPrice !== "" ? +itemForm.customPrice : defaultPrice;
    const discPct = +itemForm.discountPct || 0;
    const finalPrice = price * (1 - discPct / 100);
    setNewInv({ ...newInv, items: [...newInv.items, { productId: prod.id, name: prod.name, qty: +itemForm.qty, price: finalPrice, originalPrice: price, discountPct: discPct, cost: prod.cost_price }] });
    setItemForm({ productId: "", qty: 1, customPrice: "", discountPct: 0 });
  };

  const removeItem = (idx) => setNewInv({ ...newInv, items: newInv.items.filter((_, i) => i !== idx) });

  const subtotal = newInv.items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalDiscount = newInv.discountType === "pct" ? subtotal * (+newInv.discountValue || 0) / 100 : (+newInv.discountValue || 0);
  const shipmentAmt = newInv.shipmentType === "pct" ? subtotal * (+newInv.shipmentValue || 0) / 100 : (+newInv.shipmentValue || 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount) + shipmentAmt;

  const saveInvoice = async () => {
    if (!newInv.customer || !newInv.location_id || newInv.items.length === 0) return;
    setSaving(true);
    const invId = uid();
    // Both sales and purchases use selected payment status
    const status = newInv.paymentStatus;
    const amountPaid = newInv.paymentStatus === "paid" ? grandTotal : newInv.paymentStatus === "partial" ? (+newInv.amountPaid || 0) : 0;
    // Build invoice data — only include columns that exist in DB
    const invoiceData = {
      id: invId, type: newInv.type, date: newInv.date,
      location_id: +newInv.location_id, customer: newInv.customer, status,
      payment_status: status, amount_paid: amountPaid,
      payment_method: newInv.paymentStatus === "pending" ? null : newInv.paymentMethod,
      payment_reference: newInv.paymentReference || null,
      discount_type: newInv.discountType, discount_value: +newInv.discountValue || 0,
      shipment_type: newInv.shipmentType, shipment_value: +newInv.shipmentValue || 0,
      client_id: newInv.client_id ? +newInv.client_id : null,
      supplier_id: newInv.supplier_id ? +newInv.supplier_id : null,
    };
    // Try to add optional columns — if they fail, we still save the invoice
    try { invoiceData.shipment_company = newInv.shipmentCompany || null; } catch(e) {}
    try { invoiceData.shipment_payment_status = newInv.type === "buy" && shipmentAmt > 0 ? newInv.shipmentPaymentStatus : null; } catch(e) {}
    try { invoiceData.shipment_payment_method = newInv.type === "buy" && shipmentAmt > 0 && newInv.shipmentPaymentStatus !== "pending" ? newInv.shipmentPaymentMethod : null; } catch(e) {}

    const { error: invErr } = await supabase.from("invoices").insert(invoiceData);
    if (invErr) {
      // If failed due to missing columns, retry without optional fields
      const basicData = { id: invId, type: newInv.type, date: newInv.date, location_id: +newInv.location_id, customer: newInv.customer, status, payment_status: status, amount_paid: amountPaid, payment_method: newInv.paymentStatus === "pending" ? null : newInv.paymentMethod, payment_reference: newInv.paymentReference || null, discount_type: newInv.discountType, discount_value: +newInv.discountValue || 0, shipment_type: newInv.shipmentType, shipment_value: +newInv.shipmentValue || 0, client_id: newInv.client_id ? +newInv.client_id : null, supplier_id: newInv.supplier_id ? +newInv.supplier_id : null };
      const { error: retryErr } = await supabase.from("invoices").insert(basicData);
      if (retryErr) { alert("Error saving invoice: " + retryErr.message); setSaving(false); return; }
    }
    if (true) {
      const items = newInv.items.map(i => ({ invoice_id: invId, product_id: +i.productId, product_name: i.name, quantity: +i.qty, price: i.price, original_price: i.originalPrice || i.price, discount_pct: i.discountPct || 0, cost: i.cost }));
      await supabase.from("invoice_items").insert(items);
      // Update stock for each item
      for (const item of newInv.items) {
        const productId = +item.productId;
        const locationId = +newInv.location_id;
        const qty = +item.qty;
        const { data: stockRow, error: stockErr } = await supabase.from("stock").select("id, quantity").eq("product_id", productId).eq("location_id", locationId).single();
        if (stockRow && !stockErr) {
          const newQty = newInv.type === "sell"
            ? Math.max(0, stockRow.quantity - qty)
            : stockRow.quantity + qty;
          await supabase.from("stock").update({ quantity: newQty }).eq("id", stockRow.id);
        } else {
          // Stock row doesn't exist yet — create it (for purchases only)
          if (newInv.type === "buy") {
            await supabase.from("stock").insert({ product_id: productId, location_id: locationId, quantity: qty });
          }
        }
      }

      // Distribute shipment fees to product cost prices using weighted average
      // Recalculates from ALL purchase invoices to avoid stacking
      if (newInv.type === "buy" && newInv.distributeShipment && shipmentAmt > 0) {
        const totalItemValue = newInv.items.reduce((s, i) => s + +i.qty * i.price, 0);
        if (totalItemValue > 0) {
          await Promise.all(newInv.items.map(async item => {
            const productId = +item.productId;
            // Get ALL purchase invoice items for this product to calculate true weighted avg
            const { data: allInvItems } = await supabase
              .from("invoice_items")
              .select("quantity, price, invoice_id")
              .eq("product_id", productId);
            const { data: allInvs } = await supabase
              .from("invoices")
              .select("id, shipment_value, shipment_type")
              .eq("type", "buy");
            const invMap = {};
            (allInvs || []).forEach(inv => { invMap[inv.id] = inv; });
            let totalQty = 0, totalCost = 0;
            (allInvItems || []).forEach(ii => {
              const inv = invMap[ii.invoice_id];
              if (!inv) return;
              const invSubtotal = (allInvItems || []).filter(x => x.invoice_id === ii.invoice_id).reduce((s, x) => s + x.quantity * x.price, 0);
              const invShipAmt = inv.shipment_type === "pct" ? invSubtotal * (inv.shipment_value || 0) / 100 : (inv.shipment_value || 0);
              const itemValue = ii.quantity * ii.price;
              const shipShare = invSubtotal > 0 ? invShipAmt * (itemValue / invSubtotal) : 0;
              const costPerUnit = ii.price + (ii.quantity > 0 ? shipShare / ii.quantity : 0);
              totalQty += +ii.quantity;
              totalCost += costPerUnit * +ii.quantity;
            });
            const avgCost = totalQty > 0 ? totalCost / totalQty : +item.price;
            await supabase.from("products").update({ cost_price: +avgCost.toFixed(4) }).eq("id", productId);
          }));
        }
      }

      // Auto-add shipment charge to shipping company's supplier balance
      if (newInv.type === "buy" && shipmentAmt > 0 && newInv.shipmentCompany) {
        // Find supplier by name
        const { data: shipSupplier } = await supabase.from("suppliers").select("id").ilike("name", newInv.shipmentCompany).single();
        if (shipSupplier) {
          const paymentType = newInv.shipmentPaymentStatus === "paid" ? "payment" : "charge";
          await supabase.from("supplier_payments").insert({
            supplier_id: shipSupplier.id,
            date: newInv.date,
            amount: shipmentAmt,
            type: "charge",
            notes: `Shipment for invoice ${invId}`,
            payment_method: newInv.shipmentPaymentStatus === "paid" ? newInv.shipmentPaymentMethod : null,
          });
          // If shipment is already paid, also record the payment
          if (newInv.shipmentPaymentStatus === "paid") {
            await supabase.from("supplier_payments").insert({
              supplier_id: shipSupplier.id,
              date: newInv.date,
              amount: shipmentAmt,
              type: "payment",
              notes: `Shipment payment for invoice ${invId}`,
              payment_method: newInv.shipmentPaymentMethod,
            });
          }
        }
      }

      // Auto-record supplier PAYMENT in both tables
      if (newInv.type === "buy" && newInv.supplier_id && newInv.paymentStatus !== "pending") {
        const supplierAmountPaid = newInv.paymentStatus === "paid"
          ? grandTotal - shipmentAmt
          : (+newInv.amountPaid || 0);
        if (supplierAmountPaid > 0) {
          const payId = "PAY-" + Math.random().toString(36).slice(2,8).toUpperCase();
          // Insert into supplier_payments (for Supplier Balance)
          await supabase.from("supplier_payments").insert({
            supplier_id: +newInv.supplier_id,
            date: newInv.date,
            amount: supplierAmountPaid,
            type: "payment",
            notes: `Payment for invoice ${invId}`,
            payment_method: newInv.paymentMethod || null,
          });
          // Insert into payments (for Payments page)
          await supabase.from("payments").insert({
            id: payId,
            supplier_id: +newInv.supplier_id,
            date: newInv.date,
            amount: supplierAmountPaid,
            payment_method: newInv.paymentMethod || "cash_usd",
            notes: `Payment for invoice ${invId}`,
            reference: newInv.paymentReference || null,
          });
        }
      }

      setShowCreate(false);
      setNewInv({ type: "sell", location_id: "", customer: "", client_id: "", supplier_id: "", date: new Date().toISOString().slice(0, 10), items: [], discountType: "fixed", discountValue: 0, shipmentType: "fixed", shipmentValue: 0, distributeShipment: false, shipmentCompany: "", shipmentPaymentStatus: "pending", shipmentPaymentMethod: "cash_usd", paymentStatus: "paid", amountPaid: "", paymentMethod: "cash_usd", paymentReference: "" });
      onRefresh();
    }
    setSaving(false);
  };

  const handlePrint = async (inv) => {
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setPrintInv({ ...inv, invoice_items: items });
  };

  const saveEdit = async () => {
    if (!editInv) return;
    setSaving(true);
    const amountPaid = editInv.payment_status === "paid"
      ? editInv.total
      : editInv.payment_status === "partial"
        ? Math.min(+editInv.amount_paid || 0, editInv.total)
        : 0;
    await supabase.from("invoices").update({
      customer: editInv.customer,
      date: editInv.date,
      location_id: +editInv.location_id,
      payment_status: editInv.payment_status,
      status: editInv.payment_status,
      amount_paid: amountPaid,
      payment_method: editInv.payment_status === "pending" ? null : editInv.payment_method,
      payment_reference: editInv.payment_reference || null,
      notes: editInv.notes || null,
    }).eq("id", editInv.id);
    setEditInv(null);
    onRefresh();
    setSaving(false);
  };

  return (
    <div className="page">
      {printInv && <PrintInvoice inv={printInv} locations={locations} onClose={() => setPrintInv(null)} />}

      {/* Edit Invoice Modal */}
      {editInv && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.card, border:`1px solid ${T.accent}44`, borderRadius:16, padding:28, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6, color:T.accent }}>✏️ Edit Invoice</h3>
            <p style={{ fontSize:12, color:T.muted, marginBottom:20, fontFamily:T.mono }}>{editInv.id} · {editInv.type === "sell" ? "Sale" : "Purchase"}</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>{editInv.type === "sell" ? "Customer" : "Supplier"}</div>
                <input value={editInv.customer} onChange={e => setEditInv({...editInv, customer:e.target.value})} />
              </div>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Date</div>
                <input type="date" value={editInv.date} onChange={e => setEditInv({...editInv, date:e.target.value})} />
              </div>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Location</div>
                <select value={editInv.location_id} onChange={e => setEditInv({...editInv, location_id:e.target.value})}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Notes</div>
                <input value={editInv.notes || ""} onChange={e => setEditInv({...editInv, notes:e.target.value})} placeholder="Optional" />
              </div>
            </div>

            {/* Payment Status */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:8, textTransform:"uppercase" }}>Payment Status</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  { val:"pending", label:"⏳ Pending", color:T.red },
                  { val:"partial", label:"🔶 Partial", color:T.yellow },
                  { val:"paid", label:"✅ Paid", color:T.green },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setEditInv({...editInv, payment_status:opt.val})} style={{ background:editInv.payment_status===opt.val?opt.color+"33":"transparent", color:editInv.payment_status===opt.val?opt.color:T.muted, border:`2px solid ${editInv.payment_status===opt.val?opt.color:T.border}`, borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {editInv.payment_status === "partial" && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Amount Paid ($)</div>
                  <input type="number" value={editInv.amount_paid ?? ""} onChange={e => setEditInv({...editInv, amount_paid:e.target.value})} placeholder="0.00" style={{ maxWidth:200 }} min="0" max={editInv.total} />
                  <div style={{ fontSize:12, color:T.yellow, marginTop:4, fontFamily:T.mono }}>Remaining: {fmt(Math.max(0, editInv.total - (+editInv.amount_paid || 0)))}</div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            {editInv.payment_status !== "pending" && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:8, textTransform:"uppercase" }}>Payment Method</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                  {[
                    { val:"cash_usd", label:"💵 Cash USD", color:T.green },
                    { val:"wallet_usdt", label:"💎 Wallet USDT", color:T.accent },
                    { val:"bank_transfer", label:"🏦 Bank Transfer", color:T.yellow },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setEditInv({...editInv, payment_method:opt.val})} style={{ background:editInv.payment_method===opt.val?opt.color+"33":"transparent", color:editInv.payment_method===opt.val?opt.color:T.muted, border:`2px solid ${editInv.payment_method===opt.val?opt.color:T.border}`, borderRadius:10, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {(editInv.payment_method === "wallet_usdt" || editInv.payment_method === "bank_transfer") && (
                  <div>
                    <div style={{ fontSize:11, color:T.muted, marginBottom:4, textTransform:"uppercase" }}>Reference #</div>
                    <input value={editInv.payment_reference || ""} onChange={e => setEditInv({...editInv, payment_reference:e.target.value})} placeholder="Tx ID / Bank Ref #" style={{ maxWidth:300 }} />
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div style={{ background:T.surface, borderRadius:8, padding:12, marginBottom:20, fontFamily:T.mono, fontSize:13 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:T.muted }}>Invoice Total</span>
                <span style={{ fontWeight:800, color:T.accent }}>{fmt(editInv.total)}</span>
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={saveEdit} loading={saving}>Save Changes</Btn>
              <Btn outline onClick={() => setEditInv(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Invoices</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{filtered.length} of {invoices.length} invoices</p>
        </div>
        <Btn onClick={() => setShowCreate(!showCreate)}>+ New Invoice</Btn>
      </div>
      <DateFilter value={datePeriod} onChange={setDatePeriod} />

      {showCreate && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>Create Invoice</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>TYPE</div>
              <select value={newInv.type} onChange={e => setNewInv({ ...newInv, type: e.target.value, client_id: "", supplier_id: "" })}>
                <option value="sell">Sale Invoice</option>
                <option value="buy">Purchase Invoice</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>LOCATION</div>
              <select value={newInv.location_id} onChange={e => setNewInv({ ...newInv, location_id: e.target.value })}>
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{newInv.type === "sell" ? "CLIENT" : "SUPPLIER"}</div>
              <select value={newInv.type === "sell" ? newInv.client_id : newInv.supplier_id} onChange={e => {
                const id = e.target.value;
                if (newInv.type === "sell") {
                  const cl = clients.find(c => c.id === +id);
                  setNewInv({ ...newInv, client_id: id, customer: cl ? cl.name : newInv.customer });
                } else {
                  const sp = suppliers.find(s => s.id === +id);
                  setNewInv({ ...newInv, supplier_id: id, customer: sp ? sp.name : newInv.customer });
                }
              }}>
                <option value="">Select or type name below...</option>
                {newInv.type === "sell" ? clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>OR TYPE NAME</div>
              <input value={newInv.customer} onChange={e => setNewInv({ ...newInv, customer: e.target.value })} placeholder="Custom name" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div>
              <input type="date" value={newInv.date} onChange={e => setNewInv({ ...newInv, date: e.target.value })} />
            </div>
          </div>

          {/* Add item row */}
          <div style={{ background: T.surface, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Add Item</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 100px 80px auto", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PRODUCT</div>
                <select value={itemForm.productId} onChange={e => {
                  const prod = products.find(p => p.id === +e.target.value);
                  setItemForm({ ...itemForm, productId: e.target.value, customPrice: prod ? (newInv.type === "sell" ? prod.sell_price : prod.cost_price) : "" });
                }}>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>QTY</div>
                <input type="number" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} min="1" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PRICE ($) <span style={{ color: T.accent }}>(editable)</span></div>
                <input type="number" value={itemForm.customPrice} onChange={e => setItemForm({ ...itemForm, customPrice: e.target.value })} placeholder="Custom price" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DISC %</div>
                <input type="number" value={itemForm.discountPct} onChange={e => setItemForm({ ...itemForm, discountPct: e.target.value })} min="0" max="100" placeholder="0" />
              </div>
              <Btn small onClick={addItem} disabled={!itemForm.productId}>Add</Btn>
            </div>
          </div>

          {newInv.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Orig. Price</th><th>Disc%</th><th>Final Price</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {newInv.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ fontFamily: T.mono }}>{item.qty}</td>
                      <td style={{ fontFamily: T.mono, color: T.muted, textDecoration: item.discountPct > 0 ? "line-through" : "none" }}>{fmt(item.originalPrice)}</td>
                      <td style={{ fontFamily: T.mono, color: T.yellow }}>{item.discountPct > 0 ? `${item.discountPct}%` : "—"}</td>
                      <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(item.price)}</td>
                      <td style={{ fontFamily: T.mono, fontWeight: 700, color: T.accent }}>{fmt(item.qty * item.price)}</td>
                      <td><button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 16 }}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shipment fees */}
          {newInv.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>🚢 Shipment Fees</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <select value={newInv.shipmentType} onChange={e => setNewInv({ ...newInv, shipmentType: e.target.value })} style={{ width: "auto" }}>
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="pct">Percentage (% of subtotal)</option>
                </select>
                <input type="number" value={newInv.shipmentValue} onChange={e => setNewInv({ ...newInv, shipmentValue: e.target.value })} placeholder="0" style={{ width: 120 }} min="0" />
                {shipmentAmt > 0 && <span style={{ fontFamily: T.mono, fontSize: 13, color: T.accent }}>+ {fmt(shipmentAmt)} shipment</span>}
              </div>
              {shipmentAmt > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>Shipping Company</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={newInv.shipmentCompany} onChange={e => setNewInv({ ...newInv, shipmentCompany: e.target.value })} style={{ width: "auto", maxWidth: 280 }}>
                      <option value="">Select or type below...</option>
                      {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <input value={newInv.shipmentCompany} onChange={e => setNewInv({ ...newInv, shipmentCompany: e.target.value })} placeholder="Or type custom name..." style={{ maxWidth: 200 }} />
                  </div>
                </div>
              )}
              {newInv.type === "buy" && shipmentAmt > 0 && (
                <>
                  <div style={{ background: T.card, borderRadius: 8, padding: 12, marginBottom: 12, border: `1px solid ${T.accent}33` }}>
                    <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>💳 Shipment Payment (separate from supplier)</div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Payment Status to Shipping Company</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {[
                        { val: "pending", label: "⏳ Pending", color: T.red },
                        { val: "paid", label: "✅ Paid", color: T.green },
                      ].map(opt => (
                        <button key={opt.val} onClick={() => setNewInv({ ...newInv, shipmentPaymentStatus: opt.val })} style={{ background: newInv.shipmentPaymentStatus === opt.val ? opt.color+"33" : "transparent", color: newInv.shipmentPaymentStatus === opt.val ? opt.color : T.muted, border: `2px solid ${newInv.shipmentPaymentStatus === opt.val ? opt.color : T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {newInv.shipmentPaymentStatus === "paid" && (
                      <div>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Shipment Payment Method</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { val: "cash_usd", label: "💵 Cash USD", color: T.green },
                            { val: "wallet_usdt", label: "💎 Wallet USDT", color: T.accent },
                            { val: "bank_transfer", label: "🏦 Bank Transfer", color: T.yellow },
                          ].map(opt => (
                            <button key={opt.val} onClick={() => setNewInv({ ...newInv, shipmentPaymentMethod: opt.val })} style={{ background: newInv.shipmentPaymentMethod === opt.val ? opt.color+"33" : "transparent", color: newInv.shipmentPaymentMethod === opt.val ? opt.color : T.muted, border: `2px solid ${newInv.shipmentPaymentMethod === opt.val ? opt.color : T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10, background: T.card, borderRadius: 8, padding: "10px 14px", border: `1px solid ${newInv.distributeShipment ? T.yellow+"66" : T.border}` }}>
                    <input type="checkbox" id="distShip" checked={newInv.distributeShipment} onChange={e => setNewInv({ ...newInv, distributeShipment: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    <label htmlFor="distShip" style={{ fontSize: 13, color: newInv.distributeShipment ? T.yellow : T.muted, cursor: "pointer", fontWeight: newInv.distributeShipment ? 700 : 400 }}>
                      📦 Distribute {fmt(shipmentAmt)} to product cost prices
                    </label>
                    {newInv.distributeShipment && (
                      <div style={{ marginLeft: "auto", fontSize: 11, color: T.muted }}>
                        {newInv.items.map(item => {
                          const itemValue = +item.qty * item.price;
                          const total = newInv.items.reduce((s,i) => s + +i.qty * i.price, 0);
                          const share = total > 0 ? shipmentAmt * (itemValue / total) / +item.qty : 0;
                          return <div key={item.productId}>{item.name}: +{fmt(share)}/unit</div>;
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Total discount */}
          {newInv.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.yellow, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>🏷️ Total Invoice Discount</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <select value={newInv.discountType} onChange={e => setNewInv({ ...newInv, discountType: e.target.value })} style={{ width: "auto" }}>
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="pct">Percentage (%)</option>
                </select>
                <input type="number" value={newInv.discountValue} onChange={e => setNewInv({ ...newInv, discountValue: e.target.value })} placeholder="0" style={{ width: 120 }} min="0" />
              </div>
            </div>
          )}

          {/* Grand total summary */}
          {newInv.items.length > 0 && (
            <div style={{ background: T.accentDim, borderRadius: 10, padding: 16, marginBottom: 16, fontFamily: T.mono }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: T.muted }}>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {totalDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: T.red }}>Discount</span><span style={{ color: T.red }}>− {fmt(totalDiscount)}</span>
              </div>}
              {shipmentAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: T.accent }}>🚢 Shipment</span><span style={{ color: T.accent }}>+ {fmt(shipmentAmt)}</span>
              </div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 4 }}>
                <span>GRAND TOTAL</span><span style={{ color: T.green }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Payment Section — for all invoices when items exist */}
          {newInv.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 10, padding: 16, marginBottom: 16, border: `1px solid ${T.yellow}33` }}>
              <div style={{ fontSize: 12, color: T.yellow, fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>💳 {newInv.type === "buy" ? "Supplier Payment" : "Payment Details"}</div>

              {/* Payment Status — for both sales and purchases */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, textTransform: "uppercase" }}>Payment Status</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { val: "pending", label: "⏳ Pending", desc: "Not paid yet", color: T.red },
                    { val: "partial", label: "🔶 Partial", desc: "Partially paid", color: T.yellow },
                    { val: "paid", label: "✅ Paid", desc: "Fully paid", color: T.green },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setNewInv({...newInv, paymentStatus: opt.val})} style={{ background: newInv.paymentStatus === opt.val ? opt.color+"33" : "transparent", color: newInv.paymentStatus === opt.val ? opt.color : T.muted, border: `2px solid ${newInv.paymentStatus === opt.val ? opt.color : T.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                      <div>{opt.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {newInv.paymentStatus === "partial" && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>Amount Paid Now ($)</div>
                    <input type="number" value={newInv.amountPaid} onChange={e => setNewInv({...newInv, amountPaid: e.target.value})} placeholder="0.00" style={{ maxWidth: 200 }} min="0" max={grandTotal} />
                    {newInv.amountPaid && <div style={{ fontSize: 12, color: T.yellow, marginTop: 6, fontFamily: T.mono }}>Remaining: {fmt(grandTotal - (+newInv.amountPaid || 0))}</div>}
                  </div>
                )}
              </div>

              {/* Payment Method — show when not pending */}
              {newInv.paymentStatus !== "pending" && (
                <div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, textTransform: "uppercase" }}>Payment Method</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    {[
                      { val: "cash_usd", label: "💵 Cash USD", color: T.green },
                      { val: "wallet_usdt", label: "💎 Wallet USDT", color: T.accent },
                      { val: "bank_transfer", label: "🏦 Bank Transfer", color: T.yellow },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setNewInv({...newInv, paymentMethod: opt.val})} style={{ background: newInv.paymentMethod === opt.val ? opt.color+"33" : "transparent", color: newInv.paymentMethod === opt.val ? opt.color : T.muted, border: `2px solid ${newInv.paymentMethod === opt.val ? opt.color : T.border}`, borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(newInv.paymentMethod === "wallet_usdt" || newInv.paymentMethod === "bank_transfer") && (
                    <div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>
                        {newInv.paymentMethod === "wallet_usdt" ? "Transaction ID / Wallet Address" : "Bank Reference #"}
                      </div>
                      <input value={newInv.paymentReference} onChange={e => setNewInv({...newInv, paymentReference: e.target.value})} placeholder={newInv.paymentMethod === "wallet_usdt" ? "Tx ID..." : "Bank Ref #..."} style={{ maxWidth: 300 }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn onClick={saveInvoice} loading={saving} disabled={!newInv.customer || !newInv.location_id || newInv.items.length === 0}>Save Invoice</Btn>
            <Btn outline onClick={() => setShowCreate(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "sell", "buy"].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ background: typeFilter === t ? T.accent : "transparent", color: typeFilter === t ? "#000" : T.muted, border: `1px solid ${typeFilter === t ? T.accent : T.border}`, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {t === "all" ? "All" : t === "sell" ? "Sales" : "Purchases"}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", minWidth: 600 }}>
          <table>
            <thead><tr><th>Invoice</th><th>Type</th><th className="hide-mobile">Date</th><th className="hide-mobile">Location</th><th>Customer</th><th>Total</th><th>Payment</th><th className="hide-mobile">Method</th><th>Edit</th><th>Print</th><th>Del</th></tr></thead>
            <tbody>
              {filtered.map(inv => {
                const payStatus = inv.payment_status || inv.status || "paid";
                const payColor = payStatus === "paid" ? T.green : payStatus === "partial" ? T.yellow : T.red;
                const payLabel = payStatus === "paid" ? "✅ PAID" : payStatus === "partial" ? "🔶 PARTIAL" : "⏳ PENDING";
                const amountDue = inv.total - (inv.amount_paid || 0);
                const pm = inv.payment_method;
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 12 }}>{inv.id}</td>
                    <td><Badge color={inv.type === "sell" ? T.green : T.yellow}>{inv.type === "sell" ? "SALE" : "BUY"}</Badge></td>
                    <td className="hide-mobile" style={{ color: T.muted, fontSize: 12 }}>{inv.date}</td>
                    <td className="hide-mobile" style={{ fontSize: 12 }}>{inv.locationName}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div>{inv.customer}</div>
                      {inv.type === "buy" && inv.shipment_company && (
                        <div style={{ fontSize: 11, color: T.accent, marginTop: 2 }}>🚢 {inv.shipment_company}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(inv.total)}</td>
                    <td>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <Badge color={payColor}>{payLabel}</Badge>
                        {payStatus !== "paid" && (
                          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:T.muted, fontFamily:T.mono }}>Due: {fmt(amountDue)}</span>
                            <button onClick={async () => {
                              if(window.confirm(`Mark this ${inv.type === "sell" ? "sale" : "purchase"} as fully paid?`)) {
                                await supabase.from("invoices").update({ status:"paid", payment_status:"paid", amount_paid: inv.total }).eq("id", inv.id);
                                onRefresh();
                              }
                            }} style={{ background:T.green+"22", border:`1px solid ${T.green}44`, borderRadius:4, padding:"2px 6px", color:T.green, fontSize:10, cursor:"pointer", whiteSpace:"nowrap" }}>Mark Paid</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hide-mobile">
                      {pm ? <Badge color={pm==="cash_usd"?T.green:pm==="wallet_usdt"?T.accent:T.yellow}>{pm==="cash_usd"?"💵 Cash":pm==="wallet_usdt"?"💎 USDT":"🏦 Bank"}</Badge> : <span style={{ color:T.muted, fontSize:12 }}>—</span>}
                    </td>
                    <td><button onClick={() => setEditInv({ ...inv, payment_status: inv.payment_status || "pending", amount_paid: inv.amount_paid || 0, payment_method: inv.payment_method || "cash_usd" })} style={{ background:T.accent+"22", border:`1px solid ${T.accent}44`, borderRadius:6, padding:"4px 10px", color:T.accent, fontSize:12, cursor:"pointer" }}>✏️</button></td>
                    <td><button onClick={() => handlePrint(inv)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", color: T.muted, fontSize: 12, cursor: "pointer" }}>🖨️</button></td>
                    <td><button onClick={async () => {
                      if(window.confirm(`Delete this ${inv.type === "sell" ? "sale" : "purchase"} invoice? Stock will be reversed automatically.`)) {
                        const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
                        if (items) {
                          for (const item of items) {
                            const { data: stockRow, error: sErr } = await supabase.from("stock").select("id, quantity").eq("product_id", +item.product_id).eq("location_id", +inv.location_id).single();
                            if (stockRow && !sErr) {
                              const delta = inv.type === "sell" ? +item.quantity : -item.quantity;
                              await supabase.from("stock").update({ quantity: Math.max(0, stockRow.quantity + delta) }).eq("id", stockRow.id);
                            }
                          }
                        }
                        await supabase.from("invoice_items").delete().eq("invoice_id", inv.id);
                        await supabase.from("invoices").delete().eq("id", inv.id);
                        onRefresh();
                      }
                    }} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 10px", color: T.red, fontSize: 12, cursor: "pointer" }}>🗑️</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── PROFIT & LOSS ────────────────────────────────────────────────────────────
function ProfitLoss({ invoices, locations, userProfile }) {
  const [period, setPeriod] = useState("all");
  if (!["admin", "manager"].includes(userProfile?.role)) return (
    <div className="page" style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Restricted Access</div>
      <div style={{ color: T.muted, marginTop: 8 }}>Only managers and admins can view financial reports.</div>
    </div>
  );
  const now = new Date();
  const filtered = invoices.filter(i => {
    const d = new Date(i.date);
    if (period === "this_month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === "last_month") { const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
    if (period === "this_year") return d.getFullYear() === now.getFullYear();
    return true;
  });
  const sells = filtered.filter(i => i.type === "sell");
  const buys = filtered.filter(i => i.type === "buy");
  const paidSells = sells.filter(i => i.status === "paid");
  const revenue = sells.reduce((s, i) => s + i.total, 0);
  const paidRevenue = paidSells.reduce((s, i) => s + i.total, 0);
  const pendingRevenue = revenue - paidRevenue;
  const cogs = sells.reduce((s, i) => s + i.cogs, 0);
  const purchases = buys.reduce((s, i) => s + i.total, 0);
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? (grossProfit / revenue * 100) : 0;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Profit & Loss</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Financial performance report</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: "auto" }}>
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
        </select>
      </div>
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 28 }}>
          <h3 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: T.accent, marginBottom: 20 }}>Income Statement</h3>
          {[
            { label: "Paid Revenue", val: revenue, color: T.green },
            { label: "Pending Revenue", val: pendingRevenue, color: T.yellow },
            { label: "Cost of Goods Sold", val: -cogs, color: T.red },
            null,
            { label: "Gross Profit", val: grossProfit, color: grossProfit >= 0 ? T.green : T.red, bold: true },
            { label: "Net Profit / Loss", val: grossProfit, color: grossProfit >= 0 ? T.green : T.red, bold: true },
            { label: "Profit Margin", val: null, text: `${margin.toFixed(1)}%`, color: T.accent, bold: true },
          ].map((row, i) => row === null
            ? <div key={i} style={{ height: 1, background: T.border, margin: "8px 0" }} />
            : <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}22` }}>
              <span style={{ fontSize: 14, color: row.bold ? T.text : T.muted, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 14, color: row.color, fontWeight: row.bold ? 800 : 400 }}>
                {row.text || (row.val >= 0 ? fmt(row.val) : `-${fmt(-row.val)}`)}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: T.accent, marginBottom: 16 }}>By Location</h3>
            <table>
              <thead><tr><th>Location</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody>
                {locations.map(l => {
                  const ls = sells.filter(i => i.location_id === l.id);
                  const lr = ls.reduce((s, i) => s + i.total, 0);
                  const lp = ls.reduce((s, i) => s + i.profit, 0);
                  return <tr key={l.id}><td style={{ fontSize: 12 }}>{l.name}</td><td style={{ fontFamily: T.mono }}>{fmt(lr)}</td><td style={{ fontFamily: T.mono, color: lp >= 0 ? T.green : T.red }}>{fmt(lp)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: T.accent, marginBottom: 16 }}>Key Metrics</h3>
            {[
              ["Sales Invoices", sells.length],
              ["Purchase Invoices", buys.length],
              ["Avg Sale Value", fmt(sells.length ? revenue / sells.length : 0)],
              ["Total Purchases", fmt(purchases)],
              ["ROI", purchases > 0 ? `${((grossProfit / purchases) * 100).toFixed(1)}%` : "N/A"],
            ].map(([lbl, val], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.border}22` }}>
                <span style={{ fontSize: 13, color: T.muted }}>{lbl}</span>
                <span style={{ fontFamily: T.mono, fontSize: 13, color: T.accent }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CLIENTS PAGE ─────────────────────────────────────────────────────────────
function ClientsPage({ clients, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  const save = async () => {
    if (editClient) {
      if (!editClient.name) return;
      setSaving(true);
      await supabase.from("clients").update({ name: editClient.name, phone: editClient.phone, email: editClient.email, address: editClient.address, notes: editClient.notes }).eq("id", editClient.id);
      setEditClient(null);
    } else {
      if (!form.name) return;
      setSaving(true);
      await supabase.from("clients").insert(form);
      setShowAdd(false);
    }
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    onRefresh();
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    await supabase.from("clients").delete().eq("id", id);
    onRefresh();
  };

  const fields = [["name","Name *"],["phone","Phone"],["email","Email"],["address","Address"],["notes","Notes"]];

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Clients</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{clients.length} clients registered</p>
        </div>
        <Btn onClick={() => { setShowAdd(!showAdd); setEditClient(null); setForm({ name: "", phone: "", email: "", address: "", notes: "" }); }}>+ Add Client</Btn>
      </div>

      {(showAdd || editClient) && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>{editClient ? "✏️ Edit Client" : "New Client"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {fields.map(([k, lbl]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>{lbl}</div>
                <input value={editClient ? editClient[k] || "" : form[k]} onChange={e => editClient ? setEditClient({ ...editClient, [k]: e.target.value }) : setForm({ ...form, [k]: e.target.value })} placeholder={lbl} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn onClick={save} loading={saving}>Save</Btn>
            <Btn outline onClick={() => { setShowAdd(false); setEditClient(null); }}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th className="hide-mobile">Email</th><th className="hide-mobile">Address</th><th>Actions</th></tr></thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>👤 {c.name}</td>
                <td style={{ fontFamily: T.mono, fontSize: 12 }}>{c.phone || "—"}</td>
                <td className="hide-mobile" style={{ fontSize: 12, color: T.muted }}>{c.email || "—"}</td>
                <td className="hide-mobile" style={{ fontSize: 12, color: T.muted }}>{c.address || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setEditClient(c); setShowAdd(false); }} style={{ background: T.accent+"22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 8px", color: T.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => del(c.id)} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: T.muted, padding: 32 }}>No clients yet. Add your first client!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SUPPLIERS PAGE ───────────────────────────────────────────────────────────
function SuppliersPage({ suppliers, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", contact_person: "", address: "", notes: "" });

  const save = async () => {
    if (editSupplier) {
      if (!editSupplier.name) return;
      setSaving(true);
      await supabase.from("suppliers").update({ name: editSupplier.name, phone: editSupplier.phone, email: editSupplier.email, contact_person: editSupplier.contact_person, address: editSupplier.address, notes: editSupplier.notes }).eq("id", editSupplier.id);
      setEditSupplier(null);
    } else {
      if (!form.name) return;
      setSaving(true);
      await supabase.from("suppliers").insert(form);
      setShowAdd(false);
    }
    setForm({ name: "", phone: "", email: "", contact_person: "", address: "", notes: "" });
    onRefresh();
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    onRefresh();
  };

  const fields = [["name","Name *"],["phone","Phone"],["email","Email"],["contact_person","Contact Person"],["address","Address"],["notes","Notes"]];

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Suppliers</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{suppliers.length} suppliers registered</p>
        </div>
        <Btn onClick={() => { setShowAdd(!showAdd); setEditSupplier(null); setForm({ name: "", phone: "", email: "", contact_person: "", address: "", notes: "" }); }}>+ Add Supplier</Btn>
      </div>

      {(showAdd || editSupplier) && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>{editSupplier ? "✏️ Edit Supplier" : "New Supplier"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {fields.map(([k, lbl]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>{lbl}</div>
                <input value={editSupplier ? editSupplier[k] || "" : form[k]} onChange={e => editSupplier ? setEditSupplier({ ...editSupplier, [k]: e.target.value }) : setForm({ ...form, [k]: e.target.value })} placeholder={lbl} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn onClick={save} loading={saving}>Save</Btn>
            <Btn outline onClick={() => { setShowAdd(false); setEditSupplier(null); }}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th className="hide-mobile">Contact</th><th className="hide-mobile">Email</th><th>Actions</th></tr></thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>🏭 {s.name}</td>
                <td style={{ fontFamily: T.mono, fontSize: 12 }}>{s.phone || "—"}</td>
                <td className="hide-mobile" style={{ fontSize: 12 }}>{s.contact_person || "—"}</td>
                <td className="hide-mobile" style={{ fontSize: 12, color: T.muted }}>{s.email || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setEditSupplier(s); setShowAdd(false); }} style={{ background: T.accent+"22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 8px", color: T.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => del(s.id)} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: T.muted, padding: 32 }}>No suppliers yet. Add your first supplier!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SALES ORDERS ────────────────────────────────────────────────────────────
function SalesOrders({ products, locations, invoices, setInvoices, onRefresh }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);
  const [newOrder, setNewOrder] = useState({ location_id: "", customer: "", date: new Date().toISOString().slice(0, 10), notes: "", items: [] });
  const [itemForm, setItemForm] = useState({ productId: "", qty: 1, customPrice: "", discountPct: 0 });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sales_orders").select("*, sales_order_items(*), locations(name)").order("created_at", { ascending: false });
    setOrders((data || []).map(o => ({
      ...o,
      locationName: o.locations?.name || "",
      total: (o.sales_order_items || []).reduce((s, i) => s + i.quantity * i.price, 0),
      items: o.sales_order_items || [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const addItem = () => {
    const prod = products.find(p => p.id === +itemForm.productId);
    if (!prod) return;
    const basePrice = itemForm.customPrice !== "" ? +itemForm.customPrice : prod.sell_price;
    const discPct = +itemForm.discountPct || 0;
    const finalPrice = basePrice * (1 - discPct / 100);
    setNewOrder({ ...newOrder, items: [...newOrder.items, { productId: prod.id, name: prod.name, qty: +itemForm.qty, price: finalPrice, originalPrice: basePrice, discountPct: discPct, cost: prod.cost_price }] });
    setItemForm({ productId: "", qty: 1, customPrice: "", discountPct: 0 });
  };

  const saveOrder = async () => {
    if (!newOrder.customer || !newOrder.location_id || newOrder.items.length === 0) return;
    setSaving(true);
    const orderId = "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("sales_orders").insert({
      id: orderId, date: newOrder.date, location_id: +newOrder.location_id,
      customer: newOrder.customer, status: "draft", notes: newOrder.notes
    });
    if (!error) {
      await supabase.from("sales_order_items").insert(
        newOrder.items.map(i => ({ order_id: orderId, product_id: i.productId, product_name: i.name, quantity: i.qty, price: i.price, cost: i.cost }))
      );
      setShowCreate(false);
      setNewOrder({ location_id: "", customer: "", date: new Date().toISOString().slice(0, 10), notes: "", items: [] });
      loadOrders();
    }
    setSaving(false);
  };

  const updateStatus = async (id, status) => {
    await supabase.from("sales_orders").update({ status }).eq("id", id);
    loadOrders();
  };

  const convertToInvoice = async (order) => {
    setConverting(order.id);
    const invId = "INV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("invoices").insert({
      id: invId, type: "sell", date: order.date,
      location_id: order.location_id, customer: order.customer, status: "paid", payment_status: "paid"
    });
    if (!error) {
      await supabase.from("invoice_items").insert(
        order.items.map(i => ({ invoice_id: invId, product_id: +i.product_id, product_name: i.product_name, quantity: +i.quantity, price: i.price, cost: i.cost }))
      );
      // Deduct stock using id-based update
      for (const item of order.items) {
        const { data: stockRow, error: sErr } = await supabase.from("stock").select("id, quantity").eq("product_id", +item.product_id).eq("location_id", +order.location_id).single();
        if (stockRow && !sErr) {
          await supabase.from("stock").update({ quantity: Math.max(0, stockRow.quantity - +item.quantity) }).eq("id", stockRow.id);
        }
      }
      await supabase.from("sales_orders").update({ status: "invoiced" }).eq("id", order.id);
      loadOrders();
      onRefresh();
    }
    setConverting(null);
  };

  const statusColor = { draft: T.muted, confirmed: T.yellow, invoiced: T.green, cancelled: T.red };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Sales Orders</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Create orders before finalizing invoices</p>
        </div>
        <Btn onClick={() => setShowCreate(!showCreate)}>+ New Order</Btn>
      </div>

      {/* How it works */}
      <div style={{ background: T.card, border: `1px solid ${T.accent}33`, borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { step: "1", label: "Create Order", desc: "Draft — no stock deducted", color: T.muted },
          { step: "2", label: "Confirm Order", desc: "Customer confirmed", color: T.yellow },
          { step: "3", label: "Convert to Invoice", desc: "Stock deducted automatically", color: T.green },
        ].map(s => (
          <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color + "22", border: `1px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: s.color }}>{s.step}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>New Sales Order</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>LOCATION</div>
              <select value={newOrder.location_id} onChange={e => setNewOrder({ ...newOrder, location_id: e.target.value })}>
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>CUSTOMER</div>
              <input value={newOrder.customer} onChange={e => setNewOrder({ ...newOrder, customer: e.target.value })} placeholder="Customer name" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div>
              <input type="date" value={newOrder.date} onChange={e => setNewOrder({ ...newOrder, date: e.target.value })} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div>
              <input value={newOrder.notes} onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PRODUCT</div>
              <select value={itemForm.productId} onChange={e => {
                const prod = products.find(p => p.id === +e.target.value);
                setItemForm({ ...itemForm, productId: e.target.value, customPrice: prod ? prod.sell_price : "" });
              }}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.sell_price)}</option>)}
              </select>
            </div>
            <div style={{ width: 70 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>QTY</div>
              <input type="number" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} min="1" />
            </div>
            <div style={{ width: 120 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PRICE ($)</div>
              <input type="number" value={itemForm.customPrice} onChange={e => setItemForm({ ...itemForm, customPrice: e.target.value })} placeholder="Default" min="0" />
            </div>
            <div style={{ width: 90 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DISC (%)</div>
              <input type="number" value={itemForm.discountPct} onChange={e => setItemForm({ ...itemForm, discountPct: e.target.value })} placeholder="0" min="0" max="100" />
            </div>
            <Btn small onClick={addItem} disabled={!itemForm.productId}>Add</Btn>
          </div>
          {newOrder.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Disc</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {newOrder.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ fontFamily: T.mono }}>{item.qty}</td>
                      <td style={{ fontFamily: T.mono }}>
                        {item.discountPct > 0 && <span style={{ textDecoration: "line-through", color: T.muted, fontSize: 11, marginRight: 4 }}>{fmt(item.originalPrice || item.price)}</span>}
                        {fmt(item.price)}
                      </td>
                      <td style={{ fontFamily: T.mono, color: T.yellow }}>{item.discountPct > 0 ? `${item.discountPct}%` : "—"}</td>
                      <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(item.qty * item.price)}</td>
                      <td><button onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter((_, j) => j !== i) })} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 4, padding: "2px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>✕</button></td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                    <td style={{ fontFamily: T.mono, fontWeight: 800, color: T.accent }}>{fmt(newOrder.items.reduce((s, i) => s + i.qty * i.price, 0))}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn onClick={saveOrder} loading={saving} disabled={!newOrder.customer || !newOrder.location_id || newOrder.items.length === 0}>Save Order</Btn>
            <Btn outline onClick={() => setShowCreate(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.length === 0 && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: T.muted }}>
              No sales orders yet. Create your first one!
            </div>
          )}
          {orders.map(order => (
            <div key={order.id} style={{ background: T.card, border: `1px solid ${order.status === "confirmed" ? T.yellow + "44" : T.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: T.mono, color: T.accent, fontSize: 13 }}>{order.id}</span>
                    <Badge color={statusColor[order.status]}>{order.status.toUpperCase()}</Badge>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{order.customer}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{order.locationName} · {order.date}</div>
                  {order.notes && <div style={{ fontSize: 12, color: T.muted, marginTop: 4, fontStyle: "italic" }}>{order.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: T.mono }}>{fmt(order.total)}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{order.items.length} items</div>
                </div>
              </div>

              {/* Items */}
              <div style={{ background: T.surface, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
                <table>
                  <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 13 }}>{item.product_name}</td>
                        <td style={{ fontFamily: T.mono }}>{item.quantity}</td>
                        <td style={{ fontFamily: T.mono }}>{fmt(item.price)}</td>
                        <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(item.quantity * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {order.status === "draft" && (
                  <Btn small onClick={() => updateStatus(order.id, "confirmed")} color={T.yellow}>✓ Confirm Order</Btn>
                )}
                {order.status === "confirmed" && (
                  <Btn small onClick={() => convertToInvoice(order)} loading={converting === order.id} color={T.green}>⚡ Convert to Invoice</Btn>
                )}
                {order.status === "draft" && (
                  <Btn small outline onClick={() => updateStatus(order.id, "cancelled")} color={T.red}>✕ Cancel</Btn>
                )}
                {(order.status === "draft" || order.status === "cancelled") && (
                  <button onClick={async () => { if(window.confirm("Delete this order permanently?")) { await supabase.from("sales_order_items").delete().eq("order_id", order.id); await supabase.from("sales_orders").delete().eq("id", order.id); loadOrders(); }}} style={{ background:T.red+"22", border:`1px solid ${T.red}44`, borderRadius:6, padding:"6px 12px", color:T.red, fontSize:12, cursor:"pointer" }}>🗑️ Delete</button>
                )}
                {order.status === "invoiced" && (
                  <span style={{ fontSize: 12, color: T.green, fontFamily: T.mono }}>✓ Invoice created successfully</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOCATIONS MANAGEMENT ────────────────────────────────────────────────────
function LocationsManagement({ locations, onRefresh, userProfile }) {
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [editLoc, setEditLoc] = useState(null);
  const canEdit = ["admin"].includes(userProfile?.role);

  const addLocation = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await supabase.from("locations").insert({ name: newName.trim() });
    setNewName("");
    onRefresh();
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editLoc?.name.trim()) return;
    setSaving(true);
    await supabase.from("locations").update({ name: editLoc.name }).eq("id", editLoc.id);
    setEditLoc(null);
    onRefresh();
    setSaving(false);
  };

  const deleteLocation = async (id) => {
    if (!window.confirm("Delete this location? Stock data for this location will also be removed.")) return;
    await supabase.from("stock").delete().eq("location_id", id);
    await supabase.from("locations").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Manage Locations</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>Add, edit or remove your business locations</p>

      {/* Edit Modal */}
      {editLoc && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: T.accent }}>✏️ Edit Location</h3>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, textTransform: "uppercase" }}>Location Name</div>
            <input value={editLoc.name} onChange={e => setEditLoc({...editLoc, name: e.target.value})} style={{ marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveEdit} loading={saving}>Save</Btn>
              <Btn outline onClick={() => setEditLoc(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Add new location */}
      {canEdit && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>+ Add New Location</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>Location Name</div>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Branch D - North" onKeyDown={e => e.key === "Enter" && addLocation()} />
            </div>
            <Btn onClick={addLocation} loading={saving} disabled={!newName.trim()}>Add Location</Btn>
          </div>
        </div>
      )}

      {/* Locations list */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table>
          <thead><tr><th>#</th><th>Location Name</th><th>Created</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {locations.map(l => (
              <tr key={l.id}>
                <td style={{ fontFamily: T.mono, color: T.muted, fontSize: 12 }}>{l.id}</td>
                <td style={{ fontWeight: 600, fontSize: 15 }}>🏢 {l.name}</td>
                <td style={{ color: T.muted, fontSize: 12 }}>{l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}</td>
                {canEdit && <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditLoc(l)} style={{ background: T.accent + "22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 10px", color: T.accent, fontSize: 12, cursor: "pointer" }}>✏️ Edit</button>
                    <button onClick={() => deleteLocation(l.id)} style={{ background: T.red + "22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 10px", color: T.red, fontSize: 12, cursor: "pointer" }}>🗑️ Delete</button>
                  </div>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LOCATIONS PAGE ───────────────────────────────────────────────────────────
function LocationsPage({ products, invoices, locations }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (locations.length && !selected) setSelected(locations[0].id); }, [locations]);
  const loc = locations.find(l => l.id === selected);
  const locInvoices = invoices.filter(i => i.location_id === selected);
  const sells = locInvoices.filter(i => i.type === "sell");
  const revenue = sells.reduce((s, i) => s + i.total, 0);
  const profit = sells.reduce((s, i) => s + i.profit, 0);
  const locProducts = products.map(p => ({ ...p, locStock: p.stockByLocation?.[selected] || 0 })).filter(p => p.locStock > 0);

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Locations</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>Performance per branch</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
        {locations.map(l => (
          <button key={l.id} onClick={() => setSelected(l.id)} style={{ background: selected === l.id ? T.accent : T.card, color: selected === l.id ? "#000" : T.text, border: `1px solid ${selected === l.id ? T.accent : T.border}`, borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: selected === l.id ? 700 : 400, transition: "all .15s" }}>{l.name}</button>
        ))}
      </div>
      {loc && (
        <>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard label="Revenue" value={fmt(revenue)} icon="💰" color={T.green} />
            <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit >= 0 ? T.green : T.red} />
            <StatCard label="Invoices" value={locInvoices.length} icon="🧾" color={T.accent} />
          </div>
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.accent }}>Stock at {loc.name}</h3>
              </div>
              <table>
                <thead><tr><th>Product</th><th>Stock</th><th>Value</th></tr></thead>
                <tbody>
                  {locProducts.map(p => (
                    <tr key={p.id}><td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td><td style={{ fontFamily: T.mono, color: p.locStock < 5 ? T.red : T.green }}>{p.locStock}</td><td style={{ fontFamily: T.mono }}>{fmt(p.locStock * p.cost_price)}</td></tr>
                  ))}
                  {locProducts.length === 0 && <tr><td colSpan={3} style={{ color: T.muted, textAlign: "center", padding: 24 }}>No stock at this location</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.accent }}>Recent Invoices</h3>
              </div>
              <table>
                <thead><tr><th>Invoice</th><th>Type</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {locInvoices.slice(0, 8).map(inv => (
                    <tr key={inv.id}><td style={{ fontFamily: T.mono, fontSize: 12, color: T.accent }}>{inv.id}</td><td><Badge color={inv.type === "sell" ? T.green : T.yellow}>{inv.type === "sell" ? "SALE" : "BUY"}</Badge></td><td style={{ fontFamily: T.mono }}>{fmt(inv.total)}</td><td><Badge color={inv.status === "paid" ? T.green : T.yellow}>{inv.status?.toUpperCase()}</Badge></td></tr>
                  ))}
                  {locInvoices.length === 0 && <tr><td colSpan={4} style={{ color: T.muted, textAlign: "center", padding: 24 }}>No invoices</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────
function ExpensesPage({ locations, onRefresh }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), category: "", description: "", amount: "", location_id: "" });
  const CATEGORIES = ["Rent","Utilities","Salaries","Transport","Marketing","Maintenance","Office Supplies","Other"];

  useEffect(() => {
    supabase.from("expenses").select("*, locations(name)").order("date", { ascending: false }).then(({ data }) => {
      setExpenses((data||[]).map(e => ({ ...e, locationName: e.locations?.name || "" })));
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    await supabase.from("expenses").insert({ ...form, amount: +form.amount, location_id: form.location_id ? +form.location_id : null });
    setForm({ date: new Date().toISOString().slice(0,10), category: "", description: "", amount: "", location_id: "" });
    setShowAdd(false);
    const { data } = await supabase.from("expenses").select("*, locations(name)").order("date", { ascending: false });
    setExpenses((data||[]).map(e => ({ ...e, locationName: e.locations?.name || "" })));
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const total = expenses.reduce((s, e) => s + +e.amount, 0);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Expenses</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Total: <span style={{ color: T.red, fontWeight: 700 }}>{fmt(total)}</span></p>
        </div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ Add Expense</Btn>
      </div>

      {showAdd && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>New Expense</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>CATEGORY</div>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DESCRIPTION</div><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" /></div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>AMOUNT ($)</div><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" /></div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>LOCATION</div>
              <select value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})}>
                <option value="">All / General</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn onClick={save} loading={saving}>Save</Btn>
            <Btn outline onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Location</th><th>Amount</th><th>Del</th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontFamily: T.mono, fontSize: 12 }}>{e.date}</td>
                  <td><Badge color={T.yellow}>{e.category || "Other"}</Badge></td>
                  <td style={{ fontWeight: 600 }}>{e.description}</td>
                  <td style={{ fontSize: 12, color: T.muted }}>{e.locationName || "General"}</td>
                  <td style={{ fontFamily: T.mono, color: T.red, fontWeight: 700 }}>{fmt(e.amount)}</td>
                  <td><button onClick={() => del(e.id)} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: T.muted, padding: 32 }}>No expenses recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── STOCK TRANSFER ───────────────────────────────────────────────────────────
function StockTransfer({ products, locations, onRefresh }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTransfer, setEditTransfer] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), from_location_id: "", to_location_id: "", product_id: "", quantity: 1, notes: "" });

  const load = async () => {
    const { data } = await supabase.from("stock_transfers").select("*").order("date", { ascending: false });
    setTransfers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.from_location_id || !form.to_location_id || !form.product_id || form.from_location_id === form.to_location_id) return;
    setSaving(true);
    const prod = products.find(p => p.id === +form.product_id);
    const tid = "TRF-" + Math.random().toString(36).slice(2,8).toUpperCase();
    const fromStock = prod?.stockByLocation?.[+form.from_location_id] || 0;
    if (fromStock < +form.quantity) { alert(`Not enough stock! Available: ${fromStock}`); setSaving(false); return; }
    await supabase.from("stock").update({ quantity: fromStock - +form.quantity }).eq("product_id", +form.product_id).eq("location_id", +form.from_location_id);
    const { data: toStock } = await supabase.from("stock").select("quantity").eq("product_id", +form.product_id).eq("location_id", +form.to_location_id).single();
    if (toStock) {
      await supabase.from("stock").update({ quantity: toStock.quantity + +form.quantity }).eq("product_id", +form.product_id).eq("location_id", +form.to_location_id);
    } else {
      await supabase.from("stock").insert({ product_id: +form.product_id, location_id: +form.to_location_id, quantity: +form.quantity });
    }
    await supabase.from("stock_transfers").insert({ id: tid, date: form.date, from_location_id: +form.from_location_id, to_location_id: +form.to_location_id, product_id: +form.product_id, product_name: prod?.name || "", quantity: +form.quantity, notes: form.notes });
    setForm({ date: new Date().toISOString().slice(0,10), from_location_id: "", to_location_id: "", product_id: "", quantity: 1, notes: "" });
    setShowAdd(false);
    load();
    onRefresh();
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editTransfer) return;
    setSaving(true);
    await supabase.from("stock_transfers").update({ date: editTransfer.date, notes: editTransfer.notes }).eq("id", editTransfer.id);
    setEditTransfer(null);
    load();
    setSaving(false);
  };

  const del = async (t) => {
    if (!window.confirm("Delete this transfer? Stock will be reversed automatically.")) return;
    // Reverse stock: add back to from, deduct from to
    const { data: fromRow } = await supabase.from("stock").select("quantity").eq("product_id", t.product_id).eq("location_id", t.from_location_id).single();
    const { data: toRow } = await supabase.from("stock").select("quantity").eq("product_id", t.product_id).eq("location_id", t.to_location_id).single();
    if (fromRow) await supabase.from("stock").update({ quantity: fromRow.quantity + t.quantity }).eq("product_id", t.product_id).eq("location_id", t.from_location_id);
    if (toRow) await supabase.from("stock").update({ quantity: Math.max(0, toRow.quantity - t.quantity) }).eq("product_id", t.product_id).eq("location_id", t.to_location_id);
    await supabase.from("stock_transfers").delete().eq("id", t.id);
    load();
    onRefresh();
  };

  const locName = (id) => locations.find(l => l.id === id)?.name || id;

  return (
    <div className="page">
      {editTransfer && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.card, border:`1px solid ${T.accent}44`, borderRadius:16, padding:28, width:"100%", maxWidth:400 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:20, color:T.accent }}>✏️ Edit Transfer</h3>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>DATE</div>
              <input type="date" value={editTransfer.date} onChange={e => setEditTransfer({...editTransfer, date:e.target.value})} />
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>NOTES</div>
              <input value={editTransfer.notes||""} onChange={e => setEditTransfer({...editTransfer, notes:e.target.value})} placeholder="Notes" />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={saveEdit} loading={saving}>Save</Btn>
              <Btn outline onClick={() => setEditTransfer(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Stock Transfer</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Move stock between locations</p>
        </div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ New Transfer</Btn>
      </div>

      {showAdd && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>New Stock Transfer</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>FROM LOCATION</div>
              <select value={form.from_location_id} onChange={e => setForm({...form, from_location_id: e.target.value})}>
                <option value="">Select...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>TO LOCATION</div>
              <select value={form.to_location_id} onChange={e => setForm({...form, to_location_id: e.target.value})}>
                <option value="">Select...</option>
                {locations.filter(l => l.id !== +form.from_location_id).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PRODUCT</div>
              <select value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}>
                <option value="">Select...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {form.from_location_id ? (p.stockByLocation?.[+form.from_location_id]||0) : p.totalStock})</option>)}
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>QUANTITY</div><input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} min="1" /></div>
            <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional" /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn onClick={save} loading={saving} disabled={!form.from_location_id || !form.to_location_id || !form.product_id}>Transfer Stock</Btn>
            <Btn outline onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>ID</th><th>Date</th><th>Product</th><th>From</th><th>To</th><th>Qty</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 11 }}>{t.id}</td>
                  <td style={{ fontSize: 12, color: T.muted }}>{t.date}</td>
                  <td style={{ fontWeight: 600 }}>{t.product_name}</td>
                  <td><Badge color={T.red}>{locName(t.from_location_id)}</Badge></td>
                  <td><Badge color={T.green}>{locName(t.to_location_id)}</Badge></td>
                  <td style={{ fontFamily: T.mono, color: T.accent, fontWeight: 700 }}>{t.quantity}</td>
                  <td style={{ fontSize: 12, color: T.muted }}>{t.notes || "—"}</td>
                  <td>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => setEditTransfer(t)} style={{ background:T.accent+"22", border:`1px solid ${T.accent}44`, borderRadius:6, padding:"4px 8px", color:T.accent, fontSize:11, cursor:"pointer" }}>✏️</button>
                      <button onClick={() => del(t)} style={{ background:T.red+"22", border:`1px solid ${T.red}44`, borderRadius:6, padding:"4px 8px", color:T.red, fontSize:11, cursor:"pointer" }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: T.muted, padding: 32 }}>No transfers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports({ invoices, products, locations, setPage }) {
  const [period, setPeriod] = useState("all");
  const now = new Date();

  const filtered = invoices.filter(i => {
    const d = new Date(i.date);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "this_week") { const week = new Date(now); week.setDate(now.getDate()-7); return d >= week; }
    if (period === "this_month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if (period === "last_month") { const lm=new Date(now.getFullYear(),now.getMonth()-1); return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear(); }
    if (period === "this_year") return d.getFullYear()===now.getFullYear();
    return true;
  });

  const sells = filtered.filter(i => i.type==="sell");
  const buys = filtered.filter(i => i.type==="buy");
  const paidSells = sells.filter(i => i.status==="paid");
  const revenue = sells.reduce((s,i)=>s+i.total,0);
  const paidRevenue = paidSells.reduce((s,i)=>s+i.total,0);
  const pendingRevenue = revenue - paidRevenue;
  const cogs = sells.reduce((s,i)=>s+i.cogs,0);
  const profit = revenue - cogs;

  // Daily breakdown
  const daily = {};
  sells.forEach(inv => {
    if (!daily[inv.date]) daily[inv.date] = { revenue: 0, profit: 0, count: 0 };
    daily[inv.date].revenue += inv.total;
    daily[inv.date].profit += inv.profit;
    daily[inv.date].count++;
  });
  const dailyArr = Object.entries(daily).sort((a,b)=>b[0].localeCompare(a[0]));

  // Top products
  const prodSales = {};
  sells.forEach(inv => {
    (inv.invoice_items || []).forEach(item => {
      if (!prodSales[item.product_name]) prodSales[item.product_name] = { qty: 0, revenue: 0 };
      prodSales[item.product_name].qty += item.quantity || 0;
      prodSales[item.product_name].revenue += (item.quantity||0) * item.price;
    });
  });
  const topProds = Object.entries(prodSales).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,10);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Reports</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Sales performance & analytics</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: "auto" }}>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Revenue" value={fmt(revenue)} icon="💰" color={T.green} sub={`${sells.length} invoices`} onClick={() => setPage("invoices")} />
        <StatCard label="Collected" value={fmt(paidRevenue)} icon="✅" color={T.accent} sub={`${paidSells.length} paid`} onClick={() => setPage("invoices")} />
        <StatCard label="Pending Revenue" value={fmt(pendingRevenue)} icon="⏳" color={T.yellow} sub={`${sells.length - paidSells.length} pending`} onClick={() => setPage("invoices")} />
        <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit>=0?T.green:T.red} sub={`${paidRevenue>0?((profit/paidRevenue)*100).toFixed(1):0}% margin`} onClick={() => setPage("pl")} />
        <StatCard label="Purchases" value={fmt(buys.reduce((s,i)=>s+i.total,0))} icon="🛒" color={T.yellow} sub={`${buys.length} orders`} onClick={() => setPage("invoices")} />
        <StatCard label="Avg Sale" value={fmt(sells.length?revenue/sells.length:0)} icon="📊" color={T.accent} sub="per invoice" onClick={() => setPage("invoices")} />
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Daily breakdown */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.accent }}>Daily Breakdown</h3>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Sales</th><th>Revenue</th><th>Profit</th></tr></thead>
            <tbody>
              {dailyArr.slice(0, 15).map(([date, d]) => (
                <tr key={date}>
                  <td style={{ fontFamily: T.mono, fontSize: 12 }}>{date}</td>
                  <td style={{ fontFamily: T.mono, color: T.muted }}>{d.count}</td>
                  <td style={{ fontFamily: T.mono }}>{fmt(d.revenue)}</td>
                  <td style={{ fontFamily: T.mono, color: d.profit>=0?T.green:T.red }}>{fmt(d.profit)}</td>
                </tr>
              ))}
              {dailyArr.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No sales in this period</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Top products */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.accent }}>🏆 Top Products</h3>
          </div>
          <table>
            <thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topProds.map(([name, d], i) => (
                <tr key={name}>
                  <td style={{ fontFamily: T.mono, color: i===0?T.yellow:T.muted, fontWeight: i===0?800:400 }}>{i+1}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{name}</td>
                  <td style={{ fontFamily: T.mono }}>{d.qty}</td>
                  <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(d.revenue)}</td>
                </tr>
              ))}
              {topProds.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No sales data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location performance */}
      <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.accent }}>Performance by Location</h3>
        </div>
        <table>
          <thead><tr><th>Location</th><th>Sales</th><th>Revenue</th><th>Profit</th><th>Margin</th></tr></thead>
          <tbody>
            {locations.map(l => {
              const ls = sells.filter(i => i.location_id===l.id);
              const lr = ls.reduce((s,i)=>s+i.total,0);
              const lp = ls.reduce((s,i)=>s+i.profit,0);
              const lm = lr>0?(lp/lr*100).toFixed(1):0;
              return (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>🏢 {l.name}</td>
                  <td style={{ fontFamily: T.mono }}>{ls.length}</td>
                  <td style={{ fontFamily: T.mono }}>{fmt(lr)}</td>
                  <td style={{ fontFamily: T.mono, color: lp>=0?T.green:T.red }}>{fmt(lp)}</td>
                  <td style={{ fontFamily: T.mono, color: +lm>20?T.green:T.yellow }}>{lm}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CLIENT BALANCE ───────────────────────────────────────────────────────────
function ClientBalance({ clients, invoices, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "" });

  const reloadPayments = async () => {
    const { data } = await supabase.from("client_payments").select("*").eq("client_id", selected).order("date", { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => {
    if (selected) {
      supabase.from("client_payments").select("*").eq("client_id", selected).order("date", { ascending: false }).then(({ data }) => setPayments(data || []));
    }
  }, [selected]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const clientInvoices = invoices.filter(i => {
    if (i.type !== "sell" || i.client_id !== selected) return false;
    if (fromDate && i.date < fromDate) return false;
    if (toDate && i.date > toDate) return false;
    return true;
  });
  const totalCharged = clientInvoices.reduce((s,i)=>s+i.total,0);
  const totalPaid = payments.filter(p=>p.type==="payment").reduce((s,p)=>s+(+p.amount),0);
  const totalCharges = payments.filter(p=>p.type==="charge").reduce((s,p)=>s+(+p.amount),0);
  const balance = totalCharged + totalCharges - totalPaid;

  const refreshInvoices = async () => {
    const { data: allPayments } = await supabase.from("client_payments").select("*").eq("client_id", selected);
    const newTotalPaid = (allPayments || []).filter(p => p.type === "payment").reduce((s, p) => s + (+p.amount), 0);
    const allInvoices = invoices.filter(i => i.type==="sell" && i.client_id === selected);
    // Reset all invoices first
    for (const inv of allInvoices) {
      await supabase.from("invoices").update({ payment_status: "pending", status: "pending", amount_paid: 0 }).eq("id", inv.id);
    }
    let remaining = newTotalPaid;
    for (const inv of allInvoices) {
      if (remaining >= inv.total) { await supabase.from("invoices").update({ payment_status: "paid", status: "paid", amount_paid: inv.total }).eq("id", inv.id); remaining -= inv.total; }
      else if (remaining > 0) { await supabase.from("invoices").update({ payment_status: "partial", status: "partial", amount_paid: remaining }).eq("id", inv.id); remaining = 0; }
    }
    onRefresh();
  };

  const save = async () => {
    if (!form.amount || !selected) return;
    setSaving(true);
    await supabase.from("client_payments").insert({ client_id: selected, date: form.date, amount: +form.amount, type: form.type, notes: form.notes });
    await refreshInvoices();
    setForm({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "" });
    setShowAdd(false);
    await reloadPayments();
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editPayment) return;
    setSaving(true);
    await supabase.from("client_payments").update({ date: editPayment.date, amount: +editPayment.amount, type: editPayment.type, notes: editPayment.notes }).eq("id", editPayment.id);
    await refreshInvoices();
    setEditPayment(null);
    await reloadPayments();
    setSaving(false);
  };

  const delPayment = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    await supabase.from("client_payments").delete().eq("id", id);
    await refreshInvoices();
    await reloadPayments();
  };

  const printClientPayment = (p, clientName) => {
    const html = `<!DOCTYPE html><html><head><title>Payment Record</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; max-width: 400px; margin: 0 auto; }
      h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
      .box { border: 2px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      .row:last-child { border-bottom: none; }
      .label { color: #666; }
      .value { font-weight: 700; }
      .amount { font-size: 22px; font-weight: 800; color: #006600; text-align: center; padding: 16px; border: 2px solid #006600; border-radius: 8px; margin: 16px 0; }
      .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <h1>⚡ ElectroPro</h1>
      <div class="subtitle">${p.type === "payment" ? "RECEIPT VOUCHER" : "CHARGE VOUCHER"}</div>
      <div class="amount">$${Number(p.amount).toFixed(2)}</div>
      <div class="box">
        <div class="row"><span class="label">Date</span><span class="value">${p.date}</span></div>
        <div class="row"><span class="label">Client</span><span class="value">${clientName}</span></div>
        <div class="row"><span class="label">Type</span><span class="value">${p.type === "payment" ? "Payment Received" : "Additional Charge"}</span></div>
        ${p.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${p.notes}</span></div>` : ""}
      </div>
      <div class="footer">Thank you! • ElectroPro Business Manager</div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=500,height=650");
    w.document.write(html);
    w.document.close();
  };

  const printClientLedger = () => {
    const clientName = clients.find(c => c.id === selected)?.name || "";
    const ledgerRows = [
      ...clientInvoices.map(inv => ({ date: inv.date, desc: `Invoice ${inv.id}`, debit: inv.total, credit: 0 })),
      ...payments.filter(p => {
        if (fromDate && p.date < fromDate) return false;
        if (toDate && p.date > toDate) return false;
        return true;
      }).map(p => ({ date: p.date, desc: p.type === "payment" ? "Payment Received" : "Additional Charge", notes: p.notes || "", debit: p.type === "charge" ? +p.amount : 0, credit: p.type === "payment" ? +p.amount : 0 })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const rows = ledgerRows.map(r => {
      running += r.debit - r.credit;
      return `<tr><td>${r.date}</td><td>${r.desc}</td><td>${r.notes||"—"}</td><td style="color:#cc0000">${r.debit > 0 ? "$"+r.debit.toFixed(2) : "—"}</td><td style="color:#006600">${r.credit > 0 ? "$"+r.credit.toFixed(2) : "—"}</td><td style="font-weight:800;color:${running>0?"#cc0000":"#006600"}">${"$"+Math.abs(running).toFixed(2)+" "+(running>0?"DR":"CR")}</td></tr>`;
    }).join("");
    const period = fromDate || toDate ? ` (${fromDate||"start"} → ${toDate||"today"})` : " (All Time)";
    const html = `<!DOCTYPE html><html><head><title>Ledger - ${clientName}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
      h1 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #000; color: #fff; padding: 8px; text-align: left; }
      td { padding: 7px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f9f9f9; }
      .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
    </style></head><body>
      <h1>⚡ ElectroPro — Client Ledger</h1>
      <h2>${clientName}${period}</h2>
      <table><thead><tr><th>Date</th><th>Description</th><th>Notes</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Printed: ${new Date().toLocaleDateString()} • ElectroPro Business Manager</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Client Balance Sheet</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>Track what each client owes you</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {clients.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)} style={{ background: selected===c.id?T.accent:T.card, color: selected===c.id?"#000":T.text, border: `1px solid ${selected===c.id?T.accent:T.border}`, borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: selected===c.id?700:400 }}>👤 {c.name}</button>
        ))}
      </div>

      {selected && (
        <>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Charged" value={fmt(totalCharged)} icon="🧾" color={T.accent} sub={`${clientInvoices.length} invoices`} />
            <StatCard label="Total Paid" value={fmt(totalPaid)} icon="✅" color={T.green} />
            <StatCard label="Balance Due" value={fmt(balance)} icon="💳" color={balance>0?T.red:T.green} sub={balance>0?"Outstanding":"Fully paid"} />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>📅 From:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: "auto" }} />
            <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>To:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: "auto" }} />
            <button onClick={() => { setFromDate(""); setToDate(""); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", color: T.muted, fontSize: 11, cursor: "pointer" }}>Clear</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={printClientLedger} style={{ background: T.green+"22", border: `1px solid ${T.green}44`, borderRadius: 8, padding: "6px 14px", color: T.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Print Ledger</button>
              <Btn small onClick={() => setShowAdd(!showAdd)}>+ Record Payment</Btn>
            </div>
          </div>

          {showAdd && (
            <div style={{ background: T.card, border: `1px solid ${T.green}44`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div><input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>TYPE</div>
                  <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                    <option value="payment">Payment Received</option>
                    <option value="charge">Additional Charge</option>
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>AMOUNT ($)</div><input type="number" value={form.amount} onChange={e => setForm({...form,amount:e.target.value})} placeholder="0.00" /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div><input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Optional" /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Btn small onClick={save} loading={saving}>Save</Btn>
                <Btn small outline onClick={() => setShowAdd(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {editPayment && (
            <div style={{ background: T.card, border: `1px solid ${T.yellow}44`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.yellow }}>✏️ Edit Payment</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div><input type="date" value={editPayment.date} onChange={e => setEditPayment({...editPayment,date:e.target.value})} /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>TYPE</div>
                  <select value={editPayment.type} onChange={e => setEditPayment({...editPayment,type:e.target.value})}>
                    <option value="payment">Payment Received</option>
                    <option value="charge">Additional Charge</option>
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>AMOUNT ($)</div><input type="number" value={editPayment.amount} onChange={e => setEditPayment({...editPayment,amount:e.target.value})} /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div><input value={editPayment.notes||""} onChange={e => setEditPayment({...editPayment,notes:e.target.value})} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Btn small onClick={saveEdit} loading={saving}>Save Changes</Btn>
                <Btn small outline onClick={() => setEditPayment(null)}>Cancel</Btn>
              </div>
            </div>
          )}

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Notes</th>
                  <th style={{ color: T.red }}>Debit (Charged)</th>
                  <th style={{ color: T.green }}>Credit (Paid)</th>
                  <th style={{ color: T.accent }}>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Build combined ledger: invoices as debits, payments as credits
                  const ledgerRows = [
                    ...clientInvoices.map(inv => ({ date: inv.date, desc: `Invoice ${inv.id}`, notes: "", debit: inv.total, credit: 0, id: inv.id, isInv: true })),
                    ...payments.map(p => ({ date: p.date, desc: p.type === "payment" ? "Payment Received" : "Additional Charge", notes: p.notes || "", debit: p.type === "charge" ? +p.amount : 0, credit: p.type === "payment" ? +p.amount : 0, id: p.id, isInv: false, raw: p })),
                  ].sort((a, b) => a.date.localeCompare(b.date));
                  let runningBalance = 0;
                  return ledgerRows.map((row, i) => {
                    runningBalance += row.debit - row.credit;
                    return (
                      <tr key={i} style={{ background: row.isInv ? T.surface+"88" : "transparent" }}>
                        <td style={{ fontFamily: T.mono, fontSize: 12 }}>{row.date}</td>
                        <td style={{ fontSize: 12, fontWeight: row.isInv ? 700 : 400, color: row.isInv ? T.accent : T.text }}>{row.desc}</td>
                        <td style={{ fontSize: 12, color: T.muted }}>{row.notes || "—"}</td>
                        <td style={{ fontFamily: T.mono, color: T.red, fontWeight: 700 }}>{row.debit > 0 ? fmt(row.debit) : "—"}</td>
                        <td style={{ fontFamily: T.mono, color: T.green, fontWeight: 700 }}>{row.credit > 0 ? fmt(row.credit) : "—"}</td>
                        <td style={{ fontFamily: T.mono, fontWeight: 800, color: runningBalance > 0 ? T.red : T.green }}>{fmt(Math.abs(runningBalance))}{runningBalance > 0 ? " DR" : " CR"}</td>
                        <td>
                          {!row.isInv && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setEditPayment(row.raw)} style={{ background: T.accent+"22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 8px", color: T.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                              <button onClick={() => delPayment(row.id)} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
                {payments.length === 0 && clientInvoices.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No records yet</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: T.accent, textTransform: "uppercase", letterSpacing: 1 }}>Invoice History</h3>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead>
              <tbody>
                {(() => {
                  const allInvsSorted = [...clientInvoices].sort((a,b) => a.date.localeCompare(b.date));
                  let rem = totalPaid;
                  const paidMap = {};
                  for (const inv of allInvsSorted) {
                    if (rem >= inv.total) { paidMap[inv.id] = inv.total; rem -= inv.total; }
                    else if (rem > 0) { paidMap[inv.id] = rem; rem = 0; }
                    else { paidMap[inv.id] = 0; }
                  }
                  return clientInvoices.map(inv => {
                    const paid = paidMap[inv.id] || 0;
                    const remaining = inv.total - paid;
                    const statusColor = paid >= inv.total ? T.green : paid > 0 ? T.yellow : T.red;
                    const statusLabel = paid >= inv.total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 12 }}>{inv.id}</td>
                        <td style={{ fontSize: 12 }}>{inv.date}</td>
                        <td style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(inv.total)}</td>
                        <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(paid)}</td>
                        <td style={{ fontFamily: T.mono, color: remaining > 0 ? T.red : T.green }}>{fmt(remaining)}</td>
                        <td><Badge color={statusColor}>{statusLabel}</Badge></td>
                      </tr>
                    );
                  });
                })()}
                {clientInvoices.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No invoices for this client</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!selected && clients.length > 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Select a client above to view their balance sheet</div>}
      {clients.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>No clients yet. Add clients first!</div>}
    </div>
  );
}

// ─── SUPPLIER BALANCE ─────────────────────────────────────────────────────────
function SupplierBalance({ suppliers, invoices, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "", payment_method: "cash_usd" });

  const reloadPayments = async () => {
    const { data } = await supabase.from("supplier_payments").select("*").eq("supplier_id", selected).order("date", { ascending: false });
    setPayments(data || []);
  };

  const syncPayments = async () => {
    if (!selected) return;
    setSyncing(true);
    // Get all payments from payments table for this supplier
    const { data: paymentsData } = await supabase.from("payments").select("*").eq("supplier_id", selected);
    // Get all existing supplier_payments for this supplier
    const { data: existingData } = await supabase.from("supplier_payments").select("*").eq("supplier_id", selected);
    const existing = existingData || [];
    // Find payments not yet in supplier_payments (match by date + amount)
    for (const p of (paymentsData || [])) {
      const alreadyExists = existing.some(e => e.type === "payment" && +e.amount === +p.amount && e.date === p.date);
      if (!alreadyExists) {
        await supabase.from("supplier_payments").insert({
          supplier_id: selected, date: p.date, amount: +p.amount,
          type: "payment", notes: p.notes || null, payment_method: p.payment_method || null,
        });
      }
    }
    await reloadPayments();
    await refreshInvoices();
    setSyncing(false);
    alert("✅ Payments synced!");
  };

  useEffect(() => {
    if (selected) {
      supabase.from("supplier_payments").select("*").eq("supplier_id", selected).order("date", { ascending: false }).then(({ data }) => setPayments(data || []));
    }
  }, [selected]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const supplierInvoices = invoices.filter(i => {
    if (i.type !== "buy" || i.supplier_id !== selected) return false;
    if (fromDate && i.date < fromDate) return false;
    if (toDate && i.date > toDate) return false;
    return true;
  });
  const totalOwed = supplierInvoices.reduce((s,i)=>s+i.total,0);
  const totalPaid = payments.filter(p=>p.type==="payment").reduce((s,p)=>s+(+p.amount),0);
  const totalCharges = payments.filter(p=>p.type==="charge").reduce((s,p)=>s+(+p.amount),0);
  const balance = totalOwed + totalCharges - totalPaid;

  const refreshInvoices = async () => {
    const { data: allPayments } = await supabase.from("supplier_payments").select("*").eq("supplier_id", selected);
    const newTotalPaid = (allPayments || []).filter(p => p.type === "payment").reduce((s, p) => s + (+p.amount), 0);
    const allInvoices = invoices.filter(i => i.type==="buy" && i.supplier_id === selected);
    for (const inv of allInvoices) {
      await supabase.from("invoices").update({ payment_status: "pending", status: "pending", amount_paid: 0 }).eq("id", inv.id);
    }
    let remaining = newTotalPaid;
    for (const inv of allInvoices) {
      if (remaining >= inv.total) { await supabase.from("invoices").update({ payment_status: "paid", status: "paid", amount_paid: inv.total }).eq("id", inv.id); remaining -= inv.total; }
      else if (remaining > 0) { await supabase.from("invoices").update({ payment_status: "partial", status: "partial", amount_paid: remaining }).eq("id", inv.id); remaining = 0; }
    }
    onRefresh();
  };

  const save = async () => {
    if (!form.amount || !selected) return;
    setSaving(true);
    await supabase.from("supplier_payments").insert({ supplier_id: selected, date: form.date, amount: +form.amount, type: form.type, notes: form.notes });
    // Also insert into payments table if it's a payment (not a charge)
    if (form.type === "payment") {
      const payId = "PAY-" + Math.random().toString(36).slice(2,8).toUpperCase();
      await supabase.from("payments").insert({
        id: payId, supplier_id: selected, date: form.date,
        amount: +form.amount, payment_method: form.payment_method || "cash_usd", notes: form.notes || null,
      });
    }
    await refreshInvoices();
    setForm({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "", payment_method: "cash_usd" });
    setShowAdd(false);
    await reloadPayments();
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editPayment) return;
    setSaving(true);
    await supabase.from("supplier_payments").update({ date: editPayment.date, amount: +editPayment.amount, type: editPayment.type, notes: editPayment.notes }).eq("id", editPayment.id);
    await refreshInvoices();
    setEditPayment(null);
    await reloadPayments();
    setSaving(false);
  };

  const delPayment = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    // Get details before deleting for cross-table sync
    const sp = payments.find(p => p.id === id);
    await supabase.from("supplier_payments").delete().eq("id", id);
    // Also delete matching record from payments table
    if (sp && sp.type === "payment") {
      const { data: pRows } = await supabase.from("payments")
        .select("id").eq("supplier_id", selected)
        .eq("amount", sp.amount).eq("date", sp.date).limit(1);
      if (pRows && pRows.length > 0) {
        await supabase.from("payments").delete().eq("id", pRows[0].id);
      }
    }
    await refreshInvoices();
    await reloadPayments();
  };

  const printSupplierPayment = (p, supplierName) => {
    const html = `<!DOCTYPE html><html><head><title>Payment Voucher</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; max-width: 400px; margin: 0 auto; }
      h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
      .box { border: 2px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      .row:last-child { border-bottom: none; }
      .label { color: #666; }
      .value { font-weight: 700; }
      .amount { font-size: 22px; font-weight: 800; color: #cc0000; text-align: center; padding: 16px; border: 2px solid #cc0000; border-radius: 8px; margin: 16px 0; }
      .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <h1>⚡ ElectroPro</h1>
      <div class="subtitle">${p.type === "payment" ? "PAYMENT VOUCHER" : "CHARGE VOUCHER"}</div>
      <div class="amount">$${Number(p.amount).toFixed(2)}</div>
      <div class="box">
        <div class="row"><span class="label">Date</span><span class="value">${p.date}</span></div>
        <div class="row"><span class="label">Supplier</span><span class="value">${supplierName}</span></div>
        <div class="row"><span class="label">Type</span><span class="value">${p.type === "payment" ? "Payment Made" : "Additional Charge"}</span></div>
        ${p.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${p.notes}</span></div>` : ""}
      </div>
      <div class="footer">ElectroPro Business Manager</div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=500,height=650");
    w.document.write(html);
    w.document.close();
  };

  const printSupplierLedger = () => {
    const supplierName = suppliers.find(s => s.id === selected)?.name || "";
    const ledgerRows = [
      ...supplierInvoices.map(inv => ({ date: inv.date, desc: `Invoice ${inv.id}`, notes: "", debit: inv.total, credit: 0 })),
      ...payments.filter(p => {
        if (fromDate && p.date < fromDate) return false;
        if (toDate && p.date > toDate) return false;
        return true;
      }).map(p => ({ date: p.date, desc: p.type === "payment" ? "Payment Made" : "Additional Charge", notes: p.notes || "", debit: p.type === "charge" ? +p.amount : 0, credit: p.type === "payment" ? +p.amount : 0 })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const rows = ledgerRows.map(r => {
      running += r.debit - r.credit;
      return `<tr><td>${r.date}</td><td>${r.desc}</td><td>${r.notes||"—"}</td><td style="color:#cc0000">${r.debit > 0 ? "$"+r.debit.toFixed(2) : "—"}</td><td style="color:#006600">${r.credit > 0 ? "$"+r.credit.toFixed(2) : "—"}</td><td style="font-weight:800;color:${running>0?"#cc0000":"#006600"}">${"$"+Math.abs(running).toFixed(2)+" "+(running>0?"DR":"CR")}</td></tr>`;
    }).join("");
    const period = fromDate || toDate ? ` (${fromDate||"start"} → ${toDate||"today"})` : " (All Time)";
    const html = `<!DOCTYPE html><html><head><title>Ledger - ${supplierName}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
      h1 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #000; color: #fff; padding: 8px; text-align: left; }
      td { padding: 7px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f9f9f9; }
      .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
    </style></head><body>
      <h1>⚡ ElectroPro — Supplier Ledger</h1>
      <h2>${supplierName}${period}</h2>
      <table><thead><tr><th>Date</th><th>Description</th><th>Notes</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Printed: ${new Date().toLocaleDateString()} • ElectroPro Business Manager</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Supplier Balance Sheet</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>Track what you owe each supplier</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {suppliers.map(s => (
          <button key={s.id} onClick={() => setSelected(s.id)} style={{ background: selected===s.id?T.accent:T.card, color: selected===s.id?"#000":T.text, border: `1px solid ${selected===s.id?T.accent:T.border}`, borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: selected===s.id?700:400 }}>🏭 {s.name}</button>
        ))}
      </div>

      {selected && (
        <>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Purchases" value={fmt(totalOwed)} icon="🛒" color={T.accent} sub={`${supplierInvoices.length} invoices`} />
            <StatCard label="Total Paid" value={fmt(totalPaid)} icon="✅" color={T.green} />
            <StatCard label="Balance Owed" value={fmt(balance)} icon="💳" color={balance>0?T.red:T.green} sub={balance>0?"You owe this":"All paid"} />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>📅 From:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: "auto" }} />
            <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>To:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: "auto" }} />
            <button onClick={() => { setFromDate(""); setToDate(""); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", color: T.muted, fontSize: 11, cursor: "pointer" }}>Clear</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={syncPayments} disabled={syncing} style={{ background: T.yellow+"22", border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: "6px 14px", color: T.yellow, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{syncing ? "⏳ Syncing..." : "🔄 Sync Payments"}</button>
              <button onClick={printSupplierLedger} style={{ background: T.green+"22", border: `1px solid ${T.green}44`, borderRadius: 8, padding: "6px 14px", color: T.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Print Ledger</button>
              <Btn small onClick={() => setShowAdd(!showAdd)}>+ Record Payment</Btn>
            </div>
          </div>

          {showAdd && (
            <div style={{ background: T.card, border: `1px solid ${T.green}44`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div><input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>TYPE</div>
                  <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                    <option value="payment">Payment Made</option>
                    <option value="charge">Additional Charge</option>
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>AMOUNT ($)</div><input type="number" value={form.amount} onChange={e => setForm({...form,amount:e.target.value})} placeholder="0.00" /></div>
                {form.type === "payment" && (
                  <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PAYMENT METHOD</div>
                    <select value={form.payment_method} onChange={e => setForm({...form,payment_method:e.target.value})}>
                      <option value="cash_usd">💵 Cash USD</option>
                      <option value="wallet_usdt">💎 Wallet USDT</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                    </select>
                  </div>
                )}
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div><input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Optional" /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Btn small onClick={save} loading={saving}>Save</Btn>
                <Btn small outline onClick={() => setShowAdd(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {editPayment && (
            <div style={{ background: T.card, border: `1px solid ${T.yellow}44`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: T.yellow }}>✏️ Edit Payment</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div><input type="date" value={editPayment.date} onChange={e => setEditPayment({...editPayment,date:e.target.value})} /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>TYPE</div>
                  <select value={editPayment.type} onChange={e => setEditPayment({...editPayment,type:e.target.value})}>
                    <option value="payment">Payment Made</option>
                    <option value="charge">Additional Charge</option>
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>AMOUNT ($)</div><input type="number" value={editPayment.amount} onChange={e => setEditPayment({...editPayment,amount:e.target.value})} /></div>
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div><input value={editPayment.notes||""} onChange={e => setEditPayment({...editPayment,notes:e.target.value})} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Btn small onClick={saveEdit} loading={saving}>Save Changes</Btn>
                <Btn small outline onClick={() => setEditPayment(null)}>Cancel</Btn>
              </div>
            </div>
          )}

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Notes</th>
                  <th style={{ color: T.red }}>Debit (Owed)</th>
                  <th style={{ color: T.green }}>Credit (Paid)</th>
                  <th style={{ color: T.accent }}>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const ledgerRows = [
                    ...supplierInvoices.map(inv => ({ date: inv.date, desc: `Invoice ${inv.id}`, notes: "", debit: inv.total, credit: 0, id: inv.id, isInv: true })),
                    ...payments.map(p => ({ date: p.date, desc: p.type === "payment" ? "Payment Made" : "Additional Charge", notes: p.notes || "", debit: p.type === "charge" ? +p.amount : 0, credit: p.type === "payment" ? +p.amount : 0, id: p.id, isInv: false, raw: p })),
                  ].sort((a, b) => a.date.localeCompare(b.date));
                  let runningBalance = 0;
                  return ledgerRows.map((row, i) => {
                    runningBalance += row.debit - row.credit;
                    return (
                      <tr key={i} style={{ background: row.isInv ? T.surface+"88" : "transparent" }}>
                        <td style={{ fontFamily: T.mono, fontSize: 12 }}>{row.date}</td>
                        <td style={{ fontSize: 12, fontWeight: row.isInv ? 700 : 400, color: row.isInv ? T.accent : T.text }}>{row.desc}</td>
                        <td style={{ fontSize: 12, color: T.muted }}>{row.notes || "—"}</td>
                        <td style={{ fontFamily: T.mono, color: T.red, fontWeight: 700 }}>{row.debit > 0 ? fmt(row.debit) : "—"}</td>
                        <td style={{ fontFamily: T.mono, color: T.green, fontWeight: 700 }}>{row.credit > 0 ? fmt(row.credit) : "—"}</td>
                        <td style={{ fontFamily: T.mono, fontWeight: 800, color: runningBalance > 0 ? T.red : T.green }}>{fmt(Math.abs(runningBalance))}{runningBalance > 0 ? " DR" : " CR"}</td>
                        <td>
                          {!row.isInv && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setEditPayment(row.raw)} style={{ background: T.accent+"22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 8px", color: T.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                              <button onClick={() => delPayment(row.id)} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
                {payments.length === 0 && supplierInvoices.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No records yet</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: T.accent, textTransform: "uppercase", letterSpacing: 1 }}>Purchase History</h3>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead>
              <tbody>
                {(() => {
                  // Calculate paid per invoice from payments pool (same logic as refreshInvoices)
                  const allInvsSorted = [...supplierInvoices].sort((a,b) => a.date.localeCompare(b.date));
                  let rem = totalPaid;
                  const paidMap = {};
                  for (const inv of allInvsSorted) {
                    if (rem >= inv.total) { paidMap[inv.id] = inv.total; rem -= inv.total; }
                    else if (rem > 0) { paidMap[inv.id] = rem; rem = 0; }
                    else { paidMap[inv.id] = 0; }
                  }
                  return supplierInvoices.map(inv => {
                    const paid = paidMap[inv.id] || 0;
                    const remaining = inv.total - paid;
                    const statusColor = paid >= inv.total ? T.green : paid > 0 ? T.yellow : T.red;
                    const statusLabel = paid >= inv.total ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 12 }}>{inv.id}</td>
                        <td style={{ fontSize: 12 }}>{inv.date}</td>
                        <td style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(inv.total)}</td>
                        <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(paid)}</td>
                        <td style={{ fontFamily: T.mono, color: remaining > 0 ? T.red : T.green }}>{fmt(remaining)}</td>
                        <td><Badge color={statusColor}>{statusLabel}</Badge></td>
                      </tr>
                    );
                  });
                })()}
                {supplierInvoices.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No purchases for this supplier</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!selected && suppliers.length > 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Select a supplier above to view their balance sheet</div>}
      {suppliers.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>No suppliers yet. Add suppliers first!</div>}
    </div>
  );
}

// ─── PAYMENT METHOD BADGE ─────────────────────────────────────────────────────
const pmLabel = { cash_usd: "💵 Cash USD", wallet_usdt: "💎 Wallet USDT", bank_transfer: "🏦 Bank Transfer" };
const pmColor = { cash_usd: "#00ff9d", wallet_usdt: "#00e5ff", bank_transfer: "#ffcc00" };

// ─── RECEIPTS (Money from Clients) ───────────────────────────────────────────
function ReceiptsPage({ clients }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editReceipt, setEditReceipt] = useState(null);
  const [filterClient, setFilterClient] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [form, setForm] = useState({ client_id: "", date: new Date().toISOString().slice(0,10), amount: "", payment_method: "cash_usd", reference: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("receipts").select("*, clients(name)").order("date", { ascending: false });
    setReceipts((data||[]).map(r => ({ ...r, clientName: r.clients?.name || "—" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.amount || !form.client_id) return;
    setSaving(true);
    const id = "RCP-" + Math.random().toString(36).slice(2,8).toUpperCase();
    await supabase.from("receipts").insert({ ...form, id, amount: +form.amount, client_id: +form.client_id });
    await supabase.from("client_payments").insert({ client_id: +form.client_id, date: form.date, amount: +form.amount, type: "payment", notes: form.notes, payment_method: form.payment_method, reference: form.reference });

    // Auto-update pending invoices for this client
    const { data: allPmts } = await supabase.from("client_payments").select("*").eq("client_id", +form.client_id);
    const totalPd = (allPmts||[]).filter(p=>p.type==="payment").reduce((s,p)=>s+(+p.amount),0);
    const { data: pendInvs } = await supabase.from("invoices").select("*").eq("client_id", +form.client_id).neq("payment_status","paid").eq("type","sell");
    let rem = totalPd;
    for (const inv of (pendInvs||[])) {
      if (rem >= inv.total) { await supabase.from("invoices").update({ payment_status:"paid", status:"paid", amount_paid: inv.total }).eq("id", inv.id); rem -= inv.total; }
      else if (rem > 0) { await supabase.from("invoices").update({ payment_status:"partial", status:"partial", amount_paid: rem }).eq("id", inv.id); rem = 0; }
    }

    setForm({ client_id: "", date: new Date().toISOString().slice(0,10), amount: "", payment_method: "cash_usd", reference: "", notes: "" });
    setShowAdd(false);
    load();
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editReceipt) return;
    setSaving(true);
    await supabase.from("receipts").update({ date: editReceipt.date, amount: +editReceipt.amount, payment_method: editReceipt.payment_method, reference: editReceipt.reference, notes: editReceipt.notes }).eq("id", editReceipt.id);
    setEditReceipt(null);
    load();
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this receipt?")) return;
    await supabase.from("receipts").delete().eq("id", id);
    load();
  };

  const printReceipt = (r) => {
    const html = `<!DOCTYPE html><html><head><title>Receipt ${r.id}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; max-width: 400px; margin: 0 auto; }
      h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
      .box { border: 2px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      .row:last-child { border-bottom: none; }
      .label { color: #666; }
      .value { font-weight: 700; }
      .amount { font-size: 22px; font-weight: 800; color: #006600; text-align: center; padding: 16px; border: 2px solid #006600; border-radius: 8px; margin: 16px 0; }
      .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <h1>⚡ ElectroPro</h1>
      <div class="subtitle">RECEIPT VOUCHER</div>
      <div class="amount">$${Number(r.amount).toFixed(2)}</div>
      <div class="box">
        <div class="row"><span class="label">Receipt ID</span><span class="value">${r.id}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${r.date}</span></div>
        <div class="row"><span class="label">Client</span><span class="value">${r.clientName}</span></div>
        <div class="row"><span class="label">Payment Method</span><span class="value">${{cash_usd:"💵 Cash USD",wallet_usdt:"💎 Wallet USDT",bank_transfer:"🏦 Bank Transfer"}[r.payment_method]||r.payment_method}</span></div>
        ${r.reference ? `<div class="row"><span class="label">Reference #</span><span class="value">${r.reference}</span></div>` : ""}
        ${r.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${r.notes}</span></div>` : ""}
      </div>
      <div class="footer">Thank you for your payment! • ElectroPro Business Manager</div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=500,height=700");
    w.document.write(html);
    w.document.close();
  };

  const filtered = receipts.filter(r => {
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;
    if (filterClient && r.client_id !== +filterClient) return false;
    if (filterMethod && r.payment_method !== filterMethod) return false;
    return true;
  });
  const total = filtered.reduce((s,r) => s + +r.amount, 0);
  const byCash = filtered.filter(r=>r.payment_method==="cash_usd").reduce((s,r)=>s+(+r.amount),0);
  const byUsdt = filtered.filter(r=>r.payment_method==="wallet_usdt").reduce((s,r)=>s+(+r.amount),0);
  const byBank = filtered.filter(r=>r.payment_method==="bank_transfer").reduce((s,r)=>s+(+r.amount),0);

  return (
    <div className="page">
      {editReceipt && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.card, border:`1px solid ${T.green}44`, borderRadius:16, padding:28, width:"100%", maxWidth:440 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:20, color:T.green }}>✏️ Edit Receipt</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>DATE</div><input type="date" value={editReceipt.date} onChange={e => setEditReceipt({...editReceipt,date:e.target.value})} /></div>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>AMOUNT ($)</div><input type="number" value={editReceipt.amount} onChange={e => setEditReceipt({...editReceipt,amount:e.target.value})} /></div>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>PAYMENT METHOD</div>
                <select value={editReceipt.payment_method} onChange={e => setEditReceipt({...editReceipt,payment_method:e.target.value})}>
                  <option value="cash_usd">💵 Cash USD</option>
                  <option value="wallet_usdt">💎 Wallet USDT</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                </select>
              </div>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>REFERENCE #</div><input value={editReceipt.reference||""} onChange={e => setEditReceipt({...editReceipt,reference:e.target.value})} placeholder="Ref #" /></div>
              <div style={{ gridColumn:"1/-1" }}><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>NOTES</div><input value={editReceipt.notes||""} onChange={e => setEditReceipt({...editReceipt,notes:e.target.value})} placeholder="Notes" /></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <Btn onClick={saveEdit} loading={saving}>Save Changes</Btn>
              <Btn outline onClick={() => setEditReceipt(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:28, fontWeight:800 }}>Receipts</h2>
          <p style={{ color:T.muted, fontSize:13, marginTop:4 }}>Money received from clients</p>
        </div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ New Receipt</Btn>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
        <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1 }}>📅 From:</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width:"auto" }} />
        <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1 }}>To:</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width:"auto" }} />
        <button onClick={() => { setFromDate(""); setToDate(""); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"4px 10px", color:T.muted, fontSize:11, cursor:"pointer" }}>Clear</button>
        <button onClick={() => {
          let running = 0;
          const rows = filtered.map(r => { running += +r.amount; return `<tr><td>${r.date}</td><td>${r.clientName}</td><td>${r.notes||"—"}</td><td>${r.reference||"—"}</td><td>${{cash_usd:"Cash USD",wallet_usdt:"Wallet USDT",bank_transfer:"Bank Transfer"}[r.payment_method]||""}</td><td style="color:#006600;font-weight:700">$${Number(r.amount).toFixed(2)}</td><td style="font-weight:800">$${running.toFixed(2)}</td></tr>`; }).join("");
          const period = fromDate||toDate ? ` (${fromDate||"start"} → ${toDate||"today"})` : " (All Time)";
          const html = `<!DOCTYPE html><html><head><title>Receipts Ledger</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:30px;font-size:12px;}h1{font-size:18px;font-weight:800;margin-bottom:4px;}h2{font-size:14px;color:#666;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}th{background:#000;color:#fff;padding:8px;text-align:left;}td{padding:7px 8px;border-bottom:1px solid #eee;}tr:nth-child(even){background:#f9f9f9;}.footer{margin-top:20px;text-align:center;font-size:10px;color:#999;}</style></head><body><h1>⚡ ElectroPro — Receipts Ledger</h1><h2>${period}</h2><table><thead><tr><th>Date</th><th>Client</th><th>Notes</th><th>Reference</th><th>Method</th><th>Amount</th><th>Running Total</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Printed: ${new Date().toLocaleDateString()} • ElectroPro</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script></body></html>`;
          const w = window.open("","_blank","width=900,height=700"); w.document.write(html); w.document.close();
        }} style={{ marginLeft:"auto", background:T.green+"22", border:`1px solid ${T.green}44`, borderRadius:8, padding:"6px 14px", color:T.green, fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Print Ledger</button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16, marginBottom:24 }}>
        <StatCard label="Total Received" value={fmt(total)} icon="💰" color={T.green} sub={`${filtered.length} receipts`} />
        <StatCard label="Cash USD" value={fmt(byCash)} icon="💵" color="#00ff9d" />
        <StatCard label="Wallet USDT" value={fmt(byUsdt)} icon="💎" color="#00e5ff" />
        <StatCard label="Bank Transfer" value={fmt(byBank)} icon="🏦" color="#ffcc00" />
      </div>

      {showAdd && (
        <div style={{ background:T.card, border:`1px solid ${T.green}44`, borderRadius:12, padding:24, marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, marginBottom:16, color:T.green }}>New Receipt</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>CLIENT</div>
              <select value={form.client_id} onChange={e => setForm({...form, client_id:e.target.value})}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>DATE</div>
              <input type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>AMOUNT ($)</div>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>PAYMENT METHOD</div>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method:e.target.value})}>
                <option value="cash_usd">💵 Cash USD</option>
                <option value="wallet_usdt">💎 Wallet USDT</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>REFERENCE #</div>
              <input value={form.reference} onChange={e => setForm({...form, reference:e.target.value})} placeholder="Tx ID / Ref #" />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>NOTES</div>
              <input value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <Btn onClick={save} loading={saving} disabled={!form.client_id||!form.amount}>Save Receipt</Btn>
            <Btn outline onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ width:"auto" }}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} style={{ width:"auto" }}>
          <option value="">All Methods</option>
          <option value="cash_usd">💵 Cash USD</option>
          <option value="wallet_usdt">💎 Wallet USDT</option>
          <option value="bank_transfer">🏦 Bank Transfer</option>
        </select>
      </div>

      {loading ? <Loader /> : (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Client</th><th>Description</th><th>Reference</th><th>Method</th>
                <th style={{ color: T.green }}>Credit (Received)</th>
                <th style={{ color: T.accent }}>Running Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let running = 0;
                return filtered.map(r => {
                  running += +r.amount;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily:T.mono, fontSize:12 }}>{r.date}</td>
                      <td style={{ fontWeight:600 }}>{r.clientName}</td>
                      <td style={{ fontSize:12, color:T.muted }}>{r.notes || "Payment Received"}</td>
                      <td style={{ fontFamily:T.mono, fontSize:11, color:T.muted }}>{r.reference || "—"}</td>
                      <td><Badge color={pmColor[r.payment_method]}>{pmLabel[r.payment_method]}</Badge></td>
                      <td style={{ fontFamily:T.mono, color:T.green, fontWeight:700 }}>{fmt(r.amount)}</td>
                      <td style={{ fontFamily:T.mono, fontWeight:800, color:T.accent }}>{fmt(running)}</td>
                      <td>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => setEditReceipt(r)} style={{ background:T.accent+"22", border:`1px solid ${T.accent}44`, borderRadius:6, padding:"4px 8px", color:T.accent, fontSize:11, cursor:"pointer" }}>✏️</button>
                          <button onClick={() => del(r.id)} style={{ background:T.red+"22", border:`1px solid ${T.red}44`, borderRadius:6, padding:"4px 8px", color:T.red, fontSize:11, cursor:"pointer" }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
              {filtered.length===0 && <tr><td colSpan={8} style={{ textAlign:"center", color:T.muted, padding:32 }}>No receipts found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENTS (Money to Suppliers) ───────────────────────────────────────────
function PaymentsPage({ suppliers }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [editPayment, setEditPayment] = useState(null);
  const [form, setForm] = useState({ supplier_id: "", date: new Date().toISOString().slice(0,10), amount: "", payment_method: "cash_usd", reference: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("payments").select("*, suppliers(name)").order("date", { ascending: false });
    setPayments((data||[]).map(p => ({ ...p, supplierName: p.suppliers?.name || "—" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.amount || !form.supplier_id) return;
    setSaving(true);
    const id = "PAY-" + Math.random().toString(36).slice(2,8).toUpperCase();
    await supabase.from("payments").insert({ ...form, id, amount: +form.amount, supplier_id: +form.supplier_id });
    await supabase.from("supplier_payments").insert({ supplier_id: +form.supplier_id, date: form.date, amount: +form.amount, type: "payment", notes: form.notes, payment_method: form.payment_method, reference: form.reference });

    // Auto-update pending invoices for this supplier
    const { data: allPmts } = await supabase.from("supplier_payments").select("*").eq("supplier_id", +form.supplier_id);
    const totalPd = (allPmts||[]).filter(p=>p.type==="payment").reduce((s,p)=>s+(+p.amount),0);
    const { data: pendInvs } = await supabase.from("invoices").select("*").eq("supplier_id", +form.supplier_id).neq("payment_status","paid").eq("type","buy");
    let rem = totalPd;
    for (const inv of (pendInvs||[])) {
      if (rem >= inv.total) { await supabase.from("invoices").update({ payment_status:"paid", status:"paid", amount_paid: inv.total }).eq("id", inv.id); rem -= inv.total; }
      else if (rem > 0) { await supabase.from("invoices").update({ payment_status:"partial", status:"partial", amount_paid: rem }).eq("id", inv.id); rem = 0; }
    }

    setForm({ supplier_id: "", date: new Date().toISOString().slice(0,10), amount: "", payment_method: "cash_usd", reference: "", notes: "" });
    setShowAdd(false);
    load();
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editPayment) return;
    setSaving(true);
    await supabase.from("payments").update({ date: editPayment.date, amount: +editPayment.amount, payment_method: editPayment.payment_method, reference: editPayment.reference, notes: editPayment.notes }).eq("id", editPayment.id);
    // Also update supplier_payments if exists
    const { data: spRows } = await supabase.from("supplier_payments").select("id").eq("supplier_id", editPayment.supplier_id).eq("type", "payment").eq("amount", editPayment.amount).limit(1);
    if (spRows && spRows.length > 0) {
      await supabase.from("supplier_payments").update({ date: editPayment.date, amount: +editPayment.amount, payment_method: editPayment.payment_method, notes: editPayment.notes }).eq("id", spRows[0].id);
    }
    setEditPayment(null);
    load();
    setSaving(false);
  };

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const del = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    // Get payment details before deleting
    const payment = payments.find(p => p.id === id);
    await supabase.from("payments").delete().eq("id", id);
    // Also delete matching record from supplier_payments
    if (payment) {
      const { data: spRows } = await supabase.from("supplier_payments")
        .select("id").eq("supplier_id", payment.supplier_id)
        .eq("type", "payment").eq("amount", payment.amount).eq("date", payment.date).limit(1);
      if (spRows && spRows.length > 0) {
        await supabase.from("supplier_payments").delete().eq("id", spRows[0].id);
      }
    }
    load();
  };

  const printPayment = (p) => {
    const html = `<!DOCTYPE html><html><head><title>Payment ${p.id}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #000; background: white; padding: 40px; max-width: 400px; margin: 0 auto; }
      h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
      .box { border: 2px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      .row:last-child { border-bottom: none; }
      .label { color: #666; }
      .value { font-weight: 700; }
      .amount { font-size: 22px; font-weight: 800; color: #cc0000; text-align: center; padding: 16px; border: 2px solid #cc0000; border-radius: 8px; margin: 16px 0; }
      .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <h1>⚡ ElectroPro</h1>
      <div class="subtitle">PAYMENT VOUCHER</div>
      <div class="amount">$${Number(p.amount).toFixed(2)}</div>
      <div class="box">
        <div class="row"><span class="label">Payment ID</span><span class="value">${p.id}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${p.date}</span></div>
        <div class="row"><span class="label">Supplier</span><span class="value">${p.supplierName}</span></div>
        <div class="row"><span class="label">Payment Method</span><span class="value">${{cash_usd:"💵 Cash USD",wallet_usdt:"💎 Wallet USDT",bank_transfer:"🏦 Bank Transfer"}[p.payment_method]||p.payment_method}</span></div>
        ${p.reference ? `<div class="row"><span class="label">Reference #</span><span class="value">${p.reference}</span></div>` : ""}
        ${p.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${p.notes}</span></div>` : ""}
      </div>
      <div class="footer">ElectroPro Business Manager</div>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=500,height=700");
    w.document.write(html);
    w.document.close();
  };

  const filtered = payments.filter(p => {
    if (fromDate && p.date < fromDate) return false;
    if (toDate && p.date > toDate) return false;
    if (filterSupplier && p.supplier_id !== +filterSupplier) return false;
    if (filterMethod && p.payment_method !== filterMethod) return false;
    return true;
  });
  const total = filtered.reduce((s,p) => s + +p.amount, 0);
  const byCash = filtered.filter(p=>p.payment_method==="cash_usd").reduce((s,p)=>s+(+p.amount),0);
  const byUsdt = filtered.filter(p=>p.payment_method==="wallet_usdt").reduce((s,p)=>s+(+p.amount),0);
  const byBank = filtered.filter(p=>p.payment_method==="bank_transfer").reduce((s,p)=>s+(+p.amount),0);

  return (
    <div className="page">
      {editPayment && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:T.card, border:`1px solid ${T.red}44`, borderRadius:16, padding:28, width:"100%", maxWidth:440 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:20, color:T.red }}>✏️ Edit Payment</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>DATE</div><input type="date" value={editPayment.date} onChange={e => setEditPayment({...editPayment,date:e.target.value})} /></div>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>AMOUNT ($)</div><input type="number" value={editPayment.amount} onChange={e => setEditPayment({...editPayment,amount:e.target.value})} /></div>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>PAYMENT METHOD</div>
                <select value={editPayment.payment_method} onChange={e => setEditPayment({...editPayment,payment_method:e.target.value})}>
                  <option value="cash_usd">💵 Cash USD</option>
                  <option value="wallet_usdt">💎 Wallet USDT</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                </select>
              </div>
              <div><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>REFERENCE #</div><input value={editPayment.reference||""} onChange={e => setEditPayment({...editPayment,reference:e.target.value})} placeholder="Ref #" /></div>
              <div style={{ gridColumn:"1/-1" }}><div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>NOTES</div><input value={editPayment.notes||""} onChange={e => setEditPayment({...editPayment,notes:e.target.value})} placeholder="Notes" /></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <Btn onClick={saveEdit} loading={saving}>Save Changes</Btn>
              <Btn outline onClick={() => setEditPayment(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:28, fontWeight:800 }}>Payments</h2>
          <p style={{ color:T.muted, fontSize:13, marginTop:4 }}>Money paid to suppliers</p>
        </div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ New Payment</Btn>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
        <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1 }}>📅 From:</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width:"auto" }} />
        <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1 }}>To:</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width:"auto" }} />
        <button onClick={() => { setFromDate(""); setToDate(""); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"4px 10px", color:T.muted, fontSize:11, cursor:"pointer" }}>Clear</button>
        <button onClick={() => {
          let running = 0;
          const rows = filtered.map(p => { running += +p.amount; return `<tr><td>${p.date}</td><td>${p.supplierName}</td><td>${p.notes||"—"}</td><td>${p.reference||"—"}</td><td>${{cash_usd:"Cash USD",wallet_usdt:"Wallet USDT",bank_transfer:"Bank Transfer"}[p.payment_method]||""}</td><td style="color:#cc0000;font-weight:700">$${Number(p.amount).toFixed(2)}</td><td style="font-weight:800">$${running.toFixed(2)}</td></tr>`; }).join("");
          const period = fromDate||toDate ? ` (${fromDate||"start"} → ${toDate||"today"})` : " (All Time)";
          const html = `<!DOCTYPE html><html><head><title>Payments Ledger</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;padding:30px;font-size:12px;}h1{font-size:18px;font-weight:800;margin-bottom:4px;}h2{font-size:14px;color:#666;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}th{background:#000;color:#fff;padding:8px;text-align:left;}td{padding:7px 8px;border-bottom:1px solid #eee;}tr:nth-child(even){background:#f9f9f9;}.footer{margin-top:20px;text-align:center;font-size:10px;color:#999;}</style></head><body><h1>⚡ ElectroPro — Payments Ledger</h1><h2>${period}</h2><table><thead><tr><th>Date</th><th>Supplier</th><th>Notes</th><th>Reference</th><th>Method</th><th>Amount</th><th>Running Total</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Printed: ${new Date().toLocaleDateString()} • ElectroPro</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script></body></html>`;
          const w = window.open("","_blank","width=900,height=700"); w.document.write(html); w.document.close();
        }} style={{ marginLeft:"auto", background:T.green+"22", border:`1px solid ${T.green}44`, borderRadius:8, padding:"6px 14px", color:T.green, fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Print Ledger</button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16, marginBottom:24 }}>
        <StatCard label="Total Paid" value={fmt(total)} icon="💸" color={T.red} sub={`${filtered.length} payments`} />
        <StatCard label="Cash USD" value={fmt(byCash)} icon="💵" color="#00ff9d" />
        <StatCard label="Wallet USDT" value={fmt(byUsdt)} icon="💎" color="#00e5ff" />
        <StatCard label="Bank Transfer" value={fmt(byBank)} icon="🏦" color="#ffcc00" />
      </div>

      {showAdd && (
        <div style={{ background:T.card, border:`1px solid ${T.red}44`, borderRadius:12, padding:24, marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, marginBottom:16, color:T.red }}>New Payment</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>SUPPLIER</div>
              <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id:e.target.value})}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>DATE</div>
              <input type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>AMOUNT ($)</div>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>PAYMENT METHOD</div>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method:e.target.value})}>
                <option value="cash_usd">💵 Cash USD</option>
                <option value="wallet_usdt">💎 Wallet USDT</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>REFERENCE #</div>
              <input value={form.reference} onChange={e => setForm({...form, reference:e.target.value})} placeholder="Tx ID / Ref #" />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>NOTES</div>
              <input value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <Btn onClick={save} loading={saving} disabled={!form.supplier_id||!form.amount}>Save Payment</Btn>
            <Btn outline onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} style={{ width:"auto" }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} style={{ width:"auto" }}>
          <option value="">All Methods</option>
          <option value="cash_usd">💵 Cash USD</option>
          <option value="wallet_usdt">💎 Wallet USDT</option>
          <option value="bank_transfer">🏦 Bank Transfer</option>
        </select>
      </div>

      {loading ? <Loader /> : (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Supplier</th><th>Description</th><th>Reference</th><th>Method</th>
                <th style={{ color: T.red }}>Debit (Paid Out)</th>
                <th style={{ color: T.accent }}>Running Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let running = 0;
                return filtered.map(p => {
                  running += +p.amount;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily:T.mono, fontSize:12 }}>{p.date}</td>
                      <td style={{ fontWeight:600 }}>{p.supplierName}</td>
                      <td style={{ fontSize:12, color:T.muted }}>{p.notes || "Payment Made"}</td>
                      <td style={{ fontFamily:T.mono, fontSize:11, color:T.muted }}>{p.reference || "—"}</td>
                      <td><Badge color={pmColor[p.payment_method]}>{pmLabel[p.payment_method]}</Badge></td>
                      <td style={{ fontFamily:T.mono, color:T.red, fontWeight:700 }}>{fmt(p.amount)}</td>
                      <td style={{ fontFamily:T.mono, fontWeight:800, color:T.accent }}>{fmt(running)}</td>
                      <td>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => setEditPayment(p)} style={{ background:T.accent+"22", border:`1px solid ${T.accent}44`, borderRadius:6, padding:"4px 8px", color:T.accent, fontSize:11, cursor:"pointer" }}>✏️</button>
                          <button onClick={() => del(p.id)} style={{ background:T.red+"22", border:`1px solid ${T.red}44`, borderRadius:6, padding:"4px 8px", color:T.red, fontSize:11, cursor:"pointer" }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
              {filtered.length===0 && <tr><td colSpan={8} style={{ textAlign:"center", color:T.muted, padding:32 }}>No payments found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [pageHistory, setPageHistory] = useState(["dashboard"]);
  const page = pageHistory[pageHistory.length - 1];
  const [loading, setLoading] = useState(true);

  const setPage = (newPage) => setPageHistory(prev => [...prev, newPage]);
  const goBack = () => setPageHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  // ESC key → go back one page
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape" && pageHistory.length > 1) goBack(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pageHistory]);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const isResizing = useRef(false);

  const startResize = (e) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev) => {
      if (!isResizing.current) return;
      const newW = Math.min(320, Math.max(60, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onUp = () => { isResizing.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).single();
        setUser(session.user);
        setUserProfile(profile || { role: "cashier", full_name: session.user.email });
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") { setUser(null); setUserProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (u, profile) => { setUser(u); setUserProfile(profile); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setUserProfile(null);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: locs } = await supabase.from("locations").select("*").order("id");
    const { data: prods } = await supabase.from("products").select("*, stock(quantity, location_id)");
    const { data: invs } = await supabase.from("invoices").select("*, invoice_items(*), locations(name)").order("date", { ascending: false });
    const { data: cls } = await supabase.from("clients").select("*").order("name");
    const { data: sups } = await supabase.from("suppliers").select("*").order("name");

    const locsData = locs || [];
    const prodsData = (prods || []).map(p => {
      const stockByLocation = {};
      let totalStock = 0;
      (p.stock || []).forEach(s => { stockByLocation[s.location_id] = s.quantity; totalStock += s.quantity; });
      return { ...p, stockByLocation, totalStock, stock: undefined };
    });
    const invsData = (invs || []).map(inv => {
      const subtotal = (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0);
      const discountAmt = inv.discount_type === "pct" ? subtotal * (inv.discount_value || 0) / 100 : (inv.discount_value || 0);
      const shipAmt = inv.shipment_type === "pct" ? subtotal * (inv.shipment_value || 0) / 100 : (inv.shipment_value || 0);
      const total = Math.max(0, subtotal - discountAmt) + shipAmt;
      const cogs = (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.cost, 0);
      const profit = inv.type === "sell" ? total - cogs : 0;
      return { ...inv, total, cogs, profit, locationName: inv.locations?.name || "", invoice_items: undefined, locations: undefined };
    });
    const locsWithRevenue = locsData.map(l => {
      const locSells = invsData.filter(i => i.location_id === l.id && i.type === "sell" && i.status === "paid");
      const locPending = invsData.filter(i => i.location_id === l.id && i.type === "sell" && i.status !== "paid");
      return { ...l, revenue: locSells.reduce((s, i) => s + i.total, 0), pendingRevenue: locPending.reduce((s, i) => s + i.total, 0) };
    });

    setLocations(locsWithRevenue);
    setProducts(prodsData);
    setInvoices(invsData);
    setClients(cls || []);
    setSuppliers(sups || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <div className="spinner" />
    </div>
  );

  if (!user) return (
    <>
      <style>{css}</style>
      <LoginPage onLogin={handleLogin} />
    </>
  );

  const isAdmin = userProfile?.role === "admin";
  const isManager = ["admin", "manager"].includes(userProfile?.role);

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "inventory", label: "Inventory", icon: "📦" },
    { id: "transfer", label: "Stock Transfer", icon: "🔄" },
    { id: "clients", label: "Clients", icon: "👤" },
    { id: "client-balance", label: "Client Balance", icon: "💳" },
    { id: "receipts", label: "Receipts", icon: "🟢" },
    { id: "suppliers", label: "Suppliers", icon: "🏭" },
    { id: "supplier-balance", label: "Supplier Balance", icon: "💰" },
    { id: "payments", label: "Payments", icon: "🔴" },
    { id: "orders", label: "Sales Orders", icon: "📋" },
    { id: "invoices", label: "Invoices", icon: "🧾" },
    { id: "expenses", label: "Expenses", icon: "💸" },
    ...(isManager ? [{ id: "pl", label: "P&L", icon: "📊" }] : []),
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "locations", label: "Locations", icon: "🏢" },
    ...(isAdmin ? [{ id: "manage-locations", label: "Manage Locations", icon: "📍" }] : []),
    ...(isAdmin ? [{ id: "users", label: "Users", icon: "👥" }] : []),
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <nav className="sidebar no-print" style={{ width: sidebarWidth, minWidth: 60, maxWidth: 320, background: T.surface, borderRight: `1px solid ${T.border}`, padding: "28px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0, transition: "none", overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ padding: "0 16px 28px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, whiteSpace: "nowrap", overflow: "hidden" }}>
              <span style={{ color: T.accent }}>⚡</span> <span className="logo-text">ElectroPro</span>
            </div>
            <div className="logo-text" style={{ fontSize: 10, color: T.muted, marginTop: 4, letterSpacing: 1 }}>BUSINESS MANAGER</div>
          </div>
          <div style={{ padding: "12px 8px", flex: 1 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setPageHistory([n.id])} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", background: page === n.id ? T.accentDim : "transparent", color: page === n.id ? T.accent : T.muted, border: "none", borderRadius: 8, fontSize: 12, fontWeight: page === n.id ? 700 : 400, textAlign: "left", marginBottom: 2, transition: "all .15s", borderLeft: page === n.id ? `2px solid ${T.accent}` : "2px solid transparent", whiteSpace: "nowrap", overflow: "hidden" }}>
                <span style={{ flexShrink: 0 }}>{n.icon}</span>
                <span className="nav-label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="nav-label">{userProfile?.full_name}</div>
            <div className="nav-label" style={{ marginBottom: 10 }}><Badge color={isAdmin ? T.red : isManager ? T.accent : T.green}>{(userProfile?.role || "cashier").toUpperCase()}</Badge></div>
            <button onClick={handleLogout} className="nav-label" style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.muted, fontSize: 11, width: "100%", cursor: "pointer" }}>Sign Out</button>
          </div>
        </nav>

        {/* Drag Handle */}
        <div onMouseDown={startResize} className="no-print" style={{ width: 6, cursor: "col-resize", background: "transparent", borderRight: `1px solid ${T.border}`, flexShrink: 0, position: "relative", zIndex: 10, transition: "background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = T.accent+"44"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 14, color: T.muted, userSelect: "none" }}>⋮</div>
        </div>

        <main className="main-content" style={{ flex: 1, padding: "28px 32px", overflowY: "auto", overflowX: "auto", minWidth: 0 }}>
          {!loading && pageHistory.length > 1 && (
            <button onClick={goBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", color: T.muted, fontSize: 12, cursor: "pointer", marginBottom: 16, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.muted; }}>
              ← Back &nbsp;<span style={{ fontSize: 10, opacity: 0.5 }}>ESC</span>
            </button>
          )}
          {loading ? <Loader /> : (
            <>
              {page === "dashboard" && <Dashboard invoices={invoices} products={products} locations={locations} userProfile={userProfile} setPage={setPage} />}
              {page === "inventory" && <Inventory products={products} locations={locations} onRefresh={loadData} userProfile={userProfile} />}
              {page === "transfer" && <StockTransfer products={products} locations={locations} onRefresh={loadData} />}
              {page === "clients" && <ClientsPage clients={clients} onRefresh={loadData} />}
              {page === "client-balance" && <ClientBalance clients={clients} invoices={invoices} onRefresh={loadData} />}
              {page === "suppliers" && <SuppliersPage suppliers={suppliers} onRefresh={loadData} />}
              {page === "supplier-balance" && <SupplierBalance suppliers={suppliers} invoices={invoices} onRefresh={loadData} />}
              {page === "receipts" && <ReceiptsPage clients={clients} />}
              {page === "payments" && <PaymentsPage suppliers={suppliers} />}
              {page === "orders" && <SalesOrders products={products} locations={locations} invoices={invoices} setInvoices={setInvoices} onRefresh={loadData} />}
              {page === "invoices" && <Invoices invoices={invoices} setInvoices={setInvoices} products={products} locations={locations} clients={clients} suppliers={suppliers} onRefresh={loadData} userProfile={userProfile} />}
              {page === "expenses" && <ExpensesPage locations={locations} onRefresh={loadData} />}
              {page === "pl" && <ProfitLoss invoices={invoices} locations={locations} userProfile={userProfile} />}
              {page === "reports" && <Reports invoices={invoices} products={products} locations={locations} setPage={setPage} />}
              {page === "locations" && <LocationsPage products={products} invoices={invoices} locations={locations} />}
              {page === "manage-locations" && <LocationsManagement locations={locations} onRefresh={loadData} userProfile={userProfile} />}
              {page === "users" && <UsersPage currentUser={userProfile} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
