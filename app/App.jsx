// App.jsx — 景氣選股：real API version (replaces genSeries mock)
const { useState, useMemo, useEffect } = React;

const API = 'https://taiwan-stock-app-5qgi.onrender.com/api';
const COMPARE_TICKERS = ['0050.TW', '0056.TW', '2330.TW'];

function filterPeriod(rows, p) {
  if (p === 'ALL' || !rows.length) return rows;
  const days = { '1Y': 365, '3Y': 365 * 3, '5Y': 365 * 5 }[p];
  const last = new Date(rows[rows.length - 1].date);
  const cut = new Date(last); cut.setDate(cut.getDate() - days);
  const cs = cut.toISOString().slice(0, 10);
  return rows.filter(r => r.date >= cs);
}
const PERIODS = ['1Y', '3Y', '5Y', 'ALL'];

function StockHeader({ code, name, st, period, setPeriod, big }) {
  const T = window.T;
  const chg = st ? st.ret : 0;
  return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: big ? 18 : 12, flexWrap: 'wrap' } },
    React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 9 } },
        React.createElement('span', { style: { fontSize: big ? 26 : 20, fontWeight: 800, color: T.tx, fontFamily: window.MONO, letterSpacing: '0.01em' } }, code.replace('.TW', '')),
        React.createElement('span', { style: { fontSize: big ? 14 : 12.5, color: T.tx2, fontWeight: 600, whiteSpace: 'nowrap' } }, name)
      ),
      st && React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 } },
        React.createElement('span', { style: { fontSize: big ? 30 : 24, fontWeight: 800, color: T.tx, fontFamily: window.MONO, lineHeight: 1 } }, window.fmt.price(st.last)),
        React.createElement('span', { style: { fontSize: big ? 14 : 13, fontWeight: 700, color: window.Pn.signColor(chg), fontFamily: window.MONO } }, window.fmt.pct1(chg))
      )
    ),
    React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: 5, alignSelf: 'flex-end' } },
      PERIODS.map(p => window.UI.Chip({ key: p, children: p, mono: true, active: p === period, onClick: () => setPeriod(p) }))
    )
  );
}

function SearchRow({ ticker, setTicker, compact }) {
  const T = window.T; const [v, setV] = useState('');
  const go = () => { let t = v.trim().toUpperCase(); if (!t) return; if (!/\.\w+$/.test(t)) t += '.TW'; setTicker(t); setV(''); };
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, ...T.glassSoft, borderRadius: 10, padding: '2px 2px 2px 10px' } },
      React.createElement('span', { style: { color: T.txDim, fontSize: 13 } }, '⌕'),
      React.createElement('input', {
        value: v, onChange: e => setV(e.target.value), onKeyDown: e => e.key === 'Enter' && go(),
        placeholder: '代號 2330', style: { width: compact ? 92 : 108, padding: '6px 4px', border: 'none', outline: 'none', background: 'transparent', color: T.tx, fontSize: 13, fontFamily: window.MONO }
      }),
      React.createElement('button', { onClick: go, style: { padding: '6px 12px', background: T.acc, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' } }, '查詢')
    ),
    React.createElement('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap' } },
      window.TICKERS.map(s => window.UI.Chip({ key: s.code, children: s.code.replace('.TW', ''), mono: true, active: s.code === ticker, onClick: () => setTicker(s.code) }))
    )
  );
}

// ── Loading overlay ──
function LoadingOverlay({ height = 360 }) {
  const T = window.T;
  return React.createElement('div', {
    style: { height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: T.txDim }
  },
    React.createElement('div', { style: { fontSize: 28, animation: 'spin 1s linear infinite' } }, '⏳'),
    React.createElement('div', { style: { fontSize: 12, fontFamily: window.MONO } }, '從 Yahoo Finance 下載資料中...')
  );
}

