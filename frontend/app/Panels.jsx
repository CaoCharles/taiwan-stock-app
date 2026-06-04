// Panels.jsx — KPI strip, insight, 景氣燈號日曆 heatmap, seasonal, compare
const Pn = {};

// ---- computations ----
Pn.stats = function(rows){
  if(!rows.length) return null;
  const first=rows[0].close, last=rows[rows.length-1].close;
  let hi=-Infinity, lo=Infinity, peak=-Infinity, mdd=0;
  for(const r of rows){ if(r.high>hi)hi=r.high; if(r.low<lo)lo=r.low;
    if(r.close>peak)peak=r.close; const dd=(r.close-peak)/peak*100; if(dd<mdd)mdd=dd; }
  const d0=new Date(rows[0].date), d1=new Date(rows[rows.length-1].date);
  const yrs=Math.max(0.1,(d1-d0)/(365.25*864e5));
  const ret=(last-first)/first*100;
  const ann=(Math.pow(last/first,1/yrs)-1)*100;
  return { first,last,hi,lo,ret,ann,mdd, pos:(last-lo)/Math.max(0.01,hi-lo) };
};

Pn.seasonal = function(rows){
  const byYear={};
  for(const r of rows){ const y=r.date.slice(0,4), m=+r.date.slice(5,7);
    (byYear[y]=byYear[y]||[]).push({...r,m}); }
  const out=[];
  for(const y of Object.keys(byYear).sort()){
    const rs=byYear[y];
    const q1=rs.filter(r=>r.m<=2), q2=rs.filter(r=>r.m===3||r.m===4);
    if(!q1.length||!q2.length) continue;
    const q1hi=Math.max(...q1.map(r=>r.high));
    let loR=q2[0]; for(const r of q2) if(r.low<loR.low) loR=r;
    const dip=(loR.low-q1hi)/q1hi*100;
    const li=window.LIGHTS[loR.date.slice(0,7)];
    out.push({ y, q1hi, q2lo:loR.low, dip, loDate:loR.date, light:li });
  }
  return out;
};

// ---- atoms ----
function Panel({ title, sub, right, children, pad=14, style }){
  const T=window.T;
  return React.createElement('div',{ style:{ ...T.glass, borderRadius:16, padding:pad, ...style } },
    (title||right) && React.createElement('div',{ style:{ display:'flex', alignItems:'baseline', gap:8, marginBottom:sub?2:12 } },
      title && React.createElement('div',{ style:{ fontSize:13, fontWeight:700, color:T.tx, letterSpacing:'0.01em', whiteSpace:'nowrap' } }, title),
      right && React.createElement('div',{ style:{ marginLeft:'auto' } }, right)
    ),
    sub && React.createElement('div',{ style:{ fontSize:11, color:T.txDim, marginBottom:12 } }, sub),
    children
  );
}
Pn.Panel = Panel;

function signColor(v){ return v>=0 ? window.T.up : window.T.dn; }
Pn.signColor = signColor;

// ---- KPI strip ----
Pn.KPIStrip = function({ st, cols=4 }){
  const T=window.T; if(!st) return null;
  const items=[
    { l:'期間報酬', v:window.fmt.pct1(st.ret), c:signColor(st.ret) },
    { l:'年化報酬', v:window.fmt.pct1(st.ann), c:signColor(st.ann) },
    { l:'最大回檔', v:window.fmt.pct1(st.mdd), c:T.dn },
    { l:'現價位階', v:Math.round(st.pos*100)+'%', c:T.tx, bar:st.pos },
  ];
  return React.createElement('div',{ style:{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:9 } },
    items.map((it,i)=> React.createElement('div',{ key:i, style:{ ...T.glassSoft, borderRadius:13, padding:'11px 13px' } },
      React.createElement('div',{ style:{ fontSize:10.5, color:T.txDim, marginBottom:6, letterSpacing:'0.04em' } }, it.l),
      React.createElement('div',{ style:{ fontSize:20, fontWeight:800, color:it.c, fontFamily:window.MONO, lineHeight:1 } }, it.v),
      it.bar!=null && React.createElement('div',{ style:{ marginTop:8, height:4, borderRadius:3, background:T.bg2, overflow:'hidden' } },
        React.createElement('div',{ style:{ width:(it.bar*100)+'%', height:'100%', background:`linear-gradient(90deg,${T.dn},${T.up})`, borderRadius:3 } })
      )
    ))
  );
};

