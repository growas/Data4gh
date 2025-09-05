import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reference, email, amount } = req.body;
  if (!reference || !email || !amount) return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await paystackRes.json();
    if (!data.status) return res.status(400).json({ success: false, message: "Payment verification failed" });

    const supabaseRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/wallet`, {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({ email, balance: amount })
    });

    if (!supabaseRes.ok) throw new Error("Failed to update wallet");

    res.status(200).json({ success: true, newBalance: amount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
