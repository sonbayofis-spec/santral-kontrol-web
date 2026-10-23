// Teknisyen imzaladığında veya yeni olay açıldığında rapor maili gönderir.
// Her 15 dakikada bir GitHub Actions tarafından çalıştırılır. Yeni imza/olay yoksa mail atmaz.
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
let data;
async function loadData() {
  const html = await (await fetch("https://sonbayofis-spec.github.io/santral-kontrol-web/solaris.html?t=" + Date.now())).text();
  const im = html.match(/var ITEMS=\[([\s\S]*?)\n\]\.map/)[1];
  const tm = html.match(/var TYPES=\[([\s\S]*?)\n\];/)[1];
  const types = {};
  for (const m of tm.matchAll(/\{id:"(\w+)",tr:"([^"]*)"/g)) types[m[1]] = m[2];
  data = { items: JSON.parse("[" + im + "]").map(a => ({ id: a[0], f: a[1], p: a[3], r: a[4], tr: a[5] })), types };
}

const PARKS = {
  sg: { name: "Solaris Global SRL", to: (process.env.REPORT_SG || "").split(",").map(s => s.trim()).filter(Boolean) },
  ol: { name: "Olba SRL", to: (process.env.REPORT_OL || "").split(",").map(s => s.trim()).filter(Boolean) },
};
const FREQ = { d: "Günlük", w: "Haftalık", m: "Aylık", y: "Yıllık" };
const TZ = "Europe/Chisinau";
const fmt = ms => new Date(ms).toLocaleString("tr-TR", { timeZone: TZ, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function itemsFor(f, park) { return data.items.filter(i => i.f === f && (!i.p || i.p === park)); }

function logReport(park, d) {
  let its = itemsFor(d.freq, park);
  if (d.freq === "d") its = its.filter(i => d.visited === "yes" || i.r);
  const items = d.items || {};
  const ok = its.filter(i => items[i.id] === "ok").length;
  const bad = its.filter(i => items[i.id] === "issue");
  const left = its.filter(i => !items[i.id]);
  const t = [
    `${PARKS[park].name} - ${FREQ[d.freq] || d.freq} kontrol raporu`,
    `Dönem: ${d.key}`,
    `Kontrolü yapan: ${d.signedName} (${fmt(d.signedAt)})`,
  ];
  if (d.freq === "d") t.push(`Sahaya gidildi mi: ${d.visited === "yes" ? "Evet" : d.visited === "no" ? "Hayır (uzaktan kontrol)" : "Belirtilmedi"}`);
  t.push(`Sonuç: ${ok} tamam, ${bad.length} sorun, ${left.length} işaretlenmedi (toplam ${its.length})`);
  if (bad.length) { t.push("", "SORUNLAR:"); bad.forEach(i => t.push("- " + i.tr)); }
  if (left.length && left.length <= 8) { t.push("", "İşaretlenmeyenler:"); left.forEach(i => t.push("- " + i.tr)); }
  else if (left.length) t.push("", `${left.length} madde işaretlenmedi.`);
  if (d.note) t.push("", "Not: " + d.note);
  return { subject: `${PARKS[park].name} - ${FREQ[d.freq] || d.freq} kontrol (${d.key})${bad.length ? " - SORUN VAR" : ""}`, text: t.join("\n") };
}

function incReport(park, i) {
  const who = i.src === "guard" ? "Bekçi" : "Teknisyen";
  const t = [
    `${PARKS[park].name} - YENİ OLAY`,
    `Tür: ${data.types[i.type] || i.type}`,
    `Bildiren: ${who}`,
    `Zaman: ${i.at ? fmt(Date.parse(i.at)) : fmt(i.createdAt)}`,
  ];
  if (i.place) t.push("Yer: " + i.place);
  if (i.kwh) t.push("Tahmini kayıp: " + i.kwh + " kWh");
  if (i.desc) t.push("", i.desc);
  return { subject: `${PARKS[park].name} - OLAY: ${data.types[i.type] || i.type}`, text: t.join("\n") };
}

async function main() {
  await loadData();
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY)) });
  const db = admin.firestore();
  const mail = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
  const now = Date.now();
  let sent = 0;
  for (const park of Object.keys(PARKS)) {
    const base = db.collection("parks").doc(park);
    const stRef = base.collection("mail").doc("_state");
    const st = await stRef.get();
    if (!st.exists) { await stRef.set({ since: now }); console.log(park, "ilk çalışma: geçmiş maillenmeyecek"); continue; }
    const since = st.data().since;
    const to = PARKS[park].to;
    if (!to.length) { console.log(park, "alıcı yok"); continue; }
    const send = async (id, key, r) => {
      await mail.sendMail({ from: process.env.MAIL_USER, to, subject: r.subject, text: r.text });
      await base.collection("mail").doc(id).set({ key, at: now });
      sent++;
    };
    const logs = await base.collection("logs").where("signedAt", ">", since).get();
    for (const doc of logs.docs) {
      const d = doc.data();
      if (!d.signedAt || d.freq === "g") continue;
      const m = await base.collection("mail").doc("log_" + doc.id).get();
      if (m.exists && m.data().key >= d.signedAt) continue;
      await send("log_" + doc.id, d.signedAt, logReport(park, d));
    }
    const incs = await base.collection("incidents").where("createdAt", ">", since).get();
    for (const doc of incs.docs) {
      const m = await base.collection("mail").doc("inc_" + doc.id).get();
      if (m.exists) continue;
      await send("inc_" + doc.id, 1, incReport(park, doc.data()));
    }
  }
  console.log("gönderilen mail:", sent);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { logReport, incReport, loadData };