// ---- KPI inline (for top info bar) ----
Pn.KPIInline = function({ st }){
  const T=window.T; if(!st) return null;
  const items=[
    { l:'期間報酬', v:window.fmt.pct1(st.ret), c:signColor(st.ret) },
    { l:'年化報酬', v:window.fmt.pct1(st.ann), c:signColor(st.ann) },
    { l:'最大回檔', v:window.fmt.pct1(st.mdd), c:T.dn },
    { l:'現價位階', v:Math.round(st.pos*100)+'%', c:T.tx, bar:st.pos },
  ];
  return React.createElement('div',{ style:{ display:'flex', alignItems:'stretch' } },
    items.map((it,i)=> React.createElement('div',{ key:i, style:{ padding:'0 20px', borderLeft:i?`1px solid rgba(255,255,255,0.08)`:'none', minWidth:96 } },
      React.createElement('div',{ style:{ fontSize:10.5, color:T.txDim, marginBottom:6, letterSpacing:'0.04em' } }, it.l),
      React.createElement('div',{ style:{ fontSize:22, fontWeight:800, color:it.c, fontFamily:window.MONO, lineHeight:1 } }, it.v),
      it.bar!=null && React.createElement('div',{ style:{ marginTop:7, height:4, borderRadius:3, background:'rgba(255,255,255,0.08)', overflow:'hidden' } },
        React.createElement('div',{ style:{ width:(it.bar*100)+'%', height:'100%', background:`linear-gradient(90deg,${T.dn},${T.up})`, borderRadius:3 } })
      )
    ))
  );
};

// ---- current 景氣 badge ----
Pn.CurrentLight = function(){
  const T=window.T, LM=window.LIGHT_META, LIGHTS=window.LIGHTS;
  const keys=Object.keys(LIGHTS).sort(); const ym=keys[keys.length-1]; const li=LIGHTS[ym]; if(!li) return null;
  const meta=LM[li.l];
  return React.createElement('div',{ style:{ display:'flex', alignItems:'center', gap:9, padding:'8px 14px', borderRadius:12,
    background:`linear-gradient(135deg, ${meta.soft}, rgba(255,255,255,0.03))`, border:`1px solid ${meta.dot}40`,
    boxShadow:`inset 0 1px 0 rgba(255,255,255,0.08)` } },
    window.UI.Dot({ c:meta.dot, size:11, glow:meta.glow }),
    React.createElement('div',null,
      React.createElement('div',{ style:{ fontSize:9.5, color:T.txDim, letterSpacing:'0.06em' } }, '當月景氣 '+window.fmt.ym(ym)),
      React.createElement('div',{ style:{ display:'flex', alignItems:'baseline', gap:6 } },
        React.createElement('b',{ style:{ color:meta.dot, fontSize:14 } }, li.z),
        React.createElement('span',{ style:{ color:meta.dot, fontSize:11, fontFamily:window.MONO, opacity:0.8 } }, li.s+'分')
      )
    )
  );
};

