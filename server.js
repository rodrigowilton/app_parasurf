require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { Pool } = require('pg');
const path     = require('path');

const app = express();
const PORT = process.env.PORT || 3015;
const JWT_SECRET = process.env.JWT_SECRET || 'parasurf_secret';

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'parasurf_db',
  user:     process.env.DB_USER || 'parasurf_user',
  password: process.env.DB_PASS || 'ParaSurf@2025!',
});

pool.connect((err) => {
  if (err) console.error('Erro PostgreSQL:', err.message);
  else console.log('Conectado ao PostgreSQL');
});

app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }
}

// =============================================
// AUTH
// =============================================
app.post('/api/login', async (req, res) => {
  const { nome, perfil, senha } = req.body;
  if (!nome || !perfil) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    if (perfil === 'gestor') {
      if (!senha) return res.status(400).json({ error: 'Senha obrigatória para gestor' });
      const r = await pool.query(`SELECT * FROM pessoas WHERE LOWER(nome)=LOWER($1) AND perfil='gestor' AND ativo=TRUE LIMIT 1`, [nome]);
      if (!r.rows.length) return res.status(401).json({ error: 'Gestor não encontrado' });
      const p = r.rows[0];
      if (!p.senha_hash) {
        const hash = await bcrypt.hash(senha, 10);
        await pool.query(`UPDATE pessoas SET senha_hash=$1, primeiro_acesso=FALSE WHERE id=$2`, [hash, p.id]);
      } else {
        const ok = await bcrypt.compare(senha, p.senha_hash);
        if (!ok) return res.status(401).json({ error: 'Senha incorreta' });
      }
      const token = jwt.sign({ id: p.id, nome: p.nome, perfil: p.perfil }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, usuario: { id: p.id, nome: p.nome, perfil: p.perfil, telefone: p.telefone, email: p.email } });
    }
    const r = await pool.query(`SELECT * FROM pessoas WHERE LOWER(nome)=LOWER($1) AND perfil=$2 AND ativo=TRUE LIMIT 1`, [nome, perfil]);
    if (!r.rows.length) return res.status(401).json({ error: 'Usuário não encontrado. Verifique nome e perfil.' });
    const p = r.rows[0];
    const token = jwt.sign({ id: p.id, nome: p.nome, perfil: p.perfil }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, usuario: { id: p.id, nome: p.nome, perfil: p.perfil, telefone: p.telefone, email: p.email } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

app.post('/api/trocar-senha', auth, async (req, res) => {
  const { nova_senha } = req.body;
  if (!nova_senha || nova_senha.length < 6) return res.status(400).json({ error: 'Senha muito curta' });
  try {
    const hash = await bcrypt.hash(nova_senha, 10);
    await pool.query(`UPDATE pessoas SET senha_hash=$1, primeiro_acesso=FALSE WHERE id=$2`, [hash, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao trocar senha' }); }
});

// =============================================
// PESSOAS
// =============================================
app.get('/api/pessoas', auth, async (req, res) => {
  const { perfil } = req.query;
  try {
    let q = `SELECT id,nome,perfil,email,telefone,ativo,criado_em FROM pessoas WHERE ativo=TRUE`;
    const p = [];
    if (perfil) { q += ` AND perfil=$1`; p.push(perfil); }
    q += ` ORDER BY nome`;
    const r = await pool.query(q, p);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar pessoas' }); }
});

app.post('/api/pessoas', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores podem cadastrar' });
  const { nome, perfil, email, telefone, senha } = req.body;
  if (!nome || !perfil) return res.status(400).json({ error: 'Nome e perfil obrigatórios' });
  try {
    let senhaHash = null;
    let primeiroAcesso = true;
    if (perfil === 'gestor' && senha) {
      senhaHash = await bcrypt.hash(senha, 10);
      primeiroAcesso = false;
    }
    const r = await pool.query(
      `INSERT INTO pessoas (nome,perfil,email,telefone,ativo,senha_hash,primeiro_acesso) VALUES ($1,$2,$3,$4,TRUE,$5,$6) RETURNING id,nome,perfil,email,telefone`,
      [nome, perfil, email||`${nome.toLowerCase().replace(/\s+/g,'.')}@email.com`, telefone||'(27) 99999-9999', senhaHash, primeiroAcesso]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Erro ao cadastrar' }); }
});

app.delete('/api/pessoas/:id', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores podem remover' });
  try {
    await pool.query(`UPDATE pessoas SET ativo=FALSE WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover' }); }
});

// =============================================
// AULAS
// =============================================
app.get('/api/aulas', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM aulas ORDER BY data DESC, horario DESC`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar aulas' }); }
});

app.get('/api/aulas/ativa', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM aulas WHERE status IN ('agendada','confirmada') ORDER BY data ASC, horario ASC LIMIT 1`);
    res.json(r.rows[0] || null);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar aula ativa' }); }
});

app.post('/api/aulas', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores podem criar aulas' });
  const { titulo, data, horario, local, descricao } = req.body;
  if (!titulo||!data||!horario||!local) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  try {
    const r = await pool.query(
      `INSERT INTO aulas (titulo,data,horario,local,descricao,gestor_id,status) VALUES ($1,$2,$3,$4,$5,$6,'agendada') RETURNING *`,
      [titulo, data, horario, local, descricao||'', req.user.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar aula' }); }
});

app.delete('/api/aulas/:id', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores podem remover aulas' });
  try {
    await pool.query(`DELETE FROM aulas WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover aula' }); }
});

// =============================================
// CONFIRMAÇÕES
// =============================================
app.get('/api/confirmacoes/:aulaId', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*,p.nome,p.perfil,p.telefone FROM confirmacoes c JOIN pessoas p ON c.pessoa_id=p.id WHERE c.aula_id=$1`,
      [req.params.aulaId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar confirmações' }); }
});

app.post('/api/confirmacoes', auth, async (req, res) => {
  const { aula_id, pessoa_id, status, observacao } = req.body;
  if (!aula_id||!pessoa_id||!status) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    const r = await pool.query(
      `INSERT INTO confirmacoes (aula_id,pessoa_id,status,observacao,atualizado_em) VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (aula_id,pessoa_id) DO UPDATE SET status=$3,observacao=$4,atualizado_em=NOW() RETURNING *`,
      [aula_id, pessoa_id, status, observacao||null]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Erro ao salvar confirmação' }); }
});

app.delete('/api/confirmacoes/:aulaId/:pessoaId', auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM confirmacoes WHERE aula_id=$1 AND pessoa_id=$2`, [req.params.aulaId, req.params.pessoaId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao deletar confirmação' }); }
});

// =============================================
// AVISOS
// =============================================
app.get('/api/avisos', auth, async (req, res) => {
  const { perfil } = req.query;
  try {
    let q = `SELECT a.*,p.nome as autor_nome FROM avisos a LEFT JOIN pessoas p ON a.autor_id=p.id`;
    const params = [];
    if (perfil && perfil !== 'gestor') { q += ` WHERE $1=ANY(a.destinatarios)`; params.push(perfil); }
    q += ` ORDER BY a.criado_em DESC`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar avisos' }); }
});

app.post('/api/avisos', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores podem criar avisos' });
  const { titulo, mensagem, urgente, destinatarios } = req.body;
  if (!titulo||!mensagem) return res.status(400).json({ error: 'Título e mensagem obrigatórios' });
  try {
    const r = await pool.query(
      `INSERT INTO avisos (titulo,mensagem,urgente,destinatarios,autor_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [titulo, mensagem, urgente||false, destinatarios||['aluno','estagiario','voluntario'], req.user.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar aviso' }); }
});

app.delete('/api/avisos/:id', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores podem deletar avisos' });
  try {
    await pool.query(`DELETE FROM avisos WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao deletar aviso' }); }
});

// =============================================
// EQUIPES — /minha ANTES de /:aulaId
// =============================================
app.get('/api/equipes/minha/:aulaId/:pessoaId', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT e.* FROM equipes e
       JOIN equipe_membros em ON em.equipe_id=e.id
       WHERE e.aula_id=$1 AND em.pessoa_id=$2 LIMIT 1`,
      [req.params.aulaId, req.params.pessoaId]
    );
    if (!r.rows.length) return res.json(null);
    const membros = await pool.query(
      `SELECT em.*, p.nome, p.perfil FROM equipe_membros em
       JOIN pessoas p ON em.pessoa_id=p.id WHERE em.equipe_id=$1 ORDER BY em.papel, p.nome`,
      [r.rows[0].id]
    );
    res.json({ ...r.rows[0], membros: membros.rows });
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar equipe' }); }
});

app.get('/api/equipes/:aulaId', auth, async (req, res) => {
  try {
    const equipes = await pool.query(
      `SELECT * FROM equipes WHERE aula_id=$1 ORDER BY criado_em`,
      [req.params.aulaId]
    );
    for (const eq of equipes.rows) {
      const membros = await pool.query(
        `SELECT em.*, p.nome, p.perfil, p.telefone
         FROM equipe_membros em JOIN pessoas p ON em.pessoa_id=p.id
         WHERE em.equipe_id=$1 ORDER BY em.papel, p.nome`,
        [eq.id]
      );
      eq.membros = membros.rows;
    }
    res.json(equipes.rows);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar equipes' }); }
});

app.post('/api/equipes', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores' });
  const { nome, aula_id, membros } = req.body;
  if (!nome || !aula_id || !membros?.length) return res.status(400).json({ error: 'Dados incompletos' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eq = await client.query(
      `INSERT INTO equipes (nome, aula_id) VALUES ($1,$2) RETURNING *`,
      [nome, aula_id]
    );
    for (const m of membros) {
      await client.query(
        `INSERT INTO equipe_membros (equipe_id, pessoa_id, papel) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [eq.rows[0].id, m.pessoa_id, m.papel]
      );
    }
    await client.query('COMMIT');
    res.json(eq.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Erro ao criar equipe' }); }
  finally { client.release(); }
});

app.put('/api/equipes/:id', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores' });
  const { nome, membros } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (nome) await client.query(`UPDATE equipes SET nome=$1, atualizado_em=NOW() WHERE id=$2`, [nome, req.params.id]);
    if (membros) {
      await client.query(`DELETE FROM equipe_membros WHERE equipe_id=$1`, [req.params.id]);
      for (const m of membros) {
        await client.query(
          `INSERT INTO equipe_membros (equipe_id, pessoa_id, papel) VALUES ($1,$2,$3)`,
          [req.params.id, m.pessoa_id, m.papel]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Erro ao atualizar equipe' }); }
  finally { client.release(); }
});

app.delete('/api/equipes/:id', auth, async (req, res) => {
  if (req.user.perfil !== 'gestor') return res.status(403).json({ error: 'Apenas gestores' });
  try {
    await pool.query(`DELETE FROM equipes WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao deletar equipe' }); }
});

// =============================================
// STATIC + SPA FALLBACK — SEMPRE POR ÚLTIMO
// =============================================
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Instituto ParaSurf rodando na porta ${PORT}`));
