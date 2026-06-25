"""產生靜態股價 JSON —— 給前端直接讀，免每次即時抓 Yahoo。

在 GitHub Action 每日排程執行，輸出到 frontend/data/：
  - <ticker>.json   每檔日K（與 /api/stock 同格式）
  - compare.json    0050/VOO/QQQ 對比指標（與 /api/compare 同格式）
  - index.json      可用標的清單 + 更新時間
重用 app.py 既有的分析函式，確保與後端計算一致。
"""
import os, json
from datetime import date, datetime, timezone

import yfinance as yf
import pandas as pd

import app  # normalize_ticker / ticker_currency / _metrics / _dca / _close_series 同源

# 要預先下載的標的（前端自選清單）
TICKERS = ['0050.TW', 'VOO', 'QQQ', '0056.TW', '2330.TW', '00878.TW', '2317.TW']
COMPARE = ['0050.TW', 'VOO', 'QQQ']
START   = '2016-01-01'

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'data'))


def fetch_rows(ticker):
    df = yf.download(ticker, start=START, progress=False, auto_adjust=True)
    if df.empty:
        return None
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    rows = []
    for idx, r in df.iterrows():
        rows.append({
            'date':  idx.strftime('%Y-%m-%d'),
            'open':  round(float(r['Open']),  2) if pd.notna(r['Open'])   else None,
            'high':  round(float(r['High']),  2) if pd.notna(r['High'])   else None,
            'low':   round(float(r['Low']),   2) if pd.notna(r['Low'])    else None,
            'close': round(float(r['Close']), 2) if pd.notna(r['Close'])  else None,
            'vol':   int(r['Volume'])              if pd.notna(r['Volume']) else None,
        })
    return rows


def write(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print(f'  寫入 {name}（{os.path.getsize(os.path.join(OUT, name)) // 1024} KB）')


def main():
    os.makedirs(OUT, exist_ok=True)
    today = date.today().strftime('%Y-%m-%d')
    series = {}
    available = []

    print('下載日K資料...')
    for t in TICKERS:
        rows = fetch_rows(t)
        if not rows:
            print(f'  ⚠️  {t} 無資料，略過')
            continue
        write(f'{t}.json', {
            'ticker':   t,
            'currency': app.ticker_currency(t),
            'start':    START,
            'end':      today,
            'count':    len(rows),
            'rows':     rows,
            'splits':   app.KNOWN_SPLITS.get(t, []),
        })
        available.append(t)
        # 收盤價序列供 compare 用
        s = pd.Series(
            [r['close'] for r in rows if r['close'] is not None],
            index=pd.to_datetime([r['date'] for r in rows if r['close'] is not None]),
        )
        series[t] = s

    # compare.json（報酬/風險/定期定額/相關性）
    print('計算對比指標...')
    metrics = {}
    cser = {}
    for t in COMPARE:
        s = series.get(t)
        if s is None or len(s) < 2:
            continue
        cser[t] = s
        metrics[t] = {'currency': app.ticker_currency(t), **app._metrics(s), 'dca': app._dca(s)}

    rets = pd.DataFrame({t: s.pct_change() for t, s in cser.items()}).dropna()
    corr, cstart, cend = {}, None, None
    if len(rets) > 1:
        cm = rets.corr().round(2)
        corr = {a: {b: float(cm.loc[a, b]) for b in cm.columns} for a in cm.index}
        cstart, cend = rets.index[0].strftime('%Y-%m-%d'), rets.index[-1].strftime('%Y-%m-%d')

    write('compare.json', {
        'tickers': list(cser.keys()), 'metrics': metrics, 'corr': corr,
        'common_start': cstart, 'common_end': cend,
    })

    # index.json
    write('index.json', {
        'tickers':     available,
        'updated_at':  datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    })
    print('完成 ✅')


if __name__ == '__main__':
    main()
