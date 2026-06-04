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
  // text
  tx:    '#e9eef8',
  tx2:   '#929fb6',
  tx3:   '#5b6680',
  txDim: '#5b6680',
  // brand
  acc:   '#7b6cf6',   // violet
  accHi: '#a99cff',
  accSoft:'rgba(123,108,246,0.14)',
  // 台股慣例 紅漲綠跌
  up:    '#ff5668',   // 漲 red
  upSoft:'rgba(255,86,104,0.14)',
  dn:    '#19c79a',   // 跌 green
  dnSoft:'rgba(25,199,154,0.14)',
  // misc
  grid:  'rgba(255,255,255,0.045)',
};

// iOS-style frosted glass surface
window.T.glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(26px) saturate(165%)',
  WebkitBackdropFilter: 'blur(26px) saturate(165%)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: '0 10px 44px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
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
  function Chip({ children, active, onClick, mono, key }){
    return React.createElement('button', {
      key,
      onClick,
      style:{
        padding:'5px 11px', fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
        borderRadius:7, fontFamily: mono?window.MONO:window.FONT,
        fontWeight: active?700:500, letterSpacing: mono?'0.02em':0,
        border:`1px solid ${active?'transparent':T.line}`,
        background: active? T.acc : 'transparent',
        color: active? '#fff' : T.tx2,
        transition:'all .12s',
      }
    }, children);
  }
  return { Dot, Chip };
})();
