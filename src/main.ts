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
  window.scrollTo(0, 0);
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  if (id === 'page-home')        renderHome();
  if (id === 'page-avisos')      renderAvisos();
  if (id === 'page-confirmacao') renderConfirmacao();
  if (id === 'page-cadastro')    renderCadastro();
  if (id === "page-equipes") { renderEquipes(); const h = document.querySelector(".hero-strip") as HTMLElement; if(h) h.style.display="none"; }
  else { const h = document.querySelector(".hero-strip") as HTMLElement; if(h) h.style.display=""; }
}

// ==============================================
// RENDER HOME
// ==============================================
async function renderHome() {
  const u = api.getUsuario();
  if (!u) return;

  renderPrevisaoTempo();
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
          <button class="btn btn-primary btn-sm" onclick="editarPessoa('${p.id}','${p.nome}','${p.perfil}','${p.telefone||''}','${p.email||''}')">✏️</button>
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
      const prazo = parseInt((document.getElementById('aula-prazo') as HTMLSelectElement)?.value || '3');
      await api.addAula({ titulo, data, horario, local, descricao, prazo });
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
  const cadPerfil = document.getElementById('cad-perfil') as HTMLSelectElement;
  cadPerfil?.addEventListener('change', () => {
    const wrap = document.getElementById('cad-senha-wrap');
    if (wrap) wrap.style.display = cadPerfil.value === 'gestor' ? 'block' : 'none';
  });
  document.getElementById('btn-salvar-pessoa')?.addEventListener('click', async () => {
    const nome    = (document.getElementById('cad-nome') as HTMLInputElement)?.value?.trim();
    const perfil  = (document.getElementById('cad-perfil') as HTMLSelectElement)?.value;
    const tel     = (document.getElementById('cad-tel') as HTMLInputElement)?.value?.trim();
    const email   = (document.getElementById('cad-email') as HTMLInputElement)?.value?.trim();
    const senha   = (document.getElementById('cad-senha') as HTMLInputElement)?.value?.trim();
    const editId  = (document.getElementById('cad-edit-id') as HTMLInputElement)?.value?.trim();

    if (!nome) { toast('⚠️ Preencha o nome.', false); return; }
    if (perfil === 'gestor' && !editId && !senha) { toast('⚠️ Informe a senha do gestor.', false); return; }

    try {
      if (editId) {
        await api.updatePessoa(editId, { nome, perfil, telefone: tel, email, senha: senha || undefined });
        toast('✅ Cadastro atualizado!');
      } else {
        await api.addPessoa({ nome, perfil, telefone: tel, email, senha });
        toast('✅ ' + perfilLabel(perfil) + ' cadastrado!');
      }
      closeModal('modal-cadastro');
      // Limpar campos
      (document.getElementById('cad-nome') as HTMLInputElement).value = '';
      (document.getElementById('cad-tel') as HTMLInputElement).value = '';
      (document.getElementById('cad-email') as HTMLInputElement).value = '';
      (document.getElementById('cad-senha') as HTMLInputElement).value = '';
      (document.getElementById('cad-edit-id') as HTMLInputElement).value = '';
      const btnCancelar = document.getElementById('btn-cancelar-edicao');
      if (btnCancelar) btnCancelar.style.display = 'none';
      const titleModal = document.getElementById('modal-cadastro-title');
      if (titleModal) titleModal.textContent = '👤 Novo Cadastro';
      const btnSalvarS = document.getElementById('btn-salvar-pessoa');
      if (btnSalvarS) btnSalvarS.textContent = '✅ Cadastrar';
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
  setupEquipeForm();
  setupNav();
  const u = api.getUsuario();
  if (u) initApp();
  else showLoginScreen();
});
// ==============================================
// EQUIPES
// ==============================================
async function renderEquipes() {
  const u = api.getUsuario();
  if (!u) return;
  const container = document.getElementById('equipes-content');
  const fab = document.getElementById('fab-equipe');
  const sub = document.getElementById('equipes-sub');
  if (!container) return;
  if (fab) fab.style.display = u.perfil === 'gestor' ? 'flex' : 'none';
  setLoading(container);

  try {
    const aula = await api.getAulaAtiva();
    if (!aula) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Nenhuma aula ativa</div><div class="empty-sub">Agende uma aula primeiro.</div></div>`;
      return;
    }
    if (sub) sub.textContent = `Equipes da aula: ${aula.titulo}`;

    if (u.perfil !== "gestor") {
      const heroStrip = document.querySelector(".hero-strip") as HTMLElement;
      if (heroStrip) heroStrip.style.display = "none";
      // Mostra apenas a equipe do usuário
      const minhaEquipe = await api.getMinhaEquipe(aula.id, u.id);
      if (!minhaEquipe) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-text">Você ainda não foi alocado</div><div class="empty-sub">Aguarde o gestor montar as equipes.</div></div>`;
        return;
      }
      container.innerHTML = renderEquipeCard(minhaEquipe, u, aula);
      return;
    }

    // Gestor vê todas as equipes
    const equipes = await api.getEquipes(aula.id);

    // Quem confirmou mas não está em equipe
    const todasPessoas = await api.getPessoas();
    const confirmados = todasPessoas.filter((c: any) => c.perfil !== "gestor");
    const alocados = new Set(equipes.flatMap((e: any) => e.membros.map((m: any) => m.pessoa_id)));
    const semEquipe = confirmados.filter((c: any) => !alocados.has(c.pessoa_id));

    let html = '';

    if (semEquipe.length) {
      html += `<div class="card" style="margin:8px 16px;border-left:4px solid var(--sun);">
        <div class="card-title">⚠️ Confirmados sem equipe — ${semEquipe.length}</div>`;
      for (const c of semEquipe) {
        const emoji = c.perfil === 'aluno' ? '🏄' : c.perfil === 'estagiario' ? '📋' : '🤝';
        html += `<div class="person-row">
          <div class="avatar avatar-${c.perfil}" style="font-size:18px;">${emoji}</div>
          <div class="person-info"><div class="person-name">${c.nome}</div><div class="person-sub">${c.perfil}</div></div>
        </div>`;
      }
      html += `</div>`;
    }

    if (!equipes.length) {
      html += `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-text">Nenhuma equipe criada</div><div class="empty-sub">Clique em + para montar a primeira equipe.</div></div>`;
    } else {
      for (const eq of equipes) {
        html += renderEquipeCard(eq, u, aula);
      }
    }
    container.innerHTML = html;
  } catch(e: any) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">${e.message}</div></div>`;
  }
}

