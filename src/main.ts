// =============================================
// Instituto ParaSurf — Main App Controller
// =============================================
import { store } from './app/services/store';
import type { PerfilTipo, Pessoa } from './app/models';

// ---- Helpers ----
function fmt(date: string): string {
  try {
    return new Date(date).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return date; }
}
function fmtTime(date: string): string {
  try {
    return new Date(date).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  } catch { return ''; }
}
function perfilLabel(p: PerfilTipo): string {
  const map: Record<PerfilTipo,string> = { professor:'Gestor', aluno:'Aluno', estagiario:'Estagiário', voluntario:'Voluntário' };
  return map[p];
}
function perfilEmoji(p: PerfilTipo): string {
  const map: Record<PerfilTipo,string> = { professor:'🏢', aluno:'🏄', estagiario:'📋', voluntario:'🤝' };
  return map[p];
}
function initials(name: string): string {
  return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
}

// ---- Toast ----
function toast(msg: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el!.classList.remove('show'), 2800);
}

// ---- Navigation ----
function showPage(id: string) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${id}"]`);
  if (nav) nav.classList.add('active');
  // Render dynamic content
  if (id === 'page-home') renderHome();
  if (id === 'page-avisos') renderAvisos();
  if (id === 'page-confirmacao') renderConfirmacao();
  if (id === 'page-cadastro') renderCadastro();
}

// ---- Modal ----
function openModal(id: string) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id: string) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// ==============================================
// RENDER FUNCTIONS
// ==============================================

function renderHome() {
  const u = store.getUsuario();
  if (!u) return;

  // Update hero
  const heroName = document.getElementById('hero-name');
  const heroRole = document.getElementById('hero-role');
  if (heroName) heroName.textContent = u.nome.split(' ')[0];
  if (heroRole) heroRole.textContent = `${perfilEmoji(u.perfil)} ${perfilLabel(u.perfil)}`;

  // Render based on profile
  const homeContent = document.getElementById('home-dynamic');
  if (!homeContent) return;

  if (u.perfil === 'professor') {
    renderHomeProfessor(homeContent);
  } else {
    renderHomeAluno(homeContent, u);
  }
}

function renderHomeProfessor(container: HTMLElement) {
  const aula = store.getAulaAtiva();
  const pessoas = store.getPessoas();
  const alunos = store.getPessoas('aluno');
  const est    = store.getPessoas('estagiario');
  const vol    = store.getPessoas('voluntario');

  let confirmStats = { confirmados: 0, total: 0 };
  if (aula) {
    const confs = store.getConfirmacoes(aula.id);
    confirmStats.total = alunos.length + est.length + vol.length;
    confirmStats.confirmados = confs.filter(c => c.status === 'confirmado').length;
  }

  // Update stat numbers
  const statConf = document.getElementById('stat-confirmados');
  const statTeam = document.getElementById('stat-equipe');
  const statAlun = document.getElementById('stat-alunos');
  if (statConf) statConf.textContent = String(confirmStats.confirmados);
  if (statTeam) statTeam.textContent = String(est.length + vol.length);
  if (statAlun) statAlun.textContent = String(alunos.length);

  // Aula card com botão de nova aula
  let html = '';
  if (aula) {
    html += `
    <div class="card-title" style="padding:0 16px;margin-top:8px;">📅 Próxima Aula</div>
    <div class="aula-card">
      <div class="aula-title">${aula.titulo}</div>
      <div class="aula-info">📍 ${aula.local}</div>
      <div class="aula-date">🗓 ${fmt(aula.data)} às ${aula.horario}</div>
      ${aula.descricao ? `<div class="aula-desc" style="margin-top:10px; font-size:13px; opacity:0.9;">📝 ${aula.descricao}</div>` : ''}
    </div>`;
  } else {
    html += `<div class="card" style="margin:12px 16px;text-align:center;color:var(--text-light);">
      <div style="font-size:48px; margin-bottom:10px;">📅</div>
      <div style="font-weight:bold; margin-bottom:5px;">Nenhuma aula agendada</div>
      <div style="font-size:13px; margin-bottom:15px;">Clique no botão + para agendar uma nova aula.</div>
      <button class="btn btn-primary" onclick="openModal('modal-nova-aula')">+ Nova Aula</button>
    </div>`;
  }

  // Team overview
  if (aula) {
    const confs = store.getConfirmacoes(aula.id);
    html += `<div class="card-title" style="padding:0 16px 4px;">👥 Confirmações da Equipe</div>`;

    const grupos: Array<{label:string; lista: typeof alunos; perfil: PerfilTipo}> = [
      { label:'Alunos', lista:alunos, perfil:'aluno' },
      { label:'Estagiários', lista:est, perfil:'estagiario' },
      { label:'Voluntários', lista:vol, perfil:'voluntario' },
    ];
    for (const g of grupos) {
      if (!g.lista.length) continue;
      html += `<div class="card" style="margin:6px 16px;">
        <div class="card-title">${g.label}</div>`;
      for (const p of g.lista) {
        const c = confs.find(x => x.pessoaId === p.id);
        const statusBadge = c?.status === 'confirmado'
          ? '<span class="badge badge-confirm">✅ Confirmado</span>'
          : c?.status === 'nao_vai'
          ? '<span class="badge" style="background:#fce4ec;color:#c62828;">❌ Não vai</span>'
          : '<span class="badge badge-pendente">⏳ Pendente</span>';
        html += `<div class="person-row">
          <div class="avatar avatar-${g.perfil}">${initials(p.nome)}</div>
          <div class="person-info">
            <div class="person-name">${p.nome}</div>
            <div class="person-sub">${p.telefone}</div>
          </div>
          ${statusBadge}
        </div>`;
      }
      html += `</div>`;
    }
  }

  container.innerHTML = html;
}

