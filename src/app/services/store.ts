// =============================================
// Instituto ParaSurf — Store (Gerenciamento de Estado)
// =============================================
import type { PerfilTipo, Pessoa, Aula, Confirmacao, Aviso, AppState } from '../models';

// Usuários padrão
const USUARIO_PADRAO: Pessoa = {
  id: 'gestor-padrao',
  nome: 'Gestor',
  perfil: 'professor', // 'professor' é o equivalente a gestor no sistema
  email: 'gestor@parasurf.org',
  telefone: '(27) 98866-8868',
  ativo: true,
  criadoEm: new Date().toISOString()
};

// Usuário alternativo para teste
const USUARIO_ADMIN: Pessoa = {
  id: 'admin-padrao',
  nome: 'Administrador',
  perfil: 'professor',
  email: 'admin@parasurf.org',
  telefone: '(27) 99999-9999',
  ativo: true,
  criadoEm: new Date().toISOString()
};

// Mapa de senhas (em produção, isso seria hash, mas para exemplo usamos texto plano)
const SENHAS: Record<string, string> = {
  'gestor-padrao': '123456',
  'admin-padrao': '123456'
};

// Estado inicial
const initialState: AppState = {
  usuarioLogado: null,
  pessoas: [
    USUARIO_PADRAO,
    USUARIO_ADMIN,
    {
      id: 'aluno-demo',
      nome: 'João Silva',
      perfil: 'aluno',
      email: 'joao@email.com',
      telefone: '(27) 99999-1111',
      ativo: true,
      criadoEm: new Date().toISOString()
    },
    {
      id: 'estagiario-demo',
      nome: 'Maria Santos',
      perfil: 'estagiario',
      email: 'maria@email.com',
      telefone: '(27) 99999-2222',
      ativo: true,
      criadoEm: new Date().toISOString()
    }
  ],
  aulas: [],
  confirmacoes: [],
  avisos: []
};

class Store {
  private state: AppState = { ...initialState };
  private listeners: Array<() => void> = [];

  // Subscribe para atualizações
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // ===== LOGIN =====
  login(nome: string, perfil: PerfilTipo, senha?: string): Pessoa | null {
    console.log('Tentando login:', { nome, perfil, senha });
    
    // Busca pessoa pelo nome (case insensitive)
    const pessoa = this.state.pessoas.find(
      p => p.nome.toLowerCase() === nome.toLowerCase() && p.perfil === perfil && p.ativo
    );

    console.log('Pessoa encontrada:', pessoa);

    if (!pessoa) return null;

    // Se for gestor (professor), verifica senha
    if (perfil === 'professor') {
      // Se não tem senha ou senha incorreta
      if (!senha || SENHAS[pessoa.id] !== senha) {
        console.log('Senha incorreta. Esperada:', SENHAS[pessoa.id], 'Recebida:', senha);
        return null;
      }
    }

    this.state.usuarioLogado = pessoa;
    this.notify();
    return pessoa;
  }

  // Login por nome (para compatibilidade com código existente)
  loginByNome(nome: string, perfil: PerfilTipo): Pessoa | null {
    console.log('loginByNome:', { nome, perfil });
    
    // Para perfis que não são gestor, login sem senha
    if (perfil !== 'professor') {
      const pessoa = this.state.pessoas.find(
        p => p.nome.toLowerCase() === nome.toLowerCase() && p.perfil === perfil && p.ativo
      );
      if (pessoa) {
        this.state.usuarioLogado = pessoa;
        this.notify();
        return pessoa;
      }
      return null;
    }
    return null; // Gestor precisa usar o login com senha
  }

  // Método específico para login com senha
  loginComSenha(nome: string, perfil: PerfilTipo, senha: string): Pessoa | null {
    return this.login(nome, perfil, senha);
  }

  // ===== ALTERAR SENHA =====
  alterarSenha(pessoaId: string, senhaAtual: string, novaSenha: string): boolean {
    // Verifica se a pessoa existe e é gestor
    const pessoa = this.state.pessoas.find(p => p.id === pessoaId && p.perfil === 'professor');
    if (!pessoa) return false;

    // Verifica senha atual
    if (SENHAS[pessoaId] !== senhaAtual) return false;

    // Atualiza senha
    SENHAS[pessoaId] = novaSenha;
    return true;
  }

