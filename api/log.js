import { applyCors, rateLimit } from "./_lib.js";
import { getSql, ensureTable } from "./_db.js";

// open / built / copied -- the whole funnel. No free text ever logged.
const EVENTS = new Set(["open", "built", "copied"]);
const clip = (v) => (v == null || v === "" ? null : String(v).slice(0, 120));

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!rateLimit(req, res, { max: 60, windowMs: 60000, name: "log" })) return;

  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  if (!EVENTS.has(b.event)) return res.status(400).json({ error: "Unknown event" });

  try {
    await ensureTable();
    const sql = getSql();
    await sql`
      INSERT INTO craft_events (event, years, subject, activity)
      VALUES (${b.event}, ${clip(b.years)}, ${clip(b.subject)}, ${clip(b.activity)})`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
