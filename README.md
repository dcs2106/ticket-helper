# Tixcraft aespa 購票輔助

這是一個本機使用的 Tixcraft 購票輔助頁，目標活動：

https://tixcraft.com/activity/detail/26_aespa

## 功能

- 開賣倒數與桌面提醒。
- 儲存活動網址、張數、預算、座位偏好與預售碼。
- 產生可安裝到 Tampermonkey / Violentmonkey 的 Userscript。
- 保留可拖到書籤列的備用腳本。
- 在 Tixcraft 頁面協助開啟登入、前往購票頁、隨機挑選可見座位區、選擇張數與勾選條款。
- 遇到粉絲資格、會員碼、驗證碼、排隊或付款畫面時停下來交給使用者手動處理。

## 使用方式

直接用瀏覽器開啟 `index.html`，或在此資料夾執行：

```sh
python3 -m http.server 5173
```

接著開啟：

```text
http://localhost:5173
```

設定活動網址、張數、預算、偏好與預售碼後，建議按「複製 Userscript」，貼到 Tampermonkey 或 Violentmonkey 新腳本並啟用。Userscript 會在每個 Tixcraft 頁面載入後自動接續執行，比書籤腳本更適合搶時間。

要用其他演唱會測試時，把「活動網址」換成該活動的 `https://tixcraft.com/activity/detail/...`，重新複製 Userscript 並覆蓋 Tampermonkey 裡的腳本即可。若勾選「資料齊全時嘗試加入購物車」，它會嘗試走到加入購物車；付款仍需手動完成。

書籤腳本仍可備用，但頁面跳轉後會停止，需要再手動點一次書籤。

## 邊界

這個工具不會破解驗證碼、不繞過排隊、不代填帳密、不繞過限流，也不會完成付款。官方頁面若要求登入、手機驗證、粉絲資格確認、預售碼確認、排隊或付款，請依官方流程手動完成。
