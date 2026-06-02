# 台股投資分析 App — Claude Code 開發任務

## 這是什麼
一個可以查詢任意台股日K、疊上景氣燈號、分析 3-4月季節性買點的 Web App。
所有設計、資料格式、邏輯都已做好，Claude Code 負責把它跑起來。

## 目錄結構
```
invest_app/
├── backend/
│   ├── app.py          ← Flask API（已寫好）
│   └── requirements.txt
├── frontend/
│   ├── src/App.jsx     ← React App（已寫好）
│   └── package.json    ← 需要建立
├── data/
│   └── lights.json     ← 景氣燈號資料（已附）
└── CLAUDE_CODE_TASK.md ← 本檔案
```

## 任務清單

### Step 1: 安裝後端依賴
```bash
cd backend
pip install flask flask-cors yfinance pandas
python app.py  # 確認能在 :5000 跑起來
```

### Step 2: 建立前端
```bash
cd frontend
npm create vite@latest . -- --template react
npm install recharts
# 把 src/App.jsx 的內容換成 invest_app/frontend/src/App.jsx
npm run dev  # 確認能在 :5173 跑起來
```

### Step 3: 驗證 API
- `GET http://localhost:5000/api/stock?ticker=0050.TW&start=2024-01-01` → 應回傳日K
- `GET http://localhost:5000/api/lights` → 應回傳燈號
- `GET http://localhost:5000/api/seasonal?ticker=0056.TW` → 應回傳3-4月分析

### Step 4: 確認前端功能
- [ ] 輸入 "0050" → 自動加 .TW → 顯示日K圖
- [ ] 點快捷按鈕 (0050, 0056, 00878) → 切換
- [ ] 日K圖背景有燈號顏色
- [ ] 切換年份 tab 正常
- [ ] 3-4月分析 tab 顯示跌幅表格
- [ ] Hover tooltip 顯示燈號

### Step 5（選做）: 新增功能
見下方「進階功能」

---

## 進階功能（之後可以加）

### A. 多股對比
- 輸入多個代號（逗號分隔）
- 以100為基準，同一張圖比較漲跌幅
- API: `GET /api/compare?tickers=0050.TW,0056.TW,2330.TW`

### B. 自動更新燈號
- 國發會 API: https://index.ndc.gov.tw/
- 每月更新一次，存進 data/lights.json

### C. 年終策略模擬
- 輸入：年終金額、第一/二/三包比例、入場日期規則
- 輸出：歷史回測結果（平均成本 vs 一次性投入）

### D. 匯出 PDF 報告
- 把圖表 + 分析結果存成 PDF
- 給「寶」看的投資報告 😄

---

## 已知的特殊處理

### 0050 拆股（2025/6/18 1拆4）
後端 `app.py` 已處理：
- 拆股後的股價 × 4 = 拆股前等值
- `KNOWN_SPLITS` dict 可擴充其他拆股

### 燈號分數 → 燈號名稱
| 分數    | 燈號   |
|---------|--------|
| 38-45   | 紅燈   |
| 32-37   | 黃紅燈 |
| 23-31   | 綠燈   |
| 17-22   | 黃藍燈 |
| 9-16    | 藍燈   |

---

## 設計風格
- 配色：Claude 淺色系（#6c5fd4 紫色為主色）
- 字體：Noto Sans TC
- 圖表：Recharts
- 背景：#f7f8fc
- 手機友善（flex-wrap）