function renderHomeAluno(container: HTMLElement, u: Pessoa) {
  const aula = store.getAulaAtiva();
  const conf = aula ? store.getConfirmacaoPessoa(aula.id, u.id) : null;

  let html = '';
  if (aula) {
    html += `<div class="aula-card">
      <div class="aula-title">${aula.titulo}</div>
      <div class="aula-info">📍 ${aula.local}</div>
      <div class="aula-date">🗓 ${fmt(aula.data)} às ${aula.horario}</div>
      ${aula.descricao ? `<div class="aula-desc" style="margin-top:10px; font-size:13px; opacity:0.9;">📝 ${aula.descricao}</div>` : ''}
    </div>`;

    const status = conf?.status;
    html += `<div class="card confirm-block">
      <div class="confirm-wave">🏄</div>
      <div style="font-weight:800;font-size:18px;margin-bottom:6px;">Você vai para a aula?</div>
      <div style="color:var(--text-light);font-size:14px;margin-bottom:20px;">${aula.titulo}</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-success" onclick="confirmarPresenca('${aula.id}','${u.id}','confirmado')" 
          ${status==='confirmado'?'style="box-shadow:0 0 0 3px #00C853;"':''}>
          ✅ Vou!
        </button>
        <button class="btn btn-danger" onclick="confirmarPresenca('${aula.id}','${u.id}','nao_vai')"
          ${status==='nao_vai'?'style="box-shadow:0 0 0 3px #FF5252;"':''}>
          ❌ Não vou
        </button>
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

function renderAvisos() {
  const u = store.getUsuario();
  if (!u) return;
  const container = document.getElementById('avisos-list');
  const fabAviso = document.getElementById('fab-aviso');
  if (fabAviso) fabAviso.style.display = u.perfil === 'professor' ? 'flex' : 'none';

  const avisos = store.getAvisos(u.perfil);
  if (!container) return;

  if (!avisos.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Nenhum aviso</div><div class="empty-sub">Ainda não há avisos publicados.</div></div>`;
    return;
  }

  container.innerHTML = avisos.map(a => `
    <div class="aviso-card ${a.urgente ? 'urgent' : ''}">
      <div class="aviso-header">
        <div>
          ${a.urgente ? '<span class="badge" style="background:#fce4ec;color:#c62828;margin-bottom:6px;">⚠️ Urgente</span><br>' : ''}
          <div class="aviso-title">${a.titulo}</div>
        </div>
        <div style="text-align:right;">
          <div class="aviso-date">${fmt(a.criadoEm)}</div>
          <div class="aviso-date">${fmtTime(a.criadoEm)}</div>
          ${u.perfil === 'professor' ? `<button class="btn btn-danger btn-sm" style="margin-top:8px;" onclick="deleteAviso('${a.id}')">🗑 Excluir</button>` : ''}
        </div>
      </div>
      <div class="aviso-body">${a.mensagem}</div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
        ${a.destinatarios.map(d=>`<span class="badge badge-${d}">${perfilEmoji(d as PerfilTipo)} ${perfilLabel(d as PerfilTipo)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderConfirmacao() {
  const u = store.getUsuario();
  if (!u) return;
  const container = document.getElementById('confirmacao-content');
  if (!container) return;

  const aula = store.getAulaAtiva();
  if (!aula) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Nenhuma aula ativa</div><div class="empty-sub">Aguarde o gestor agendar uma aula.</div></div>`;
    return;
  }

  const confs = store.getConfirmacoes(aula.id);
  const todos = store.getPessoas();
  const equipe = todos.filter(p => p.perfil !== 'professor');

  let html = `<div class="aula-card">
    <div class="aula-title">${aula.titulo}</div>
    <div class="aula-info">📍 ${aula.local}</div>
    <div class="aula-date">🗓 ${fmt(aula.data)} às ${aula.horario}</div>
  </div>`;

  const grupos: Array<{label:string; perfil: PerfilTipo}> = [
    { label:'👩‍🎓 Alunos', perfil:'aluno' },
    { label:'📋 Estagiários', perfil:'estagiario' },
    { label:'🤝 Voluntários', perfil:'voluntario' },
  ];

  for (const g of grupos) {
    const lista = equipe.filter(p => p.perfil === g.perfil);
    if (!lista.length) continue;
    html += `<div class="card" style="margin:8px 16px;"><div class="card-title">${g.label} — ${lista.length}</div>`;
    for (const p of lista) {
      const c = confs.find(x => x.pessoaId === p.id);
      const myConf = u.id === p.id;
      html += `<div class="person-row">
        <div class="avatar avatar-${p.perfil}">${initials(p.nome)}</div>
        <div class="person-info">
          <div class="person-name">${p.nome}</div>
          <div class="person-sub">${p.telefone}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          ${c ? `
            <span class="badge ${c.status==='confirmado'?'badge-confirm':''}" 
              style="${c.status==='nao_vai'?'background:#fce4ec;color:#c62828;':''}">
              ${c.status==='confirmado'?'✅ Confirmado':'❌ Não vai'}
            </span>
            ${(myConf || u.perfil==='professor') ? `<button class="btn btn-danger btn-sm" onclick="deleteConf('${aula.id}','${p.id}')">🗑 Excluir</button>` : ''}
          ` : `
            <span class="badge badge-pendente">⏳ Pendente</span>
            ${myConf ? `
              <button class="btn btn-success btn-sm" onclick="confirmarPresenca('${aula.id}','${p.id}','confirmado')">✅ Confirmar</button>
            ` : ''}
          `}
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

function renderCadastro() {
  const u = store.getUsuario();
  if (!u) return;

  const container = document.getElementById('cadastro-list');
  const sectionTitle = document.getElementById('cadastro-section-title');
  if (!container) return;

  // Gestor pode ver todos, outros veem apenas seu tipo
  const perfil: PerfilTipo = u.perfil === 'professor' ? 'aluno' : u.perfil;
  const filterSelect = document.getElementById('cadastro-filter') as HTMLSelectElement;
  const activePerfil: PerfilTipo = (filterSelect?.value as PerfilTipo) || perfil;

  if (sectionTitle) {
    sectionTitle.textContent = `Lista de ${perfilLabel(activePerfil)}s`;
  }

  const lista = store.getPessoas(activePerfil);
  if (!lista.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${perfilEmoji(activePerfil)}</div><div class="empty-text">Nenhum ${perfilLabel(activePerfil)}</div><div class="empty-sub">Clique em + para cadastrar.</div></div>`;
    return;
  }

  container.innerHTML = lista.map(p => `
    <div class="person-row">
      <div class="avatar avatar-${p.perfil}">${initials(p.nome)}</div>
      <div class="person-info">
        <div class="person-name">${p.nome}</div>
        <div class="person-sub">📧 ${p.email}</div>
        <div class="person-sub">📞 ${p.telefone}</div>
      </div>
      <div class="person-actions">
        <button class="btn btn-danger btn-sm" onclick="deletePessoa('${p.id}')">🗑</button>
      </div>
    </div>
  `).join('');
}

// ==============================================
// GLOBAL ACTIONS (called from HTML onclick)
// ==============================================

(window as any).openModal = openModal;
(window as any).closeModal = closeModal;

(window as any).confirmarPresenca = function(aulaId: string, pessoaId: string, status: 'confirmado'|'nao_vai') {
  store.confirmar(aulaId, pessoaId, status);
  toast(status === 'confirmado' ? '✅ Presença confirmada!' : '❌ Ausência registrada.');
  renderHome();
  renderConfirmacao();
};

(window as any).deleteConf = function(aulaId: string, pessoaId: string) {
  if (!confirm('Excluir esta confirmação?')) return;
  store.deleteConfirmacao(aulaId, pessoaId);
  toast('🗑 Confirmação excluída.');
  renderConfirmacao();
  renderHome();
};

(window as any).deleteMinhaConf = function(aulaId: string, pessoaId: string) {
  store.deleteConfirmacao(aulaId, pessoaId);
  toast('🗑 Confirmação excluída.');
  renderHome();
};

(window as any).deleteAviso = function(id: string) {
  if (!confirm('Excluir este aviso?')) return;
  store.deleteAviso(id);
  toast('🗑 Aviso excluído.');
  renderAvisos();
};

(window as any).deletePessoa = function(id: string) {
  if (!confirm('Remover esta pessoa?')) return;
  store.deletePessoa(id);
  toast('🗑 Pessoa removida.');
  renderCadastro();
  renderHome();
};

(window as any).handleCadastroFilter = function(val: string) {
  renderCadastro();
};

// ==============================================
// FORM SUBMISSIONS
// ==============================================

function setupForms() {
  // Login form
  const loginBtn = document.getElementById('btn-login');
  loginBtn?.addEventListener('click', () => {
    const nome = (document.getElementById('login-nome') as HTMLInputElement)?.value?.trim();
    const perfilSelect = document.getElementById('login-perfil') as HTMLSelectElement;
    const perfilSelecionado = perfilSelect?.value;
    const senha = (document.getElementById('login-senha') as HTMLInputElement)?.value?.trim();
    
    console.log('=== TENTATIVA DE LOGIN ===');
    console.log('Nome digitado:', nome);
    console.log('Perfil selecionado (HTML):', perfilSelecionado);
    console.log('Senha digitada:', senha);
    
    if (!nome) { 
      toast('⚠️ Digite seu nome'); 
      return; 
    }
    
    // Mapeia o perfil do HTML para o tipo do sistema
    let perfilSistema: PerfilTipo;
    if (perfilSelecionado === 'gestor') {
      perfilSistema = 'professor'; // Mapeia gestor para professor
    } else {
      perfilSistema = perfilSelecionado as PerfilTipo; // aluno, estagiario, voluntario
    }
    
    console.log('Perfil mapeado para sistema:', perfilSistema);
    
    let user: Pessoa | null = null;
    
    if (perfilSistema === 'professor') {
      // Gestor precisa de senha
      if (!senha) {
        toast('⚠️ Digite a senha');
        return;
      }
      user = store.loginComSenha(nome, perfilSistema, senha);
      console.log('Resultado login gestor:', user);
    } else {
      // Outros perfis não precisam de senha
      user = store.loginByNome(nome, perfilSistema);
      console.log('Resultado login outros:', user);
    }
    
    if (!user) {
      console.log('❌ LOGIN FALHOU - Usuário não encontrado ou senha incorreta');
      
      // Vamos listar todos os usuários disponíveis para debug
      const todosUsuarios = store.getPessoas();
      console.log('Usuários disponíveis no sistema:', todosUsuarios.map(u => ({
        nome: u.nome,
        perfil: u.perfil,
        id: u.id
      })));
      
      toast('❌ Usuário não encontrado ou senha incorreta.');
      return;
    }

    console.log('✅ LOGIN BEM SUCEDIDO! Usuário:', user);
    
    // Verifica se é primeiro acesso do gestor (senha padrão)
    if (user.perfil === 'professor' && store.isPrimeiroAcesso(user.id)) {
      toast('🔐 Primeiro acesso. Por favor, altere sua senha.');
      setTimeout(() => {
        openModal('modal-senha');
      }, 500);
    }
    
    initApp();
  });

  // Perfil quick-select buttons
  document.querySelectorAll('.profile-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.profile-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const sel = document.getElementById('login-perfil') as HTMLSelectElement;
      if (sel) sel.value = (btn as HTMLElement).dataset.perfil || '';
    });
  });

  // Botão de alterar senha
  const btnSalvarSenha = document.getElementById('btn-salvar-senha');
  btnSalvarSenha?.addEventListener('click', () => {
    const u = store.getUsuario();
    if (!u || u.perfil !== 'professor') {
      toast('⚠️ Apenas gestores podem alterar senha.');
      closeModal('modal-senha');
      return;
    }

    const novaSenha = (document.getElementById('nova-senha') as HTMLInputElement)?.value;
    const confirmaSenha = (document.getElementById('confirma-senha') as HTMLInputElement)?.value;

    if (!novaSenha || novaSenha.length < 6) {
      toast('⚠️ A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmaSenha) {
      toast('⚠️ As senhas não conferem.');
      return;
    }

    // Tenta alterar a senha
    const sucesso = store.alterarSenhaPrimeiroAcesso(u.id, novaSenha);
    
    if (sucesso) {
      toast('✅ Senha alterada com sucesso!');
      closeModal('modal-senha');
      
      // Limpa os campos
      (document.getElementById('nova-senha') as HTMLInputElement).value = '';
      (document.getElementById('confirma-senha') as HTMLInputElement).value = '';
    } else {
      toast('❌ Erro ao alterar senha.');
    }
  });

  // Botão de salvar aula
  const aulaBtn = document.getElementById('btn-salvar-aula');
  aulaBtn?.addEventListener('click', () => {
    const u = store.getUsuario();
    if (!u || u.perfil !== 'professor') {
      toast('⚠️ Apenas gestores podem agendar aulas.');
      closeModal('modal-nova-aula');
      return;
    }

    const titulo = (document.getElementById('aula-titulo') as HTMLInputElement)?.value?.trim();
    const data = (document.getElementById('aula-data') as HTMLInputElement)?.value;
    const horario = (document.getElementById('aula-horario') as HTMLInputElement)?.value;
    const local = (document.getElementById('aula-local') as HTMLInputElement)?.value?.trim();
    const descricao = (document.getElementById('aula-desc') as HTMLTextAreaElement)?.value?.trim();

    if (!titulo || !data || !horario || !local) {
      toast('⚠️ Preencha todos os campos obrigatórios.');
      return;
    }

    // Formata a data para o padrão brasileiro
    const dataObj = new Date(data + 'T' + horario);
    const dataFormatada = dataObj.toISOString();

    store.addAula({
      titulo,
      data: dataFormatada,
      horario,
      local,
      descricao: descricao || '',
      professorId: u.id,
      status: 'agendada'
    });

    toast('✅ Aula agendada com sucesso!');
    closeModal('modal-nova-aula');

    // Limpa o formulário
    (document.getElementById('aula-titulo') as HTMLInputElement).value = '';
    (document.getElementById('aula-data') as HTMLInputElement).value = '';
    (document.getElementById('aula-horario') as HTMLInputElement).value = '';
    (document.getElementById('aula-local') as HTMLInputElement).value = '';
    (document.getElementById('aula-desc') as HTMLTextAreaElement).value = '';

    renderHome();
    renderConfirmacao();
  });

  // Aviso form
  const avisoBtn = document.getElementById('btn-salvar-aviso');
  avisoBtn?.addEventListener('click', () => {
    const u = store.getUsuario();
    if (!u) return;
    const titulo = (document.getElementById('aviso-titulo') as HTMLInputElement)?.value?.trim();
    const mensagem = (document.getElementById('aviso-msg') as HTMLTextAreaElement)?.value?.trim();
    const urgente = (document.getElementById('aviso-urgente') as HTMLInputElement)?.checked;
    const destinatarios: PerfilTipo[] = [];
    
    // Por enquanto, envia para todos
    destinatarios.push('aluno', 'estagiario', 'voluntario');
    
    if (!titulo || !mensagem) { toast('⚠️ Preencha título e mensagem.'); return; }
    
    store.addAviso({ titulo, mensagem, urgente: urgente || false, destinatarios, autorId: u.id });
    toast('📢 Aviso enviado!');
    closeModal('modal-aviso');
    (document.getElementById('aviso-titulo') as HTMLInputElement).value = '';
    (document.getElementById('aviso-msg') as HTMLTextAreaElement).value = '';
    renderAvisos();
  });

  // Cadastro form
  const cadastroBtn = document.getElementById('btn-salvar-pessoa');
  cadastroBtn?.addEventListener('click', () => {
    const nome    = (document.getElementById('cad-nome') as HTMLInputElement)?.value?.trim();
    const perfilSelect = (document.getElementById('cad-perfil') as HTMLSelectElement)?.value;
    
    // Mapeia o perfil do HTML para o tipo do sistema
    let perfilSistema: PerfilTipo;
    if (perfilSelect === 'gestor') {
      perfilSistema = 'professor';
    } else {
      perfilSistema = perfilSelect as PerfilTipo;
    }
    
    if (!nome) { toast('⚠️ Preencha o nome.'); return; }
    
    // Gera email e telefone padrão se não existirem
    const email = `${nome.toLowerCase().replace(/\s+/g, '.')}@email.com`;
    const telefone = '(27) 99999-9999';
    
    store.addPessoa({ nome, email, telefone, perfil: perfilSistema, ativo: true });
    toast(`✅ ${perfilLabel(perfilSistema)} cadastrado!`);
    closeModal('modal-cadastro');
    (document.getElementById('cad-nome') as HTMLInputElement).value = '';
    renderCadastro();
  });

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  logoutBtn?.addEventListener('click', () => {
    store.logout();
    showLoginScreen();
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('open');
    });
  });
}

// ==============================================
// APP INIT
// ==============================================

function showLoginScreen() {
  const login = document.getElementById('login-screen');
  const main  = document.getElementById('main-app');
  if (login) login.style.display = 'flex';
  if (main)  main.style.display  = 'none';
}

function initApp() {
  const u = store.getUsuario();
  if (!u) { showLoginScreen(); return; }

  const login = document.getElementById('login-screen');
  const main  = document.getElementById('main-app');
  if (login) login.style.display = 'none';
  if (main)  main.style.display  = 'flex';

  // Adjust nav visibility per profile
  const isProfessor = u.perfil === 'professor';
  const navAvisos = document.getElementById('nav-avisos');
  const fabAviso = document.getElementById('fab-aviso');
  const fabCadastro = document.getElementById('fab-cadastro');
  const navConfirmacao = document.getElementById('nav-confirmacao');
  const navCadastro = document.getElementById('nav-cadastro');
  
  // Mostra/esconde link de trocar senha (apenas para gestor)
  const linkTrocarSenha = document.getElementById('link-trocar-senha');
  if (linkTrocarSenha) {
    if (isProfessor) {
      linkTrocarSenha.classList.remove('hidden');
    } else {
      linkTrocarSenha.classList.add('hidden');
    }
  }

  // Set user display
  const headerUser = document.getElementById('header-user-name');
  if (headerUser) headerUser.textContent = u.nome.split(' ')[0];

  // Show correct nav items
  document.querySelectorAll('.nav-item').forEach(n => {
    (n as HTMLElement).style.display = 'flex';
  });

  // Filter nav for cadastro (gestor can manage all, others see own only)
  const cadastroFilter = document.getElementById('cadastro-filter-wrap');
  if (cadastroFilter) {
    (cadastroFilter as HTMLElement).style.display = isProfessor ? 'block' : 'none';
  }

  // FABs
  if (fabAviso) (fabAviso as HTMLElement).style.display = isProfessor ? 'flex' : 'none';
  if (fabCadastro) (fabCadastro as HTMLElement).style.display = 'flex';

  // Pre-fill cadastro filter
  const filterSel = document.getElementById('cadastro-filter') as HTMLSelectElement;
  if (filterSel && !isProfessor) {
    filterSel.value = u.perfil;
  }

  showPage('page-home');
}

// Nav click handlers
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

  const u = store.getUsuario();
  if (u) {
    initApp();
  } else {
    showLoginScreen();
  }
});