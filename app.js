"use strict";

const CUENTAS = {
  "animals-kids": { name: "Animals Kids", cls: "c-ak", ini: "AK", redes: "YouTube" },
  "leora": { name: "Leora", cls: "c-le", ini: "L", redes: "Instagram · TikTok" },
  "fuera-toxicos": { name: "Fuera Tóxicos", cls: "c-ft", ini: "FT", redes: "Instagram · TikTok" },
};
const REDES = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" };
const TRAFICO = { RELATED_VIDEO: "Vídeos sugeridos", EXT_URL: "Webs externas", NO_LINK_OTHER: "Directo / otros", SUBSCRIBER: "Suscriptores",
  YT_CHANNEL: "Página del canal", YT_OTHER_PAGE: "Otras de YouTube", YT_SEARCH: "Búsqueda", PLAYLIST: "Listas", SHORTS: "Feed de Shorts",
  NOTIFICATION: "Notificaciones", END_SCREEN: "Pantallas finales", HASHTAGS: "Hashtags", SOUND_PAGE: "Sonidos", ANNOTATION: "Anotaciones" };

const S = { datos: null, acct: "all", tab: "resumen", mes: (() => { const d = new Date(); d.setDate(1); return d; })(), cargadoEn: null, error: null };
try { const g = JSON.parse(localStorage.getItem("ls-ui") || "{}"); if (g.acct === "all" || g.acct in CUENTAS) S.acct = g.acct; if (["resumen", "publicaciones", "calendario"].includes(g.tab)) S.tab = g.tab; } catch (e) {}
const guardarUi = () => { try { localStorage.setItem("ls-ui", JSON.stringify({ acct: S.acct, tab: S.tab })); } catch (e) {} };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const fmt = n => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("es-ES");
const dia = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const hoy = dia(new Date());
const fecha = s => { const d = new Date(s); return isNaN(d) ? "—" : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); };
const hora = d => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const mmss = s => { s = Math.round(+s || 0); return Math.floor(s / 60) + ":" + pad(s % 60); };
const urlSegura = u => /^https:\/\//.test(u || "") ? u : null;

function vistasDe(p) {
  if (p.vistas == null) return null;
  if (typeof p.vistas === "object") return p.vistas[p.red] ?? null;
  return +p.vistas;
}
function imgDe(p) {
  if (p.img) return p.img;
  if (p.red === "youtube") { const v = (S.datos.youtube?.videos || []).find(x => "yt-" + x.id === p.id); return v?.img || null; }
  return null;
}

/* ---------- Carga de datos ---------- */
// Abierta desde el archivo (Mac): los datos vienen en data/datos.js junto a la app.
// Publicada: los datos están en un repositorio privado de GitHub y se leen con una clave de solo lectura guardada en este dispositivo.
const LOCAL = location.protocol === "file:";
const REPO_DATOS = "Maverick101-AS/leora-studio-datos";
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const escribir = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };

async function deGithub(ruta) {
  const r = await fetch(`https://api.github.com/repos/${REPO_DATOS}/contents/${ruta}`, {
    cache: "no-store", headers: { Accept: "application/vnd.github.raw+json", Authorization: "Bearer " + leer("ls-clave") } });
  if (r.status === 401 || r.status === 403 || r.status === 404) { const e = new Error("clave"); e.clave = true; throw e; }
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r;
}

async function cargar(manual) {
  if (LOCAL) {
    if (manual) { location.reload(); return; }
    S.datos = window.DATOS || null; S.cargadoEn = new Date(); S.error = S.datos ? null : new Error("sin datos");
    render(); return;
  }
  if (!leer("ls-clave")) { S.pedirClave = true; render(); return; }
  if (!S.datos) { try { S.datos = JSON.parse(leer("ls-datos") || "null"); } catch (e) {} }
  if (manual) { $("upd-txt").textContent = "Actualizando…"; $("upd-txt").className = "muted"; }
  try {
    const r = await deGithub("data/datos.json");
    const txt = await r.text();
    S.datos = JSON.parse(txt); S.cargadoEn = new Date(); S.error = null; S.pedirClave = false;
    escribir("ls-datos", txt);
  } catch (e) {
    S.error = e;
    if (e.clave) { S.pedirClave = true; escribir("ls-clave", null); }
  }
  render();
}

