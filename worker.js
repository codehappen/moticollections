export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/products') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT data FROM products ORDER BY pos').all();
        return Response.json(results.map(r => JSON.parse(r.data)), { headers: { 'Cache-Control': 'no-store' } });
      }
      if (request.method === 'PUT') {
        if (!isAdmin(request, env)) return new Response('Unauthorized', { status: 401 });
        let list;
        try { list = await request.json(); } catch (e) { return new Response('Bad request', { status: 400 }); }
        if (!Array.isArray(list) || list.length > 200) return new Response('Bad request', { status: 400 });
        const stmts = [env.DB.prepare('DELETE FROM products')];
        list.forEach((p, i) => {
          stmts.push(env.DB.prepare('INSERT INTO products (id, pos, data) VALUES (?, ?, ?)').bind(String(p.id), i, JSON.stringify(p)));
        });
        await env.DB.batch(stmts);
        return Response.json({ ok: true });
      }
      return new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname === '/api/auth') {
      return isAdmin(request, env) ? Response.json({ ok: true }) : new Response('Unauthorized', { status: 401 });
    }

    return env.ASSETS.fetch(request);
  }
};

function isAdmin(request, env) {
  const h = request.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const secret = env.ADMIN_TOKEN || '';
  if (!secret || token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
