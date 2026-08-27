import { applyCors, requireAdmin, rateLimit } from "./_lib.js";
import { getSql, ensureTable } from "./_db.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;
  if (!rateLimit(req, res, { max: 30, windowMs: 60000, name: "stats" })) return;

  try {
    await ensureTable();
    const sql = getSql();
    const [totals, byDay, bySubject, byYears, recent] = await Promise.all([
      sql`SELECT event, COUNT(*)::int AS n FROM craft_events GROUP BY event ORDER BY n DESC`,
      sql`SELECT to_char(ts::date, 'YYYY-MM-DD') AS day,
                 COUNT(*) FILTER (WHERE event = 'open')::int AS opens,
                 COUNT(*) FILTER (WHERE event = 'built')::int AS built,
                 COUNT(*) FILTER (WHERE event = 'copied')::int AS copied
          FROM craft_events WHERE ts > now() - interval '30 days'
          GROUP BY ts::date ORDER BY ts::date`,
      sql`SELECT subject, COUNT(*)::int AS n FROM craft_events
          WHERE event = 'built' AND subject IS NOT NULL GROUP BY subject ORDER BY n DESC LIMIT 15`,
      sql`SELECT years, COUNT(*)::int AS n FROM craft_events
          WHERE event = 'built' AND years IS NOT NULL GROUP BY years ORDER BY n DESC LIMIT 15`,
      sql`SELECT to_char(ts, 'YYYY-MM-DD HH24:MI') AS ts, event, years, subject, activity
          FROM craft_events ORDER BY ts DESC LIMIT 50`,
    ]);
    return res.status(200).json({ totals, byDay, bySubject, byYears, recent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
