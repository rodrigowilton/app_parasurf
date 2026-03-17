// =============================================
// Instituto ParaSurf — Main App Controller
// Versão com backend PostgreSQL
// =============================================
import * as api from './app/services/api';

type PerfilTipo = 'gestor' | 'aluno' | 'estagiario' | 'voluntario';

// ---- Helpers ----
function fmt(date: string): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return date; }
}
function perfilLabel(p: string): string {
  const map: Record<string, string> = { gestor: 'Gestor', aluno: 'Aluno', estagiario: 'Estagiário', voluntario: 'Voluntário' };
  return map[p] || p;
}
function perfilEmoji(p: string): string {
  const map: Record<string, string> = { gestor: '🏢', aluno: '🏄', estagiario: '📋', voluntario: '🤝' };
  return map[p] || '👤';
}
function initials(name: string): string {
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch { return iso; }
}
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ---- Toast ----
function toast(msg: string, ok = true) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show';
  el.style.background = ok ? 'var(--ocean-deep, #0a2540)' : '#c62828';
  clearTimeout((el as any)._t);
  (el as any)._t = setTimeout(() => el!.classList.remove('show'), 2800);
}

// ---- Modal ----
function openModal(id: string) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id: string) { document.getElementById(id)?.classList.remove('open'); }
(window as any).openModal = openModal;
(window as any).closeModal = closeModal;

// ---- Loading ----
function setLoading(container: HTMLElement | null, msg = 'Carregando...') {
  if (container) container.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">${msg}</div></div>`;
}

// ---- Navigation ----
function showPage(id: string) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  if (id === 'page-home')        renderHome();
  if (id === 'page-avisos')      renderAvisos();
  if (id === 'page-confirmacao') renderConfirmacao();
  if (id === 'page-cadastro')    renderCadastro();
}

// ==============================================
// RENDER HOME
// ==============================================
async function renderHome() {
  const u = api.getUsuario();
  if (!u) return;

  const heroName = document.getElementById('hero-name');
  const heroRole = document.getElementById('hero-role');
  if (heroName) heroName.textContent = u.nome.split(' ')[0];
  if (heroRole) heroRole.textContent = `${perfilEmoji(u.perfil)} ${perfilLabel(u.perfil)}`;

  const homeContent = document.getElementById('home-dynamic');
  if (!homeContent) return;
  setLoading(homeContent);

  try {
    const aula = await api.getAulaAtiva();

    if (u.perfil === 'gestor') {
      await renderHomeGestor(homeContent, aula);
    } else {
      await renderHomeAluno(homeContent, u, aula);
    }
  } catch (e: any) {
    homeContent.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">Erro ao carregar</div><div class="empty-sub">${e.message}</div></div>`;
  }
}

async function renderHomeGestor(container: HTMLElement, aula: any) {
  const [alunos, est, vol] = await Promise.all([
    api.getPessoas('aluno'),
    api.getPessoas('estagiario'),
    api.getPessoas('voluntario'),
  ]);

  let confs: any[] = [];
  let confirmados = 0;
  if (aula) {
    confs = await api.getConfirmacoes(aula.id);
    confirmados = confs.filter((c: any) => c.status === 'confirmado').length;
  }

  const statConf = document.getElementById('stat-confirmados');
  const statTeam = document.getElementById('stat-equipe');
  const statAlun = document.getElementById('stat-alunos');
  if (statConf) statConf.textContent = String(confirmados);
  if (statTeam) statTeam.textContent = String(est.length + vol.length);
  if (statAlun) statAlun.textContent = String(alunos.length);

  let html = '';
  if (aula) {
    html += `
    <div class="card-title" style="padding:0 16px;margin-top:8px;">📅 Próxima Aula</div>
    <div class="aula-card">
      <div class="aula-title">${aula.titulo}</div>
      <div class="aula-info">📍 ${aula.local}</div>
      <div class="aula-date">🗓 ${fmtDate(aula.data)} às ${String(aula.horario).slice(0,5)}</div>
      ${aula.descricao ? `<div style="margin-top:8px;font-size:13px;opacity:.9;">📝 ${aula.descricao}</div>` : ''}
      <button class="btn btn-danger btn-sm" style="margin-top:12px;" onclick="deleteAula('${aula.id}')">🗑 Cancelar Aula</button>
    </div>`;
  } else {
    html += `<div class="card" style="margin:12px 16px;text-align:center;color:var(--text-light);">
      <div style="font-size:48px;margin-bottom:10px;">📅</div>
      <div style="font-weight:bold;margin-bottom:5px;">Nenhuma aula agendada</div>
      <div style="font-size:13px;margin-bottom:15px;">Clique no botão + para agendar.</div>
      <button class="btn btn-primary" onclick="openModal('modal-nova-aula')">+ Nova Aula</button>
    </div>`;
  }

  if (aula) {
    html += `<div class="card-title" style="padding:0 16px 4px;">👥 Confirmações da Equipe</div>`;
    const grupos = [
      { label: 'Alunos', lista: alunos, perfil: 'aluno' },
      { label: 'Estagiários', lista: est, perfil: 'estagiario' },
      { label: 'Voluntários', lista: vol, perfil: 'voluntario' },
    ];
    for (const g of grupos) {
      if (!g.lista.length) continue;
      html += `<div class="card" style="margin:6px 16px;"><div class="card-title">${g.label}</div>`;
      for (const p of g.lista) {
        const c = confs.find((x: any) => x.pessoa_id === p.id);
        const badge = c?.status === 'confirmado'
          ? '<span class="badge badge-confirm">✅ Confirmado</span>'
          : c?.status === 'nao_vai'
          ? '<span class="badge" style="background:#fce4ec;color:#c62828;">❌ Não vai</span>'
          : '<span class="badge badge-pendente">⏳ Pendente</span>';
        html += `<div class="person-row">
          <div class="avatar avatar-${g.perfil}">${initials(p.nome)}</div>
          <div class="person-info">
            <div class="person-name">${p.nome}</div>
            <div class="person-sub">${p.telefone || ''}</div>
          </div>${badge}</div>`;
      }
      html += `</div>`;
    }
  }

  container.innerHTML = html;
}