function renderEquipeCard(eq: any, u: any, aula: any): string {
  const alunos = eq.membros.filter((m: any) => m.papel === 'aluno');
  const estagiarios = eq.membros.filter((m: any) => m.papel === 'estagiario');
  const voluntarios = eq.membros.filter((m: any) => m.papel === 'voluntario');
  const isGestor = u.perfil === 'gestor';
  const isEstagiario = u.perfil === 'estagiario';

  return `<div class="card" style="margin:8px 16px;border-left:4px solid var(--wave);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-family:var(--font-display);font-size:20px;">🤝 ${eq.nome}</div>
      <div style="display:flex;gap:6px;">
        ${isEstagiario ? `<button class="btn btn-primary btn-sm" onclick="gerarPDF('${eq.id}','${aula.id}')">📄 PDF</button>` : ''}
        ${isGestor ? `
          <button class="btn btn-primary btn-sm" onclick="editarEquipe('${eq.id}','${aula.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="doDeleteEquipe('${eq.id}')">🗑</button>
          <button class="btn btn-success btn-sm" onclick="gerarPDF('${eq.id}','${aula.id}')">📄 PDF</button>
        ` : ''}
      </div>
    </div>
    ${alunos.length ? `<div class="card-title">🏄 Alunos (${alunos.length})</div>
      ${alunos.map((m: any) => `<div class="person-row">
        <div class="avatar avatar-aluno" style="width:36px;height:36px;font-size:13px;">${m.nome.split(' ').map((w:any)=>w[0]).slice(0,2).join('').toUpperCase()}</div>
        <div class="person-info"><div class="person-name">${m.nome}</div></div>
      </div>`).join('')}` : ''}
    ${estagiarios.length ? `<div class="card-title" style="margin-top:10px;">📋 Estagiários (${estagiarios.length})</div>
      ${estagiarios.map((m: any) => `<div class="person-row">
        <div class="avatar avatar-estagiario" style="width:36px;height:36px;font-size:13px;">${m.nome.split(' ').map((w:any)=>w[0]).slice(0,2).join('').toUpperCase()}</div>
        <div class="person-info"><div class="person-name">${m.nome}</div></div>
      </div>`).join('')}` : ''}
    ${voluntarios.length ? `<div class="card-title" style="margin-top:10px;">🤝 Voluntários (${voluntarios.length})</div>
      ${voluntarios.map((m: any) => `<div class="person-row">
        <div class="avatar avatar-voluntario" style="width:36px;height:36px;font-size:13px;">${m.nome.split(' ').map((w:any)=>w[0]).slice(0,2).join('').toUpperCase()}</div>
        <div class="person-info"><div class="person-name">${m.nome}</div></div>
      </div>`).join('')}` : ''}
  </div>`;
}

