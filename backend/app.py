"""
台股投資分析 App — Flask Backend
執行: python app.py
API文件: http://localhost:5000/api/docs
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf, pandas as pd, numpy as np, json, os, re
from datetime import date, datetime

app = Flask(__name__)
CORS(app)

# ── 載入景氣燈號 ──────────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
with open(os.path.join(DATA_DIR, 'lights.json'), encoding='utf-8') as f:
    LIGHTS_RAW = json.load(f)

# ── 已知拆股（可擴充）────────────────────────────────────────────────────────
KNOWN_SPLITS = {
    "0050.TW": [{"date": "2025-06-18", "ratio": 4}],
}

def normalize_ticker(ticker):
    """正規化股票代號：
       - 已含後綴（含 '.'）→ 原樣（例：0050.TW、BRK.B）
       - 以數字開頭（台股代號 0050、2330）→ 補 .TW
       - 純英文（美股 VOO、QQQ、SPY）→ 不補後綴
    """
    t = (ticker or '').upper().strip()
    if not t:
        return t
    if '.' in t:
        return t
    if t[0].isdigit():
        return t + '.TW'
    return t  # 美股 bare symbol

def ticker_currency(ticker):
    """依後綴推測幣別（僅供顯示用）"""
    return 'TWD' if ticker.upper().endswith('.TW') else 'USD'

def score_to_light(s):
    s = int(s)
    if s >= 38: return 'red',         '紅燈',  '景氣過熱'
    if s >= 32: return 'yellow_red',  '黃紅燈','景氣活絡'
    if s >= 23: return 'green',       '綠燈',  '景氣穩定'
    if s >= 17: return 'yellow_blue', '黃藍燈','景氣轉弱'
    return       'blue',              '藍燈',  '景氣低迷'

def get_split_ratio(ticker, ts_ms):
    """回傳某個時間點的累積拆股倍率（用於還原前複權）"""
    ratio = 1
    for sp in KNOWN_SPLITS.get(ticker, []):
        sp_ts = int(datetime.strptime(sp['date'], '%Y-%m-%d').timestamp() * 1000)
        if ts_ms >= sp_ts:
            ratio *= sp['ratio']
    return ratio


# ── API Routes ────────────────────────────────────────────────────────────────

@app.route('/api/docs')
def docs():
    return jsonify({
        "routes": {
            "GET /api/stock":    "params: ticker, start, end → 日K資料（自動拆股還原）",
            "GET /api/lights":   "景氣燈號（全部）",
            "GET /api/seasonal": "params: ticker, start, end → 3-4月季節性分析",
            "GET /api/compare":  "params: tickers(逗號分隔), start, end → 多股報酬/風險/定期定額/相關性",
            "GET /api/suggest":  "常用股票清單",
        }
    })


@app.route('/api/stock')
def get_stock():
    ticker = normalize_ticker(request.args.get('ticker', '0050.TW'))
    start  = request.args.get('start',  '2016-01-01')
    end    = request.args.get('end',    date.today().strftime('%Y-%m-%d'))

    try:
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
        if df.empty:
            return jsonify({'error': f'找不到 {ticker} 的資料，請確認代號正確'}), 404

        # Flatten multi-level columns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        rows = []
        for idx, row in df.iterrows():
            rows.append({
                'date':  idx.strftime('%Y-%m-%d'),
                'open':  round(float(row['Open']),  2) if pd.notna(row['Open'])   else None,
                'high':  round(float(row['High']),  2) if pd.notna(row['High'])   else None,
                'low':   round(float(row['Low']),   2) if pd.notna(row['Low'])    else None,
                'close': round(float(row['Close']), 2) if pd.notna(row['Close'])  else None,
                'vol':   int(row['Volume'])              if pd.notna(row['Volume']) else None,
            })

        return jsonify({
            'ticker':   ticker,
            'currency': ticker_currency(ticker),
            'start':    start,
            'end':      end,
            'count':    len(rows),
            'rows':     rows,
            'splits':   KNOWN_SPLITS.get(ticker, []),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/lights')
def get_lights():
    result = {}
    for ym, v in sorted(LIGHTS_RAW.items()):
        l, zh, desc = score_to_light(v['s'])
        result[ym] = {'score': v['s'], 'light': l, 'label': zh, 'desc': desc}
    return jsonify(result)


@app.route('/api/seasonal')
def get_seasonal():
    ticker = normalize_ticker(request.args.get('ticker', '0050.TW'))
    start  = request.args.get('start',  '2016-01-01')
    end    = request.args.get('end',    date.today().strftime('%Y-%m-%d'))

    try:
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
        if df.empty:
            return jsonify({'error': '找不到資料'}), 404

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df['yr'] = df.index.year
        df['mo'] = df.index.month
        result = {}

        for yr in sorted(df['yr'].unique()):
            ydf = df[df['yr'] == yr]
            q1  = ydf[ydf['mo'] <= 2]
            q2  = ydf[ydf['mo'].isin([3, 4])]
            if q1.empty or q2.empty:
                continue

            q1hi   = float(q1['High'].max())
            q2lo   = float(q2['Low'].min())
            lo_idx = q2['Low'].idxmin()
            dip    = round((q2lo - q1hi) / q1hi * 100, 1)

            lo_mo    = lo_idx.strftime('%Y-%m')
            li       = LIGHTS_RAW.get(lo_mo, {})
            lo_light = score_to_light(li['s'])[1] if li else None

            result[str(yr)] = {
                'q1hi':     round(q1hi, 2),
                'q2lo':     round(q2lo, 2),
                'dip':      dip,
                'lo_date':  lo_idx.strftime('%m-%d'),
                'lo_light': lo_light,
                'lo_score': li.get('s') if li else None,
                'is_opportunity': dip <= -3 and lo_light in ['綠燈', '黃藍燈'],
            }

        return jsonify({'ticker': ticker, 'seasonal': result})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/suggest')
def suggest():
    return jsonify([
        {"ticker": "0050.TW",  "name": "元大台灣50",       "type": "ETF"},
        {"ticker": "0056.TW",  "name": "元大高股息",        "type": "ETF"},
        {"ticker": "00878.TW", "name": "國泰永續高股息",    "type": "ETF"},
        {"ticker": "00929.TW", "name": "復華台灣科技優息",  "type": "ETF"},
        {"ticker": "2330.TW",  "name": "台積電",            "type": "股票"},
        {"ticker": "2317.TW",  "name": "鴻海",              "type": "股票"},
        {"ticker": "2454.TW",  "name": "聯發科",            "type": "股票"},
        {"ticker": "006208.TW","name": "富邦台灣50",        "type": "ETF"},
        {"ticker": "VOO",      "name": "Vanguard S&P 500",  "type": "美股 ETF"},
        {"ticker": "QQQ",      "name": "Invesco 那斯達克100","type": "美股 ETF"},
    ])


# ── 多股分析比較 ────────────────────────────────────────────────────────────────

def _close_series(ticker, start, end):
    """下載單一標的收盤價，回傳 pandas Series（index=日期）"""
    df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
    if df.empty:
        return None
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df['Close'].dropna()

def _window_return(s, days):
    """近 N 天的累積報酬率（%）；資料不足則用全期"""
    if len(s) < 2:
        return None
    last = s.index[-1]
    cut  = last - pd.Timedelta(days=days)
    win  = s[s.index >= cut]
    if len(win) < 2:
        return None
    return round(float(win.iloc[-1] / win.iloc[0] - 1) * 100, 1)

def _metrics(s):
    """單一標的的報酬／風險指標"""
    first, last = float(s.iloc[0]), float(s.iloc[-1])
    yrs  = max(0.1, (s.index[-1] - s.index[0]).days / 365.25)
    cagr = (pow(last / first, 1 / yrs) - 1) * 100

    daily = s.pct_change().dropna()
    vol   = float(daily.std() * np.sqrt(252) * 100) if len(daily) > 1 else 0.0

    peak = s.cummax()
    mdd  = float(((s - peak) / peak).min() * 100)

    rf = 2.0  # 假設無風險利率 2%
    sharpe = (cagr - rf) / vol if vol > 0 else 0.0

    return {
        'ret':  {'1Y': _window_return(s, 365), '3Y': _window_return(s, 365 * 3),
                 '5Y': _window_return(s, 365 * 5),
                 'ALL': round((last / first - 1) * 100, 1)},
        'cagr': round(cagr, 1),
        'vol':  round(vol, 1),
        'mdd':  round(mdd, 1),
        'sharpe': round(sharpe, 2),
    }

def _dca(s):
    """定期定額模擬：每月第一個交易日投入固定金額，回傳報酬率（%，與金額無關）"""
    monthly = s.groupby([s.index.year, s.index.month]).head(1)  # 各月首個交易日
    units = 0.0
    invest_each = 1.0  # 報酬率與金額無關，用 1 單位即可
    for price in monthly.values:
        units += invest_each / float(price)
    invested = invest_each * len(monthly)
    final    = units * float(s.iloc[-1])
    return {
        'months':   int(len(monthly)),
        'lump_ret': round((float(s.iloc[-1]) / float(s.iloc[0]) - 1) * 100, 1),  # 單筆投入報酬
        'dca_ret':  round((final - invested) / invested * 100, 1),
    }


@app.route('/api/compare')
def compare():
    raw    = request.args.get('tickers', '0050.TW,VOO,QQQ')
    start  = request.args.get('start', '2016-01-01')
    end    = request.args.get('end',   date.today().strftime('%Y-%m-%d'))
    tickers = [normalize_ticker(t) for t in raw.split(',') if t.strip()]
    if not tickers:
        return jsonify({'error': '請提供 tickers'}), 400

    try:
        series  = {}
        metrics = {}
        for t in tickers:
            s = _close_series(t, start, end)
            if s is None or len(s) < 2:
                continue
            series[t]  = s
            metrics[t] = {
                'currency': ticker_currency(t),
                **_metrics(s),
                'dca': _dca(s),
            }

        if not series:
            return jsonify({'error': '找不到任何標的資料'}), 404

        # 相關係數矩陣（日報酬，取共同交易日）
        rets = pd.DataFrame({t: s.pct_change() for t, s in series.items()}).dropna()
        corr = {}
        common_start = common_end = None
        if len(rets) > 1:
            cm = rets.corr().round(2)
            corr = {a: {b: float(cm.loc[a, b]) for b in cm.columns} for a in cm.index}
            common_start = rets.index[0].strftime('%Y-%m-%d')
            common_end   = rets.index[-1].strftime('%Y-%m-%d')

        return jsonify({
            'tickers':      list(series.keys()),
            'start':        start,
            'end':          end,
            'metrics':      metrics,
            'corr':         corr,
            'common_start': common_start,
            'common_end':   common_end,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 台股投資分析 API 啟動中...")
    print("   http://localhost:5000")
    app.run(debug=True, port=5001)