// ---- Insight card ----
Pn.InsightCard = function({ seas, name }){
  const T=window.T;
  const valid=seas.filter(s=>s.light);
  const dips=valid.map(s=>s.dip);
  const avg= dips.length? dips.reduce((a,b)=>a+b,0)/dips.length : 0;
  const good=valid.filter(s=> (s.light.l==='green'||s.light.l==='yellow_blue') && s.dip<=-3 );
  return React.createElement('div',{ style:{ ...T.glassSoft, background:`linear-gradient(135deg, ${T.accSoft}, rgba(255,255,255,0.03))`, border:`1px solid ${T.acc}55`, borderRadius:16, padding:'15px 17px' } },
    React.createElement('div',{ style:{ fontSize:11, color:T.accHi, fontWeight:700, letterSpacing:'0.06em', marginBottom:9 } }, '◆ 季節性洞察'),
    React.createElement('div',{ style:{ fontSize:15.5, color:T.tx, lineHeight:1.7, fontWeight:500 } },
      `過去 `, React.createElement('b',{style:{color:T.accHi,fontFamily:window.MONO}}, valid.length), ` 年，`,
      name, ` 的 3–4 月平均回檔 `,
      React.createElement('b',{style:{color:T.up,fontFamily:window.MONO}}, window.fmt.pct1(avg)),
      `，其中 `, React.createElement('b',{style:{color:T.accHi,fontFamily:window.MONO}}, good.length),
      ` 年落在綠燈／黃藍燈且回檔逾 3%，屬於品質較佳的進場點。`
    )
  );
};

// ---- Insight banner (slim, full-width) ----
Pn.InsightBanner = function({ seas, name }){
  const T=window.T;
  const valid=seas.filter(s=>s.light);
  const dips=valid.map(s=>s.dip);
  const avg= dips.length? dips.reduce((a,b)=>a+b,0)/dips.length : 0;
  const good=valid.filter(s=> (s.light.l==='green'||s.light.l==='yellow_blue') && s.dip<=-3 );
  return React.createElement('div',{ style:{ ...T.glass, background:`linear-gradient(110deg, ${T.accSoft}, rgba(255,255,255,0.04) 60%)`, border:`1px solid ${T.acc}45`, borderRadius:16, padding:'14px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' } },
    React.createElement('span',{ style:{ fontSize:11, color:T.accHi, fontWeight:800, letterSpacing:'0.08em', whiteSpace:'nowrap' } }, '◆ 季節性洞察'),
    React.createElement('div',{ style:{ fontSize:15, color:T.tx, lineHeight:1.6, fontWeight:500 } },
      `過去 `, React.createElement('b',{style:{color:T.accHi,fontFamily:window.MONO}}, valid.length), ` 年，`, name,
      ` 的 3–4 月平均回檔 `, React.createElement('b',{style:{color:T.up,fontFamily:window.MONO}}, window.fmt.pct1(avg)),
      `，其中 `, React.createElement('b',{style:{color:T.accHi,fontFamily:window.MONO}}, good.length),
      ` 年落在綠燈／黃藍燈且回檔逾 3%，為品質較佳的進場點。`
    )
  );
};

// ---- 景氣燈號日曆 heatmap ----
Pn.LightCalendar = function({ seas, compact=false }){
  const T=window.T, LM=window.LIGHT_META, LIGHTS=window.LIGHTS;
  const years=[]; for(let y=2016;y<=2026;y++) years.push(String(y));
  const goodLo={}; // ym -> good?
  seas.forEach(s=>{ if(s.light){ const isGood=(s.light.l==='green'||s.light.l==='yellow_blue')&&s.dip<=-3;
    goodLo[s.loDate.slice(0,7)]={good:isGood, dip:s.dip}; }});
  const cell=compact?15:20, gap=3;
  return React.createElement('div',{ style:{ overflowX:'auto' } },
    React.createElement('div',{ style:{ minWidth: 12*(cell+gap)+44 } },
      // header
      React.createElement('div',{ style:{ display:'grid', gridTemplateColumns:`34px repeat(12,${cell}px)`, gap, marginBottom:gap } },
        React.createElement('div'),
        Array.from({length:12},(_,m)=> React.createElement('div',{ key:m, style:{ fontSize:9, color:T.txDim, textAlign:'center', fontFamily:window.MONO } }, m+1))
      ),
      years.map(y=> React.createElement('div',{ key:y, style:{ display:'grid', gridTemplateColumns:`34px repeat(12,${cell}px)`, gap, marginBottom:gap, alignItems:'center' } },
        React.createElement('div',{ style:{ fontSize:10.5, color:T.tx2, fontFamily:window.MONO, fontWeight:600 } }, y),
        Array.from({length:12},(_,m)=>{ const ym=`${y}-${String(m+1).padStart(2,'0')}`; const li=LIGHTS[ym];
          const meta=li?LM[li.l]:null; const g=goodLo[ym];
          const gloss = meta? 'inset 0 1px 0 rgba(255,255,255,0.40), inset 0 -3px 5px rgba(0,0,0,0.22)' : 'none';
          const ring = g&&g.good? '0 0 0 2px rgba(8,11,18,0.95), 0 0 0 3.7px #fff' : '';
          const shadow = [meta?gloss:null, ring||null].filter(Boolean).join(', ') || 'none';
          return React.createElement('div',{ key:m, title: li?`${ym}　${li.z}　${li.s}分`:ym,
            style:{ width:cell, height:cell, borderRadius:5, position:'relative',
              background: meta? meta.dot : 'rgba(255,255,255,0.05)', opacity: meta?0.95:0.5,
              boxShadow: shadow, cursor:'default' } },
            g && React.createElement('span',{ style:{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:cell*0.5, color:'#fff', fontWeight:900, lineHeight:1, textShadow:'0 1px 2px rgba(0,0,0,0.5)' } }, '▾')
          );
        })
      ))
    )
  );
};