// Abrir modal para nova equipe
(window as any).abrirNovaEquipe = async function(aulaId: string) {
  (document.getElementById('equipe-edit-id') as HTMLInputElement).value = '';
  (document.getElementById('equipe-nome') as HTMLInputElement).value = '';
  const title = document.getElementById('modal-equipe-title');
  if (title) title.textContent = '🤝 Nova Equipe';
  await carregarMembrosSeletor(aulaId, []);
  openModal('modal-nova-equipe');
};

// Abrir modal para editar equipe
(window as any).editarEquipe = async function(equipeId: string, aulaId: string) {
  try {
    const equipes = await api.getEquipes(aulaId);
    const eq = equipes.find((e: any) => e.id === equipeId);
    if (!eq) return;
    (document.getElementById('equipe-edit-id') as HTMLInputElement).value = equipeId;
    (document.getElementById('equipe-nome') as HTMLInputElement).value = eq.nome;
    const title = document.getElementById('modal-equipe-title');
    if (title) title.textContent = '✏️ Editar Equipe';
    await carregarMembrosSeletor(aulaId, eq.membros.map((m: any) => m.pessoa_id));
    openModal('modal-nova-equipe');
  } catch(e: any) { toast('❌ ' + e.message, false); }
};

async function carregarMembrosSeletor(aulaId: string, selecionados: string[]) {
  const lista = document.getElementById('equipe-membros-lista');
  if (!lista) return;
  lista.innerHTML = '<div style="padding:10px;color:var(--text-light);">Carregando...</div>';
  try {
    const todasPessoas = await api.getPessoas();
    const confirmados = todasPessoas.filter((c: any) => c.perfil !== "gestor");
    if (!confirmados.length) {
      lista.innerHTML = '<div style="padding:10px;color:var(--text-light);">Nenhum confirmado ainda.</div>';
      return;
    }
    const grupos: Record<string, any[]> = { aluno: [], estagiario: [], voluntario: [] };
    for (const c of confirmados) {
      if (grupos[c.perfil]) grupos[c.perfil].push(c);
    }
    const labels: Record<string, string> = { aluno: '🏄 Alunos', estagiario: '📋 Estagiários', voluntario: '🤝 Voluntários' };
    let html = '';
    for (const [perfil, pessoas] of Object.entries(grupos)) {
      if (!pessoas.length) continue;
      html += `<div style="font-weight:800;font-size:12px;text-transform:uppercase;color:var(--text-light);margin:12px 0 6px;">${labels[perfil]}</div>`;
      for (const p of pessoas) {
        const checked = selecionados.includes(p.id) ? 'checked' : '';
        html += `<label style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:var(--page-bg);">
          <input type="checkbox" value="${p.id}" data-perfil="${perfil}" ${checked} style="width:18px;height:18px;">
          <span>${p.nome}</span>
        </label>`;
      }
    }
    lista.innerHTML = html;
  } catch(e: any) { lista.innerHTML = `<div style="color:red;">${e.message}</div>`; }
}

