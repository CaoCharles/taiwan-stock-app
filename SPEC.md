# 台股投資分析 App — Claude Code 開發規格

## 目標
可自由篩選股票、時間區間，疊上台灣景氣燈號，分析季節性買點的互動式 Web App。

## 技術棧
- Backend: Python + Flask + yfinance
- Frontend: React + Recharts
- Data: 國發會景氣燈號（已附 lights.json）

## 功能需求

### 1. 股票篩選
- 輸入任意台股代號（0050、0056、2330 等）
- 支援多檔同時顯示（對比模式）
- 自動偵測並處理拆股（如 0050 在 2025/6/18 1拆4）

### 2. 時間區間
- 起訖日期選擇器（預設 2016/01/01 ~ 今天）
- 快捷按鈕：近1年、近3年、近5年、全部

### 3. 日K圖表
- 每日收盤線 + 高低區間帶
- 背景色 = 當月景氣燈號顏色
- 每月分隔線
- Hover tooltip：日期、收盤、高低、當月燈號

### 4. 景氣燈號
- 資料來源：國發會（data/lights.json，已附）
- 五色：紅燈(38-45)、黃紅燈(32-37)、綠燈(23-31)、黃藍燈(17-22)、藍燈(9-16)
- 顯示：圖表背景帶 + 月份燈號條 + 分數

### 5. 季節性分析
- 自動計算每年 3-4月最低點 vs 1-2月最高點
- 跌幅表格（全年一覽）
- 與景氣燈號交叉分析

### 6. 多股對比（進階）
- 同一時間軸，多條線對比（各自還原基準=100）
- 適合比較 0050 vs 0056 vs 2330 等

## API 設計

### GET /api/stock
params: ticker, start, end
回傳: { dates, close, high, low, splits }

### GET /api/lights
回傳: { "YYYY-MM": { score, light, label } }

### GET /api/seasonal
params: ticker, start, end
回傳: 每年 3-4月分析結果

## 已完成的資產（可直接複用）
- data/lights.json: 2016-2026 全部景氣燈號
- frontend/src/App.jsx: 完整的圖表元件（recharts）
- 圖表設計：Claude 淺色風格，橘色(0056)、紫色(0050)
