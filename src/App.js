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
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: 12 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(inv.invoice_items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 0", fontSize: 13 }}>{item.product_name}</td>
                <td style={{ textAlign: "center", padding: "10px 0", fontSize: 13 }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "10px 0", fontSize: 13 }}>{fmt(item.price)}</td>
                <td style={{ textAlign: "right", padding: "10px 0", fontSize: 13, fontWeight: 700 }}>{fmt(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: "2px solid #000", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
                <span>Subtotal</span><span>{fmt(total)}</span>
              </div>
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

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Inventory</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{products.length} products · {locations.length} locations</p>
        </div>
        {canEdit && <Btn onClick={() => setShowAdd(!showAdd)}>+ Add Product</Btn>}
      </div>
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
                <th>Total</th>
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
function Invoices({ invoices, setInvoices, products, locations, onRefresh, userProfile }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printInv, setPrintInv] = useState(null);
  const [newInv, setNewInv] = useState({ type: "sell", location_id: "", customer: "", date: new Date().toISOString().slice(0, 10), items: [] });
  const [itemForm, setItemForm] = useState({ productId: "", qty: 1 });

  const filtered = invoices.filter(i => typeFilter === "all" || i.type === typeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const addItem = () => {
    const prod = products.find(p => p.id === +itemForm.productId);
    if (!prod) return;
    const price = newInv.type === "sell" ? prod.sell_price : prod.cost_price;
    setNewInv({ ...newInv, items: [...newInv.items, { productId: prod.id, name: prod.name, qty: +itemForm.qty, price, cost: prod.cost_price }] });
    setItemForm({ productId: "", qty: 1 });
  };

  const saveInvoice = async () => {
    if (!newInv.customer || !newInv.location_id || newInv.items.length === 0) return;
    setSaving(true);
    const invId = uid();
    const { error: invErr } = await supabase.from("invoices").insert({
      id: invId, type: newInv.type, date: newInv.date,
      location_id: +newInv.location_id, customer: newInv.customer, status: "paid"
    });
    if (!invErr) {
      const items = newInv.items.map(i => ({ invoice_id: invId, product_id: i.productId, product_name: i.name, quantity: i.qty, price: i.price, cost: i.cost }));
      await supabase.from("invoice_items").insert(items);
      for (const item of newInv.items) {
        const { data: stockRow } = await supabase.from("stock").select("quantity").eq("product_id", item.productId).eq("location_id", newInv.location_id).single();
        if (stockRow) {
          const delta = newInv.type === "sell" ? -item.qty : +item.qty;
          await supabase.from("stock").update({ quantity: Math.max(0, stockRow.quantity + delta) }).eq("product_id", item.productId).eq("location_id", newInv.location_id);
        }
      }
      setShowCreate(false);
      setNewInv({ type: "sell", location_id: "", customer: "", date: new Date().toISOString().slice(0, 10), items: [] });
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
              <select value={newInv.type} onChange={e => setNewInv({ ...newInv, type: e.target.value })}>
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
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{newInv.type === "sell" ? "CUSTOMER" : "SUPPLIER"}</div>
              <input value={newInv.customer} onChange={e => setNewInv({ ...newInv, customer: e.target.value })} placeholder="Name" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>DATE</div>
              <input type="date" value={newInv.date} onChange={e => setNewInv({ ...newInv, date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>PRODUCT</div>
              <select value={itemForm.productId} onChange={e => setItemForm({ ...itemForm, productId: e.target.value })}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div style={{ width: 80 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>QTY</div>
              <input type="number" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} min="1" />
            </div>
            <Btn small onClick={addItem} disabled={!itemForm.productId}>Add</Btn>
          </div>
          {newInv.items.length > 0 && (
            <div style={{ background: T.surface, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {newInv.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ fontFamily: T.mono }}>{item.qty}</td>
                      <td style={{ fontFamily: T.mono }}>{fmt(item.price)}</td>
                      <td style={{ fontFamily: T.mono, color: T.green }}>{fmt(item.qty * item.price)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                    <td style={{ fontFamily: T.mono, fontWeight: 800, color: T.accent }}>{fmt(newInv.items.reduce((s, i) => s + i.qty * i.price, 0))}</td>
                  </tr>
                </tbody>
              </table>
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
            <thead><tr><th>Invoice</th><th>Type</th><th className="hide-mobile">Date</th><th className="hide-mobile">Location</th><th>Customer</th><th>Total</th><th className="hide-mobile">Status</th><th>Print</th></tr></thead>
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

    const locsData = locs || [];
    const prodsData = (prods || []).map(p => {
      const stockByLocation = {};
      let totalStock = 0;
      (p.stock || []).forEach(s => { stockByLocation[s.location_id] = s.quantity; totalStock += s.quantity; });
      return { ...p, stockByLocation, totalStock, stock: undefined };
    });
    const invsData = (invs || []).map(inv => {
      const total = (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0);
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
    { id: "invoices", label: "Invoices", icon: "🧾" },
    ...(isManager ? [{ id: "pl", label: "P&L", icon: "📊" }] : []),
    { id: "locations", label: "Locations", icon: "🏢" },
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
              {page === "invoices" && <Invoices invoices={invoices} setInvoices={setInvoices} products={products} locations={locations} onRefresh={loadData} userProfile={userProfile} />}
              {page === "pl" && <ProfitLoss invoices={invoices} locations={locations} userProfile={userProfile} />}
              {page === "locations" && <LocationsPage products={products} invoices={invoices} locations={locations} />}
              {page === "users" && <UsersPage currentUser={userProfile} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
