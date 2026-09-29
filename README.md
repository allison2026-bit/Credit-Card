# CardLedger — 信用卡福利追蹤表 (2026 Morandi Edition)

> **Live Demo 線上預覽**：[https://ais-pre-p7nubtyuwgs635s3qo4b65-56578231960.us-west1.run.app](https://ais-pre-p7nubtyuwgs635s3qo4b65-56578231960.us-west1.run.app)

![CardLedger App Demo Screenshot](./docs/demo-screenshot.svg)

---

## 核心功能亮點

1. **莫蘭迪配色與手機友善直式排版 (Morandi & Cellphone-Friendly UI)**
   - 採用溫潤亞麻灰 (`#F2EFE9`)、粉筆米白 (`#FAF8F5`)、霧霾藍 (`#667889`)、灰豆綠 (`#5C7062`) 與乾燥玫瑰 (`#9E7672`) 視覺系統。
   - 支援「精簡卡片」與「精簡表格」一鍵切換，詳細條款收合於下拉選單 (`<details>`)。
   - 清楚標示 **免海外交易手續費 (`No Foreign Transaction Fee`)** 欄位。

2. **年度報銷與免房券時序追蹤 (`報銷追蹤`)**
   - 支援記錄追蹤日期（如 `2026-09-29`）並自動計算 **已使用**、**過期無法用** 與 **尚餘可用** 金額（例如 CSP DoorDash 每月 $10 折抵：1–8 月過期 `-$80`，9 月未用剩 `$40` / 已用剩 `$30`）。
   - 依時序排列 10 項核心福利：
     1. `Chase Sapphire Preferred` — Chase Travel $100 飯店折抵 (`10/1` 提醒)
     2. `Chase IHG One Rewards Premier` — UA TravelBank $25 × 2 (`1/5` & `7/5` 提醒)
     3. `Chase Marriott Bonvoy Boundless` — 航空直購滿 $250 折 $50 × 2 (`1/5` & `7/5` 提醒)
     4. `Chase Marriott Bonvoy Boundless` — Marriott 周年免房券 35k 點 (`3/1` 提醒)
     5. `Chase IHG One Rewards Premier` — IHG 周年免房券 40k 點 (`9/1` 提醒)
     6. `Chase World of Hyatt Visa` — Hyatt 周年免房券 Cat 1–4 (`11/1` 提醒)
     7. `Chase Sapphire Preferred` — DoorDash 每月 $10 折抵
     8. `Chase Sapphire Preferred` — Global Entry / TSA $120
     9. `Chase IHG One Rewards Premier` — Global Entry / TSA $120
     10. `Chase Freedom Flex` — 手機損壞與失竊險 $800

3. **Google Calendar 年度提醒整合**
   - 支援一鍵或單項將 6 項年度福利與免房券提醒寫入 Google Calendar（每年自動重複提醒）。

4. **一鍵下載高清截圖 (PNG) 與 CSV / 試算表匯出**
   - 點擊頂部導覽列的 **「截圖」** 按鈕，即可將目前最新追蹤進度匯出為高清莫蘭迪配色 PNG 圖片，方便直接放上 GitHub Issues、PR 或社群分享。

---

## 本地開發與啟動

```bash
npm install
npm run dev
```
