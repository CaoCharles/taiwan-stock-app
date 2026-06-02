import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from "recharts";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const LIGHT_COLOR = {
  red:         { bg:"#fef2f2", line:"#ef4444", text:"#dc2626", label:"紅燈",  desc:"景氣過熱" },
  yellow_red:  { bg:"#fff7ed", line:"#f59e0b", text:"#d97706", label:"黃紅燈",desc:"景氣活絡" },
  green:       { bg:"#f0fdf4", line:"#22c55e", text:"#16a34a", label:"綠燈",  desc:"景氣穩定" },
  yellow_blue: { bg:"#eff6ff", line:"#93c5fd", text:"#2563eb", label:"黃藍燈",desc:"景氣轉弱" },
  blue:        { bg:"#eef2ff", line:"#818cf8", text:"#4f46e5", label:"藍燈",  desc:"景氣低迷" },
};

const MTHS_ZH = ["","1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const YEARS   = ["2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026"];

const PRESETS = [
  { label:"近1年", start: offsetDate(-365) },
  { label:"近3年", start: offsetDate(-365*3) },
  { label:"近5年", start: offsetDate(-365*5) },
  { label:"全部",  start: "2016-01-01" },
];

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function today() { return new Date().toISOString().split("T")[0]; }

// ── HOOKS ─────────────────────────────────────────────────────────────────────
function useStock(ticker, start, end) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true); setError(null);
    fetch(`${API}/stock?ticker=${ticker}&start=${start}&end=${end}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker, start, end]);

  return { data, loading, error };
}

function useLights() {
  const [lights, setLights] = useState({});
  useEffect(() => {
    fetch(`${API}/lights`)
      .then(r => r.json())
      .then(setLights)
      .catch(() => {});
  }, []);
  return lights;
}

function useSeasonal(ticker, start, end) {
  const [seasonal, setSeasonal] = useState(null);
  useEffect(() => {
    if (!ticker) return;
    fetch(`${API}/seasonal?ticker=${ticker}&start=${start}&end=${end}`)
      .then(r => r.json())
      .then(d => setSeasonal(d.seasonal || null))
      .catch(() => {});
  }, [ticker, start, end]);
  return seasonal;
}

function useSuggest() {
  const [list, setList] = useState([]);
  useEffect(() => {
    fetch(`${API}/suggest`).then(r => r.json()).then(setList).catch(() => {});
  }, []);
  return list;
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function LightBadge({ light, score, size = "sm" }) {
  if (!light) return null;
  const lc = LIGHT_COLOR[light];
  if (!lc) return null;
  const pad = size === "sm" ? "2px 7px" : "4px 11px";
  const fs  = size === "sm" ? 11 : 13;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      background:lc.bg, border:`1.5px solid ${lc.line}`,
      borderRadius:20, padding:pad, fontSize:fs }}>
      <span style={{ width:7,height:7,borderRadius:"50%",background:lc.line,flexShrink:0 }} />
      <b style={{ color:lc.text }}>{lc.label}</b>
      {score && <span style={{ color:lc.text, opacity:.7 }}>{score}分</span>}
    </span>
  );
}

function Tip({ active, payload, lights }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const ym = d.date?.slice(0,7);
  const li = lights[ym];
  return (
    <div style={{ background:"#fff", border:"1px solid #e4e8f2", borderRadius:10,
      padding:"10px 14px", boxShadow:"0 4px 16px rgba(0,0,0,.10)", fontSize:12.5 }}>
      <div style={{ color:"#9098b5", marginBottom:3 }}>{d.date}</div>
      <div style={{ fontWeight:800, fontSize:18, color:"#6c5fd4" }}>{d.close} 元</div>
      <div style={{ fontSize:11, color:"#9098b5", marginTop:1 }}>
        H: {d.high}　L: {d.low}　V: {d.vol?.toLocaleString() ?? "—"}
      </div>
      {d.ma20 != null && (
        <div style={{ fontSize:11, color:"#f59e0b", marginTop:2 }}>MA20: {d.ma20} 元</div>
      )}
      {li && (
        <div style={{ marginTop:6 }}>
          <LightBadge light={li.light} score={li.score} />
          <span style={{ fontSize:10, color:"#9098b5", marginLeft:6 }}>{li.desc}</span>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [ticker,  setTicker]  = useState("0050.TW");
  const [input,   setInput]   = useState("0050.TW");
  const [start,   setStart]   = useState("2016-01-01");
  const [end,     setEnd]     = useState(today());
  const [tab,     setTab]     = useState("chart");
  const [year,    setYear]    = useState(null);  // null = 全部, "2025" = 單年

  const { data, loading, error } = useStock(ticker, start, end);
  const lights   = useLights();
  const seasonal = useSeasonal(ticker, start, end);
  const suggests = useSuggest();

  // Parse rows into chart-ready format, with 20-day MA
  const allDays = useMemo(() => {
    if (!data?.rows) return [];
    const rows = data.rows.filter(r => r.close);
    return rows.map((r, i) => {
      const win = rows.slice(Math.max(0, i - 19), i + 1);
      const ma20 = win.length >= 5
        ? parseFloat((win.reduce((s, x) => s + x.close, 0) / win.length).toFixed(2))
        : null;
      return {
        i,
        date:  r.date,
        m:     parseInt(r.date.slice(5,7)),
        yr:    parseInt(r.date.slice(0,4)),
        close: r.close,
        high:  r.high,
        low:   r.low,
        vol:   r.vol,
        ma20,
      };
    });
  }, [data]);

  const chartDays = useMemo(() => {
    if (!year) return allDays;
    return allDays.filter(d => d.yr === parseInt(year)).map((d,i) => ({...d, i}));
  }, [allDays, year]);

  const prices = chartDays.map(d => d.close);
  const hi = prices.length ? Math.max(...prices) : 0;
  const lo = prices.length ? Math.min(...prices) : 0;
  const first = prices[0] ?? 0, last = prices[prices.length-1] ?? 0;
  const chg   = first ? ((last-first)/first*100).toFixed(1) : "—";
  const isPos = last >= first;

  const mStarts = chartDays
    .map((d,i) => ({i, m:d.m, prev:chartDays[i-1]?.m}))
    .filter(x => x.i===0 || x.m!==x.prev);

  const yMin = lo ? Math.floor(lo*0.97/1)*1 : 0;
  const yMax = hi ? Math.ceil(hi*1.03/1)*1  : 200;

  const monthRanges = useMemo(() => {
    if (!chartDays.length) return [];
    return mStarts.map((ms, mi) => {
      const x1 = ms.i;
      const x2 = mi+1 < mStarts.length ? mStarts[mi+1].i-1 : chartDays.length-1;
      const mo = String(chartDays[x1].m).padStart(2,"0");
      const yr = chartDays[x1].yr;
      const li = lights[`${yr}-${mo}`];
      if (!li) return null;
      const lc = LIGHT_COLOR[li.light];
      return { x1, x2, bg:lc?.bg ?? "#fff" };
    }).filter(Boolean);
  }, [chartDays, mStarts, lights]);

  const handleSearch = useCallback(() => {
    let t = input.trim().toUpperCase();
    if (!t) return;
    if (!/\.\w+$/.test(t)) t += ".TW";
    setTicker(t);
    setYear(null);
  }, [input]);

  // Split markers: find index in chartDays for each split date
  const splitMarkers = useMemo(() => {
    if (!data?.splits || !chartDays.length) return [];
    return data.splits.flatMap(sp => {
      const idx = chartDays.findIndex(d => d.date >= sp.date);
      if (idx === -1) return [];
      return [{ i: idx, date: sp.date, ratio: sp.ratio }];
    });
  }, [data, chartDays]);

  const availYears = useMemo(() =>
    [...new Set(allDays.map(d => String(d.yr)))].sort(), [allDays]);

  return (
    <div style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif",
      background:"#f7f8fc", minHeight:"100vh", color:"#1a1d2e", fontSize:14 }}>

      {/* ── HEADER ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e4e8f2",
        padding:"12px 16px", display:"flex", alignItems:"center", gap:10,
        flexWrap:"wrap", position:"sticky", top:0, zIndex:50,
        boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>

        {/* Stock search */}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSearch()}
            placeholder="輸入代號，如 2330"
            style={{ width:130, padding:"7px 11px", borderRadius:9,
              border:"1px solid #e4e8f2", fontSize:13, outline:"none",
              background:"#f0f2f9", fontFamily:"inherit" }} />
          <button onClick={handleSearch}
            style={{ padding:"7px 14px", background:"#6c5fd4", color:"#fff",
              border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            查詢
          </button>
        </div>

        {/* Suggest pills */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {suggests.slice(0,5).map(s => (
            <button key={s.ticker} onClick={() => { setInput(s.ticker); setTicker(s.ticker); setYear(null); }}
              style={{ padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer",
                borderRadius:20, border:"1px solid #e4e8f2",
                background: s.ticker===ticker ? "#6c5fd4" : "#f7f8fc",
                color: s.ticker===ticker ? "#fff" : "#5a607a" }}>
              {s.ticker.replace(".TW","")} {s.name}
            </button>
          ))}
        </div>

        <div style={{ flex:1 }} />

        {/* Date range */}
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setStart(p.start); setEnd(today()); setYear(null); }}
              style={{ padding:"4px 9px", fontSize:11, cursor:"pointer",
                borderRadius:6, border:"1px solid #e4e8f2", background:"#f7f8fc",
                color:"#5a607a", fontWeight:500 }}>
              {p.label}
            </button>
          ))}
          <input type="date" value={start} onChange={e=>{setStart(e.target.value);setYear(null);}}
            style={{ padding:"4px 8px", borderRadius:7, border:"1px solid #e4e8f2",
              fontSize:12, outline:"none", background:"#f0f2f9" }} />
          <span style={{ color:"#9098b5" }}>→</span>
          <input type="date" value={end} onChange={e=>{setEnd(e.target.value);setYear(null);}}
            style={{ padding:"4px 8px", borderRadius:7, border:"1px solid #e4e8f2",
              fontSize:12, outline:"none", background:"#f0f2f9" }} />
        </div>

        {loading && <span style={{ fontSize:11, color:"#f59e0b" }}>⏳ 載入中...</span>}
        {error   && <span style={{ fontSize:11, color:"#ef4444" }}>⚠️ {error}</span>}
      </div>

      {/* ── TABS ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e4e8f2", display:"flex" }}>
        {[["chart","📊 日K圖"],["seasonal","🎯 3-4月分析"],["lights","🚦 燈號說明"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"9px 0", border:"none",
            borderBottom:`2.5px solid ${tab===id?"#6c5fd4":"transparent"}`,
            background:"none", fontSize:12.5,
            fontWeight:tab===id?700:400, color:tab===id?"#6c5fd4":"#9098b5", cursor:"pointer"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"12px" }}>

      {/* ── CHART TAB ── */}
      {tab==="chart" && (<>

        {/* Light legend */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
          {Object.entries(LIGHT_COLOR).map(([k,v])=>(
            <div key={k} style={{ display:"flex", alignItems:"center", gap:4,
              background:v.bg, border:`1.5px solid ${v.line}`,
              borderRadius:7, padding:"4px 9px", fontSize:11 }}>
              <div style={{width:8,height:8,borderRadius:"50%",background:v.line}}/>
              <b style={{color:v.text}}>{v.label}</b>
              <span style={{color:"#9098b5",fontSize:10}}>{v.desc}</span>
            </div>
          ))}
        </div>

        {/* Year filter tabs */}
        {availYears.length > 0 && (
          <div style={{ background:"#fff", border:"1px solid #e4e8f2", borderRadius:10,
            marginBottom:10, display:"flex", overflowX:"auto", scrollbarWidth:"none" }}>
            <button onClick={()=>setYear(null)} style={{
              flexShrink:0, padding:"8px 12px", border:"none",
              borderBottom:`2.5px solid ${!year?"#6c5fd4":"transparent"}`,
              background:"none", fontSize:12, fontWeight:!year?700:400,
              color:!year?"#6c5fd4":"#9098b5", cursor:"pointer" }}>全部</button>
            {availYears.map(y=>(
              <button key={y} onClick={()=>setYear(y)} style={{
                flexShrink:0, padding:"8px 11px", border:"none",
                borderBottom:`2.5px solid ${y===year?"#6c5fd4":"transparent"}`,
                background:"none", fontSize:12, fontWeight:y===year?700:400,
                color:y===year?"#6c5fd4":"#9098b5", cursor:"pointer" }}>{y}</button>
            ))}
          </div>
        )}

        {/* KPI */}
        {chartDays.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7, marginBottom:10 }}>
            {[
              ["起始",`${first}元`,"#5a607a"],
              ["終點",`${last}元`,isPos?"#22c55e":"#ef4444"],
              ["最高",`${hi}元`,"#22c55e"],
              ["最低",`${lo}元`,"#ef4444"],
            ].map(([label,val,color],i)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #e4e8f2",
                borderRadius:11,padding:"10px 6px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#9098b5",marginBottom:2}}>{label}</div>
                <div style={{fontWeight:800,fontSize:15,color,lineHeight:1}}>{val}</div>
                {i===1&&<div style={{fontSize:10,color:isPos?"#22c55e":"#ef4444",marginTop:2}}>
                  {isPos?"+":""}{chg}%</div>}
              </div>
            ))}
          </div>
        )}

        {/* CHART */}
        <div style={{ background:"#fff", border:"1px solid #e4e8f2", borderRadius:14,
          padding:"14px 6px 10px 2px", boxShadow:"0 1px 4px rgba(0,0,0,.05)", marginBottom:10 }}>
          <div style={{fontSize:11,fontWeight:600,color:"#5a607a",paddingLeft:12,marginBottom:6}}>
            {ticker.replace(".TW","")} {year ? `${year}年` : `${start} ~ ${end}`}
            {" "}（背景色 = 當月景氣燈號）
          </div>

          {loading ? (
            <div style={{height:280,display:"flex",alignItems:"center",justifyContent:"center",color:"#9098b5"}}>
              ⏳ 從 Yahoo Finance 下載資料中...
            </div>
          ) : chartDays.length === 0 ? (
            <div style={{height:280,display:"flex",alignItems:"center",justifyContent:"center",color:"#c0c7de"}}>
              {error ?? "請輸入股票代號查詢"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartDays} margin={{top:8,right:12,bottom:4,left:2}}>
                {monthRanges.map((r,i)=>(
                  <ReferenceArea key={i} x1={r.x1} x2={r.x2} fill={r.bg} fillOpacity={1} stroke="none" />
                ))}
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
                {mStarts.map(({i})=><ReferenceLine key={i} x={i} stroke="#d4d8e830" strokeWidth={1}/>)}
                <XAxis dataKey="i" ticks={mStarts.map(d=>d.i)}
                  tickFormatter={i=>{const d=chartDays[i];return d?`${d.yr}/${d.m}月`:"";}}
                  tick={{fontSize:9,fill:"#9098b5"}} axisLine={false} tickLine={false} interval={0}/>
                <YAxis domain={[yMin,yMax]} tick={{fontSize:10,fill:"#9098b5"}}
                  axisLine={false} tickLine={false} width={42}/>
                <Tooltip content={<Tip lights={lights}/>}/>
                <Area type="monotone" dataKey="high"  fill="#6c5fd415" stroke="none"/>
                <Area type="monotone" dataKey="low"   fill="#f7f8fc"   stroke="none" opacity={1}/>
                <Line type="monotone" dataKey="close"
                  stroke={isPos?"#6c5fd430":"#ef444430"} strokeWidth={1} dot={false}/>
                <Line type="monotone" dataKey="ma20"
                  stroke={isPos?"#6c5fd4":"#ef4444"} strokeWidth={2.5} dot={false}
                  activeDot={{r:4,fill:"#6c5fd4",stroke:"#fff",strokeWidth:2}}/>
                {splitMarkers.map((sp, idx) => (
                  <ReferenceLine key={`sp-${idx}`} x={sp.i}
                    stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
                    label={{ value:`拆股 1→${sp.ratio}`, position:"insideTopLeft",
                      fontSize:10, fill:"#d97706", fontWeight:700 }}/>
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </>)}

      {/* ── SEASONAL TAB ── */}
      {tab==="seasonal" && (
        <div>
          <div style={{background:"#fff",border:"1px solid #e4e8f2",borderRadius:13,padding:"13px"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#1a1d2e",marginBottom:4}}>
              🎯 {ticker.replace(".TW","")} — 歷年 3-4月最低點 vs 1-2月最高點
            </div>
            <div style={{fontSize:11,color:"#9098b5",marginBottom:12}}>
              使用真實日K最低價計算，可搭配景氣燈號判斷買點品質
            </div>
            {!seasonal ? (
              <div style={{color:"#c0c7de",padding:"20px 0",textAlign:"center"}}>載入中...</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#f0f2f9"}}>
                      {["年","1-2月高點","3-4月低點","跌幅","低點日","當月燈號","機會評估"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"#5a607a",
                          fontWeight:600,borderBottom:"1px solid #e4e8f2",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(seasonal).sort().map(([yr, s])=>{
                      const n = s.dip;
                      const dipColor = n<=-5?"#ef4444":n<=-3?"#f59e0b":n<0?"#9098b5":"#22c55e";
                      const dipBg    = n<=-5?"#fef2f2":n<=-3?"#fffbeb":n<0?"#f7f8fc":"#f0fdf4";
                      const loMo = `${yr}-${s.lo_date?.split("-")[0]?.padStart(2,"0")}`;
                      const li   = lights[loMo];
                      return (
                        <tr key={yr} style={{borderBottom:"1px solid #f0f2f9"}}>
                          <td style={{padding:"7px 10px",fontWeight:700}}>{yr}</td>
                          <td style={{padding:"7px 10px"}}>{s.q1hi} 元</td>
                          <td style={{padding:"7px 10px",color:dipColor,fontWeight:n<=-3?700:400}}>{s.q2lo} 元</td>
                          <td style={{padding:"7px 10px"}}>
                            <span style={{background:dipBg,color:dipColor,borderRadius:6,
                              padding:"2px 8px",fontSize:11,fontWeight:700}}>
                              {n<=0?n+"%":"▲"+Math.abs(n)+"%"}
                            </span>
                          </td>
                          <td style={{padding:"7px 10px",color:"#9098b5"}}>{s.lo_date}</td>
                          <td style={{padding:"7px 10px"}}>
                            {li && <LightBadge light={li.light} score={li.score} />}
                          </td>
                          <td style={{padding:"7px 10px",fontSize:11,fontWeight:600,
                            color:s.is_opportunity?"#16a34a":n<=-3?"#f59e0b":"#9098b5"}}>
                            {s.is_opportunity?"✅ 好機會":n<=-3?"⚠️ 留意燈號":n>-3&&n<0?"◷ 微跌":"▲ 無回調"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIGHTS TAB ── */}
      {tab==="lights" && (
        <div>
          <div style={{background:"#fff",border:"1px solid #e4e8f2",borderRadius:13,padding:"14px",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🚦 景氣對策信號說明</div>
            {Object.entries(LIGHT_COLOR).map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:12,
                padding:"10px",borderRadius:10,background:v.bg,
                border:`1px solid ${v.line}40`,marginBottom:8}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:v.line,flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:12}}>
                  {v.label.slice(0,1)}
                </div>
                <div style={{flex:1}}>
                  <b style={{color:v.text,fontSize:13}}>{v.label}</b>
                  <span style={{color:"#9098b5",fontSize:11,marginLeft:8}}>{v.desc}</span>
                </div>
                <div style={{color:v.text,fontSize:11,fontWeight:600}}>
                  {k==="red"?"38-45":k==="yellow_red"?"32-37":k==="green"?"23-31":k==="yellow_blue"?"17-22":"9-16"} 分
                </div>
              </div>
            ))}
            <div style={{marginTop:12,background:"#f7f8fc",borderRadius:9,padding:"12px",fontSize:12,color:"#5a607a",lineHeight:1.75}}>
              📌 <b>使用方式：</b>圖表背景色代表當月景氣燈號。<br/>
              綠燈/黃藍燈期間的 3-4月跌幅（3%+）通常是較好的買點，<br/>
              紅燈/藍燈期間的大跌要留意是否有更深的空頭風險。
            </div>
          </div>

          {/* Recent lights table */}
          <div style={{background:"#fff",border:"1px solid #e4e8f2",borderRadius:11,padding:"13px"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#5a607a",marginBottom:8}}>近期燈號（倒序）</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {Object.entries(lights).sort().reverse().slice(0,24).map(([ym,li])=>{
                const lc = LIGHT_COLOR[li.light];
                return lc ? (
                  <div key={ym} style={{background:lc.bg,border:`1px solid ${lc.line}60`,
                    borderRadius:8,padding:"6px 9px",textAlign:"center",minWidth:52}}>
                    <div style={{fontSize:9,color:"#9098b5",marginBottom:2}}>{ym.slice(2)}</div>
                    <div style={{fontWeight:700,fontSize:10,color:lc.text}}>{li.score}</div>
                    <div style={{fontSize:8.5,color:lc.text}}>{lc.label}</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
