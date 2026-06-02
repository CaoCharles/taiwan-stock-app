"""
台股投資分析 App — Flask Backend
執行: python app.py
API文件: http://localhost:5000/api/docs
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf, pandas as pd, json, os
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
            "GET /api/suggest":  "常用股票清單",
        }
    })


@app.route('/api/stock')
def get_stock():
    ticker = request.args.get('ticker', '0050.TW').upper().strip()
    start  = request.args.get('start',  '2016-01-01')
    end    = request.args.get('end',    date.today().strftime('%Y-%m-%d'))
    if '.' not in ticker:
        ticker += '.TW'

    try:
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=False)
        if df.empty:
            return jsonify({'error': f'找不到 {ticker} 的資料，請確認代號正確'}), 404

        # Flatten multi-level columns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        rows = []
        for idx, row in df.iterrows():
            ts = int(idx.timestamp() * 1000)
            r  = get_split_ratio(ticker, ts)
            rows.append({
                'date':  idx.strftime('%Y-%m-%d'),
                'open':  round(float(row['Open'])  * r, 2) if pd.notna(row['Open'])   else None,
                'high':  round(float(row['High'])  * r, 2) if pd.notna(row['High'])   else None,
                'low':   round(float(row['Low'])   * r, 2) if pd.notna(row['Low'])    else None,
                'close': round(float(row['Close']) * r, 2) if pd.notna(row['Close'])  else None,
                'vol':   int(row['Volume'])                 if pd.notna(row['Volume']) else None,
            })

        return jsonify({
            'ticker': ticker,
            'start':  start,
            'end':    end,
            'count':  len(rows),
            'rows':   rows,
            'splits': KNOWN_SPLITS.get(ticker, []),
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
    ticker = request.args.get('ticker', '0050.TW').upper().strip()
    start  = request.args.get('start',  '2016-01-01')
    end    = request.args.get('end',    date.today().strftime('%Y-%m-%d'))
    if '.' not in ticker:
        ticker += '.TW'

    try:
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=False)
        if df.empty:
            return jsonify({'error': '找不到資料'}), 404

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
    ])


if __name__ == '__main__':
    print("🚀 台股投資分析 API 啟動中...")
    print("   http://localhost:5000")
    app.run(debug=True, port=5001)