// ── DESKTOP ──
function Desktop({ ticker, setTicker, period, setPeriod, rows, loading, cmp }) {
  const T = window.T, Pn = window.Pn;
  const meta = window.TICKERS.find(t => t.code === ticker) || { name: '' };
  const names = Object.fromEntries(window.TICKERS.map(t => [t.code, t.name]));

  const filtered = useMemo(() => filterPeriod(rows, period), [rows, period]);
  const st = useMemo(() => Pn.stats(filtered), [filtered]);
  const seas = useMemo(() => Pn.seasonal(rows), [rows]);
  const chg = st ? st.ret : 0;

  return React.createElement('div', { style: { maxWidth: 1480, margin: '0 auto', padding: '16px 26px 44px' } },
    React.createElement(SearchRow, { ticker, setTicker }),
    // info bar
    React.createElement('div', { style: { ...T.glass, borderRadius: 18, padding: '16px 22px', marginTop: 14, display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' } },
      React.createElement('div', { style: { minWidth: 200 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
          React.createElement('span', { style: { fontSize: 27, fontWeight: 800, color: T.tx, fontFamily: window.MONO } }, ticker.replace('.TW', '')),
          React.createElement('span', { style: { fontSize: 14, color: T.tx2, fontWeight: 600, whiteSpace: 'nowrap' } }, meta.name)
        ),
        st && React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 11, marginTop: 7 } },
          React.createElement('span', { style: { fontSize: 32, fontWeight: 800, color: T.tx, fontFamily: window.MONO, lineHeight: 1 } }, window.fmt.price(st.last)),
          React.createElement('span', { style: { fontSize: 15, fontWeight: 700, color: Pn.signColor(chg), fontFamily: window.MONO } }, window.fmt.pct1(chg))
        )
      ),
      React.createElement('div', { style: { width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.08)' } }),
      React.createElement(Pn.KPIInline, { st }),
      React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 } },
        React.createElement(Pn.CurrentLight, null),
        React.createElement('div', { style: { display: 'flex', gap: 5 } },
          PERIODS.map(p => window.UI.Chip({ key: p, children: p, mono: true, active: p === period, onClick: () => setPeriod(p) }))
        )
      )
    ),
    // chart
    React.createElement(Pn.Panel, { pad: 18, style: { marginTop: 14 } },
      loading
        ? React.createElement(LoadingOverlay, { height: 430 })
        : React.createElement(window.PriceChart, { rows: filtered, height: 430 }),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)' } },
        React.createElement('span', { style: { fontSize: 10.5, color: T.txDim } }, '底部色帶 / 背景 = 當月景氣燈號'),
        React.createElement('div', { style: { marginLeft: 'auto' } }, React.createElement(Pn.Legend, { wrap: false }))
      )
    ),
    // insight
    React.createElement('div', { style: { marginTop: 14 } }, React.createElement(Pn.InsightBanner, { seas, name: meta.name })),
    // row B
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 14, marginTop: 14, alignItems: 'start' } },
      React.createElement(Pn.Panel, { title: '景氣燈號日曆', sub: '2016–2026 每月對策信號　▾ = 該年 3–4 月優質買點', pad: 18 },
        React.createElement(Pn.LightCalendar, { seas })
      ),
      React.createElement(Pn.Panel, { title: '3–4 月季節性回檔', sub: '1–2 月高點 → 3–4 月最低點　✓ 好買點 ! 留意 · 無回調', pad: 18 },
        React.createElement(Pn.SeasonalPanel, { seas })
      )
    ),
    // compare
    React.createElement(Pn.Panel, { title: '多股對比', sub: '同期還原基準 = 100', pad: 18, style: { marginTop: 14 } },
      React.createElement(window.CompareChart, { series: cmp, names, height: 220 })
    )
  );
}