  // Versão simplificada para primeira alteração (sem verificar senha atual)
  alterarSenhaPrimeiroAcesso(pessoaId: string, novaSenha: string): boolean {
    const pessoa = this.state.pessoas.find(p => p.id === pessoaId && p.perfil === 'professor');
    if (!pessoa) return false;
    
    SENHAS[pessoaId] = novaSenha;
    return true;
  }

  // Verifica se é primeiro acesso (senha ainda é a padrão)
  isPrimeiroAcesso(pessoaId: string): boolean {
    return SENHAS[pessoaId] === '123456';
  }

  // ===== USUÁRIO =====
  getUsuario(): Pessoa | null {
    return this.state.usuarioLogado;
  }

  logout() {
    this.state.usuarioLogado = null;
    this.notify();
  }

  // ===== PESSOAS =====
  getPessoas(perfil?: PerfilTipo): Pessoa[] {
    if (perfil) {
      return this.state.pessoas.filter(p => p.perfil === perfil && p.ativo);
    }
    return this.state.pessoas.filter(p => p.ativo);
  }

  addPessoa(pessoa: Omit<Pessoa, 'id' | 'criadoEm'>) {
    const nova: Pessoa = {
      ...pessoa,
      id: Date.now().toString(),
      criadoEm: new Date().toISOString()
    };
    this.state.pessoas.push(nova);
    this.notify();
  }

  deletePessoa(id: string) {
    const index = this.state.pessoas.findIndex(p => p.id === id);
    if (index !== -1) {
      this.state.pessoas[index].ativo = false;
      this.notify();
    }
  }

  // ===== AULAS =====
  getAulas(): Aula[] {
    return this.state.aulas;
  }

  getAulaAtiva(): Aula | null {
    return this.state.aulas.find(a => a.status === 'agendada') || null;
  }

  addAula(aula: Omit<Aula, 'id' | 'criadaEm'>) {
    const nova: Aula = {
      ...aula,
      id: Date.now().toString(),
      criadaEm: new Date().toISOString()
    };
    this.state.aulas.push(nova);
    this.notify();
  }

  // ===== CONFIRMAÇÕES =====
  getConfirmacoes(aulaId: string): Confirmacao[] {
    return this.state.confirmacoes.filter(c => c.aulaId === aulaId);
  }

  getConfirmacaoPessoa(aulaId: string, pessoaId: string): Confirmacao | undefined {
    return this.state.confirmacoes.find(c => c.aulaId === aulaId && c.pessoaId === pessoaId);
  }

  confirmar(aulaId: string, pessoaId: string, status: 'confirmado' | 'nao_vai') {
    const existente = this.state.confirmacoes.find(
      c => c.aulaId === aulaId && c.pessoaId === pessoaId
    );

    if (existente) {
      existente.status = status;
      existente.atualizadoEm = new Date().toISOString();
    } else {
      this.state.confirmacoes.push({
        id: Date.now().toString(),
        aulaId,
        pessoaId,
        status,
        atualizadoEm: new Date().toISOString()
      });
    }
    this.notify();
  }

  deleteConfirmacao(aulaId: string, pessoaId: string) {
    this.state.confirmacoes = this.state.confirmacoes.filter(
      c => !(c.aulaId === aulaId && c.pessoaId === pessoaId)
    );
    this.notify();
  }

  // ===== AVISOS =====
  getAvisos(perfil?: PerfilTipo): Aviso[] {
    if (perfil) {
      return this.state.avisos
        .filter(a => a.destinatarios.includes(perfil))
        .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    }
    return this.state.avisos.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }

  addAviso(aviso: Omit<Aviso, 'id' | 'criadoEm'>) {
    const novo: Aviso = {
      ...aviso,
      id: Date.now().toString(),
      criadoEm: new Date().toISOString()
    };
    this.state.avisos.push(novo);
    this.notify();
  }

  deleteAviso(id: string) {
    this.state.avisos = this.state.avisos.filter(a => a.id !== id);
    this.notify();
  }
}

export const store = new Store();