async function renderHomeAluno(container: HTMLElement, u: any, aula: any) {
  let conf: any = null;
  if (aula) {
    const confs = await api.getConfirmacoes(aula.id);
    conf = confs.find((c: any) => c.pessoa_id === u.id) || null;
  }

  let html = '';
  if (aula) {
    html += `<div class="aula-card">
      <div class="aula-title">${aula.titulo}</div>
      <div class="aula-info">📍 ${aula.local}</div>
      <div class="aula-date">🗓 ${fmtDate(aula.data)} às ${String(aula.horario).slice(0,5)}</div>
      ${aula.descricao ? `<div style="margin-top:8px;font-size:13px;opacity:.9;">📝 ${aula.descricao}</div>` : ''}
    </div>`;

    const status = conf?.status;
    html += `<div class="card confirm-block">
      <div class="confirm-wave">🏄</div>
      <div style="font-weight:800;font-size:18px;margin-bottom:6px;">Você vai para a aula?</div>
      <div style="color:var(--text-light);font-size:14px;margin-bottom:20px;">${aula.titulo}</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-success" onclick="confirmarPresenca('${aula.id}','${u.id}','confirmado')"
          ${status === 'confirmado' ? 'style="box-shadow:0 0 0 3px #00C853;"' : ''}>✅ Vou!</button>
        <button class="btn btn-danger" onclick="confirmarPresenca('${aula.id}','${u.id}','nao_vai')"
          ${status === 'nao_vai' ? 'style="box-shadow:0 0 0 3px #FF5252;"' : ''}>❌ Não vou</button>
      </div>
      ${status ? `<div style="margin-top:16px;font-size:13px;color:var(--text-light);">
        Sua resposta: <strong>${status === 'confirmado' ? '✅ Confirmado' : '❌ Não vai'}</strong>
        <button class="btn btn-outline btn-sm" style="margin-left:10px;" onclick="deleteMinhaConf('${aula.id}','${u.id}')">Excluir</button>
      </div>` : ''}
    </div>`;
  } else {
    html += `<div class="empty-state">
      <div class="empty-icon">🌊</div>
      <div class="empty-text">Nenhuma aula agendada</div>
      <div class="empty-sub">O gestor ainda não agendou uma aula.</div>
    </div>`;
  }
  container.innerHTML = html;
}