(window as any).doDeleteEquipe = async function(id: string) {
  if (!confirm('Excluir esta equipe?')) return;
  try {
    await api.deleteEquipe(id);
    toast('🗑 Equipe excluída.');
    renderEquipes();
  } catch(e: any) { toast('❌ ' + e.message, false); }
};

// PDF lista de presença
(window as any).gerarPDF = async function(equipeId: string, aulaId: string) {
  try {
    const [equipes, aulaResp] = await Promise.all([
      api.getEquipes(aulaId),
      api.getAulaAtiva()
    ]);
    const eq = equipes.find((e: any) => e.id === equipeId);
    const aula = aulaResp;
    if (!eq || !aula) { toast('❌ Dados não encontrados', false); return; }

    const alunos = eq.membros.filter((m: any) => m.papel === 'aluno');
    const estagiarios = eq.membros.filter((m: any) => m.papel === 'estagiario');
    const voluntarios = eq.membros.filter((m: any) => m.papel === 'voluntario');

    const dataFormatada = new Date(aula.data).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

    const linhasAlunos = alunos.map((a: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${a.nome}</td>
        <td style="border-bottom:1px solid #ccc;min-width:180px;">&nbsp;</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Lista de Presença — ${eq.nome}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 3px solid #0a2540; padding-bottom: 20px; margin-bottom: 24px; }
      .header img { height: 80px; margin-bottom: 10px; }
      .header h1 { font-size: 22px; margin: 0; color: #0a2540; }
      .header h2 { font-size: 16px; margin: 6px 0 0; font-weight: normal; color: #555; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; background: #f5f8ff; padding: 16px; border-radius: 8px; }
      .info-item label { font-size: 11px; text-transform: uppercase; color: #777; display: block; }
      .info-item span { font-weight: bold; font-size: 15px; }
      .equipe-info { background: #0a2540; color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
      .equipe-info h3 { margin: 0 0 8px; font-size: 16px; }
      .equipe-membros { font-size: 13px; opacity: 0.85; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th { background: #0a2540; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
      td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .assinatura-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .assinatura-box { text-align: center; }
      .assinatura-linha { border-top: 1px solid #333; margin-bottom: 6px; margin-top: 50px; }
      .assinatura-label { font-size: 12px; color: #555; }
      .rodape { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <div class="header">
      <img src="/logo parasurf.jpeg" alt="Instituto ParaSurf" onerror="this.style.display='none'">
      <h1>Instituto ParaSurf</h1>
      <h2>Lista de Presença — Surf Adaptado</h2>
    </div>
    <div class="info-grid">
      <div class="info-item"><label>Aula</label><span>${aula.titulo}</span></div>
      <div class="info-item"><label>Data</label><span>${dataFormatada}</span></div>
      <div class="info-item"><label>Horário</label><span>${String(aula.horario).slice(0,5)}</span></div>
      <div class="info-item"><label>Local</label><span>${aula.local}</span></div>
    </div>
    <div class="equipe-info">
      <h3>🤝 ${eq.nome}</h3>
      <div class="equipe-membros">
        ${estagiarios.map((e: any) => `📋 ${e.nome}`).join(' &nbsp;|&nbsp; ')}
        ${voluntarios.length ? '&nbsp;&nbsp;' + voluntarios.map((v: any) => `🤝 ${v.nome}`).join(' &nbsp;|&nbsp; ') : ''}
      </div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Nome do Aluno</th><th>Assinatura</th></tr></thead>
      <tbody>${linhasAlunos || '<tr><td colspan="3" style="text-align:center;color:#aaa;">Nenhum aluno nesta equipe</td></tr>'}</tbody>
    </table>
    <div class="assinatura-area">
      ${estagiarios.map((e: any) => `
        <div class="assinatura-box">
          <div class="assinatura-linha"></div>
          <div class="assinatura-label">${e.nome}<br>Estagiário(a)</div>
        </div>`).join('')}
      <div class="assinatura-box">
        <div class="assinatura-linha"></div>
        <div class="assinatura-label">Responsável / Gestor<br>Instituto ParaSurf</div>
      </div>
    </div>
    <div class="rodape">Instituto ParaSurf · Vila Velha, ES · +55 27 98866-8868 · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
    <script>window.onload = () => window.print();<\/script>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch(e: any) { toast('❌ Erro ao gerar PDF: ' + e.message, false); }
};

// Setup form equipe
function setupEquipeForm() {
  document.getElementById('btn-salvar-equipe')?.addEventListener('click', async () => {
    const nome = (document.getElementById('equipe-nome') as HTMLInputElement)?.value?.trim();
    const editId = (document.getElementById('equipe-edit-id') as HTMLInputElement)?.value;
    if (!nome) { toast('⚠️ Digite o nome da equipe', false); return; }

    const checkboxes = document.querySelectorAll('#equipe-membros-lista input[type=checkbox]:checked');
    const membros = Array.from(checkboxes).map((cb: any) => ({
      pessoa_id: cb.value,
      papel: (cb as HTMLElement).getAttribute("data-perfil")
    }));
    if (!membros.length) { toast('⚠️ Selecione ao menos um membro', false); return; }

    try {
      const aula = await api.getAulaAtiva();
      if (!aula) { toast('⚠️ Nenhuma aula ativa', false); return; }

      if (editId) {
        await api.updateEquipe(editId, { nome, membros });
        toast('✅ Equipe atualizada!');
      } else {
        await api.addEquipe({ nome, aula_id: aula.id, membros });
        toast('✅ Equipe criada!');
      }
      closeModal('modal-nova-equipe');
      renderEquipes();
    } catch(e: any) { toast('❌ ' + e.message, false); }
  });

  // FAB equipe
  document.getElementById('fab-equipe')?.addEventListener('click', async () => {
    const aula = await api.getAulaAtiva();
    if (!aula) { toast('⚠️ Nenhuma aula ativa', false); return; }
    (window as any).abrirNovaEquipe(aula.id);
  });
  // Sobrescrever o onclick do FAB
  const fab = document.getElementById('fab-equipe');
  if (fab) {
    fab.removeAttribute('onclick');
    fab.addEventListener('click', async () => {
      const aula = await api.getAulaAtiva();
      if (!aula) { toast('⚠️ Nenhuma aula ativa', false); return; }
      (window as any).abrirNovaEquipe(aula.id);
    });
  }
}

(window as any).editarPessoa = function(id: string, nome: string, perfil: string, tel: string, email: string) {
  (document.getElementById('cad-edit-id') as HTMLInputElement).value = id;
  (document.getElementById('cad-nome') as HTMLInputElement).value = nome;
  (document.getElementById('cad-tel') as HTMLInputElement).value = tel;
  (document.getElementById('cad-email') as HTMLInputElement).value = email;
  (document.getElementById('cad-perfil') as HTMLSelectElement).value = perfil;
  const btnSalvar = document.getElementById('btn-salvar-pessoa');
  if (btnSalvar) btnSalvar.textContent = '💾 Salvar Alterações';
  const btnCancelar = document.getElementById('btn-cancelar-edicao');
  if (btnCancelar) btnCancelar.style.display = 'block';
  const title = document.getElementById('modal-cadastro-title');
  if (title) title.textContent = '✏️ Editar Cadastro';
  const senhaWrap = document.getElementById('cad-senha-wrap');
  if (senhaWrap) senhaWrap.style.display = perfil === 'gestor' ? 'block' : 'none';
  openModal('modal-cadastro');
};

(window as any).cancelarEdicaoPessoa = function() {
  (document.getElementById('cad-edit-id') as HTMLInputElement).value = '';
  (document.getElementById('cad-nome') as HTMLInputElement).value = '';
  (document.getElementById('cad-tel') as HTMLInputElement).value = '';
  (document.getElementById('cad-email') as HTMLInputElement).value = '';
  const btnCancelar = document.getElementById('btn-cancelar-edicao');
  if (btnCancelar) btnCancelar.style.display = 'none';
  const title = document.getElementById('modal-cadastro-title');
  if (title) title.textContent = '👤 Novo Cadastro';
  closeModal('modal-cadastro');
};

// ==============================================
// RELATÓRIO
// ==============================================
let _dadosRelatorio: any = null;

async function renderRelatorio() {
  const u = api.getUsuario();
  if (!u || u.perfil !== 'gestor') return;
  // Esconder nav relatorio para não gestores (já feito no initApp)
}

(window as any).gerarRelatorio = async function() {
  const inicio = (document.getElementById('rel-data-inicio') as HTMLInputElement)?.value;
  const fim    = (document.getElementById('rel-data-fim') as HTMLInputElement)?.value;
  const perfil = (document.getElementById('rel-perfil') as HTMLSelectElement)?.value;
  const container = document.getElementById('relatorio-content');
  const fabPDF    = document.getElementById('fab-relatorio-pdf');

  if (!inicio || !fim) { toast('⚠️ Selecione data início e fim.', false); return; }
  if (inicio > fim)    { toast('⚠️ Data início maior que data fim.', false); return; }

  if (container) setLoading(container, 'Gerando relatório...');

  try {
    const dados = await api.getRelatorioPresencas(inicio, fim, perfil);
    _dadosRelatorio = dados;
    if (fabPDF) fabPDF.style.display = dados.relatorio.length ? 'flex' : 'none';

    if (!dados.total_aulas) {
      if (container) container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Nenhuma aula no período</div><div class="empty-sub">${fmtDateStr(inicio)} até ${fmtDateStr(fim)}</div></div>`;
      return;
    }

    const pLabel: Record<string,string> = { aluno:'🏄 Aluno', estagiario:'📋 Estagiário', voluntario:'🤝 Voluntário' };
    let html = '';

    // Resumo geral
    const totalConf  = dados.relatorio.reduce((a: number, p: any) => a + p.confirmados, 0);
    const totalFalta = dados.relatorio.reduce((a: number, p: any) => a + p.faltas, 0);
    const totalPend  = dados.relatorio.reduce((a: number, p: any) => a + p.pendentes, 0);

    html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:8px 16px;">
      <div style="background:white;border-radius:12px;padding:14px;text-align:center;box-shadow:var(--shadow);border-top:3px solid var(--green-go);">
        <div style="font-size:24px;font-weight:800;color:var(--green-go);">${totalConf}</div>
        <div style="font-size:11px;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px;">Presenças</div>
      </div>
      <div style="background:white;border-radius:12px;padding:14px;text-align:center;box-shadow:var(--shadow);border-top:3px solid var(--coral);">
        <div style="font-size:24px;font-weight:800;color:var(--coral);">${totalFalta}</div>
        <div style="font-size:11px;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px;">Faltas</div>
      </div>
      <div style="background:white;border-radius:12px;padding:14px;text-align:center;box-shadow:var(--shadow);border-top:3px solid var(--sun);">
        <div style="font-size:24px;font-weight:800;color:var(--sun);">${totalPend}</div>
        <div style="font-size:11px;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px;">Pendentes</div>
      </div>
    </div>`;

    html += `<div style="padding:4px 16px 8px;font-size:13px;color:var(--text-light);">
      📅 ${dados.total_aulas} aula(s) entre ${fmtDateStr(inicio)} e ${fmtDateStr(fim)}
    </div>`;

    // Por perfil
    const grupos: Record<string, any[]> = { aluno:[], estagiario:[], voluntario:[] };
    for (const p of dados.relatorio) {
      if (grupos[p.perfil]) grupos[p.perfil].push(p);
    }

    for (const [perf, lista] of Object.entries(grupos)) {
      if (!lista.length) continue;
      html += `<div class="card-title" style="padding:8px 16px 4px;">${pLabel[perf] || perf}</div>`;
      html += `<div class="card" style="margin:4px 16px 12px;padding:0;">`;

      for (const p of lista) {
        const pct = dados.total_aulas > 0 ? Math.round((p.confirmados / dados.total_aulas) * 100) : 0;
        const barColor = pct >= 75 ? 'var(--green-go)' : pct >= 50 ? 'var(--sun)' : 'var(--coral)';
        html += `<div style="padding:14px 16px;border-bottom:1px solid #f0f4f8;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div>
              <div style="font-weight:700;font-size:15px;">${p.nome}</div>
              <div style="font-size:12px;color:var(--text-light);">
                ✅ ${p.confirmados} presença(s) · ❌ ${p.faltas} falta(s) · ⏳ ${p.pendentes} pendente(s)
              </div>
            </div>
            <div style="font-family:var(--font-display);font-size:22px;color:${barColor};">${pct}%</div>
          </div>
          <div style="background:#e0e8f0;border-radius:4px;height:6px;">
            <div style="background:${barColor};width:${pct}%;height:6px;border-radius:4px;transition:width .5s;"></div>
          </div>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
            ${p.presencas.map((a: any) => {
              const cor = a.status === 'confirmado' ? '#e8f5e9' : a.status === 'nao_vai' ? '#fce4ec' : '#fff8e1';
              const icone = a.status === 'confirmado' ? '✅' : a.status === 'nao_vai' ? '❌' : '⏳';
              return `<span style="background:${cor};padding:2px 8px;border-radius:10px;font-size:10px;" title="${a.aula_titulo} — ${fmtDateStr(a.aula_data)}">${icone} ${fmtDateStr(a.aula_data)}</span>`;
            }).join('')}
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    if (container) container.innerHTML = html;
  } catch (e: any) {
    if (container) container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-text">${e.message}</div></div>`;
  }
};

function fmtDateStr(d: string): string {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return d; }
}

// Gerar PDF do relatório
(window as any).gerarRelatorioPDF = function() {
  if (!_dadosRelatorio) return;
  const dados = _dadosRelatorio;
  const inicio = (document.getElementById('rel-data-inicio') as HTMLInputElement)?.value;
  const fim    = (document.getElementById('rel-data-fim') as HTMLInputElement)?.value;
  const pLabel: Record<string,string> = { aluno:'Aluno', estagiario:'Estagiário', voluntario:'Voluntário' };

  let linhas = '';
  for (const p of dados.relatorio) {
    const pct = dados.total_aulas > 0 ? Math.round((p.confirmados / dados.total_aulas) * 100) : 0;
    const cor = pct >= 75 ? '#00C853' : pct >= 50 ? '#FFB300' : '#FF5252';
    linhas += `<tr>
      <td>${p.nome}</td>
      <td style="text-align:center;">${pLabel[p.perfil]||p.perfil}</td>
      <td style="text-align:center;color:#00C853;font-weight:bold;">${p.confirmados}</td>
      <td style="text-align:center;color:#FF5252;font-weight:bold;">${p.faltas}</td>
      <td style="text-align:center;color:#FFB300;">${p.pendentes}</td>
      <td style="text-align:center;font-weight:bold;color:${cor};">${pct}%</td>
    </tr>`;
  }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Relatório de Presenças</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; color: #111; max-width: 900px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px solid #0a2540; padding-bottom: 16px; margin-bottom: 20px; }
    .header img { height: 70px; margin-bottom: 8px; }
    .header h1 { font-size: 20px; margin: 0; color: #0a2540; }
    .header h2 { font-size: 14px; font-weight: normal; color: #555; margin: 4px 0 0; }
    .resumo { display: flex; gap: 16px; margin-bottom: 24px; }
    .resumo-card { flex: 1; text-align: center; padding: 14px; border-radius: 8px; }
    .resumo-card .num { font-size: 28px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0a2540; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .rodape { margin-top: 30px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { padding: 10px; } }
  </style></head><body>
  <div class="header">
    <img src="/logo parasurf.jpeg" onerror="this.style.display='none'" alt="Logo">
    <h1>Instituto ParaSurf — Relatório de Presenças</h1>
    <h2>Período: ${fmtDateStr(inicio)} até ${fmtDateStr(fim)} · ${dados.total_aulas} aula(s)</h2>
  </div>
  <div class="resumo">
    <div class="resumo-card" style="background:#e8f5e9;">
      <div class="num" style="color:#00C853;">${dados.relatorio.reduce((a:number,p:any)=>a+p.confirmados,0)}</div>
      <div>Presenças</div>
    </div>
    <div class="resumo-card" style="background:#fce4ec;">
      <div class="num" style="color:#FF5252;">${dados.relatorio.reduce((a:number,p:any)=>a+p.faltas,0)}</div>
      <div>Faltas</div>
    </div>
    <div class="resumo-card" style="background:#fff8e1;">
      <div class="num" style="color:#FFB300;">${dados.relatorio.reduce((a:number,p:any)=>a+p.pendentes,0)}</div>
      <div>Pendentes</div>
    </div>
    <div class="resumo-card" style="background:#e3f2fd;">
      <div class="num" style="color:#1565C0;">${dados.relatorio.length}</div>
      <div>Participantes</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Nome</th><th>Perfil</th><th>Presenças</th><th>Faltas</th><th>Pendentes</th><th>%</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="rodape">Instituto ParaSurf · Vila Velha, ES · +55 27 98866-8868 · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  <script>window.onload = () => window.print();<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
};

// ==============================================
// PREVISÃO DO TEMPO
// ==============================================
function weatherCode(code: number): { icon: string; desc: string } {
  if (code === 0)                    return { icon: '☀️',  desc: 'Céu limpo' };
  if (code <= 2)                     return { icon: '🌤️', desc: 'Poucas nuvens' };
  if (code === 3)                    return { icon: '☁️',  desc: 'Nublado' };
  if (code <= 49)                    return { icon: '🌫️', desc: 'Névoa' };
  if (code <= 59)                    return { icon: '🌦️', desc: 'Chuvisco' };
  if (code <= 69)                    return { icon: '🌧️', desc: 'Chuva' };
  if (code <= 79)                    return { icon: '🌨️', desc: 'Neve' };
  if (code <= 84)                    return { icon: '🌦️', desc: 'Pancadas' };
  if (code <= 99)                    return { icon: '⛈️',  desc: 'Trovoada' };
  return { icon: '🌡️', desc: 'Variável' };
}

const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

async function renderPrevisaoTempo() {
  const container = document.getElementById('previsao-tempo');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:10px;color:var(--text-light);font-size:13px;">🌤️ Carregando previsão...</div>`;

  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-20.3297&longitude=-40.2922&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=America/Sao_Paulo&forecast_days=7';
    const resp = await fetch(url);
    const data = await resp.json();
    const d = data.daily;

    let html = `<div style="padding:0 16px 4px;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-light);margin-bottom:8px;">
        📍 Vila Velha, ES — Previsão da Semana
      </div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;">`;

    for (let i = 0; i < d.time.length; i++) {
      const date    = new Date(d.time[i] + 'T12:00:00');
      const diaNome = DIAS[date.getDay()];
      const diaN    = date.getDate();
      const w       = weatherCode(d.weathercode[i]);
      const chuva   = d.precipitation_probability_max[i];
      const tmax    = Math.round(d.temperature_2m_max[i]);
      const tmin    = Math.round(d.temperature_2m_min[i]);
      const isHoje  = i === 0;
      const chuvaColor = chuva >= 70 ? '#1565C0' : chuva >= 40 ? '#0097A7' : '#90a4ae';

      html += `<div style="
        min-width:72px;flex-shrink:0;
        background:${isHoje ? 'linear-gradient(135deg,var(--ocean-mid),var(--wave))' : 'white'};
        border-radius:12px;padding:10px 6px;text-align:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.08);
        border:${isHoje ? '2px solid var(--bright)' : '1px solid #e0e8f0'};
      ">
        <div style="font-size:11px;font-weight:${isHoje?'800':'600'};color:${isHoje?'rgba(255,255,255,0.9)':'var(--text-light)'};margin-bottom:2px;">${isHoje ? 'Hoje' : diaNome}</div>
        <div style="font-size:10px;color:${isHoje?'rgba(255,255,255,0.7)':'#b0bec5'};margin-bottom:6px;">${diaN}</div>
        <div style="font-size:24px;line-height:1;margin-bottom:6px;">${w.icon}</div>
        <div style="font-size:13px;font-weight:800;color:${isHoje?'var(--sun)':'var(--coral)'};">${tmax}°</div>
        <div style="font-size:11px;color:${isHoje?'rgba(255,255,255,0.7)':'var(--text-light)'};">${tmin}°</div>
        <div style="font-size:10px;color:${isHoje?'rgba(255,255,255,0.8)':chuvaColor};margin-top:4px;">💧${chuva}%</div>
      </div>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:8px;color:var(--text-light);font-size:12px;">Previsão indisponível</div>`;
  }
}