// ---- Seasonal dip bars ----
Pn.SeasonalPanel = function({ seas }){
  const T=window.T, LM=window.LIGHT_META;
  const maxDip=Math.max(8, ...seas.map(s=>Math.abs(Math.min(0,s.dip))));
  return React.createElement('div',{ style:{ display:'flex', flexDirection:'column', gap:7 } },
    seas.slice().reverse().map(s=>{ const meta=s.light?LM[s.light.l]:null;
      const w=Math.abs(Math.min(0,s.dip))/maxDip*100;
      const good=meta&&(s.light.l==='green'||s.light.l==='yellow_blue')&&s.dip<=-3;
      const dc= s.dip<=-5?T.up : s.dip<=-3?'#ff9f43' : s.dip<0?T.tx2 : T.dn;
      return React.createElement('div',{ key:s.y, style:{ display:'flex', alignItems:'center', gap:10 } },
        React.createElement('div',{ style:{ width:34, fontSize:11.5, color:T.tx2, fontFamily:window.MONO, fontWeight:600 } }, s.y),
        meta && window.UI.Dot({ c:meta.dot, size:8, glow:good?meta.glow:null }),
        React.createElement('div',{ style:{ flex:1, height:18, background:T.bg2, borderRadius:5, position:'relative', overflow:'hidden' } },
          React.createElement('div',{ style:{ position:'absolute', left:0, top:0, height:'100%', width:w+'%', background:dc, opacity:0.85, borderRadius:5 } })
        ),
        React.createElement('div',{ style:{ width:54, textAlign:'right', fontSize:12, fontWeight:700, color:dc, fontFamily:window.MONO } }, window.fmt.pct1(s.dip)),
        React.createElement('div',{ style:{ width:30, textAlign:'center', fontSize:13 } }, good?'✓':(s.dip<=-3?'!':'·'))
      );
    })
  );
};

// ---- Light legend ----
Pn.Legend = function({ wrap=true }){
  const T=window.T, LM=window.LIGHT_META;
  return React.createElement('div',{ style:{ display:'flex', flexWrap:wrap?'wrap':'nowrap', gap:7 } },
    window.LIGHT_ORDER.map(k=>{ const v=LM[k];
      return React.createElement('div',{ key:k, style:{ display:'flex', alignItems:'center', gap:6, padding:'4px 9px', ...T.glassSoft, borderRadius:9 } },
        window.UI.Dot({ c:v.dot, size:8, glow:v.glow }),
        React.createElement('b',{ style:{ color:v.dot, fontSize:11.5 } }, v.zh),
        React.createElement('span',{ style:{ color:T.txDim, fontSize:10 } }, v.desc)
      );
    })
  );
};

window.Pn = Pn;
