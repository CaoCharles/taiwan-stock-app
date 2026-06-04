// Compare.jsx — multi-stock rebased-to-100 line chart
function CompareChart({ series, height=200, names }){
  // series: [{code, rows:[{date,close}]}], aligned by index on a shared date axis
  const T=window.T;
  const [wrapRef,W]=window.__useWidth();
  const palette=[T.acc, '#ff9f43', '#2dd4d4', T.up];
  const padL=6,padR=46,padT=10,padB=22;
  const plotW=Math.max(10,W-padL-padR), plotH=Math.max(10,height-padT-padB);

  // rebase each series to 100 from its first point
  const reb = series.map(s=>{ const f=s.rows[0]?.close||1; return s.rows.map(r=>({date:r.date, v:r.close/f*100})); });
  const n = Math.max(...reb.map(r=>r.length),1);
  let lo=Infinity,hi=-Infinity; reb.forEach(r=>r.forEach(p=>{ if(p.v<lo)lo=p.v; if(p.v>hi)hi=p.v; }));
  if(!isFinite(lo)){lo=80;hi=120;} const pad=(hi-lo)*0.08||5; lo-=pad; hi+=pad;
  const x=i=>padL+(i/(n-1))*plotW, y=v=>padT+plotH-((v-lo)/(hi-lo))*plotH;

  const yearTicks=[]; { let cy=null; const base=reb[0]||[]; for(let i=0;i<base.length;i++){ const yr=base[i].date.slice(0,4); if(yr!==cy){yearTicks.push({i,yr});cy=yr;} } }

  return React.createElement('div',{ ref:wrapRef, style:{ width:'100%' } },
    React.createElement('svg',{ width:'100%', height, viewBox:`0 0 ${W} ${height}` },
      // baseline 100
      React.createElement('line',{ x1:padL,x2:padL+plotW,y1:y(100),y2:y(100), stroke:T.line, strokeDasharray:'3 3' }),
      React.createElement('text',{ x:padL+plotW+6, y:y(100)+3.5, fill:T.txDim, fontSize:10, fontFamily:window.MONO }, '100'),
      yearTicks.map((t,k)=> t.i>2 && React.createElement('text',{ key:k, x:x(t.i), y:height-6, fill:T.txDim, fontSize:10, fontFamily:window.MONO, textAnchor:'middle' }, t.yr)),
      reb.map((r,si)=>{ let d=''; for(let i=0;i<r.length;i++) d+=(i?'L':'M')+x(i).toFixed(1)+' '+y(r[i].v).toFixed(1);
        const lastV=r[r.length-1];
        return React.createElement('g',{ key:si },
          React.createElement('path',{ d, fill:'none', stroke:palette[si%palette.length], strokeWidth:1.8 }),
          lastV && React.createElement('text',{ x:padL+plotW+4, y:y(lastV.v)+3.5, fill:palette[si%palette.length], fontSize:10, fontWeight:700, fontFamily:window.MONO }, Math.round(lastV.v))
        );
      })
    ),
    React.createElement('div',{ style:{ display:'flex', gap:14, flexWrap:'wrap', marginTop:8 } },
      series.map((s,si)=> React.createElement('div',{ key:si, style:{ display:'flex', alignItems:'center', gap:6 } },
        React.createElement('span',{ style:{ width:14, height:3, borderRadius:2, background:palette[si%palette.length] } }),
        React.createElement('span',{ style:{ fontSize:11.5, color:T.tx2 } }, s.code.replace('.TW','')),
        names && React.createElement('span',{ style:{ fontSize:11.5, color:T.txDim } }, names[s.code])
      ))
    )
  );
}
window.CompareChart = CompareChart;
