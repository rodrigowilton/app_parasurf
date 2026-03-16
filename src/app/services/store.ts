// =============================================
// Instituto ParaSurf — Store (LocalStorage)
// =============================================
import type { AppState, Pessoa, Aula, Confirmacao, Aviso, PerfilTipo } from '../models';

const STORAGE_KEY = 'parasurf_data';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

function seed(): AppState {
  const professorId = uid();
  const state: AppState = {
    usuarioLogado: null,
    pessoas: [
      {
        id: professorId,
        nome: 'Carlos Mestre',
        perfil: 'professor',
        email: 'carlos@parasurf.org',
        telefone: '+55 27 98866-8868',
        ativo: true,
        criadoEm: now(),
      },
      {
        id: uid(),
        nome: 'Ana Surfista',
        perfil: 'aluno',
        email: 'ana@email.com',
        telefone: '27 99999-0001',
        ativo: true,
        criadoEm: now(),
      },
      {
        id: uid(),
        nome: 'Bruno Estágio',
        perfil: 'estagiario',
        email: 'bruno@email.com',
        telefone: '27 99999-0002',
        ativo: true,
        criadoEm: now(),
      },
      {
        id: uid(),
        nome: 'Cláudia Voluntária',
        perfil: 'voluntario',
        email: 'claudia@email.com',
        telefone: '27 99999-0003',
        ativo: true,
        criadoEm: now(),
      },
    ],
    aulas: [
      {
        id: uid(),
        titulo: 'Surf Adaptado — Turma A',
        data: new Date().toISOString().split('T')[0],
        horario: '09:00',
        local: 'Praia de Itaparica, Vila Velha',
        professorId,
        descricao: 'Aula prática de surf adaptado para iniciantes.',
        status: 'agendada',
        criadaEm: now(),
      },
    ],
    confirmacoes: [],
    avisos: [
      {
        id: uid(),
        titulo: '🏄 Bem-vindos ao Instituto ParaSurf!',
        mensagem: 'Olá, equipe! Bem-vindos ao nosso sistema de confirmação de presenças. Usem este app para confirmar sua presença nas aulas e receber avisos importantes.',
        autorId: professorId,
        urgente: false,
        destinatarios: ['aluno', 'estagiario', 'voluntario'],
        criadoEm: now(),
      },
      {
        id: uid(),
        titulo: '⚠️ Equipamentos obrigatórios',
        mensagem: 'Lembrem-se: roupa de neoprene e protetor solar são obrigatórios. Tragam também garrafa de água.',
        autorId: professorId,
        urgente: true,
        destinatarios: ['aluno', 'estagiario', 'voluntario'],
        criadoEm: now(),
      },
    ],
  };
  return state;
}

export class Store {
  private state: AppState;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
      } catch {
        this.state = seed();
        this.save();
      }
    } else {
      this.state = seed();
      this.save();
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getState(): AppState { return this.state; }

  // --- AUTH ---
  login(pessoaId: string): Pessoa | null {
    const p = this.state.pessoas.find(x => x.id === pessoaId) || null;
    this.state.usuarioLogado = p;
    this.save();
    return p;
  }

  loginByNome(nome: string, perfil: PerfilTipo): Pessoa | null {
    const p = this.state.pessoas.find(x =>
      x.nome.toLowerCase() === nome.toLowerCase() && x.perfil === perfil && x.ativo
    ) || null;
    this.state.usuarioLogado = p;
    this.save();
    return p;
  }

  logout() {
    this.state.usuarioLogado = null;
    this.save();
  }

  getUsuario(): Pessoa | null { return this.state.usuarioLogado; }

  // --- PESSOAS ---
  getPessoas(perfil?: PerfilTipo): Pessoa[] {
    if (perfil) return this.state.pessoas.filter(p => p.perfil === perfil && p.ativo);
    return this.state.pessoas.filter(p => p.ativo);
  }

  addPessoa(dados: Omit<Pessoa, 'id' | 'criadoEm'>): Pessoa {
    const p: Pessoa = { ...dados, id: uid(), criadoEm: now() };
    this.state.pessoas.push(p);
    this.save();
    return p;
  }

  updatePessoa(id: string, dados: Partial<Pessoa>) {
    const idx = this.state.pessoas.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.state.pessoas[idx] = { ...this.state.pessoas[idx], ...dados };
      this.save();
    }
  }

  deletePessoa(id: string) {
    this.state.pessoas = this.state.pessoas.map(p =>
      p.id === id ? { ...p, ativo: false } : p
    );
    this.save();
  }

  // --- AULAS ---
  getAulas(): Aula[] { return this.state.aulas; }

  getAulaAtiva(): Aula | null {
    return this.state.aulas.find(a => a.status === 'agendada' || a.status === 'confirmada') || null;
  }

  addAula(dados: Omit<Aula, 'id' | 'criadaEm'>): Aula {
    const a: Aula = { ...dados, id: uid(), criadaEm: now() };
    this.state.aulas.push(a);
    this.save();
    return a;
  }

  deleteAula(id: string) {
    this.state.aulas = this.state.aulas.filter(a => a.id !== id);
    this.state.confirmacoes = this.state.confirmacoes.filter(c => c.aulaId !== id);
    this.save();
  }

  // --- CONFIRMAÇÕES ---
  getConfirmacoes(aulaId: string): Confirmacao[] {
    return this.state.confirmacoes.filter(c => c.aulaId === aulaId);
  }

  getConfirmacaoPessoa(aulaId: string, pessoaId: string): Confirmacao | null {
    return this.state.confirmacoes.find(c => c.aulaId === aulaId && c.pessoaId === pessoaId) || null;
  }

  confirmar(aulaId: string, pessoaId: string, status: 'confirmado' | 'nao_vai', obs?: string) {
    const existing = this.state.confirmacoes.findIndex(
      c => c.aulaId === aulaId && c.pessoaId === pessoaId
    );
    const entry: Confirmacao = {
      id: existing >= 0 ? this.state.confirmacoes[existing].id : uid(),
      aulaId, pessoaId, status,
      observacao: obs,
      atualizadoEm: now(),
    };
    if (existing >= 0) {
      this.state.confirmacoes[existing] = entry;
    } else {
      this.state.confirmacoes.push(entry);
    }
    this.save();
    return entry;
  }

  deleteConfirmacao(aulaId: string, pessoaId: string) {
    this.state.confirmacoes = this.state.confirmacoes.filter(
      c => !(c.aulaId === aulaId && c.pessoaId === pessoaId)
    );
    this.save();
  }

  // --- AVISOS ---
  getAvisos(perfil?: PerfilTipo): Aviso[] {
    if (!perfil) return this.state.avisos;
    return this.state.avisos.filter(a => a.destinatarios.includes(perfil) || a.destinatarios.includes('professor' as PerfilTipo));
  }

  addAviso(dados: Omit<Aviso, 'id' | 'criadoEm'>): Aviso {
    const a: Aviso = { ...dados, id: uid(), criadoEm: now() };
    this.state.avisos.unshift(a);
    this.save();
    return a;
  }

  deleteAviso(id: string) {
    this.state.avisos = this.state.avisos.filter(a => a.id !== id);
    this.save();
  }
}

export const store = new Store();