// ── MOBILE ──
function Mobile({ ticker, setTicker, period, setPeriod, rows, loading }) {
  const T = window.T, Pn = window.Pn;
  const [tab, setTab] = useState('chart');
  const meta = window.TICKERS.find(t => t.code === ticker) || { name: '' };

  const filtered = useMemo(() => filterPeriod(rows, period), [rows, period]);
  const st = useMemo(() => Pn.stats(filtered), [filtered]);
  const seas = useMemo(() => Pn.seasonal(rows), [rows]);

  const TABS = [['chart', '走勢'], ['seasonal', '季節性'], ['lights', '燈號']];
  return React.createElement(PhoneFrame, null,
    React.createElement('div', { style: { padding: '8px 14px 10px', borderBottom: `1px solid rgba(255,255,255,0.08)`, background: 'rgba(8,11,18,0.55)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)', position: 'sticky', top: 0, zIndex: 5 } },
      React.createElement(SearchRow, { ticker, setTicker, compact: true }),
      React.createElement('div', { style: { marginTop: 11 } },
        React.createElement(StockHeader, { code: ticker, name: meta.name, st, period, setPeriod })
      )
    ),
    React.createElement('div', { style: { padding: '12px 14px 80px' } },
      React.createElement(Pn.KPIStrip, { st, cols: 2 }),
      React.createElement('div', { style: { marginTop: 12 } },
        React.createElement(Pn.Panel, { pad: 12 },
          loading
            ? React.createElement(LoadingOverlay, { height: 220 })
            : React.createElement(window.PriceChart, { rows: filtered, height: 220, compact: true }),
          React.createElement('div', { style: { marginTop: 10 } }, React.createElement(Pn.Legend, { wrap: true }))
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: 6, margin: '14px 0 12px', background: T.bg2, padding: 4, borderRadius: 10, border: `1px solid ${T.line}` } },
        TABS.map(([id, label]) => React.createElement('button', {
          key: id, onClick: () => setTab(id), style: {
            flex: 1, padding: '8px 0', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: tab === id ? 700 : 500,
            background: tab === id ? T.acc : 'transparent', color: tab === id ? '#fff' : T.tx2, fontFamily: window.FONT
          }
        }, label))
      ),
      tab === 'chart' && React.createElement(Pn.InsightCard, { seas, name: meta.name }),
      tab === 'seasonal' && React.createElement(Pn.Panel, { title: '3–4 月季節性回檔', sub: '✓ 好買點 ! 留意 · 無回調', pad: 14 },
        React.createElement(Pn.SeasonalPanel, { seas })),
      tab === 'lights' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement(Pn.Panel, { title: '景氣燈號日曆', sub: '▾ = 該年 3–4 月優質買點', pad: 14 },
          React.createElement(Pn.LightCalendar, { seas, compact: true })),
        React.createElement(Pn.Panel, { title: '燈號說明', pad: 14 }, React.createElement(Pn.Legend, { wrap: true }))
      )
    ),
    React.createElement('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 62, background: 'rgba(11,15,23,0.92)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 6 } },
      [['◧', '自選'], ['◔', '圖表', true], ['◈', '分析'], ['○', '我的']].map(([ic, lb, on], i) =>
        React.createElement('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? T.acc : T.txDim } },
          React.createElement('span', { style: { fontSize: 17, lineHeight: 1 } }, ic),
          React.createElement('span', { style: { fontSize: 9.5 } }, lb)
        ))
    )
  );
}

function PhoneFrame({ children }) {
  const T = window.T;
  return React.createElement('div', { style: { display: 'flex', justifyContent: 'center', padding: '28px 16px 48px' } },
    React.createElement('div', { style: { width: 392, position: 'relative' } },
      React.createElement('div', { style: { position: 'relative', width: 392, height: 812, background: T.bg1, borderRadius: 46, border: `1px solid ${T.line}`, boxShadow: '0 40px 90px rgba(0,0,0,0.6), 0 0 0 11px #05070b, 0 0 0 12px #1b2230', overflow: 'hidden' } },
        React.createElement('div', { style: { height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', background: T.bg1, position: 'relative', zIndex: 6 } },
          React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: T.tx, fontFamily: window.MONO } }, '9:41'),
          React.createElement('div', { style: { width: 118, height: 26, background: '#000', borderRadius: 16, position: 'absolute', left: '50%', top: 7, transform: 'translateX(-50%)' } }),
          React.createElement('span', { style: { fontSize: 11, color: T.tx2, letterSpacing: '0.1em' } }, '5G  ▮▮▮')
        ),
        React.createElement('div', { style: { position: 'absolute', top: 40, left: 0, right: 0, bottom: 0, overflowY: 'auto', background: T.ambient } }, children)
      )
    )
  );
}

