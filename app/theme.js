// theme.js — dark fintech design tokens (Taiwan stock terminal)
window.T = {
  // surfaces
  bg0:   '#080b12',   // app canvas
  bg1:   '#10151f',   // panel
  bg2:   '#0b0f17',   // inset / track
  bg3:   '#161d2a',   // raised / hover
  // lines
  line:  '#1e2636',
  lineSoft: '#171e2b',
  // text — txDim 從 #5b6680 調亮到 #77839c：小字對比達 WCAG，視覺幾乎無感但可讀性明顯提升
  tx:    '#e9eef8',
  tx2:   '#929fb6',
  tx3:   '#77839c',
  txDim: '#77839c',
  // brand
  acc:   '#7b6cf6',   // violet
  accHi: '#a99cff',
  accSoft:'rgba(123,108,246,0.14)',
  // 台股慣例 紅漲綠跌
  up:    '#ff5668',   // 漲 red
  upSoft:'rgba(255,86,104,0.14)',
  dn:    '#19c79a',   // 跌 green
  dnSoft:'rgba(25,199,154,0.14)',
  // 買點品質（琥珀）— 與漲跌色系分離，避免「回檔越深越紅」被誤讀成上漲
  buy:   '#ffb454',
  buyDim:'#c9a15e',
  buySoft:'rgba(255,180,84,0.13)',
  // misc
  grid:  'rgba(255,255,255,0.045)',
};

// ── 面板兩級制 ──
// glass（主面板）：完整毛玻璃 + glow，整頁只留給視覺重心（價格圖表、頂部資訊列）
window.T.glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(26px) saturate(165%)',
  WebkitBackdropFilter: 'blur(26px) saturate(165%)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 10px 44px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
};
// card（次面板）：無 backdrop-filter 的實色卡片 → 建立層級 + 低階裝置效能更好
window.T.card = {
  background: 'rgba(16,21,31,0.78)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
};
window.T.glassSoft = {
  background: 'rgba(255,255,255,0.035)',
  backdropFilter: 'blur(18px) saturate(150%)',
  WebkitBackdropFilter: 'blur(18px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.08)',
};
// ambient glow backdrop (gives glass something to refract)
window.T.ambient = `radial-gradient(1000px 680px at 10% -5%, rgba(123,108,246,0.20), transparent 58%), radial-gradient(900px 640px at 96% 4%, rgba(25,199,154,0.12), transparent 54%), radial-gradient(820px 600px at 52% 108%, rgba(74,107,255,0.13), transparent 60%), #080b12`;

// fonts
window.FONT = "'Noto Sans TC','PingFang TC',system-ui,sans-serif";
window.MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

// ── 字級 scale：全站收斂到這 8 級（取代散落的 9.5/10.5/12.5/15.5…）──
window.FS = { xs:10, sm:11, md:12, base:13, lg:15, xl:20, h1:28, num:32 };

// helpers
window.fmt = {
  price: (n) => n==null ? '—' : (n>=1000 ? n.toLocaleString('en-US',{maximumFractionDigits:0}) : n.toFixed(2)),
  pct:   (n) => (n>0?'+':'') + n.toFixed(2) + '%',
  pct1:  (n) => (n>0?'+':'') + n.toFixed(1) + '%',
  ym:    (s) => s.slice(2).replace('-','/'),
};

// small shared bits used across panels
window.UI = (function(){
  const T = window.T;
  function Dot({ c, size=8, glow }){
    return React.createElement('span', { style:{
      width:size, height:size, borderRadius:'50%', background:c, flexShrink:0,
      boxShadow: glow ? `0 0 7px ${glow}` : 'none', display:'inline-block'
    }});
  }
  // Chip：改用 CSS class（定義於 index.html），才有 :hover / :focus-visible 態
  function Chip({ children, active, onClick, mono, key }){
    return React.createElement('button', {
      key,
      onClick,
      className: 'chip' + (active ? ' chip--on' : '') + (mono ? ' chip--mono' : ''),
    }, children);
  }
  // Skeleton：shimmer 載入佔位（.sk class 定義於 index.html）
  function Skeleton({ key, w='100%', h=14, r=8, style }){
    return React.createElement('div', { key, className:'sk', style:{ width:w, height:h, borderRadius:r, ...style } });
  }
  // SkeletonRows：面板常用的多行佔位
  function SkeletonRows({ n=3, h=14, gap=10 }){
    const widths = ['100%','82%','64%','90%','71%'];
    return React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap } },
      Array.from({length:n},(_,i)=> Skeleton({ key:i, w:widths[i%widths.length], h }))
    );
  }
  return { Dot, Chip, Skeleton, SkeletonRows };
})();