// ==============================================
// RENDER AVISOS
// ==============================================
async function renderAvisos() {
  const u = api.getUsuario();
  if (!u) return;
  const container = document.getElementById('avisos-list');
  const fabAviso  = document.getElementById('fab-aviso');
  if (fabAviso) fabAviso.style.display = u.perfil === 'gestor' ? 'flex' : 'none';
  if (!container) return;
  setLoading(container);

  try {
    const avisos = await api.getAvisos(u.perfil);
    if (!avisos.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Nenhum aviso</div></div>`;
      return;
    }
    container.innerHTML = avisos.map((a: any) => `
      <div class="aviso-card ${a.urgente ? 'urgent' : ''}">
        <div class="aviso-header">
          <div>
            ${a.urgente ? '<span class="badge" style="background:#fce4ec;color:#c62828;margin-bottom:6px;">⚠️ Urgente</span><br>' : ''}
            <div class="aviso-title">${a.titulo}</div>
          </div>
          <div style="text-align:right;">
            <div class="aviso-date">${fmtDate(a.criado_em)}</div>
            <div class="aviso-date">${fmtTime(a.criado_em)}</div>
            ${u.perfil === 'gestor' ? `<button class="btn btn-danger btn-sm" style="margin-top:6px;" onclick="doDeleteAviso('${a.id}')">🗑 Excluir</button>` : ''}
          </div>
        </div>
        <div class="aviso-body">${a.mensagem}</div>
      </div>`).join('');
  } catch (e: any) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">${e.message}</div></div>`;
  }
}

// ==============================================
// RENDER CONFIRMAÇÃO
// ==============================================
async function renderConfirmacao() {
  const u = api.getUsuario();
  if (!u) return;
  const container = document.getElementById('confirmacao-content');
  if (!container) return;
  setLoading(container);

  try {
    const aula = await api.getAulaAtiva();
    if (!aula) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Nenhuma aula ativa</div></div>`;
      return;
    }

    const [confs, pessoas] = await Promise.all([
      api.getConfirmacoes(aula.id),
      api.getPessoas(),
    ]);

    let html = `<div class="aula-card">${aula.titulo}<br>
      <small style="opacity:.8">📍 ${aula.local} | 🗓 ${fmtDate(aula.data)} ${String(aula.horario).slice(0,5)}</small>
    </div>`;

    const grupos = [
      { label: '🏄 Alunos', perfil: 'aluno' },
      { label: '📋 Estagiários', perfil: 'estagiario' },
      { label: '🤝 Voluntários', perfil: 'voluntario' },
    ];

    for (const g of grupos) {
      const lista = pessoas.filter((p: any) => p.perfil === g.perfil);
      if (!lista.length) continue;
      html += `<div class="card" style="margin:8px 16px;"><div class="card-title">${g.label} — ${lista.length}</div>`;
      for (const p of lista) {
        const c = confs.find((x: any) => x.pessoa_id === p.id);
        const myConf = u.id === p.id;
        html += `<div class="person-row">
          <div class="avatar avatar-${p.perfil}">${initials(p.nome)}</div>
          <div class="person-info">
            <div class="person-name">${p.nome}</div>
            <div class="person-sub">${p.telefone || ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            ${c ? `
              <span class="badge ${c.status === 'confirmado' ? 'badge-confirm' : ''}"
                style="${c.status === 'nao_vai' ? 'background:#fce4ec;color:#c62828;' : ''}">
                ${c.status === 'confirmado' ? '✅ Confirmado' : '❌ Não vai'}
              </span>
              ${(myConf || u.perfil === 'gestor') ? `<button class="btn btn-danger btn-sm" onclick="deleteConf('${aula.id}','${p.id}')">🗑 Excluir</button>` : ''}
            ` : `
              <span class="badge badge-pendente">⏳ Pendente</span>
              ${myConf ? `<button class="btn btn-success btn-sm" onclick="confirmarPresenca('${aula.id}','${p.id}','confirmado')">✅ Confirmar</button>` : ''}
            `}
          </div>
        </div>`;
      }
      html += `</div>`;
    }
    container.innerHTML = html;
  } catch (e: any) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">${e.message}</div></div>`;
  }
}

// ==============================================
// RENDER CADASTRO
// ==============================================
async function renderCadastro() {
  const u = api.getUsuario();
  if (!u) return;
  const container = document.getElementById('cadastro-list');
  const sectionTitle = document.getElementById('cadastro-section-title');
  if (!container) return;
  setLoading(container);

  const filterSelect = document.getElementById('cadastro-filter') as HTMLSelectElement;
  const activePerfil = filterSelect?.value || 'aluno';
  if (sectionTitle) sectionTitle.textContent = `Lista de ${perfilLabel(activePerfil)}s`;

  try {
    const lista = await api.getPessoas(activePerfil);
    if (!lista.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">${perfilEmoji(activePerfil)}</div><div class="empty-text">Nenhum ${perfilLabel(activePerfil)}</div><div class="empty-sub">Clique em + para cadastrar.</div></div>`;
      return;
    }
    container.innerHTML = lista.map((p: any) => `
      <div class="person-row">
        <div class="avatar avatar-${p.perfil}">${initials(p.nome)}</div>
        <div class="person-info">
          <div class="person-name">${p.nome}</div>
          <div class="person-sub">📧 ${p.email || '-'}</div>
          <div class="person-sub">📞 ${p.telefone || '-'}</div>
        </div>
        <div class="person-actions">
          <button class="btn btn-danger btn-sm" onclick="doDeletePessoa('${p.id}')">🗑</button>
        </div>
      </div>`).join('');
  } catch (e: any) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">${e.message}</div></div>`;
  }
}

// ==============================================
// GLOBAL ACTIONS
// ==============================================
(window as any).confirmarPresenca = async function(aulaId: string, pessoaId: string, status: string) {
  try {
    await api.confirmar(aulaId, pessoaId, status);
    toast(status === 'confirmado' ? '✅ Presença confirmada!' : '❌ Ausência registrada.');
    renderHome();
    renderConfirmacao();
  } catch (e: any) { toast('❌ ' + e.message, false); }
};

(window as any).deleteConf = async function(aulaId: string, pessoaId: string) {
  if (!confirm('Excluir esta confirmação?')) return;
  try {
    await api.deleteConfirmacao(aulaId, pessoaId);
    toast('🗑 Confirmação excluída.');
    renderConfirmacao(); renderHome();
  } catch (e: any) { toast('❌ ' + e.message, false); }
};

(window as any).deleteMinhaConf = async function(aulaId: string, pessoaId: string) {
  try {
    await api.deleteConfirmacao(aulaId, pessoaId);
    toast('🗑 Confirmação excluída.');
    renderHome();
  } catch (e: any) { toast('❌ ' + e.message, false); }
};

(window as any).doDeleteAviso = async function(id: string) {
  if (!confirm('Excluir este aviso?')) return;
  try {
    await api.deleteAviso(id);
    toast('🗑 Aviso excluído.');
    renderAvisos();
  } catch (e: any) { toast('❌ ' + e.message, false); }
};

(window as any).doDeletePessoa = async function(id: string) {
  if (!confirm('Remover esta pessoa?')) return;
  try {
    await api.deletePessoa(id);
    toast('🗑 Pessoa removida.');
    renderCadastro(); renderHome();
  } catch (e: any) { toast('❌ ' + e.message, false); }
};

(window as any).deleteAula = async function(id: string) {
  if (!confirm('Cancelar esta aula?')) return;
  try {
    await api.deleteAula(id);
    toast('🗑 Aula cancelada.');
    renderHome();
  } catch (e: any) { toast('❌ ' + e.message, false); }
};

(window as any).handleCadastroFilter = function() { renderCadastro(); };

// ==============================================
// FORMS
// ==============================================
function setupForms() {
  // Login
  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const nome   = (document.getElementById('login-nome') as HTMLInputElement)?.value?.trim();
    const perfil = (document.getElementById('login-perfil') as HTMLSelectElement)?.value;
    const senha  = (document.getElementById('login-senha') as HTMLInputElement)?.value;
    if (!nome) { toast('⚠️ Digite seu nome', false); return; }
    try {
      await api.login(nome, perfil, senha);
      initApp();
    } catch (e: any) { toast('❌ ' + e.message, false); }
  });

  // Permitir Enter no campo nome/senha
  ['login-nome', 'login-senha'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter') document.getElementById('btn-login')?.click();
    });
  });

  // Perfil selector
  document.querySelectorAll('.profile-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.profile-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const perfil = (opt as HTMLElement).dataset.perfil || '';
      const sel = document.getElementById('login-perfil') as HTMLSelectElement;
      if (sel) sel.value = perfil;
      const passGroup = document.getElementById('pass-group');
      if (passGroup) passGroup.classList.toggle('hidden', perfil !== 'gestor');
    });
  });

  // Trocar senha
  document.getElementById('btn-salvar-senha')?.addEventListener('click', async () => {
    const nova    = (document.getElementById('nova-senha') as HTMLInputElement)?.value;
    const confirma = (document.getElementById('confirma-senha') as HTMLInputElement)?.value;
    if (!nova || nova.length < 6) { toast('⚠️ Senha mínimo 6 caracteres', false); return; }
    if (nova !== confirma) { toast('⚠️ Senhas não conferem', false); return; }
    try {
      await api.trocarSenha(nova);
      toast('✅ Senha alterada com sucesso!');
      closeModal('modal-senha');
    } catch (e: any) { toast('❌ ' + e.message, false); }
  });

  // Nova aula
  document.getElementById('btn-salvar-aula')?.addEventListener('click', async () => {
    const titulo  = (document.getElementById('aula-titulo') as HTMLInputElement)?.value?.trim();
    const data    = (document.getElementById('aula-data') as HTMLInputElement)?.value;
    const horario = (document.getElementById('aula-horario') as HTMLInputElement)?.value;
    const local   = (document.getElementById('aula-local') as HTMLInputElement)?.value?.trim();
    const descricao = (document.getElementById('aula-desc') as HTMLTextAreaElement)?.value?.trim();
    if (!titulo || !data || !horario || !local) { toast('⚠️ Preencha todos os campos.', false); return; }
    try {
      await api.addAula({ titulo, data, horario, local, descricao });
      toast('✅ Aula agendada!');
      closeModal('modal-nova-aula');
      ['aula-titulo','aula-data','aula-horario','aula-local','aula-desc'].forEach(id => {
        (document.getElementById(id) as HTMLInputElement).value = '';
      });
      renderHome();
    } catch (e: any) { toast('❌ ' + e.message, false); }
  });

  // Novo aviso
  document.getElementById('btn-salvar-aviso')?.addEventListener('click', async () => {
    const titulo   = (document.getElementById('aviso-titulo') as HTMLInputElement)?.value?.trim();
    const mensagem = (document.getElementById('aviso-msg') as HTMLTextAreaElement)?.value?.trim();
    const urgente  = (document.getElementById('aviso-urgente') as HTMLInputElement)?.checked;
    if (!titulo || !mensagem) { toast('⚠️ Preencha título e mensagem.', false); return; }
    try {
      await api.addAviso({ titulo, mensagem, urgente, destinatarios: ['aluno','estagiario','voluntario'] });
      toast('📢 Aviso publicado!');
      closeModal('modal-aviso');
      (document.getElementById('aviso-titulo') as HTMLInputElement).value = '';
      (document.getElementById('aviso-msg') as HTMLTextAreaElement).value = '';
      renderAvisos();
    } catch (e: any) { toast('❌ ' + e.message, false); }
  });

  // Novo cadastro
  document.getElementById('btn-salvar-pessoa')?.addEventListener('click', async () => {
    const nome   = (document.getElementById('cad-nome') as HTMLInputElement)?.value?.trim();
    const perfil = (document.getElementById('cad-perfil') as HTMLSelectElement)?.value;
    if (!nome) { toast('⚠️ Preencha o nome.', false); return; }
    try {
      await api.addPessoa({ nome, perfil });
      toast(`✅ ${perfilLabel(perfil)} cadastrado!`);
      closeModal('modal-cadastro');
      (document.getElementById('cad-nome') as HTMLInputElement).value = '';
      renderCadastro();
    } catch (e: any) { toast('❌ ' + e.message, false); }
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    api.logout();
    showLoginScreen();
  });

  // Fechar modal clicando fora
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) (m as HTMLElement).classList.remove('open'); });
  });
}

