const http = require('node:http');
const { URL } = require('node:url');

const status = ['pendente', 'pronto', 'cancelado'];
let orders = [];
let nextId = 1;

function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

function lerBody(req, callback) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      callback(null, JSON.parse(body));
    } catch {
      callback(new Error('JSON inválido'));
    }
  });
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const partes = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  if (method === 'GET' && partes.length === 1 && partes[0] === 'orders') {
    const status = url.searchParams.get('status');
    if (status) {
      if (!status.includes(status)) {
        return responder(res, 400, { erro: 'Status inválido' });
      }
      return responder(res, 200, orders.filter((o) => o.status === status));
    }
    return responder(res, 200, orders);
  }

  if (method === 'POST' && partes.length === 1 && partes[0] === 'orders') {
    return lerBody(req, (err, dados) => {
      if (err || !dados?.client || !dados?.item) {
        return responder(res, 400, { erro: 'Preencha todos os campos' });
      }
      const novoPedido = {
        id: nextId++,
        cliente: dados.client,
        item: dados.item,
        status: 'pendente',
      };
      orders.push(novoPedido);
      return responder(res, 201, novoPedido);
    });
  }

  if (partes.length === 2 && partes[0] === 'orders') {
    const id = Number(partes[1]);
    const index = orders.findIndex((o) => o.id === id);

    if (index === -1) {
      return responder(res, 404, { erro: 'Pedido não encontrado' });
    }

    if (method === 'GET') {
      return responder(res, 200, orders[index]);
    }

    if (method === 'DELETE') {
      orders.splice(index, 1);
      res.writeHead(204);
      return res.end();
    }
  }

  if (method === 'PATCH' && partes.length === 3 && partes[0] === 'orders' && partes[2] === 'status') {
    const id = Number(partes[1]);
    const pedido = orders.find((o) => o.id === id);

    if (!pedido) {
      return responder(res, 404, { erro: 'Pedido não encontrado' });
    }

    return lerBody(req, (err, dados) => {
      if (err || !status.includes(dados?.status)) {
        return responder(res, 400, { erro: 'Status inválido' });
      }
      pedido.status = dados.status;
      return responder(res, 200, pedido);
    });
  }

  return responder(res, 404, { erro: 'Rota ou método não encontrado' });
});

servidor.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));