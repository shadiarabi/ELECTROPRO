import { useState, useEffect, useCallback } from "react";
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
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const uid = () => "INV-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const Badge = ({ children, color = T.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: T.mono, letterSpacing: 1 }}>{children}</span>
);

const StatCard = ({ label, value, sub, color = T.accent, icon }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 12, color: T.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontFamily: T.mono }}>{sub}</div>}
  </div>
);

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
  const profit = inv.profit || 0;

  const print = () => window.print();

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
                <span>Subtotal</span><span>{fmt((inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0))}</span>
              </div>
              {inv.discount_value > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "red" }}>
                  <span>Discount {inv.discount_type === "pct" ? `(${inv.discount_value}%)` : ""}</span>
                  <span>− {fmt(inv.discount_type === "pct" ? (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0) * inv.discount_value / 100 : inv.discount_value)}</span>
                </div>
              )}
              {inv.shipment_value > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#0066cc" }}>
                  <span>🚢 Shipment {inv.shipment_type === "pct" ? `(${inv.shipment_value}%)` : ""}</span>
                  <span>+ {fmt(inv.shipment_type === "pct" ? (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0) * inv.shipment_value / 100 : inv.shipment_value)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 16, fontWeight: 800, borderTop: "2px solid #000", marginTop: 8 }}>
                <span>TOTAL</span><span>{fmt(total)}</span>
              </div>
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
function Dashboard({ invoices, products, locations, userProfile }) {
  const sells = invoices.filter(i => i.type === "sell" && i.status === "paid");
  const buys = invoices.filter(i => i.type === "buy" && i.status === "paid");
  const revenue = sells.reduce((s, i) => s + i.total, 0);
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
        {canSeeFinancials && <StatCard label="Total Revenue" value={fmt(revenue)} icon="💰" color={T.green} sub={`${sells.length} sales`} />}
        {canSeeFinancials && <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit >= 0 ? T.green : T.red} sub={`${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}% margin`} />}
        {canSeeFinancials && <StatCard label="Purchases" value={fmt(buys.reduce((s, i) => s + i.total, 0))} icon="🛒" color={T.yellow} sub={`${buys.length} invoices`} />}
        <StatCard label="Stock Items" value={totalItems} icon="📦" color={T.accent} sub={`${products.length} products`} />
      </div>
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
              { label: "Gross Revenue", val: revenue, color: T.green },
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
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: "", sku: "", category: "", cost_price: "", sell_price: "" });
  const canEdit = ["admin", "manager"].includes(userProfile?.role);

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
        {canEdit && <Btn onClick={() => setShowAdd(!showAdd)}>+ Add Product</Btn>}
      </div>

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
      <div style={{ overflowX: "auto" }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", minWidth: 600 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th className="hide-mobile">Category</th>
                <th className="hide-mobile">Cost</th><th>Sell</th><th className="hide-mobile">Margin</th>
                {locations.map(l => <th key={l.id} className="hide-mobile">{l.name.split(" ")[0]}</th>)}
                <th>Total</th>{canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const margin = p.sell_price > 0 ? ((p.sell_price - p.cost_price) / p.sell_price * 100).toFixed(1) : 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>{p.sku}</td>
                    <td className="hide-mobile"><Badge>{p.category}</Badge></td>
                    <td className="hide-mobile" style={{ fontFamily: T.mono }}>{fmt(p.cost_price)}</td>
                    <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(p.sell_price)}</td>
                    <td className="hide-mobile"><span style={{ color: +margin > 20 ? T.green : T.yellow, fontFamily: T.mono }}>{margin}%</span></td>
                    {locations.map(l => {
                      const s = p.stockByLocation?.[l.id] || 0;
                      return <td key={l.id} className="hide-mobile" style={{ textAlign: "center", fontFamily: T.mono, color: s < 3 ? T.red : s < 8 ? T.yellow : T.text }}>{s}</td>;
                    })}
                    <td style={{ fontWeight: 700, fontFamily: T.mono, color: T.accent }}>{p.totalStock || 0}</td>
                    {canEdit && <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditProduct(p)} style={{ background: T.accent + "22", border: `1px solid ${T.accent}44`, borderRadius: 6, padding: "4px 8px", color: T.accent, fontSize: 11, cursor: "pointer" }}>✏️</button>
                        <button onClick={() => deleteProduct(p.id)} style={{ background: T.red + "22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 8px", color: T.red, fontSize: 11, cursor: "pointer" }}>🗑️</button>
                      </div>
                    </td>}
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

