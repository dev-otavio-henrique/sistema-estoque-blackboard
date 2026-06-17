// ─── Variáveis globais da página de loja ───
let lojaId = null;
let lojaNome = null;

// ─── Inicializa a página ───
function init() {
    const params = new URLSearchParams(window.location.search);
    lojaId = params.get('id');
    lojaNome = decodeURIComponent(params.get('nome') || 'Loja');

    if (!lojaId) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('titulo-loja').textContent = '🏬 ' + lojaNome;
    document.title = lojaNome;

    carregarEstoque();
    carregarProdutosDropdown();

    // Auto-refresh do estoque a cada 5 segundos
    setInterval(carregarEstoque, 5000);
}

// ─── Calcula o status visual baseado na quantidade ───
function calculaStatus(quantidade, limiar, temAprovada) {
    if (quantidade < limiar) {
        return temAprovada ? 'reposicao' : 'critico';
    }
    return 'adequado';
}

function labelStatus(s) {
    if (s === 'critico') return '🔴 Crítico';
    if (s === 'reposicao') return '🟡 Em Reposição';
    return '🟢 Adequado';
}

// ─── Busca e exibe o estoque da loja ───
async function carregarEstoque() {
    try {
        const [estoques, aprovadas] = await Promise.all([
            fetch(`/api/estoque/loja/${lojaId}`).then(r => {
                if (!r.ok) throw new Error('Falha ao buscar estoque');
                return r.json();
            }),
            fetch('/api/sugestoes/aprovadas').then(r => r.json())
        ]);
        montarTabela(estoques, aprovadas);
        const hora = new Date().toLocaleTimeString('pt-BR');
        document.getElementById('info-atualizacao').textContent =
            `⟳ Última atualização: ${hora}`;
    } catch (e) {
        document.getElementById('tabela-estoque').innerHTML =
            `<div class="alerta erro">❌ Erro: ${e.message}</div>`;
    }
}

// ─── Monta a tabela HTML de estoque ───
function montarTabela(estoques, aprovadas) {
    if (!estoques.length) {
        document.getElementById('tabela-estoque').innerHTML =
            '<div class="alerta info">Nenhum produto no estoque desta loja.</div>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Qtd. Atual</th>
                    <th>Limiar Crítico</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    estoques.forEach(e => {
        const temAprovada = aprovadas.some(s =>
            s.produto.id === e.produto.id && s.lojaDestino.id === e.loja.id
        );
        const s = calculaStatus(e.quantidadeAtual, e.produto.limiar_critico, temAprovada);
        html += `
            <tr class="${s}">
                <td><strong>${e.produto.nome}</strong></td>
                <td>${e.produto.categoria || '—'}</td>
                <td><strong style="font-size:16px">${e.quantidadeAtual}</strong></td>
                <td>${e.produto.limiar_critico}</td>
                <td><span class="badge ${s}">${labelStatus(s)}</span></td>
            </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('tabela-estoque').innerHTML = html;
}

// ─── Preenche o dropdown de produtos para o formulário de venda ───
async function carregarProdutosDropdown() {
    try {
        const resp = await fetch('/api/produtos');
        const produtos = await resp.json();
        const sel = document.getElementById('select-produto');
        sel.innerHTML = '<option value="">Selecione um produto...</option>';
        produtos.forEach(p => {
            sel.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
        });
    } catch (e) {
        console.error('Erro ao carregar produtos:', e);
    }
}

// ─── Registra uma venda ───
async function registrarVenda() {
    const produtoId = document.getElementById('select-produto').value;
    const quantidade = parseInt(document.getElementById('input-quantidade').value);
    const msgDiv = document.getElementById('msg-venda');

    if (!produtoId) {
        msgDiv.innerHTML = '<div class="alerta erro">⚠️ Selecione um produto.</div>';
        return;
    }
    if (!quantidade || quantidade <= 0) {
        msgDiv.innerHTML = '<div class="alerta erro">⚠️ Informe uma quantidade válida.</div>';
        return;
    }

    try {
        const resp = await fetch('/api/vendas/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                produtoId: parseInt(produtoId),
                lojaId: parseInt(lojaId),
                quantidade: quantidade
            })
        });

        if (!resp.ok) throw new Error(await resp.text());
        const venda = await resp.json();

        msgDiv.innerHTML = `
            <div class="alerta sucesso">
                ✅ Venda registrada!
                Produto: <strong>${venda.produto.nome}</strong> |
                Quantidade: <strong>${venda.quantidade}</strong> un.
                <br><small>Se o estoque ficou crítico, o Blackboard notificará o Especialista de Reposição automaticamente.</small>
            </div>`;

        document.getElementById('select-produto').value = '';
        document.getElementById('input-quantidade').value = '1';
        carregarEstoque();
    } catch (e) {
        msgDiv.innerHTML = `<div class="alerta erro">❌ ${e.message}</div>`;
    }
}

// ─── Controla qual aba está visível ───
function mostrarTab(tabId, botao) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('ativo'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('ativo'));
    document.getElementById('tab-' + tabId).classList.add('ativo');
    botao.classList.add('ativo');
}

// Inicia tudo quando a página carrega
init();