// ── ROOT ──
function App() {
  const T = window.T;
  const [device, setDevice] = useState(() => localStorage.getItem('tw_device') || 'desktop');
  const [ticker, setTicker] = useState('0050.TW');
  const [period, setPeriod] = useState('ALL');
  const [cache, setCache] = useState({});      // ticker -> rows[]
  const [cmpCache, setCmpCache] = useState({}); // ticker -> rows[]
  const [loading, setLoading] = useState(false);

  useEffect(() => { localStorage.setItem('tw_device', device); }, [device]);

  // fetch main ticker data
  useEffect(() => {
    if (cache[ticker]) return;
    setLoading(true);
    fetch(`${API}/stock?ticker=${ticker}&start=2016-01-01`)
      .then(r => r.json())
      .then(d => { if (d.rows) setCache(p => ({ ...p, [ticker]: d.rows })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  // prefetch compare tickers in background
  useEffect(() => {
    COMPARE_TICKERS.forEach(t => {
      if (cmpCache[t]) return;
      fetch(`${API}/stock?ticker=${t}&start=2016-01-01`)
        .then(r => r.json())
        .then(d => { if (d.rows) setCmpCache(p => ({ ...p, [t]: d.rows })); })
        .catch(() => {});
    });
  }, []);

  const rows = (cache[ticker] || []).filter(r => r.close != null);
  const cmp = COMPARE_TICKERS.map(c => ({ code: c, rows: (cmpCache[c] || []).filter(r => r.close != null).filter((_, i) => i % 3 === 0) }));

  return React.createElement('div', { style: { minHeight: '100vh', background: T.ambient, backgroundAttachment: 'fixed', color: T.tx, fontFamily: window.FONT } },
    // presenter bar
    React.createElement('div', { style: { position: 'sticky', top: 0, zIndex: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '11px 22px', background: 'rgba(8,11,18,0.55)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)', borderBottom: `1px solid rgba(255,255,255,0.08)` } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
        React.createElement('div', { style: { width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg,${T.acc},${T.dn})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' } }, '燈'),
        React.createElement('span', { style: { fontSize: 14.5, fontWeight: 800, color: T.tx, letterSpacing: '0.01em' } }, '景氣選股'),
        React.createElement('span', { style: { fontSize: 11, color: T.txDim, fontFamily: window.MONO } }, 'TW · 景氣燈號 × 日K')
      ),
      loading && React.createElement('span', { style: { fontSize: 11, color: T.acc, fontFamily: window.MONO, marginLeft: 8 } }, '⟳ 載入中...'),
      React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 3, gap: 2 } },
        [['desktop', '▭  桌機儀表板'], ['mobile', '▢  手機 App']].map(([id, lb]) =>
          React.createElement('button', {
            key: id, onClick: () => setDevice(id), style: {
              padding: '7px 15px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: device === id ? 700 : 500,
              background: device === id ? T.acc : 'transparent', color: device === id ? '#fff' : T.tx2, fontFamily: window.FONT, transition: 'all .14s'
            }
          }, lb))
      )
    ),
    device === 'desktop'
      ? React.createElement(Desktop, { ticker, setTicker, period, setPeriod, rows, loading, cmp })
      : React.createElement(Mobile, { ticker, setTicker, period, setPeriod, rows, loading })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