// ─── INVOICES ─────────────────────────────────────────────────────────────────
function Invoices({ invoices, setInvoices, products, locations, clients, suppliers, onRefresh, userProfile }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printInv, setPrintInv] = useState(null);
  const [newInv, setNewInv] = useState({ type: "sell", location_id: "", customer: "", client_id: "", supplier_id: "", date: new Date().toISOString().slice(0, 10), items: [], discountType: "fixed", discountValue: 0, shipmentType: "fixed", shipmentValue: 0 });
  const [itemForm, setItemForm] = useState({ productId: "", qty: 1, customPrice: "", discountPct: 0 });

  const filtered = invoices.filter(i => typeFilter === "all" || i.type === typeFilter)
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
    const { error: invErr } = await supabase.from("invoices").insert({
      id: invId, type: newInv.type, date: newInv.date,
      location_id: +newInv.location_id, customer: newInv.customer, status: "paid",
      discount_type: newInv.discountType, discount_value: +newInv.discountValue || 0,
      shipment_type: newInv.shipmentType, shipment_value: +newInv.shipmentValue || 0,
      client_id: newInv.client_id ? +newInv.client_id : null,
      supplier_id: newInv.supplier_id ? +newInv.supplier_id : null,
    });
    if (!invErr) {
      const items = newInv.items.map(i => ({ invoice_id: invId, product_id: i.productId, product_name: i.name, quantity: i.qty, price: i.price, original_price: i.originalPrice, discount_pct: i.discountPct, cost: i.cost }));
      await supabase.from("invoice_items").insert(items);
      for (const item of newInv.items) {
        const { data: stockRow } = await supabase.from("stock").select("quantity").eq("product_id", item.productId).eq("location_id", newInv.location_id).single();
        if (stockRow) {
          const delta = newInv.type === "sell" ? -item.qty : +item.qty;
          await supabase.from("stock").update({ quantity: Math.max(0, stockRow.quantity + delta) }).eq("product_id", item.productId).eq("location_id", newInv.location_id);
        }
      }
      setShowCreate(false);
      setNewInv({ type: "sell", location_id: "", customer: "", client_id: "", supplier_id: "", date: new Date().toISOString().slice(0, 10), items: [], discountType: "fixed", discountValue: 0, shipmentType: "fixed", shipmentValue: 0 });
      onRefresh();
    }
    setSaving(false);
  };

  const handlePrint = async (inv) => {
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setPrintInv({ ...inv, invoice_items: items });
  };

  return (
    <div className="page">
      {printInv && <PrintInvoice inv={printInv} locations={locations} onClose={() => setPrintInv(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Invoices</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{invoices.length} total invoices</p>
        </div>
        <Btn onClick={() => setShowCreate(!showCreate)}>+ New Invoice</Btn>
      </div>

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
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <select value={newInv.shipmentType} onChange={e => setNewInv({ ...newInv, shipmentType: e.target.value })} style={{ width: "auto" }}>
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="pct">Percentage (% of subtotal)</option>
                </select>
                <input type="number" value={newInv.shipmentValue} onChange={e => setNewInv({ ...newInv, shipmentValue: e.target.value })} placeholder="0" style={{ width: 120 }} min="0" />
                {shipmentAmt > 0 && <span style={{ fontFamily: T.mono, fontSize: 13, color: T.accent }}>+ {fmt(shipmentAmt)} shipment</span>}
              </div>
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
            <thead><tr><th>Invoice</th><th>Type</th><th className="hide-mobile">Date</th><th className="hide-mobile">Location</th><th>Customer</th><th>Total</th><th className="hide-mobile">Status</th><th>Print</th><th>Del</th></tr></thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 12 }}>{inv.id}</td>
                  <td><Badge color={inv.type === "sell" ? T.green : T.yellow}>{inv.type === "sell" ? "SALE" : "BUY"}</Badge></td>
                  <td className="hide-mobile" style={{ color: T.muted, fontSize: 12 }}>{inv.date}</td>
                  <td className="hide-mobile" style={{ fontSize: 12 }}>{inv.locationName}</td>
                  <td style={{ fontWeight: 600 }}>{inv.customer}</td>
                  <td style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(inv.total)}</td>
                  <td className="hide-mobile"><Badge color={inv.status === "paid" ? T.green : T.yellow}>{inv.status?.toUpperCase()}</Badge></td>
                  <td><button onClick={() => handlePrint(inv)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", color: T.muted, fontSize: 12, cursor: "pointer" }}>🖨️</button></td>
                  <td><button onClick={async () => { if(window.confirm("Delete this invoice?")) { await supabase.from("invoice_items").delete().eq("invoice_id", inv.id); await supabase.from("invoices").delete().eq("id", inv.id); onRefresh(); }}} style={{ background: T.red+"22", border: `1px solid ${T.red}44`, borderRadius: 6, padding: "4px 10px", color: T.red, fontSize: 12, cursor: "pointer" }}>🗑️</button></td>
                </tr>
              ))}
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
  const sells = filtered.filter(i => i.type === "sell" && i.status === "paid");
  const buys = filtered.filter(i => i.type === "buy" && i.status === "paid");
  const revenue = sells.reduce((s, i) => s + i.total, 0);
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
            { label: "Sales Revenue", val: revenue, color: T.green },
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
    if (!form.name) return;
    setSaving(true);
    if (editClient) {
      await supabase.from("clients").update(form).eq("id", editClient.id);
      setEditClient(null);
    } else {
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
    if (!form.name) return;
    setSaving(true);
    if (editSupplier) {
      await supabase.from("suppliers").update(form).eq("id", editSupplier.id);
      setEditSupplier(null);
    } else {
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
  const [itemForm, setItemForm] = useState({ productId: "", qty: 1 });

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
    setNewOrder({ ...newOrder, items: [...newOrder.items, { productId: prod.id, name: prod.name, qty: +itemForm.qty, price: prod.sell_price, cost: prod.cost_price }] });
    setItemForm({ productId: "", qty: 1 });
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
      location_id: order.location_id, customer: order.customer, status: "paid"
    });
    if (!error) {
      await supabase.from("invoice_items").insert(
        order.items.map(i => ({ invoice_id: invId, product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, price: i.price, cost: i.cost }))
      );
      // Deduct stock
      for (const item of order.items) {
        const { data: stockRow } = await supabase.from("stock").select("quantity").eq("product_id", item.product_id).eq("location_id", order.location_id).single();
        if (stockRow) {
          await supabase.from("stock").update({ quantity: Math.max(0, stockRow.quantity - item.quantity) }).eq("product_id", item.product_id).eq("location_id", order.location_id);
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
              <select value={itemForm.productId} onChange={e => setItemForm({ ...itemForm, productId: e.target.value })}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.sell_price)}</option>)}
              </select>
            </div>
            <div style={{ width: 80 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>QTY</div>
              <input type="number" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} min="1" />
            </div>
            <Btn small onClick={addItem} disabled={!itemForm.productId}>Add</Btn>
          </div>
          {newOrder.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {newOrder.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ fontFamily: T.mono }}>{item.qty}</td>
                      <td style={{ fontFamily: T.mono }}>{fmt(item.price)}</td>
                      <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(item.qty * item.price)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                    <td style={{ fontFamily: T.mono, fontWeight: 800, color: T.accent }}>{fmt(newOrder.items.reduce((s, i) => s + i.qty * i.price, 0))}</td>
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
                {order.status === "invoiced" && (
                  <span style={{ fontSize: 12, color: T.green, fontFamily: T.mono }}>✓ Invoice created successfully</span>
                )}
                {order.status === "cancelled" && (
                  <span style={{ fontSize: 12, color: T.red, fontFamily: T.mono }}>✕ Order cancelled</span>
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
  const sells = locInvoices.filter(i => i.type === "sell" && i.status === "paid");
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
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), from_location_id: "", to_location_id: "", product_id: "", quantity: 1, notes: "" });

  useEffect(() => {
    supabase.from("stock_transfers").select("*").order("date", { ascending: false }).then(({ data }) => {
      setTransfers(data || []);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!form.from_location_id || !form.to_location_id || !form.product_id || form.from_location_id === form.to_location_id) return;
    setSaving(true);
    const prod = products.find(p => p.id === +form.product_id);
    const tid = "TRF-" + Math.random().toString(36).slice(2,8).toUpperCase();
    // Check stock availability
    const fromStock = prod?.stockByLocation?.[+form.from_location_id] || 0;
    if (fromStock < +form.quantity) { alert(`Not enough stock! Available: ${fromStock}`); setSaving(false); return; }
    // Deduct from source
    await supabase.from("stock").update({ quantity: fromStock - +form.quantity }).eq("product_id", +form.product_id).eq("location_id", +form.from_location_id);
    // Add to destination
    const { data: toStock } = await supabase.from("stock").select("quantity").eq("product_id", +form.product_id).eq("location_id", +form.to_location_id).single();
    if (toStock) {
      await supabase.from("stock").update({ quantity: toStock.quantity + +form.quantity }).eq("product_id", +form.product_id).eq("location_id", +form.to_location_id);
    } else {
      await supabase.from("stock").insert({ product_id: +form.product_id, location_id: +form.to_location_id, quantity: +form.quantity });
    }
    // Record transfer
    await supabase.from("stock_transfers").insert({ id: tid, date: form.date, from_location_id: +form.from_location_id, to_location_id: +form.to_location_id, product_id: +form.product_id, product_name: prod?.name || "", quantity: +form.quantity, notes: form.notes });
    setForm({ date: new Date().toISOString().slice(0,10), from_location_id: "", to_location_id: "", product_id: "", quantity: 1, notes: "" });
    setShowAdd(false);
    const { data } = await supabase.from("stock_transfers").select("*").order("date", { ascending: false });
    setTransfers(data || []);
    onRefresh();
    setSaving(false);
  };

  const locName = (id) => locations.find(l => l.id === id)?.name || id;

  return (
    <div className="page">
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
            <thead><tr><th>ID</th><th>Date</th><th>Product</th><th>From</th><th>To</th><th>Qty</th><th>Notes</th></tr></thead>
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
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: T.muted, padding: 32 }}>No transfers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports({ invoices, products, locations }) {
  const [period, setPeriod] = useState("this_month");
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

  const sells = filtered.filter(i => i.type==="sell"&&i.status==="paid");
  const buys = filtered.filter(i => i.type==="buy"&&i.status==="paid");
  const revenue = sells.reduce((s,i)=>s+i.total,0);
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
        <StatCard label="Revenue" value={fmt(revenue)} icon="💰" color={T.green} sub={`${sells.length} sales`} />
        <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit>=0?T.green:T.red} sub={`${revenue>0?((profit/revenue)*100).toFixed(1):0}% margin`} />
        <StatCard label="Purchases" value={fmt(buys.reduce((s,i)=>s+i.total,0))} icon="🛒" color={T.yellow} sub={`${buys.length} orders`} />
        <StatCard label="Avg Sale" value={fmt(sells.length?revenue/sells.length:0)} icon="📊" color={T.accent} sub="per invoice" />
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
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "" });

  useEffect(() => {
    if (selected) {
      supabase.from("client_payments").select("*").eq("client_id", selected).order("date", { ascending: false }).then(({ data }) => setPayments(data || []));
    }
  }, [selected]);

  const clientInvoices = invoices.filter(i => i.type==="sell" && i.client_id === selected);
  const totalCharged = clientInvoices.reduce((s,i)=>s+i.total,0);
  const totalPaid = payments.filter(p=>p.type==="payment").reduce((s,p)=>s+(+p.amount),0);
  const balance = totalCharged - totalPaid;

  const save = async () => {
    if (!form.amount || !selected) return;
    setSaving(true);
    await supabase.from("client_payments").insert({ client_id: selected, date: form.date, amount: +form.amount, type: form.type, notes: form.notes });
    setForm({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "" });
    setShowAdd(false);
    const { data } = await supabase.from("client_payments").select("*").eq("client_id", selected).order("date", { ascending: false });
    setPayments(data || []);
    setSaving(false);
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Payment History</h3>
            <Btn small onClick={() => setShowAdd(!showAdd)}>+ Record Payment</Btn>
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

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Notes</th><th>Amount</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: T.mono, fontSize: 12 }}>{p.date}</td>
                    <td><Badge color={p.type==="payment"?T.green:T.red}>{p.type==="payment"?"PAYMENT":"CHARGE"}</Badge></td>
                    <td style={{ fontSize: 12, color: T.muted }}>{p.notes || "—"}</td>
                    <td style={{ fontFamily: T.mono, color: p.type==="payment"?T.green:T.red, fontWeight: 700 }}>{p.type==="payment"?"+":"-"}{fmt(p.amount)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No payment records yet</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: T.accent, textTransform: "uppercase", letterSpacing: 1 }}>Invoice History</h3>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {clientInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 12 }}>{inv.id}</td>
                    <td style={{ fontSize: 12 }}>{inv.date}</td>
                    <td style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(inv.total)}</td>
                    <td><Badge color={T.green}>PAID</Badge></td>
                  </tr>
                ))}
                {clientInvoices.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No invoices for this client</td></tr>}
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
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "" });

  useEffect(() => {
    if (selected) {
      supabase.from("supplier_payments").select("*").eq("supplier_id", selected).order("date", { ascending: false }).then(({ data }) => setPayments(data || []));
    }
  }, [selected]);

  const supplierInvoices = invoices.filter(i => i.type==="buy" && i.supplier_id === selected);
  const totalOwed = supplierInvoices.reduce((s,i)=>s+i.total,0);
  const totalPaid = payments.filter(p=>p.type==="payment").reduce((s,p)=>s+(+p.amount),0);
  const balance = totalOwed - totalPaid;

  const save = async () => {
    if (!form.amount || !selected) return;
    setSaving(true);
    await supabase.from("supplier_payments").insert({ supplier_id: selected, date: form.date, amount: +form.amount, type: form.type, notes: form.notes });
    setForm({ date: new Date().toISOString().slice(0,10), amount: "", type: "payment", notes: "" });
    setShowAdd(false);
    const { data } = await supabase.from("supplier_payments").select("*").eq("supplier_id", selected).order("date", { ascending: false });
    setPayments(data || []);
    setSaving(false);
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Payment History</h3>
            <Btn small onClick={() => setShowAdd(!showAdd)}>+ Record Payment</Btn>
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
                <div><div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>NOTES</div><input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Optional" /></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Btn small onClick={save} loading={saving}>Save</Btn>
                <Btn small outline onClick={() => setShowAdd(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Notes</th><th>Amount</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: T.mono, fontSize: 12 }}>{p.date}</td>
                    <td><Badge color={p.type==="payment"?T.green:T.red}>{p.type==="payment"?"PAID":"CHARGE"}</Badge></td>
                    <td style={{ fontSize: 12, color: T.muted }}>{p.notes || "—"}</td>
                    <td style={{ fontFamily: T.mono, color: p.type==="payment"?T.green:T.red, fontWeight: 700 }}>{fmt(p.amount)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No payment records yet</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: T.accent, textTransform: "uppercase", letterSpacing: 1 }}>Purchase History</h3>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Total</th></tr></thead>
              <tbody>
                {supplierInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: T.mono, color: T.accent, fontSize: 12 }}>{inv.id}</td>
                    <td style={{ fontSize: 12 }}>{inv.date}</td>
                    <td style={{ fontFamily: T.mono, fontWeight: 700 }}>{fmt(inv.total)}</td>
                  </tr>
                ))}
                {supplierInvoices.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", color: T.muted, padding: 24 }}>No purchases for this supplier</td></tr>}
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

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

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
      return { ...l, revenue: locSells.reduce((s, i) => s + i.total, 0) };
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
    { id: "suppliers", label: "Suppliers", icon: "🏭" },
    { id: "supplier-balance", label: "Supplier Balance", icon: "💰" },
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
        <nav className="sidebar no-print" style={{ width: 220, background: T.surface, borderRight: `1px solid ${T.border}`, padding: "28px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
          <div style={{ padding: "0 24px 28px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
              <span style={{ color: T.accent }}>⚡</span> <span className="logo-text">ElectroPro</span>
            </div>
            <div className="logo-text" style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: 1 }}>BUSINESS MANAGER</div>
          </div>
          <div style={{ padding: "16px 12px", flex: 1 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", background: page === n.id ? T.accentDim : "transparent", color: page === n.id ? T.accent : T.muted, border: "none", borderRadius: 10, fontSize: 13, fontWeight: page === n.id ? 700 : 400, textAlign: "left", marginBottom: 4, transition: "all .15s", borderLeft: page === n.id ? `2px solid ${T.accent}` : "2px solid transparent" }}>
                <span>{n.icon}</span> <span className="nav-label">{n.label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="nav-label">{userProfile?.full_name}</div>
            <div className="nav-label" style={{ marginBottom: 12 }}><Badge color={isAdmin ? T.red : isManager ? T.accent : T.green}>{(userProfile?.role || "cashier").toUpperCase()}</Badge></div>
            <button onClick={handleLogout} className="nav-label" style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.muted, fontSize: 12, width: "100%", cursor: "pointer" }}>Sign Out</button>
          </div>
        </nav>
        <main className="main-content" style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
          {loading ? <Loader /> : (
            <>
              {page === "dashboard" && <Dashboard invoices={invoices} products={products} locations={locations} userProfile={userProfile} />}
              {page === "inventory" && <Inventory products={products} locations={locations} onRefresh={loadData} userProfile={userProfile} />}
              {page === "transfer" && <StockTransfer products={products} locations={locations} onRefresh={loadData} />}
              {page === "clients" && <ClientsPage clients={clients} onRefresh={loadData} />}
              {page === "client-balance" && <ClientBalance clients={clients} invoices={invoices} onRefresh={loadData} />}
              {page === "suppliers" && <SuppliersPage suppliers={suppliers} onRefresh={loadData} />}
              {page === "supplier-balance" && <SupplierBalance suppliers={suppliers} invoices={invoices} onRefresh={loadData} />}
              {page === "orders" && <SalesOrders products={products} locations={locations} invoices={invoices} setInvoices={setInvoices} onRefresh={loadData} />}
              {page === "invoices" && <Invoices invoices={invoices} setInvoices={setInvoices} products={products} locations={locations} clients={clients} suppliers={suppliers} onRefresh={loadData} userProfile={userProfile} />}
              {page === "expenses" && <ExpensesPage locations={locations} onRefresh={loadData} />}
              {page === "pl" && <ProfitLoss invoices={invoices} locations={locations} userProfile={userProfile} />}
              {page === "reports" && <Reports invoices={invoices} products={products} locations={locations} />}
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
