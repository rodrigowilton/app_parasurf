const BASE = '/api';

export function getToken(): string | null { return localStorage.getItem('parasurf_token'); }
export function getUsuario(): any { const u = localStorage.getItem('parasurf_usuario'); return u ? JSON.parse(u) : null; }

async function req(method: string, url: string, body?: any): Promise<any> {
  const token = getToken();
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Erro desconhecido' })); throw new Error(err.error || `HTTP ${res.status}`); }
  return res.json();
}

export async function login(nome: string, perfil: string, senha?: string) {
  const data = await req('POST', '/login', { nome, perfil, senha });
  localStorage.setItem('parasurf_token', data.token);
  localStorage.setItem('parasurf_usuario', JSON.stringify(data.usuario));
  return data.usuario;
}
export function logout() { localStorage.removeItem('parasurf_token'); localStorage.removeItem('parasurf_usuario'); }
export async function trocarSenha(nova_senha: string) { return req('POST', '/trocar-senha', { nova_senha }); }
export async function getPessoas(perfil?: string) { return req('GET', '/pessoas' + (perfil ? `?perfil=${perfil}` : '')); }
export async function addPessoa(d: any) { return req('POST', '/pessoas', d); }
export async function deletePessoa(id: string) { return req('DELETE', `/pessoas/${id}`); }
export async function getAulas() { return req('GET', '/aulas'); }
export async function getAulaAtiva() { return req('GET', '/aulas/ativa'); }
export async function addAula(d: any) { return req('POST', '/aulas', d); }
export async function deleteAula(id: string) { return req('DELETE', `/aulas/${id}`); }
export async function getConfirmacoes(aulaId: string) { return req('GET', `/confirmacoes/${aulaId}`); }
export async function confirmar(aulaId: string, pessoaId: string, status: string, obs?: string) { return req('POST', '/confirmacoes', { aula_id: aulaId, pessoa_id: pessoaId, status, observacao: obs }); }
export async function deleteConfirmacao(aulaId: string, pessoaId: string) { return req('DELETE', `/confirmacoes/${aulaId}/${pessoaId}`); }
export async function getAvisos(perfil?: string) { return req('GET', '/avisos' + (perfil ? `?perfil=${perfil}` : '')); }
export async function addAviso(d: any) { return req('POST', '/avisos', d); }
export async function deleteAviso(id: string) { return req('DELETE', `/avisos/${id}`); }
