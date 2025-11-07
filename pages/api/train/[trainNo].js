// pages/api/train/[trainNo].js
export default async function handler(req, res) {
  try {
    // केवल GET स्वीकार कर रहे हैं; जरूरत हो तो जोड़ सकते हैं
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // pages API में dynamic param req.query से मिलता है
    const { trainNo } = req.query;

    if (!trainNo) {
      return res.status(400).json({ ok: false, error: "Provide trainNo in URL path" });
    }

    // यहाँ अपना DB/लॉजिक डालें — फिलहाल mock डेटा लौटाया जा रहा है
    const mockData = {
      trainNo: String(trainNo),
      name: `Train ${trainNo}`,
      found: true,
    };

    return res.status(200).json({ ok: true, row: mockData });
  } catch (err) {
    console.error("train route error:", err);
    return res.status(500).json({ ok: false, error: (err && err.message) || "Server error" });
  }
}
