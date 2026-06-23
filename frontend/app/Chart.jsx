// Chart.jsx — bespoke dark SVG price chart with 景氣燈號 background bands + bottom ribbon
const { useState, useRef, useEffect, useMemo, useLayoutEffect } = React;

function useWidth(){
  const ref = useRef(null);
  const [w, setW] = useState(720);
  useLayoutEffect(()=>{
    if(!ref.current) return;
    const ro = new ResizeObserver(es=>{ for(const e of es){ setW(e.contentRect.width); } });
    ro.observe(ref.current);
    setW(ref.current.clientWidth);
    return ()=>ro.disconnect();
  },[]);
  return [ref, w];
}
window.__useWidth = useWidth;

function PriceChart({ rows, height=360, accent, showMA=true, compact=false, showLights=true }){
  const T = window.T, LM = window.LIGHT_META, LIGHTS = window.LIGHTS;
  accent = accent || T.acc;
  const [wrapRef, W] = useWidth();
  const [hi, setHi] = useState(null); // hover index
  const uid = useMemo(()=>'c'+Math.random().toString(36).slice(2,8),[]);

  const n = rows.length;
  const padL = 6, padR = 54, padT = 14;
  const ribbonH = compact?12:15, ribbonGap = 9, xLabelH = 18;
  const padB = ribbonH + ribbonGap + xLabelH;
  const plotW = Math.max(10, W - padL - padR);
  const plotH = Math.max(10, height - padT - padB);
  const plotBottom = padT + plotH;

  const ma = useMemo(()=>{
    if(!showMA) return [];
    const out = new Array(n).fill(null);
    for(let i=0;i<n;i++){ const s=Math.max(0,i-19); const w=rows.slice(s,i+1);
      if(w.length>=5) out[i]= w.reduce((a,b)=>a+b.close,0)/w.length; }
    return out;
  },[rows,n,showMA]);

  const { lo, hiP } = useMemo(()=>{
    let lo=Infinity, h=-Infinity;
    for(const r of rows){ if(r.low<lo)lo=r.low; if(r.high>h)h=r.high; }
    if(!isFinite(lo)){lo=0;h=1;}
    const pad=(h-lo)*0.06||1; return { lo:lo-pad, hiP:h+pad };
  },[rows]);

  const x = i => padL + (n<=1?0:(i/(n-1))*plotW);
  const y = v => plotBottom - ((v-lo)/(hiP-lo))*plotH;

  // month segments for bands + ribbon
  const months = useMemo(()=>{
    const segs=[]; let cur=null;
    for(let i=0;i<n;i++){ const ym=rows[i].date.slice(0,7);
      if(!cur||cur.ym!==ym){ if(cur)cur.i2=i-1; cur={ym,i1:i,i2:i}; segs.push(cur);} }
    if(cur)cur.i2=n-1; return segs;
  },[rows,n]);

  const yearTicks = useMemo(()=>{
    const out=[]; let cy=null;
    for(let i=0;i<n;i++){ const yr=rows[i].date.slice(0,4);
      if(yr!==cy){ out.push({i,yr}); cy=yr; } }
    return out;
  },[rows,n]);

  // paths
  const linePath = useMemo(()=>{
    if(!n) return '';
    let d=''; for(let i=0;i<n;i++){ d+=(i?'L':'M')+x(i).toFixed(1)+' '+y(rows[i].close).toFixed(1); }
    return d;
  },[rows,n,W,height,lo,hiP]);
  const areaPath = useMemo(()=> n? linePath+`L${x(n-1).toFixed(1)} ${plotBottom}L${x(0).toFixed(1)} ${plotBottom}Z`:'',[linePath,n,W,height]);
  const maPath = useMemo(()=>{
    if(!showMA||!n) return ''; let d='',started=false;
    for(let i=0;i<n;i++){ if(ma[i]==null)continue; d+=(started?'L':'M')+x(i).toFixed(1)+' '+y(ma[i]).toFixed(1); started=true; }
    return d;
  },[ma,n,W,height,lo,hiP]);

  // y grid ticks
  const yTicks = useMemo(()=>{
    const k=compact?4:5, out=[]; for(let t=0;t<=k;t++){ const v=lo+(hiP-lo)*t/k; out.push(v);} return out;
  },[lo,hiP,compact]);

  const last = rows[n-1];
  const hov = hi!=null ? rows[hi] : null;
  const hovLight = hov ? LIGHTS[hov.date.slice(0,7)] : null;

  function onMove(e){
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let i = Math.round(((mx-padL)/plotW)*(n-1));
    i = Math.max(0,Math.min(n-1,i)); setHi(i);
  }

  // tooltip position
  const ttW = 156; let ttX = hi!=null ? x(hi)+12 : 0;
  if(ttX+ttW > W) ttX = x(hi)-12-ttW;

  return (
    React.createElement('div', { ref:wrapRef, style:{ width:'100%', position:'relative', userSelect:'none' } },
      React.createElement('svg', { width:'100%', height, viewBox:`0 0 ${W} ${height}`, style:{ display:'block', overflow:'visible' },
        onMouseMove:onMove, onMouseLeave:()=>setHi(null) },
        React.createElement('defs', null,
          React.createElement('linearGradient', { id:uid+'a', x1:0,y1:0,x2:0,y2:1 },
            React.createElement('stop',{offset:'0%',stopColor:accent,stopOpacity:0.28}),
            React.createElement('stop',{offset:'100%',stopColor:accent,stopOpacity:0})),
        ),
        // month light bands
        showLights && months.map((m,k)=>{ const li=LIGHTS[m.ym]; if(!li)return null; const meta=LM[li.l]; if(!meta)return null;
          const x1=x(m.i1), x2=x(m.i2+1>=n? n-1 : m.i2)+ (plotW/Math.max(1,n-1))*0.5;
          return React.createElement('rect',{ key:'b'+k, x:x1, y:padT, width:Math.max(0.5,x2-x1), height:plotH, fill:meta.soft });
        }),
        // y grid + labels
        yTicks.map((v,k)=> React.createElement('g',{key:'y'+k},
          React.createElement('line',{ x1:padL, x2:padL+plotW, y1:y(v), y2:y(v), stroke:T.grid, strokeWidth:1 }),
          React.createElement('text',{ x:padL+plotW+8, y:y(v)+3.5, fill:T.txDim, fontSize:10.5, fontFamily:window.MONO, textAnchor:'start' }, window.fmt.price(v))
        )),
        // area + line
        React.createElement('path',{ d:areaPath, fill:`url(#${uid}a)` }),
        showMA && React.createElement('path',{ d:maPath, fill:'none', stroke:accent, strokeOpacity:0.35, strokeWidth:1.2 }),
        React.createElement('path',{ d:linePath, fill:'none', stroke:accent, strokeWidth:1.8, strokeLinejoin:'round' }),
        // last price marker
        last && React.createElement('g',null,
          React.createElement('line',{ x1:padL, x2:padL+plotW, y1:y(last.close), y2:y(last.close), stroke:accent, strokeOpacity:0.35, strokeDasharray:'2 3', strokeWidth:1 }),
          React.createElement('circle',{ cx:x(n-1), cy:y(last.close), r:3.2, fill:accent, stroke:T.bg1, strokeWidth:2 }),
          React.createElement('rect',{ x:padL+plotW+2, y:y(last.close)-9, width:padR-4, height:18, rx:4, fill:accent }),
          React.createElement('text',{ x:padL+plotW+8, y:y(last.close)+3.5, fill:'#fff', fontSize:10.5, fontWeight:700, fontFamily:window.MONO }, window.fmt.price(last.close))
        ),
        // x year labels
        yearTicks.map((t,k)=> (t.i>2 && (!compact || (+t.yr)%2===0)) && React.createElement('text',{ key:'x'+k, x:x(t.i), y:plotBottom+13, fill:T.txDim, fontSize:10.5, fontFamily:window.MONO, textAnchor:'middle' }, t.yr)),
        yearTicks.map((t,k)=> t.i>2 && React.createElement('line',{ key:'xl'+k, x1:x(t.i), x2:x(t.i), y1:padT, y2:plotBottom, stroke:T.grid, strokeWidth:1 })),
        // ===== 景氣燈號 RIBBON =====
        showLights && (()=>{ const ry = plotBottom + ribbonGap + xLabelH;
          return React.createElement('g',null,
            months.map((m,k)=>{ const li=LIGHTS[m.ym]; if(!li)return null; const meta=LM[li.l]; if(!meta)return null;
              const x1=x(m.i1), x2=k+1<months.length? x(months[k+1].i1): padL+plotW;
              return React.createElement('rect',{ key:'r'+k, x:x1, y:ry, width:Math.max(0.5,x2-x1-0.6), height:ribbonH, rx:1.5, fill:meta.dot, opacity:0.92 });
            })
          );
        })(),
        // hover crosshair
        hov && React.createElement('g',{ style:{pointerEvents:'none'} },
          React.createElement('line',{ x1:x(hi), x2:x(hi), y1:padT, y2:plotBottom, stroke:T.tx2, strokeOpacity:0.4, strokeWidth:1 }),
          React.createElement('circle',{ cx:x(hi), cy:y(hov.close), r:3.6, fill:'#fff', stroke:accent, strokeWidth:2 }),
        ),
      ),
      // hover tooltip (HTML overlay)
      hov && React.createElement('div',{ style:{
        position:'absolute', left:ttX, top:padT+6, width:ttW, pointerEvents:'none',
        background:'rgba(12,16,24,0.96)', border:`1px solid ${T.line}`, borderRadius:9,
        padding:'9px 11px', boxShadow:'0 8px 28px rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' } },
        React.createElement('div',{ style:{ fontSize:11, color:T.txDim, fontFamily:window.MONO, marginBottom:3 } }, hov.date),
        React.createElement('div',{ style:{ fontSize:19, fontWeight:800, color:accent, fontFamily:window.MONO, lineHeight:1 } }, window.fmt.price(hov.close)),
        React.createElement('div',{ style:{ fontSize:10.5, color:T.txDim, fontFamily:window.MONO, marginTop:4 } }, `高 ${window.fmt.price(hov.high)}　低 ${window.fmt.price(hov.low)}`),
        showLights && hovLight && (()=>{ const meta=LM[hovLight.l]; return React.createElement('div',{ style:{ display:'flex',alignItems:'center',gap:6,marginTop:7,paddingTop:7,borderTop:`1px solid ${T.lineSoft}` } },
          window.UI.Dot({ c:meta.dot, size:8, glow:meta.glow }),
          React.createElement('b',{ style:{ color:meta.dot, fontSize:12 } }, hovLight.z),
          React.createElement('span',{ style:{ color:T.txDim, fontSize:10.5, fontFamily:window.MONO, marginLeft:'auto' } }, hovLight.s+'分')
        ); })()
      )
    )
  );
}
window.PriceChart = PriceChart;