// Las portadas también son privadas: se descargan con la clave y se guardan en el dispositivo para verlas sin conexión.
const urlsImg = {};
async function hidratarImagenes() {
  if (LOCAL) return;
  const cache = await caches.open("leora-studio-img").catch(() => null);
  for (const el of document.querySelectorAll("img[data-src]")) {
    const ruta = el.dataset.src;
    if (urlsImg[ruta]) { el.src = urlsImg[ruta]; continue; }
    try {
      let r = cache && await cache.match(ruta);
      if (!r) { r = await deGithub(ruta); if (cache) await cache.put(ruta, r.clone()); }
      urlsImg[ruta] = URL.createObjectURL(await r.blob());
      document.querySelectorAll(`img[data-src="${CSS.escape(ruta)}"]`).forEach(i => i.src = urlsImg[ruta]);
    } catch (e) {}
  }
}
const imgTag = (ruta, cls) => LOCAL ? `<img${cls ? ` class="${cls}"` : ""} src="${esc(ruta)}" alt="" loading="lazy">`
  : `<img${cls ? ` class="${cls}"` : ""} data-src="${esc(ruta)}" src="${urlsImg[ruta] || "data:image/gif;base64,R0lGODlhAQABAAAAACw="}" alt="">`;

function vistaClave() {
  const err = S.error?.clave ? `<p class="notice" style="color:var(--warn)">GitHub no ha aceptado esa clave. Revisa que tenga acceso al repositorio leora-studio-datos con permiso de lectura.</p>` : "";
  return `<section class="panel"><h2>Conectar los datos</h2>${err}
    <p>Tus datos están en un repositorio privado de GitHub. Para verlos en este dispositivo, pega una clave de solo lectura (solo hay que hacerlo una vez en cada dispositivo).</p>
    <ol style="margin:0;padding-left:20px;display:grid;gap:4px">
      <li>Abre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Fine-grained token nuevo</a>.</li>
      <li>Nombre: «Leora Studio». Caducidad: la más larga que te deje.</li>
      <li>Repository access: «Only select repositories» → <b>leora-studio-datos</b>.</li>
      <li>Permissions → Repository permissions → <b>Contents: Read-only</b>. Nada más.</li>
      <li>Pulsa «Generate token», cópialo y pégalo aquí.</li>
    </ol>
    <form id="f-clave" style="display:flex;gap:8px;flex-wrap:wrap">
      <input id="i-clave" type="password" autocomplete="off" placeholder="github_pat_…" style="flex:1;min-width:220px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)">
      <button class="btn" type="submit">Guardar</button>
    </form>
    <p class="muted" style="font-size:12px;margin:0">La clave se guarda solo en este dispositivo y solo permite leer ese repositorio.</p></section>`;
}

function ultimaFecha() {
  const d = S.datos; if (!d) return null;
  const fs = [d.generado, d.youtube?.actualizado];
  for (const p of Object.values(d.perfiles || {})) fs.push(p.instagram?.actualizado, p.tiktok?.actualizado);
  return fs.map(x => new Date(x)).filter(x => !isNaN(x)).sort((a, b) => b - a)[0] || null;
}
function pintarEstado() {
  const el = $("upd-txt");
  if (S.pedirClave) { el.textContent = "Falta la clave de GitHub"; el.className = "old"; return; }
  if (!S.datos) { el.textContent = S.error ? "Sin conexión y sin datos guardados" : "Cargando…"; el.className = "old"; return; }
  const d = ultimaFecha(), viejo = d && (Date.now() - d) > 36 * 3600e3;
  el.className = viejo || S.error ? "old" : "muted";
  el.textContent = (S.error ? "Sin conexión · " : "") + "Datos del " + (d ? (dia(d) === hoy ? "día de hoy " + hora(d) : d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " " + hora(d)) : "—");
}