// ==============================================
// APP INIT
// ==============================================
function showLoginScreen() {
  document.getElementById('login-screen')!.style.display = 'flex';
  document.getElementById('main-app')!.style.display = 'none';
}

function initApp() {
  const u = api.getUsuario();
  if (!u) { showLoginScreen(); return; }

  document.getElementById('login-screen')!.style.display = 'none';
  document.getElementById('main-app')!.style.display = 'flex';

  const isGestor = u.perfil === 'gestor';
  const headerUser = document.getElementById('header-user-name');
  if (headerUser) headerUser.textContent = u.nome.split(' ')[0];

  document.getElementById('link-trocar-senha')?.classList.toggle('hidden', !isGestor);
  const navCadastro = document.getElementById('nav-cadastro');
  if (navCadastro) navCadastro.style.display = isGestor ? 'flex' : 'none';
  const fabCadastro = document.getElementById('fab-cadastro');
  if (fabCadastro) fabCadastro.style.display = isGestor ? 'flex' : 'none';
  const cadastroFilter = document.getElementById('cadastro-filter-wrap');
  if (cadastroFilter) (cadastroFilter as HTMLElement).style.display = isGestor ? 'block' : 'none';

  showPage('page-home');
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = (btn as HTMLElement).dataset.page;
      if (page) showPage(page);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupForms();
  setupNav();
  const u = api.getUsuario();
  if (u) initApp();
  else showLoginScreen();
});