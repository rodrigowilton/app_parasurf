// =============================================
// Instituto ParaSurf — Models & Types
// =============================================

export type PerfilTipo = 'professor' | 'aluno' | 'estagiario' | 'voluntario';

export interface Pessoa {
  id: string;
  nome: string;
  perfil: PerfilTipo;
  email: string;
  telefone: string;
  foto?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Aula {
  id: string;
  titulo: string;
  data: string;
  horario: string;
  local: string;
  professorId: string;
  descricao?: string;
  status: 'agendada' | 'confirmada' | 'cancelada' | 'realizada';
  criadaEm: string;
}

export interface Confirmacao {
  id: string;
  aulaId: string;
  pessoaId: string;
  status: 'confirmado' | 'nao_vai' | 'pendente';
  observacao?: string;
  atualizadoEm: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  autorId: string;
  urgente: boolean;
  destinatarios: PerfilTipo[];
  criadoEm: string;
}

export interface AppState {
  usuarioLogado: Pessoa | null;
  pessoas: Pessoa[];
  aulas: Aula[];
  confirmacoes: Confirmacao[];
  avisos: Aviso[];
}
