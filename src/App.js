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
  input, select { background: ${T.surface}; color: ${T.text}; border: 1px solid ${T.border}; border-radius: 8px; padding: 8px 12px; font-family: ${T.font}; font-size: 13px; outline: none; }
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
    transition: "all .15s", letterSpacing: .5, display: "flex", alignItems: "center", gap: 6,
  }}>{loading ? "Saving..." : children}</button>
);

const Loader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div className="spinner" />
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ invoices, products, locations }) {
  const sells = invoices.filter(i => i.type === "sell" && i.status === "paid");
  const buys = invoices.filter(i => i.type === "buy" && i.status === "paid");
  const revenue = sells.reduce((s, i) => s + i.total, 0);
  const cogs = sells.reduce((s, i) => s + i.cogs, 0);
  const profit = revenue - cogs;
  const totalItems = products.reduce((s, p) => s + (p.totalStock || 0), 0);
  const maxRev = Math.max(...locations.map(l => l.revenue || 0), 1);

  return (
    <div className="page">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Dashboard</h2>
      <p style={{ color: T.muted, fontSize: 13, marginBottom: 28 }}>Overview of your electronics business</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Revenue" value={fmt(revenue)} icon="💰" color={T.green} sub={`${sells.length} sales`} />
        <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit >= 0 ? T.green : T.red} sub={`${revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}% margin`} />
        <StatCard label="Purchases" value={fmt(buys.reduce((s, i) => s + i.total, 0))} icon="🛒" color={T.yellow} sub={`${buys.length} invoices`} />
        <StatCard label="Stock Items" value={totalItems} icon="📦" color={T.accent} sub={`${products.length} products`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
      <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.yellow}44`, borderRadius: 12, padding: 24 }}>
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
function Inventory({ products, locations, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", cost_price: "", sell_price: "" });

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Inventory</h2>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{products.length} products · {locations.length} locations</p>
        </div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ Add Product</Btn>
      </div>
      {showAdd && (
        <div style={{ background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.accent }}>New Product</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            {[["name","Product Name"],["sku","SKU"],["category","Category"],["cost_price","Cost Price ($)"],["sell_price","Sell Price ($)"]].map(([k,lbl]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>{lbl}</div>
                <input value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} style={{ width:"100%" }} placeholder={lbl} />
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <Btn onClick={addProduct} loading={saving}>Save Product</Btn>
            <Btn outline onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ width:"100%", marginBottom:20 }} />
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Product</th><th>SKU</th><th>Category</th><th>Cost</th><th>Sell</th><th>Margin</th>
              {locations.map(l => <th key={l.id}>{l.name.split(" ")[0]}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const margin = p.sell_price > 0 ? ((p.sell_price - p.cost_price) / p.sell_price * 100).toFixed(1) : 0;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight:600 }}>{p.name}</td>
                  <td style={{ fontFamily:T.mono, fontSize:12, color:T.muted }}>{p.sku}</td>
                  <td><Badge>{p.category}</Badge></td>
                  <td style={{ fontFamily:T.mono }}>{fmt(p.cost_price)}</td>
                  <td style={{ fontFamily:T.mono, color:T.green }}>{fmt(p.sell_price)}</td>
                  <td><span style={{ color:+margin>20?T.green:T.yellow, fontFamily:T.mono }}>{margin}%</span></td>
                  {locations.map(l => {
                    const s = p.stockByLocation?.[l.id] || 0;
                    return <td key={l.id} style={{ textAlign:"center", fontFamily:T.mono, color:s<3?T.red:s<8?T.yellow:T.text }}>{s}</td>;
                  })}
                  <td style={{ fontWeight:700, fontFamily:T.mono, color:T.accent }}>{p.totalStock || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────
function Invoices({ invoices, products, locations, onRefresh }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInv, setNewInv] = useState({ type:"sell", location_id:"", customer:"", date:new Date().toISOString().slice(0,10), items:[] });
  const [itemForm, setItemForm] = useState({ productId:"", qty:1 });

  const filtered = invoices.filter(i => typeFilter === "all" || i.type === typeFilter)
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const addItem = () => {
    const prod = products.find(p => p.id === +itemForm.productId);
    if (!prod) return;
    const price = newInv.type === "sell" ? prod.sell_price : prod.cost_price;
    setNewInv({...newInv, items:[...newInv.items, { productId:prod.id, name:prod.name, qty:+itemForm.qty, price, cost:prod.cost_price }]});
    setItemForm({ productId:"", qty:1 });
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
      const items = newInv.items.map(i => ({ invoice_id:invId, product_id:i.productId, product_name:i.name, quantity:i.qty, price:i.price, cost:i.cost }));
      await supabase.from("invoice_items").insert(items);
      // Update stock
      for (const item of newInv.items) {
        const { data: stockRow } = await supabase.from("stock").select("quantity").eq("product_id", item.productId).eq("location_id", newInv.location_id).single();
        if (stockRow) {
          const delta = newInv.type === "sell" ? -item.qty : +item.qty;
          await supabase.from("stock").update({ quantity: Math.max(0, stockRow.quantity + delta) }).eq("product_id", item.productId).eq("location_id", newInv.location_id);
        }
      }
      setShowCreate(false);
      setNewInv({ type:"sell", location_id:"", customer:"", date:new Date().toISOString().slice(0,10), items:[] });
      onRefresh();
    }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:28, fontWeight:800 }}>Invoices</h2>
          <p style={{ color:T.muted, fontSize:13, marginTop:4 }}>{invoices.length} total invoices</p>
        </div>
        <Btn onClick={() => setShowCreate(!showCreate)}>+ New Invoice</Btn>
      </div>

      {showCreate && (
        <div style={{ background:T.card, border:`1px solid ${T.accent}44`, borderRadius:12, padding:24, marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, marginBottom:16, color:T.accent }}>Create Invoice</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>TYPE</div>
              <select value={newInv.type} onChange={e => setNewInv({...newInv,type:e.target.value})} style={{ width:"100%" }}>
                <option value="sell">Sale Invoice</option>
                <option value="buy">Purchase Invoice</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>LOCATION</div>
              <select value={newInv.location_id} onChange={e => setNewInv({...newInv,location_id:e.target.value})} style={{ width:"100%" }}>
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>{newInv.type==="sell"?"CUSTOMER":"SUPPLIER"}</div>
              <input value={newInv.customer} onChange={e => setNewInv({...newInv,customer:e.target.value})} placeholder="Name" style={{ width:"100%" }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>DATE</div>
              <input type="date" value={newInv.date} onChange={e => setNewInv({...newInv,date:e.target.value})} style={{ width:"100%" }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-end" }}>
            <div style={{ flex:2 }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>PRODUCT</div>
              <select value={itemForm.productId} onChange={e => setItemForm({...itemForm,productId:e.target.value})} style={{ width:"100%" }}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>QTY</div>
              <input type="number" value={itemForm.qty} onChange={e => setItemForm({...itemForm,qty:e.target.value})} style={{ width:"100%" }} min="1" />
            </div>
            <Btn small onClick={addItem} disabled={!itemForm.productId}>Add</Btn>
          </div>
          {newInv.items.length > 0 && (
            <div style={{ background:T.surface, borderRadius:8, overflow:"hidden", marginBottom:16 }}>
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {newInv.items.map((item,i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ fontFamily:T.mono }}>{item.qty}</td>
                      <td style={{ fontFamily:T.mono }}>{fmt(item.price)}</td>
                      <td style={{ fontFamily:T.mono, color:T.green }}>{fmt(item.qty*item.price)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ textAlign:"right", fontWeight:700 }}>Total</td>
                    <td style={{ fontFamily:T.mono, fontWeight:800, color:T.accent }}>{fmt(newInv.items.reduce((s,i)=>s+i.qty*i.price,0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={saveInvoice} loading={saving} disabled={!newInv.customer||!newInv.location_id||newInv.items.length===0}>Save Invoice</Btn>
            <Btn outline onClick={() => setShowCreate(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {["all","sell","buy"].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ background:typeFilter===t?T.accent:"transparent", color:typeFilter===t?"#000":T.muted, border:`1px solid ${typeFilter===t?T.accent:T.border}`, borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
            {t==="all"?"All":t==="sell"?"Sales":"Purchases"}
          </button>
        ))}
      </div>

      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
        <table>
          <thead><tr><th>Invoice</th><th>Type</th><th>Date</th><th>Location</th><th>Customer</th><th>Total</th><th>Profit</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id}>
                <td style={{ fontFamily:T.mono, color:T.accent, fontSize:12 }}>{inv.id}</td>
                <td><Badge color={inv.type==="sell"?T.green:T.yellow}>{inv.type==="sell"?"SALE":"PURCHASE"}</Badge></td>
                <td style={{ color:T.muted, fontSize:12 }}>{inv.date}</td>
                <td style={{ fontSize:12 }}>{inv.locationName}</td>
                <td style={{ fontWeight:600 }}>{inv.customer}</td>
                <td style={{ fontFamily:T.mono, fontWeight:700 }}>{fmt(inv.total)}</td>
                <td style={{ fontFamily:T.mono, color:inv.profit>0?T.green:T.muted }}>{inv.type==="sell"?fmt(inv.profit):"—"}</td>
                <td><Badge color={inv.status==="paid"?T.green:T.yellow}>{inv.status.toUpperCase()}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PROFIT & LOSS ────────────────────────────────────────────────────────────
function ProfitLoss({ invoices, locations }) {
  const [period, setPeriod] = useState("all");
  const now = new Date();
  const filtered = invoices.filter(i => {
    const d = new Date(i.date);
    if (period === "this_month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if (period === "last_month") { const lm=new Date(now.getFullYear(),now.getMonth()-1); return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear(); }
    if (period === "this_year") return d.getFullYear()===now.getFullYear();
    return true;
  });
  const sells = filtered.filter(i => i.type==="sell"&&i.status==="paid");
  const buys = filtered.filter(i => i.type==="buy"&&i.status==="paid");
  const revenue = sells.reduce((s,i)=>s+i.total,0);
  const cogs = sells.reduce((s,i)=>s+i.cogs,0);
  const purchases = buys.reduce((s,i)=>s+i.total,0);
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? (grossProfit/revenue*100) : 0;

  return (
    <div className="page">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:28, fontWeight:800 }}>Profit & Loss</h2>
          <p style={{ color:T.muted, fontSize:13, marginTop:4 }}>Financial performance report</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
        </select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:28 }}>
          <h3 style={{ fontSize:13, letterSpacing:2, textTransform:"uppercase", color:T.accent, marginBottom:20 }}>Income Statement</h3>
          {[
            { label:"Sales Revenue", val:revenue, color:T.green },
            { label:"Cost of Goods Sold", val:-cogs, color:T.red },
            null,
            { label:"Gross Profit", val:grossProfit, color:grossProfit>=0?T.green:T.red, bold:true },
            { label:"Net Profit / Loss", val:grossProfit, color:grossProfit>=0?T.green:T.red, bold:true },
            { label:"Profit Margin", val:null, text:`${margin.toFixed(1)}%`, color:T.accent, bold:true },
          ].map((row,i) => row===null
            ? <div key={i} style={{ height:1, background:T.border, margin:"8px 0" }} />
            : <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${T.border}22` }}>
                <span style={{ fontSize:14, color:row.bold?T.text:T.muted, fontWeight:row.bold?700:400 }}>{row.label}</span>
                <span style={{ fontFamily:T.mono, fontSize:14, color:row.color, fontWeight:row.bold?800:400 }}>
                  {row.text || (row.val>=0?fmt(row.val):`-${fmt(-row.val)}`)}
                </span>
              </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:24 }}>
            <h3 style={{ fontSize:13, letterSpacing:2, textTransform:"uppercase", color:T.accent, marginBottom:16 }}>By Location</h3>
            <table>
              <thead><tr><th>Location</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody>
                {locations.map(l => {
                  const locSells = sells.filter(i => i.location_id===l.id);
                  const lr = locSells.reduce((s,i)=>s+i.total,0);
                  const lp = locSells.reduce((s,i)=>s+i.profit,0);
                  return <tr key={l.id}><td style={{fontSize:12}}>{l.name}</td><td style={{fontFamily:T.mono}}>{fmt(lr)}</td><td style={{fontFamily:T.mono,color:lp>=0?T.green:T.red}}>{fmt(lp)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:24 }}>
            <h3 style={{ fontSize:13, letterSpacing:2, textTransform:"uppercase", color:T.accent, marginBottom:16 }}>Key Metrics</h3>
            {[
              ["Sales Invoices", sells.length],
              ["Purchase Invoices", buys.length],
              ["Avg Sale Value", fmt(sells.length?revenue/sells.length:0)],
              ["Total Purchases", fmt(purchases)],
              ["ROI", purchases>0?`${((grossProfit/purchases)*100).toFixed(1)}%`:"N/A"],
            ].map(([lbl,val],i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}22` }}>
                <span style={{ fontSize:13, color:T.muted }}>{lbl}</span>
                <span style={{ fontFamily:T.mono, fontSize:13, color:T.accent }}>{val}</span>
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
  const sells = locInvoices.filter(i => i.type==="sell"&&i.status==="paid");
  const revenue = sells.reduce((s,i)=>s+i.total,0);
  const profit = sells.reduce((s,i)=>s+i.profit,0);
  const locProducts = products.map(p => ({...p, locStock: p.stockByLocation?.[selected]||0})).filter(p=>p.locStock>0);

  return (
    <div className="page">
      <h2 style={{ fontSize:28, fontWeight:800, marginBottom:6 }}>Locations</h2>
      <p style={{ color:T.muted, fontSize:13, marginBottom:24 }}>Performance per branch</p>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:28 }}>
        {locations.map(l => (
          <button key={l.id} onClick={() => setSelected(l.id)} style={{ background:selected===l.id?T.accent:T.card, color:selected===l.id?"#000":T.text, border:`1px solid ${selected===l.id?T.accent:T.border}`, borderRadius:10, padding:"10px 18px", fontSize:13, fontWeight:selected===l.id?700:400, transition:"all .15s" }}>{l.name}</button>
        ))}
      </div>
      {loc && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
            <StatCard label="Revenue" value={fmt(revenue)} icon="💰" color={T.green} />
            <StatCard label="Net Profit" value={fmt(profit)} icon="📈" color={profit>=0?T.green:T.red} />
            <StatCard label="Invoices" value={locInvoices.length} icon="🧾" color={T.accent} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}` }}>
                <h3 style={{ fontSize:13, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:T.accent }}>Stock at {loc.name}</h3>
              </div>
              <table>
                <thead><tr><th>Product</th><th>Stock</th><th>Value</th></tr></thead>
                <tbody>
                  {locProducts.map(p => (
                    <tr key={p.id}><td style={{fontWeight:600,fontSize:13}}>{p.name}</td><td style={{fontFamily:T.mono,color:p.locStock<5?T.red:T.green}}>{p.locStock}</td><td style={{fontFamily:T.mono}}>{fmt(p.locStock*p.cost_price)}</td></tr>
                  ))}
                  {locProducts.length===0&&<tr><td colSpan={3} style={{color:T.muted,textAlign:"center",padding:24}}>No stock at this location</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}` }}>
                <h3 style={{ fontSize:13, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:T.accent }}>Recent Invoices</h3>
              </div>
              <table>
                <thead><tr><th>Invoice</th><th>Type</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {locInvoices.slice(0,8).map(inv => (
                    <tr key={inv.id}><td style={{fontFamily:T.mono,fontSize:12,color:T.accent}}>{inv.id}</td><td><Badge color={inv.type==="sell"?T.green:T.yellow}>{inv.type==="sell"?"SALE":"BUY"}</Badge></td><td style={{fontFamily:T.mono}}>{fmt(inv.total)}</td><td><Badge color={inv.status==="paid"?T.green:T.yellow}>{inv.status.toUpperCase()}</Badge></td></tr>
                  ))}
                  {locInvoices.length===0&&<tr><td colSpan={4} style={{color:T.muted,textAlign:"center",padding:24}}>No invoices</td></tr>}
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
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [locations, setLocations] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    // Load locations
    const { data: locs } = await supabase.from("locations").select("*").order("id");
    // Load products with stock
    const { data: prods } = await supabase.from("products").select("*, stock(quantity, location_id)");
    // Load invoices with items
    const { data: invs } = await supabase.from("invoices").select("*, invoice_items(*), locations(name)").order("date", { ascending: false });

    const locsData = locs || [];
    // Process products
    const prodsData = (prods || []).map(p => {
      const stockByLocation = {};
      let totalStock = 0;
      (p.stock || []).forEach(s => { stockByLocation[s.location_id] = s.quantity; totalStock += s.quantity; });
      return { ...p, stockByLocation, totalStock, stock: undefined };
    });
    // Process invoices
    const invsData = (invs || []).map(inv => {
      const total = (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.price, 0);
      const cogs = (inv.invoice_items || []).reduce((s, i) => s + i.quantity * i.cost, 0);
      const profit = inv.type === "sell" ? total - cogs : 0;
      return { ...inv, total, cogs, profit, locationName: inv.locations?.name || "", invoice_items: undefined, locations: undefined };
    });
    // Compute location revenues
    const locsWithRevenue = locsData.map(l => {
      const locSells = invsData.filter(i => i.location_id === l.id && i.type === "sell" && i.status === "paid");
      return { ...l, revenue: locSells.reduce((s, i) => s + i.total, 0) };
    });

    setLocations(locsWithRevenue);
    setProducts(prodsData);
    setInvoices(invsData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"⚡" },
    { id:"inventory", label:"Inventory", icon:"📦" },
    { id:"invoices", label:"Invoices", icon:"🧾" },
    { id:"pl", label:"Profit & Loss", icon:"📊" },
    { id:"locations", label:"Locations", icon:"🏢" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <nav style={{ width:220, background:T.surface, borderRight:`1px solid ${T.border}`, padding:"28px 0", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh" }}>
          <div style={{ padding:"0 24px 28px", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5 }}><span style={{ color:T.accent }}>⚡</span> ElectroPro</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:4, letterSpacing:1 }}>BUSINESS MANAGER</div>
          </div>
          <div style={{ padding:"16px 12px", flex:1 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"11px 14px", background:page===n.id?T.accentDim:"transparent", color:page===n.id?T.accent:T.muted, border:"none", borderRadius:10, fontSize:13, fontWeight:page===n.id?700:400, textAlign:"left", marginBottom:4, transition:"all .15s", borderLeft:page===n.id?`2px solid ${T.accent}`:"2px solid transparent" }}>
                <span>{n.icon}</span> {n.label}
              </button>
            ))}
          </div>
          <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}`, fontSize:11, color:T.muted }}>
            <div style={{ marginBottom:4 }}>{products.length} Products</div>
            <div style={{ marginBottom:4 }}>{invoices.length} Invoices</div>
            <div>{locations.length} Locations</div>
          </div>
        </nav>
        <main style={{ flex:1, padding:"36px 40px", overflowY:"auto" }}>
          {loading ? <Loader /> : (
            <>
              {page==="dashboard" && <Dashboard invoices={invoices} products={products} locations={locations} />}
              {page==="inventory" && <Inventory products={products} locations={locations} onRefresh={loadData} />}
              {page==="invoices" && <Invoices invoices={invoices} products={products} locations={locations} onRefresh={loadData} />}
              {page==="pl" && <ProfitLoss invoices={invoices} locations={locations} />}
              {page==="locations" && <LocationsPage products={products} invoices={invoices} locations={locations} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
