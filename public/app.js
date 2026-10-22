const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const shapes = {
  grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="14" y="3" width="6" height="6" rx="1"/><rect x="3" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  briefcase: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a24 24 0 0 0 18 0m-9-1v4"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 17l10 5 10-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Zm7-1v4m-2-2h4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8M8 17h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${shapes[name] || shapes.file}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
let state = { candidates: [], vacancies: [], reports: [], reviews: [] }, status = {}, selectedVacancy = null, selectedReport = null, running = false, errorMessage = '', consent = false, note = '', toastTimer;
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'X-Cora-Client': 'atlas', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.errors?.map(e => `${e.filename}: ${e.error}`).join('\n') || 'No se pudo completar la operación.');
  return data;
}
function notify(message, error = false) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').className = `toast${error ? ' error' : ''}`; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 12000 : 6000);
}
async function refresh() { [state, status] = await Promise.all([api('/api/state'), api('/api/status')]); }
const date = value => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const page = () => location.hash.slice(1) || 'overview';
const initials = name => name.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
const heading = (eyebrow, title, text, extra = '') => `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${text}</p></div>${extra}</div>`;
const empty = (title, description, button = '') => `<div class="empty"><div class="empty-icon">${icon('file')}</div><h3>${title}</h3><p>${description}</p>${button}</div>`;
function vacancyRow(vacancy) {
  const report = state.reports.find(r => r.vacancyId === vacancy.id);
  return `<div class="vacancy-row"><div class="vacancy-icon">${icon('briefcase')}</div><div><div class="vacancy-title">${escape(vacancy.title)}</div><div class="vacancy-meta">${escape(vacancy.company || 'Tu equipo')} · ${escape(vacancy.location || 'Sin ubicación')}</div></div><div class="row-trailing"><span class="pill ${report ? 'success' : 'pending'}">${report ? 'Analizada' : 'Por analizar'}</span><button class="arrow-button" data-vacancy="${escape(vacancy.id)}" aria-label="Abrir ${escape(vacancy.title)}">↗</button></div></div>`;
}
function overview() {
  return `${heading('TU TALENTO, CON PERSPECTIVA', 'Cada perfil tiene una historia.', 'Conecta lo que necesitas con lo que cada persona puede aportar.', `<span class="page-date">${escape(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}</span>`)}
    <section class="hero"><div class="hero-copy"><span class="eyebrow"><i></i> TALENT INTELLIGENCE, POWERED BY NEMOTRON</span><h1>El talento está<br>en los <em>detalles.</em></h1><p>De una oferta y una colección de CVs a propuestas con contexto, evidencias y preguntas que importan.</p><a class="button button-lime" href="#vacancies">Explorar candidatos ${icon('arrow')}</a></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit two"></div><div class="orbit three"></div><div class="core">${icon('spark')}</div><div class="art-tag one">${icon('file')} Cada CV, en contexto</div><div class="art-tag two">${icon('check')} Cada propuesta, con evidencias</div><span class="art-caption">CONNECTING PEOPLE & POSSIBILITIES</span></div></section>
    <section class="stats" aria-label="Resumen del espacio">${[['users', state.candidates.length, 'CVs en tu biblioteca', 'DOCUMENTOS'], ['briefcase', state.vacancies.length, 'Vacantes creadas', 'PROCESOS'], ['spark', state.reports.length, 'Análisis de Nemotron', 'INTELIGENCIA']].map(([i, n, l, tag]) => `<div class="stat"><div class="stat-icon">${icon(i)}</div><div><div class="stat-number">${n.toString().padStart(2, '0')}</div><div class="stat-label">${l}</div></div><span class="stat-side">${tag}</span></div>`).join('')}</section>
    <div class="content-grid"><section><div class="section-heading"><h2>Tus procesos de selección</h2><a href="#vacancies" class="button button-ghost">Ver vacantes ↗</a></div><div class="panel">${state.vacancies.length ? state.vacancies.slice(0, 4).map(vacancyRow).join('') : empty('Tu próxima incorporación empieza aquí', 'Crea una vacante o explora el espacio con tres CVs ficticios y una oferta de ejemplo.', '<button class="button button-outline button-small" data-demo>Preparar ejemplo</button>')}</div><div class="info-banner"><strong>Más contexto. Mejores conversaciones.</strong><br>Nemotron interpreta los requisitos y propone candidatos. Tú revisas las evidencias y decides el siguiente paso.</div></section>
    <section><div class="section-heading"><h2>Así conecta las piezas</h2><span class="pill neutral">EL FLUJO</span></div><div class="panel panel-pad"><div class="flow-heading">DE LA OFERTA A UNA DECISIÓN INFORMADA</div>${[['Entender la oferta', 'Nemotron identifica requisitos y preguntas abiertas.'], ['Leer cada perfil', 'La IA revisa el contenido de los CVs aportados.'], ['Conectar las evidencias', 'Propone candidatos y cita sus documentos.'], ['Darle tu criterio', 'Revisa, contrasta y prepara la entrevista.']].map(([t, p], i) => `<div class="flow-step"><span class="step-number">0${i + 1}</span><div><h3>${t}</h3><p>${p}</p></div></div>`).join('')}<div class="model-note">${icon('shield')} Sin porcentajes. Con trazabilidad.</div></div></section></div>`;
}
function library() {
  return `${heading('EL PUNTO DE PARTIDA', 'Tu biblioteca de talento.', 'Los documentos que la IA utilizará como fuente de cada propuesta.', '<button class="button button-outline" data-demo>Usar CVs de ejemplo</button>')}
    <div class="import-zone" id="dropzone"><div class="upload-icon">${icon('upload')}</div><div><h3>Un espacio para cada trayectoria</h3><p>Arrastra CVs o selecciona archivos · PDF, DOCX y TXT · Máximo 5 MB por archivo</p></div><button class="button button-dark" data-upload>${icon('plus')} Añadir CVs</button></div>
    <div class="toolbar"><div class="search">${icon('search')}<input id="library-filter" type="search" aria-label="Filtrar documentos por nombre" placeholder="Filtrar documentos por nombre…"></div><span class="result-count">${state.candidates.length} de 25 documentos · filtro por nombre de archivo</span></div>
    <div class="panel table-wrap"><table><thead><tr><th>DOCUMENTO</th><th>ORIGEN</th><th>AÑADIDO</th><th></th></tr></thead><tbody id="candidate-table">${candidateRows(state.candidates)}</tbody></table>${!state.candidates.length ? empty('La biblioteca está lista para tus CVs', 'Añade documentos o carga el ejemplo. El texto se guarda en este ordenador hasta que solicitas el análisis.') : ''}</div>
    <p class="small-note">La lectura de archivos extrae texto, sin interpretar perfiles. Los PDF escaneados necesitan OCR previo. Los nombres iniciales proceden del archivo; no se infieren datos personales.</p>`;
}
function candidateRows(candidates) {
  return candidates.map(c => `<tr><td><div class="candidate-name"><span class="avatar">${escape(initials(c.name))}</span><div>${escape(c.name)}<small>${escape(c.filename)} · ${c.characters.toLocaleString('es-ES')} caracteres</small></div></div></td><td><span class="pill ${c.synthetic ? 'pending' : 'neutral'}">${c.synthetic ? 'Ejemplo ficticio' : c.source === 'zetaris' ? 'Zetaris' : 'Archivo local'}</span></td><td>${date(c.createdAt)}</td><td><button class="text-link" data-document="${escape(c.id)}">Ver texto ↗</button></td></tr>`).join('');
}
function reportMarkup(report) {
  return `<div class="report-summary"><span class="eyebrow">LA PERSPECTIVA DE NEMOTRON</span><p>${escape(report.summary)}</p><div class="report-meta">${date(report.createdAt)} · ${escape(report.provider)} · ${escape(report.model)}</div></div>
    ${report.clarificationQuestions.length ? `<div class="panel panel-pad"><h3>Antes de seguir, aclaremos</h3><ul class="questions">${report.clarificationQuestions.map(q => `<li>${escape(q)}</li>`).join('')}</ul></div>` : ''}
    <div class="report-actions"><h3>${report.candidates.length} perfiles revisados · Orden propuesto por la IA</h3><button class="button button-ghost" data-export="${escape(report.id)}">Descargar informe ↗</button></div>
    ${report.candidates.map((c, i) => {
      const source = report.sources.find(s => s.id === c.candidateId), review = state.reviews.find(r => r.reportId === report.id && r.candidateId === c.candidateId);
      const labels = { strong: 'Encaje respaldado', possible: 'Requiere contraste', insufficient_evidence: 'Evidencia insuficiente' };
      return `<article class="candidate-card"><div class="candidate-card-head"><span class="avatar">${escape(initials(source.name))}</span><div><h3>${escape(source.name)}</h3><small>${escape(source.filename)}</small></div><span class="pill ${c.recommendation === 'strong' ? 'success' : 'pending'}">${labels[c.recommendation]}</span></div><p>${escape(c.rationale)}</p><button class="text-link" data-snapshot="${escape(report.id)}" data-candidate="${escape(c.candidateId)}">Consultar el CV utilizado ↗</button><details ${i === 0 ? 'open' : ''}><summary>Revisar las ${c.evidence.length} evidencias</summary>${c.evidence.map(e => `<div class="evidence"><div class="evidence-head"><span class="pill ${e.status === 'supported' ? 'success' : 'pending'}">${{ supported: 'Acreditado', unclear: 'Por aclarar', missing: 'Sin evidencia' }[e.status]}</span>${escape(report.requirements.find(r => r.id === e.requirementId)?.label)}</div>${e.quote ? `<blockquote>“${escape(e.quote)}”</blockquote>` : ''}<p>${escape(e.explanation)}</p></div>`).join('')}</details><details><summary>Preguntas para la entrevista</summary><ul class="questions">${c.interviewQuestions.map(q => `<li>${escape(q)}</li>`).join('')}</ul></details><div class="review-row"><span class="review-label">Tu siguiente paso</span><select aria-label="Estado de revisión de ${escape(source.name)}" data-review="${escape(c.candidateId)}" data-report="${escape(report.id)}">${[['pending', 'Pendiente de revisión'], ['interview', 'Proponer entrevista'], ['hold', 'Seguir contrastando']].map(([v, t]) => `<option value="${v}" ${review?.status === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div></article>`;
    }).join('')}`;
}
function vacancies() {
  if (!state.vacancies.length) return `${heading('DEFINIR LO QUE IMPORTA', 'Encuentra tu próxima incorporación.', 'Una buena propuesta empieza por una oferta clara.')}<div class="panel">${empty('¿Qué necesita tu equipo?', 'Describe el puesto y los requisitos. Nemotron se ocupará de interpretarlos al analizar los CVs.', '<button class="button button-dark" data-new-vacancy>Crear primera vacante ↗</button> <button class="button button-outline" data-demo>Explorar ejemplo</button>')}</div>`;
  const vacancy = state.vacancies.find(v => v.id === selectedVacancy) || state.vacancies[0]; selectedVacancy = vacancy.id;
  const reports = state.reports.filter(r => r.vacancyId === vacancy.id);
  const report = reports.find(r => r.id === selectedReport) || reports[0];
  return `${heading('CRITERIO HUMANO. CONTEXTO DE IA.', 'Cada propuesta, una razón.', 'Deja que Nemotron conecte la oferta con la experiencia documentada.')}
    <div class="vacancy-workspace"><section class="panel vacancy-config"><label for="vacancy-select">VACANTE SELECCIONADA</label><select id="vacancy-select">${state.vacancies.map(v => `<option value="${escape(v.id)}" ${v.id === vacancy.id ? 'selected' : ''}>${escape(v.title)}</option>`).join('')}</select><h3>${escape(vacancy.title)}</h3><div class="vacancy-meta">${escape(vacancy.company)} · ${escape(vacancy.location)}</div><div class="vacancy-description">${escape(vacancy.description)}</div><label>Contexto adicional del equipo<textarea id="analysis-note" rows="3" maxlength="4000" placeholder="Dudas o contexto que conviene tener presente…">${escape(note)}</textarea></label><label class="consent"><input type="checkbox" id="analysis-consent" ${consent ? 'checked' : ''}><span>Autorizo enviar esta oferta, las notas y los ${state.candidates.length} CVs a ${escape(status.provider)} para este análisis.</span></label><button id="analyze" class="button button-dark full-width" ${running || !consent || !status.configured || !state.candidates.length ? 'disabled' : ''}>${icon('spark')} ${running ? 'Analizando los perfiles…' : 'Analizar con Nemotron'}</button>${!status.configured ? '<p class="small-note">Falta conectar la IA. Configura la clave en .env y reinicia. <a href="#connections" class="text-link">Ver conexiones ↗</a></p>' : '<p class="small-note">Puede tardar unos minutos. La app envía todos los CVs activos, sin búsqueda ni puntuación local.</p>'}<p class="small-note">Los documentos permanecen en SQLite local y se envían al proveedor solo al solicitar el análisis. Revisa las condiciones del proveedor antes de usar datos reales.</p></section>
    <section>${errorMessage ? `<div role="alert" class="error-inline">${escape(errorMessage)}</div>` : ''}${running ? `<div class="panel analysis-placeholder running"><div class="core">${icon('spark')}</div><h2>Conectando las piezas.</h2><p>Nemotron está interpretando la oferta y contrastando cada CV. Después verificaremos que las citas existan en los documentos.</p><div class="trust-row"><span>${icon('file')} Leer</span><span>${icon('layers')} Contrastar</span><span>${icon('check')} Verificar</span></div></div>` : report ? reportMarkup(report) : `<div class="panel analysis-placeholder"><div class="core">${icon('spark')}</div><span class="eyebrow">LA EXPERIENCIA TIENE CONTEXTO</span><h2>Del CV a una propuesta<br>que puedes contrastar.</h2><p>Aquí aparecerán los candidatos que proponga Nemotron, sus evidencias y las preguntas que merecen una conversación.</p><div class="trust-row"><span>${icon('shield')} Citas verificables</span><span>${icon('users')} Revisión humana</span><span>${icon('check')} Sin porcentajes</span></div></div>`}
    ${reports.length ? `<div class="history"><div class="section-heading"><h2>Historial de análisis</h2></div><div class="panel">${reports.map(r => `<button data-history="${escape(r.id)}"><span>${escape(r.vacancyTitle)}</span><small>${date(r.createdAt)} · ${r.candidates.length} CVs ↗</small></button>`).join('')}</div></div>` : ''}</section></div>`;
}
function connections() {
  return `${heading('LAS PIEZAS DEL SISTEMA', 'Conexiones con propósito.', 'Cada tecnología tiene una función concreta en el flujo de selección.')}
    <div class="connection-grid"><section class="panel connection"><div class="connection-logo">N</div><h2>NVIDIA Nemotron</h2><p>Comprende la oferta, contrasta los CVs y propone candidatos con evidencias.</p><span class="pill ${status.configured && status.providerId === 'nvidia' ? 'success' : 'pending'}">${status.configured && status.providerId === 'nvidia' ? 'Clave configurada · sin verificar' : 'Pendiente de configurar'}</span><div class="connection-meta">Modelo previsto<br><strong>Nemotron 3.5 Super VL</strong><br>La clave se configura en el servidor, en .env.</div></section>
    <section class="panel connection"><div class="connection-logo">M</div><h2>Meterless Nightshift</h2><p>Proveedor compatible para ejecutar el análisis a través del runtime y conservar su trazabilidad.</p><span class="pill ${status.configured && status.providerId === 'meterless' ? 'success' : 'pending'}">${status.configured && status.providerId === 'meterless' ? 'Token configurado · sin verificar' : 'Pendiente de conectar'}</span><div class="connection-meta">Activa AI_PROVIDER=meterless y configura el token real del runtime. La ruta elegida debe ejecutar Nemotron para nuestra demo.</div></section>
    <section class="panel connection"><div class="connection-logo">Z</div><h2>Zetaris</h2><p>Conecta una vista de candidatos procedentes de fuentes de datos federadas.</p><span class="pill ${status.zetarisConfigured ? 'success' : 'pending'}">${status.zetarisConfigured ? 'Endpoint configurado · sin verificar' : 'Pendiente de conectar'}</span><div class="connection-meta">Adaptador de consulta Trino de solo lectura. Necesita una instancia y una vista autorizada.</div><button class="button button-outline button-small" id="zetaris-import" ${!status.zetarisConfigured ? 'disabled' : ''}>Importar desde Zetaris ↗</button></section></div>
    <div class="info-banner"><strong>Estado real, sin simulaciones.</strong><br>Configurar credenciales no acredita que el servicio responda. Puedes comprobar el proveedor activo sin enviar CVs.</div><button class="button button-dark" id="check-provider">Comprobar ${escape(status.provider || 'proveedor')}</button><div id="provider-result" aria-live="polite"></div>
    <div class="content-grid history"><section><div class="section-heading"><h2>Antes de presentar el proyecto</h2></div><div class="panel panel-pad"><ul class="clear-list checklist"><li>Usar Cursor y guardar evidencia de desarrollo<span>Pendiente</span></li><li>Probar Zetaris con una vista real<span>Pendiente</span></li><li>Ejecutar un análisis a través de Meterless<span>Pendiente</span></li><li>Mostrar la aportación de Nemotron<span>Pendiente</span></li><li>Preparar vídeo, presentación y README<span>Pendiente</span></li></ul></div></section><section><div class="section-heading"><h2>Guía de configuración</h2></div><div class="panel panel-pad"><h3>Todo empieza en .env</h3><p>Copia .env.example como .env. La guía del repositorio explica cómo obtener la clave y conectar los servicios.</p><p class="small-note">Esta base es independiente del producto Cora. No usa sus cuentas, archivos, índices ni servicios.</p><a class="button button-ghost" href="https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b" target="_blank" rel="noopener">Obtener API key de NVIDIA ↗</a></div></section></div>`;
}
function render() {
  const route = ['overview', 'library', 'vacancies', 'connections'].includes(page()) ? page() : 'overview';
  $('#main').innerHTML = ({ overview, library, vacancies, connections }[route])();
  $('#page-crumb').textContent = { overview: 'Vista general', library: 'Biblioteca de CVs', vacancies: 'Vacantes', connections: 'Conexiones' }[route];
  $('#nav-count').textContent = state.candidates.length;
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === route));
  if ($('#dropzone')) {
    $('#dropzone').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
    $('#dropzone').addEventListener('dragleave', e => e.currentTarget.classList.remove('dragover'));
    $('#dropzone').addEventListener('drop', e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); uploadFiles(e.dataTransfer.files); });
  }
  if ($('#library-filter')) $('#library-filter').addEventListener('input', e => { $('#candidate-table').innerHTML = candidateRows(state.candidates.filter(c => `${c.name} ${c.filename}`.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase()))); });
}
function openVacancy() { $('#vacancy-dialog').showModal(); }
$('#new-vacancy').addEventListener('click', openVacancy);
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  try {
    if (button.hasAttribute('data-close')) button.closest('dialog').close();
    if (button.hasAttribute('data-new-vacancy')) openVacancy();
    if (button.hasAttribute('data-upload')) $('#file-input').click();
    if (button.hasAttribute('data-demo')) { button.disabled = true; await api('/api/demo', { method: 'POST', body: '{}' }); await refresh(); render(); notify('Ejemplo preparado: 3 CVs ficticios y una vacante. No se ha ejecutado ningún análisis.'); }
    if (button.dataset.vacancy) { selectedVacancy = button.dataset.vacancy; selectedReport = null; location.hash = 'vacancies'; render(); }
    if (button.dataset.document) showDocument(await api(`/api/candidates/${encodeURIComponent(button.dataset.document)}`));
    if (button.dataset.snapshot) { const report = state.reports.find(r => r.id === button.dataset.snapshot); showDocument(report.sources.find(c => c.id === button.dataset.candidate)); }
    if (button.dataset.history) { selectedReport = button.dataset.history; render(); }
    if (button.dataset.export) exportReport(state.reports.find(r => r.id === button.dataset.export));
    if (button.id === 'analyze') await analyze();
    if (button.id === 'check-provider') {
      button.disabled = true;
      const result = await api('/api/integrations/check', { method: 'POST', body: '{}' });
      const messages = { online: 'Proveedor conectado. No se han enviado CVs. Esta comprobación verifica la autenticación; el análisis aún debe probarse.', unauthorized: 'Credenciales rechazadas por el proveedor. Revisa la clave o token en .env.', unconfigured: 'Falta la clave o el token real del proveedor en .env.', offline: 'El proveedor no está disponible en la dirección configurada.' };
      $('#provider-result').innerHTML = `<div class="info-banner">${escape(messages[result.state])}${result.models?.length && status.providerId === 'meterless' ? `<br>Rutas disponibles: ${escape(result.models.filter(m => m.startsWith('meterless/')).join(', '))}` : ''}</div>`; button.disabled = false;
    }
    if (button.id === 'zetaris-import') { button.disabled = true; const result = await api('/api/sources/zetaris/import', { method: 'POST', body: '{}' }); await refresh(); render(); notify(`${result.imported} CVs importados desde Zetaris.`); }
  } catch (error) { notify(error.message, true); button.disabled = false; }
});
document.addEventListener('input', event => { if (event.target.id === 'analysis-note') note = event.target.value; });
document.addEventListener('change', async event => {
  const target = event.target;
  if (target.id === 'vacancy-select') { selectedVacancy = target.value; selectedReport = null; consent = false; note = ''; errorMessage = ''; render(); }
  if (target.id === 'analysis-consent') { consent = target.checked; $('#analyze').disabled = !consent || running || !status.configured || !state.candidates.length; }
  if (target.dataset.review) {
    target.disabled = true;
    try { await api('/api/reviews', { method: 'POST', body: JSON.stringify({ reportId: target.dataset.report, candidateId: target.dataset.review, status: target.value }) }); await refresh(); notify('Tu decisión se ha guardado.'); }
    catch (error) { notify(error.message, true); render(); }
    finally { target.disabled = false; }
  }
});
$('#vacancy-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try { const vacancy = await api('/api/vacancies', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); selectedVacancy = vacancy.id; selectedReport = null; note = ''; consent = false; await refresh(); event.target.reset(); $('#vacancy-dialog').close(); location.hash = 'vacancies'; render(); notify('Vacante creada. Añade los CVs y conecta la IA para analizarla.'); }
  catch (error) { notify(error.message, true); } finally { button.disabled = false; }
});
$('#file-input').addEventListener('change', e => { uploadFiles(e.target.files); e.target.value = ''; });
let uploading = false;
async function uploadFiles(files) {
  if (!files.length || uploading) return;
  if (files.length > 10) return notify('Puedes añadir hasta 10 documentos en cada importación.', true);
  const data = new FormData(); for (const file of files) data.append('files', file);
  uploading = true; $('#main').classList.add('busy'); notify('Leyendo los documentos en este ordenador…');
  try { const result = await api('/api/candidates', { method: 'POST', body: data }); await refresh(); render(); notify(`${result.added.length} documentos añadidos.${result.errors.length ? ' ' + result.errors.map(e => `${e.filename}: ${e.error}`).join(' · ') : ''}`, Boolean(result.errors.length)); }
  catch (error) { notify(error.message, true); } finally { uploading = false; $('#main').classList.remove('busy'); }
}
function showDocument(candidate) { $('#document-title').textContent = candidate.name; $('#document-meta').textContent = candidate.filename; $('#document-text').textContent = candidate.text; $('#document-dialog').showModal(); }
async function analyze() {
  if (!consent || running) return;
  running = true; errorMessage = ''; const vacancyId = selectedVacancy, analysisNote = note; render();
  try { const report = await api(`/api/vacancies/${encodeURIComponent(vacancyId)}/analyze`, { method: 'POST', body: JSON.stringify({ consent: true, note: analysisNote }) }); await refresh(); selectedVacancy = vacancyId; selectedReport = report.id; notify('Análisis guardado. Revisa las evidencias antes de decidir.'); }
  catch (error) { errorMessage = error.message; notify(error.message, true); }
  finally { running = false; render(); }
}
function exportReport(report) {
  let text = `# ${report.vacancyTitle}\n\n${report.summary}\n\nProveedor: ${report.provider}\nModelo: ${report.model}\nFecha: ${report.createdAt}\n\nRecomendaciones de IA sujetas a revisión humana. Sin puntuaciones.\n`;
  for (const candidate of report.candidates) {
    const source = report.sources.find(s => s.id === candidate.candidateId);
    text += `\n## ${source.name}\n\nFuente: ${source.filename}\n\n${candidate.rationale}\n`;
    for (const evidence of candidate.evidence) text += `\n### ${report.requirements.find(r => r.id === evidence.requirementId).label}\n\n${evidence.status}: ${evidence.explanation}\n${evidence.quote ? `\n> ${evidence.quote.replace(/\n/g, '\n> ')}\n` : ''}`;
    text += `\nPreguntas para entrevista:\n${candidate.interviewQuestions.map(q => `- ${q}`).join('\n')}\n`;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `cora-atlas-${report.id}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
try { await refresh(); render(); } catch (error) { $('#main').innerHTML = `${heading('CORA ATLAS', 'No se pudo abrir el espacio.', 'Comprueba que el servidor local esté funcionando.')}<p role="alert" class="error-inline">${escape(error.message)}</p>`; }