/* ---------- Cabecera ---------- */
function pintarCuentas() {
  const fotos = S.datos?.perfiles || {};
  const btn = (id, c) => `<button type="button" class="acct ${c.cls}" data-acct="${id}" aria-pressed="${S.acct === id}">
    <span class="av">${fotos[id]?.foto ? imgTag(fotos[id].foto) : esc(c.ini)}</span><span><b>${esc(c.name)}</b><small>${esc(c.redes)}</small></span></button>`;
  $("accts").innerHTML = btn("all", { name: "Todas", cls: "c-all", ini: "★", redes: "Vista general" }) + Object.entries(CUENTAS).map(([k, c]) => btn(k, c)).join("");
  $("accts").querySelectorAll("[data-acct]").forEach(b => b.onclick = () => { S.acct = b.dataset.acct; guardarUi(); render(); });
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.tab === S.tab));
}

/* ---------- Resumen ---------- */
function postsDe(cuenta) { return (S.datos.posts || []).filter(p => p.estado !== "idea" && (cuenta === "all" || p.cuenta === cuenta)); }
const suma = (arr, f) => arr.reduce((a, x) => a + (+f(x) || 0), 0);

function grafico(filas) {
  const W = 640, H = 200, L = 34, R = 8, T = 10, B = 24;
  const max = Math.max(5, ...filas.map(r => r.views || 0));
  const paso = Math.pow(10, Math.floor(Math.log10(max))), tope = Math.ceil(max / paso) * paso;
  const x = i => L + (filas.length < 2 ? 0 : i * (W - L - R) / (filas.length - 1));
  const y = v => T + (H - T - B) * (1 - v / tope);
  const linea = filas.map((r, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(r.views || 0).toFixed(1)).join(" ");
  let g = "";
  for (let k = 0; k <= 4; k++) { const v = tope * k / 4; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 5}" y="${y(v) + 4}" text-anchor="end">${fmt(Math.round(v))}</text>`; }
  [0, filas.length - 1].forEach(i => { const d = new Date(filas[i].day + "T12:00"); g += `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="${i ? "end" : "start"}">${d.getDate()} ${d.toLocaleDateString("es-ES", { month: "short" })}</text>`; });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visualizaciones por día">${g}
    <path d="${linea} L${x(filas.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z" fill="var(--ak-soft)"/><path d="${linea}" fill="none" stroke="var(--ak)" stroke-width="2"/></svg></div>`;
}

function resumenYT() {
  const yt = S.datos.youtube; if (!yt) return `<p class="notice">Todavía no hay datos de YouTube.</p>`;
  const filas = (yt.diario || []).slice(-28), ch = yt.canal || {};
  const posts = postsDe("animals-kids"), conRet = posts.filter(p => p.pct_visto != null);
  const ret = conRet.length ? suma(conRet, p => p.pct_visto * (p.vistas || 0)) / Math.max(1, suma(conRet, p => p.vistas)) : null;
  const top = [...posts].sort((a, b) => (vistasDe(b) || 0) - (vistasDe(a) || 0)).slice(0, 5);
  return `<section class="panel acc c-ak"><div class="panel-head"><h2>Animals Kids · YouTube</h2><span class="muted" style="font-size:12px">${esc(yt.fuente || "")}</span></div>
    <div class="kpis">
      <div class="kpi"><span class="l">Suscriptores</span><span class="v">${fmt(ch.subscriberCount)}</span><span class="h">en total</span></div>
      <div class="kpi"><span class="l">Visualizaciones</span><span class="v">${fmt(suma(filas, r => r.views))}</span><span class="h">últimos 28 días</span></div>
      <div class="kpi"><span class="l">Horas vistas</span><span class="v">${(suma(filas, r => r.estimatedMinutesWatched) / 60).toLocaleString("es-ES", { maximumFractionDigits: 1 })}</span><span class="h">últimos 28 días</span></div>
      <div class="kpi"><span class="l">Suscriptores nuevos</span><span class="v">+${fmt(suma(filas, r => r.subscribersGained))}</span><span class="h">últimos 28 días</span></div>
      <div class="kpi"><span class="l">Retención media</span><span class="v">${ret == null ? "—" : ret.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %"}</span><span class="h">ponderada por vistas</span></div>
    </div>
    ${filas.length ? grafico(filas) + `<p class="muted" style="font-size:12px;margin:0">YouTube tarda uno o dos días en contar las visualizaciones más recientes.</p>` : ""}
    <h3 style="font-size:15px">Lo más visto</h3><div class="posts">${top.map(tarjeta).join("")}</div></section>`;
}

function resumenSocial(cuenta) {
  const c = CUENTAS[cuenta], pf = S.datos.perfiles?.[cuenta] || {}, posts = postsDe(cuenta);
  const red = r => {
    const p = pf[r] || {}, ps = posts.filter(x => x.red === r);
    const url = r === "instagram" ? `https://www.instagram.com/${p.usuario || ""}/` : `https://www.tiktok.com/@${p.usuario || ""}`;
    return `<div class="kpi"><span class="l">${REDES[r]}${p.usuario ? ` · <a href="${esc(url)}" target="_blank" rel="noopener">@${esc(p.usuario)}</a>` : ""}</span>
      <span class="v">${fmt(p.seguidores)}</span><span class="h">seguidores · ${fmt(ps.length)} publicaciones · ${fmt(suma(ps, vistasDe))} visualizaciones · ${fmt(suma(ps, x => x.megusta))} me gusta</span></div>`;
  };
  const ult = posts.slice(0, 4);
  return `<section class="panel acc ${c.cls}"><div class="panel-head"><h2>${esc(c.name)}</h2></div>
    <div class="kpis">${red("instagram")}${red("tiktok")}</div>
    ${ult.length ? `<h3 style="font-size:15px">Últimas publicaciones</h3><div class="posts">${ult.map(tarjeta).join("")}</div>` : ""}</section>`;
}

function vistaResumen() {
  if (S.acct === "animals-kids") return resumenYT();
  if (S.acct !== "all") return resumenSocial(S.acct);
  return resumenYT() + `<div class="grid2">${resumenSocial("leora")}${resumenSocial("fuera-toxicos")}</div>`;
}

/* ---------- Publicaciones ---------- */
function tarjeta(p) {
  const c = CUENTAS[p.cuenta] || CUENTAS.leora, img = imgDe(p), url = urlSegura(p.enlace), v = vistasDe(p);
  const st = [];
  st.push(`<span>👁 <b>${v == null ? (p.formato === "Carrusel" ? "sin vistas públicas" : "—") : fmt(v)}</b></span>`);
  if (p.megusta != null) st.push(`<span>♥ <b>${fmt(p.megusta)}</b></span>`);
  if (p.comentarios != null) st.push(`<span>💬 <b>${fmt(p.comentarios)}</b></span>`);
  if (p.pct_visto != null) st.push(`<span>Retención <b>${(+p.pct_visto).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %</b>${p.duracion_media_s != null ? ` (${mmss(p.duracion_media_s)})` : ""}</span>`);
  else if (p.red === "youtube") st.push(`<span class="muted">Retención: pendiente</span>`);
  if (p.subs_ganados) st.push(`<span>+<b>${fmt(p.subs_ganados)}</b> suscriptores</span>`);
  if (p.compartidos) st.push(`<span>↗ <b>${fmt(p.compartidos)}</b> compartidos</span>`);
  const inner = `${img ? imgTag(img, "th") : `<span class="th">${esc(p.formato || "")}</span>`}
    <div><div class="t">${esc(p.titulo)}</div>
      <div class="meta"><span class="chip">${esc(REDES[p.red] || p.red)}</span><span>${esc(p.formato || "")}</span><span>${fecha(p.fecha)}</span></div>
      <div class="stats">${st.join("")}</div></div>`;
  return url ? `<a class="post ${c.cls}" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="post ${c.cls}">${inner}</div>`;
}

function traficoCanal(posts) {
  const t = {};
  posts.forEach(p => Object.entries(p.trafico || {}).forEach(([k, n]) => t[k] = (t[k] || 0) + (+n || 0)));
  const filas = Object.entries(t).sort((a, b) => b[1] - a[1]), tot = suma(filas, f => f[1]);
  if (!tot) return "";
  return `<section class="panel acc c-ak"><div class="panel-head"><h2>De dónde vienen las visitas</h2><span class="muted" style="font-size:12px">YouTube, todos los vídeos</span></div>
    <div class="bars">${filas.slice(0, 8).map(([k, n]) => `<div class="bar"><span>${esc(TRAFICO[k] || k)}</span><i style="width:${(n / filas[0][1] * 100).toFixed(1)}%"></i><span class="num muted">${Math.round(n / tot * 100)} %</span></div>`).join("")}</div></section>`;
}

function vistaPublicaciones() {
  const posts = postsDe(S.acct);
  if (!posts.length) return `<p class="notice">Todavía no hay publicaciones.</p>`;
  const yt = posts.filter(p => p.red === "youtube");
  return `<section class="panel"><div class="panel-head"><h2>Publicaciones <span class="muted num">${posts.length}</span></h2><span class="muted" style="font-size:12px">Pulsa una para abrirla</span></div>
    <div class="posts">${posts.map(tarjeta).join("")}</div></section>${yt.length ? traficoCanal(yt) : ""}`;
}

/* ---------- Calendario ---------- */
function vistaCalendario() {
  const y = S.mes.getFullYear(), m = S.mes.getMonth();
  const ini = new Date(y, m, 1); ini.setDate(1 - (ini.getDay() + 6) % 7);
  const porDia = {};
  postsDe(S.acct).forEach(p => { const d = new Date(p.fecha); if (!isNaN(d)) (porDia[dia(d)] ||= []).push(p); });
  let celdas = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map(d => `<div class="dow">${d}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    const d = new Date(ini); d.setDate(ini.getDate() + i); const k = dia(d);
    if (i >= 35 && d.getMonth() !== m) break;
    celdas += `<div class="cell ${d.getMonth() !== m ? "out" : ""} ${k === hoy ? "today" : ""}"><span class="n">${d.getDate()}</span>${(porDia[k] || []).map(p => {
      const c = CUENTAS[p.cuenta] || CUENTAS.leora, url = urlSegura(p.enlace), txt = `${REDES[p.red] || ""} · ${p.titulo}`;
      return url ? `<a class="pill ${c.cls}" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(c.name + " · " + p.titulo)}">${esc(txt)}</a>` : `<span class="pill ${c.cls}" title="${esc(c.name + " · " + p.titulo)}">${esc(txt)}</span>`;
    }).join("")}</div>`;
  }
  const leyenda = `<div class="legend">${Object.values(CUENTAS).map(c => `<span class="${c.cls}">${esc(c.name)}</span>`).join("")}</div>`;
  return `<section class="panel"><div class="panel-head"><div class="cal-head"><button type="button" data-mes="-1" aria-label="Mes anterior">‹</button>
    <h3>${S.mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</h3><button type="button" data-mes="1" aria-label="Mes siguiente">›</button><button type="button" data-mes="0">Hoy</button></div>${leyenda}</div>
    <div class="cal-scroll"><div class="cal">${celdas}</div></div></section>`;
}

/* ---------- Render ---------- */
function render() {
  pintarEstado(); pintarCuentas();
  if (S.pedirClave) {
    $("view").innerHTML = vistaClave();
    $("f-clave").onsubmit = ev => { ev.preventDefault(); const v = $("i-clave").value.trim(); if (!v) return; escribir("ls-clave", v); S.error = null; cargar(true); };
    return;
  }
  if (!S.datos) { $("view").innerHTML = `<p class="notice">${S.error ? "No se han podido cargar los datos. Comprueba la conexión y pulsa Actualizar." : "Cargando…"}</p>`; return; }
  $("view").innerHTML = (S.tab === "publicaciones" ? vistaPublicaciones() : S.tab === "calendario" ? vistaCalendario() : vistaResumen())
    + (LOCAL ? "" : `<p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0"><button type="button" class="btn" id="b-clave" style="font-size:12px;padding:3px 10px">Cambiar clave de GitHub</button></p>`);
  $("view").querySelectorAll("[data-mes]").forEach(b => b.onclick = () => {
    const k = +b.dataset.mes; if (k) S.mes.setMonth(S.mes.getMonth() + k); else { S.mes = new Date(); S.mes.setDate(1); } render();
  });
  if ($("b-clave")) $("b-clave").onclick = () => { S.pedirClave = true; render(); };
  hidratarImagenes();
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => { S.tab = t.dataset.tab; guardarUi(); render(); });
$("upd-btn").onclick = () => cargar(true);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.cargadoEn && Date.now() - S.cargadoEn > 10 * 60e3) cargar(); });

if (!LOCAL && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
cargar();
