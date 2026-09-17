const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// 環境変数からAPIキーを取得（引用符や余計な空白を自動除去）
const apiKey = (process.env.GEMINI_API_KEY || "").replace(/['"]/g, "").trim();
const genAI = new GoogleGenerativeAI(apiKey);

// 全体献立の生成API
app.post("/api/menu", async (req, res) => {
  try {
    const { budget, people, days, meals, dislikes } = req.body;

    const prompt = `
あなたはプロの献立作成AIです。

【条件】
- 予算: ${budget}円
- 人数: ${people}人分
- 日数: ${days}日数分
- 対象の時間帯: ${meals.join(", ")}
- 苦手な食材/アレルギー: ${dislikes.length > 0 ? dislikes.join(", ") : "なし"}

【重要な価格・食材ルール】
1. 食材の単価(price)は、小分けの消費量換算ではなく「日本の標準的なスーパーで1パック・1袋単位で購入した際の実売目安金額」で指定してください。（例：卵1パック 約250円、食パン1袋 約160円など）
2. お米（白米・ご飯）および基本調味料（醤油、塩、味噌、砂糖、油、ポン酢など）は家に常備されている前提とし、ingredients リストおよび価格計算から完全に除外してください。

【出力フォーマット（JSONのみ）】
以下のJSON構造のみを出力してください。説明文やMarkdownの枠組みは不要です。

{
  "totalPrice": 全体の概算合計金額(数値),
  "menu": [
    {
      "day": 1,
      "meal": "朝",
      "dish": "料理名",
      "price": 1食あたりの概算価格(数値),
      "ingredients": [
        { "name": "食材名(単位付き)", "price": スーパーでの購入目安単価(数値) }
      ]
    }
  ]
}
`;

    // モデル名を推奨されている gemini-3.6-flash に指定
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    res.json(data);

  } catch (error) {
    console.error("献立生成エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

// 特定の1食だけを再生成するAPI
app.post("/api/regenerate-dish", async (req, res) => {
  try {
    const { meal, dislikes } = req.body;

    const prompt = `
あなたはプロの献立作成AIです。${meal}の料理を1つ新しく提案してください。

【条件】
- 苦手な食材/アレルギー: ${dislikes.length > 0 ? dislikes.join(", ") : "なし"}
- 食材の単価(price)はスーパーで1パック・1袋単位で購入した際の実売目安金額にしてください。
- お米や基本調味料は ingredients リストに含めないでください。

【出力フォーマット（JSONのみ）】
{
  "dish": "料理名",
  "price": 料理の概算価格(数値),
  "ingredients": [
    { "name": "食材名(単位付き)", "price": スーパーでの購入目安単価(数値) }
  ]
}
`;

    // モデル名を gemini-3.6-flash に指定
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    res.json(data);

  } catch (error) {
    console.error("1食再生成エラー:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});