// ─── Inicializa a página do gerente ───
function init() {
    carregarDashboard();
    carregarSugestoes();
    carregarDropdownsModal();

    // Auto-refresh do dashboard a cada 10 segundos
    setInterval(carregarDashboard, 10000);

    // Auto-refresh de sugestões a cada 8 segundos
    // Fundamental para a demo: a sugestão aparece aqui sem nenhum clique
    setInterval(carregarSugestoes, 8000);
}

// ─── Helpers de status e formatação ───
function status(qtd, limiar) {
    if (qtd < limiar) return 'critico';
    if (qtd <= limiar * 1.5) return 'alerta';
    return 'ok';
}

function labelStatus(s) {
    if (s === 'critico') return '🔴 Crítico';
    if (s === 'alerta') return '🟡 Alerta';
    return '🟢 Ok';
}

function formatarData(dataStr) {
    if (!dataStr) return '—';
    return new Date(dataStr).toLocaleString('pt-BR');
}

function formatarMoeda(valor) {
    if (!valor) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Exibe mensagem temporária de feedback nos formulários ───
function msg(elementId, texto, tipo = 'sucesso') {
    const el = document.getElementById(elementId);
    el.innerHTML = `<div class="alerta ${tipo}">${texto}</div>`;
    setTimeout(() => el.innerHTML = '', 4000);
}

// ═══ ABA 1: Dashboard da Rede ═══

async function carregarDashboard() {
    try {
        const [estoques, lojas] = await Promise.all([
            fetch('/api/estoque').then(r => r.json()),
            fetch('/api/lojas').then(r => r.json())
        ]);
        montarDashboard(estoques, lojas);
        const hora = new Date().toLocaleTimeString('pt-BR');
        document.getElementById('info-dashboard').textContent = `⟳ ${hora}`;
    } catch (e) {
        document.getElementById('dashboard-content').innerHTML =
            `<div class="alerta erro">❌ Erro: ${e.message}</div>`;
    }
}

function montarDashboard(estoques, lojas) {
    if (!lojas.length) {
        document.getElementById('dashboard-content').innerHTML =
            '<div class="alerta info">Nenhuma loja cadastrada ainda.</div>';
        return;
    }

    let html = '<div class="dashboard-lojas">';
    lojas.forEach(loja => {
        const estoqueLoja = estoques.filter(e => e.loja.id === loja.id);
        html += `
            <div class="loja-card">
                <div class="loja-header">🏬 ${loja.nome}</div>
                <table>
                    <thead>
                        <tr><th>Produto</th><th>Qtd.</th><th>Limiar</th><th>Status</th></tr>
                    </thead>
                    <tbody>`;

        if (!estoqueLoja.length) {
            html += '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">Sem estoque</td></tr>';
        } else {
            estoqueLoja.forEach(e => {
                const s = status(e.quantidadeAtual, e.produto.limiar_critico);
                html += `
                    <tr class="${s}">
                        <td>${e.produto.nome}</td>
                        <td><strong>${e.quantidadeAtual}</strong></td>
                        <td>${e.produto.limiar_critico}</td>
                        <td><span class="badge ${s}">${labelStatus(s)}</span></td>
                    </tr>`;
            });
        }
        html += '</tbody></table></div>';
    });
    html += '</div>';
    document.getElementById('dashboard-content').innerHTML = html;
}

// ═══ ABA 2: Reposição de Produtos ═══

async function carregarSugestoes() {
    try {
        const sugestoes = await fetch('/api/sugestoes/pendentes').then(r => r.json());
        const badge = document.getElementById('badge');
        if (sugestoes.length > 0) {
            badge.textContent = sugestoes.length;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
        montarSugestoes(sugestoes);
    } catch (e) {
        document.getElementById('sugestoes-content').innerHTML =
            `<div class="alerta erro">❌ Erro: ${e.message}</div>`;
    }
}

function montarSugestoes(sugestoes) {
    const cont = document.getElementById('sugestoes-content');
    if (!sugestoes.length) {
        cont.innerHTML = `
            <div class="alerta sucesso" style="text-align:center; padding:32px;">
                ✅ <strong>Nenhuma sugestão pendente.</strong><br>
                <small style="color:#555;">O sistema continua monitorando automaticamente.</small>
            </div>`;
        return;
    }

    let html = '';
    sugestoes.forEach(s => {
        const eTransf = s.tipoAcao === 'TRANSFERENCIA';
        const detalhe = eTransf
            ? `<strong>De:</strong> ${s.lojaOrigem?.nome || '—'} &nbsp;→&nbsp; <strong>Para:</strong> ${s.lojaDestino?.nome || '—'}`
            : `<strong>Fornecedor:</strong> ${s.fornecedor?.nome || '—'} &nbsp;→&nbsp; <strong>Destino:</strong> ${s.lojaDestino?.nome || '—'}`;

        html += `
            <div class="sugestao-card ${eTransf ? '' : 'compra'}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                        <div class="sugestao-titulo">
                            ${eTransf ? '🔄 Transferência entre lojas' : '🛒 Ordem de compra'} —
                            <strong>${s.produto.nome}</strong>
                        </div>
                        <div class="sugestao-detalhe">
                            ${detalhe} &nbsp;|&nbsp;
                            <strong>Qtd. recomendada:</strong> ${s.quantidadeRecomendada} unidades
                        </div>
                    </div>
                    <span class="badge pendente">${s.status}</span>
                </div>
                <div class="sugestao-justificativa">
                    💬 <strong>Justificativa automática:</strong> ${s.justificativa}
                </div>
                <div class="sugestao-acoes">
                    <button class="btn verde sm" onclick="acao(${s.id}, 'aprovar')">👍 Aprovar</button>
                    <button class="btn vermelho sm" onclick="acao(${s.id}, 'rejeitar')">❌ Rejeitar</button>
                </div>
            </div>`;
    });
    cont.innerHTML = html;
}

async function acao(id, tipo) {
    try {
        if (tipo === 'aprovar') {
            const resp = await fetch(`/api/sugestoes/${id}/aprovar`, { method: 'PATCH' });
            if (!resp.ok) throw new Error(await resp.text());
            await carregarSugestoes();
            alert('👍 Sugestão aprovada! Os produtos estão a caminho!');
            // executa após 10 segundos (simula tempo de compra/transferência)
            setTimeout(async () => {
                try {
                    const respExec = await fetch(`/api/sugestoes/${id}/executada`, { method: 'PATCH' });
                    if (respExec.ok) {
                        await carregarSugestoes();
                        await carregarDashboard();
                    }
                } catch (e) {
                    console.error('[BLACKBOARD] Erro ao executar sugestão automaticamente:', e);
                }
            }, 10000);
        } else if (tipo === 'rejeitar') {
            const resp = await fetch(`/api/sugestoes/${id}/rejeitar`, { method: 'PATCH' });
            if (!resp.ok) throw new Error(await resp.text());
            await carregarSugestoes();
        }
    } catch (e) {
        alert('❌ Erro: ' + e.message);
    }
}


async function carregarDropdownsModal() {
    try {
        const [lojas, produtos, fornecedores] = await Promise.all([
            fetch('/api/lojas').then(r => r.json()),
            fetch('/api/produtos').then(r => r.json()),
            fetch('/api/fornecedores').then(r => r.json())
        ]);

        const selLoja = document.getElementById('modal-loja');
        selLoja.innerHTML = '<option value="">Selecione a loja...</option>';
        lojas.forEach(l => {
            selLoja.innerHTML += `<option value="${l.id}">${l.nome}</option>`;
        });

        const selProduto = document.getElementById('modal-produto');
        selProduto.innerHTML = '<option value="">Selecione o produto...</option>';
        produtos.forEach(p => {
            selProduto.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
        });

        const selProdForn = document.getElementById('prod-fornecedor');
        if (selProdForn) {
            selProdForn.innerHTML = '<option value="">Selecione um fornecedor...</option>';
            fornecedores.forEach(f => {
                selProdForn.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
            });
        }
    } catch (e) {
        console.error('Erro ao carregar dropdowns:', e);
    }
}


function abrirModalCompra() {
    document.getElementById('modal-loja').value = '';
    document.getElementById('modal-produto').value = '';
    document.getElementById('modal-quantidade').value = '1';
    document.getElementById('modal-overlay').classList.add('aberto');
}

function fecharModalCompra() {
    document.getElementById('modal-overlay').classList.remove('aberto');
}

async function finalizarCompraAvulsa() {
    const lojaId = document.getElementById('modal-loja').value;
    const produtoId = document.getElementById('modal-produto').value;
    const quantidade = parseInt(document.getElementById('modal-quantidade').value);

    if (!lojaId || !produtoId || !quantidade || quantidade <= 0) {
        alert('⚠️ Preencha todos os campos com valores válidos.');
        return;
    }

    try {
        const resp = await fetch('/api/sugestoes/compra-avulso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                produtoId: parseInt(produtoId),
                lojaId: parseInt(lojaId),
                quantidade: quantidade
            })
        });

        if (!resp.ok) throw new Error(await resp.text());

        fecharModalCompra();
        alert('✅ Compra finalizada! Os produtos estão a caminho!');
        setTimeout(async () => {
            await carregarDashboard();
        }, 10000);

    } catch (e) {
        alert('❌ Erro ao realizar compra: ' + e.message);
    }
}

// ═══ ABA 3: Histórico de Vendas ═══

async function carregarVendas() {
    document.getElementById('vendas-content').innerHTML =
        '<div class="loading">Carregando vendas...</div>';
    try {
        const vendas = await fetch('/api/vendas').then(r => r.json());
        montarTabelaVendas(vendas);
    } catch (e) {
        document.getElementById('vendas-content').innerHTML =
            `<div class="alerta erro">❌ Erro: ${e.message}</div>`;
    }
}

function montarTabelaVendas(vendas) {
    const cont = document.getElementById('vendas-content');
    if (!vendas.length) {
        cont.innerHTML = '<div class="alerta info">Nenhuma venda registrada ainda.</div>';
        return;
    }

    // Ordena por data mais recente primeiro
    vendas.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));

    let html = `
        <div class="tabela-historico">
        <table>
            <thead>
                <tr>
                    <th>Data / Hora</th>
                    <th>Produto</th>
                    <th>Loja</th>
                    <th>Quantidade</th>
                    <th>Preço Unit.</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>`;

    vendas.forEach(v => {
        const total = v.quantidade * v.precoUnitario;
        html += `
            <tr>
                <td>${formatarData(v.dataVenda)}</td>
                <td><strong>${v.produto.nome}</strong></td>
                <td>${v.loja.nome}</td>
                <td>${v.quantidade} un.</td>
                <td>${formatarMoeda(v.precoUnitario)}</td>
                <td><strong>${formatarMoeda(total)}</strong></td>
            </tr>`;
    });

    html += '</tbody></table></div>';
    cont.innerHTML = html;
}

// ═══ ABA 4: Compras e Transferências Executadas ═══

async function carregarHistorico() {
    document.getElementById('historico-content').innerHTML =
        '<div class="loading">Carregando histórico...</div>';
    try {
        const historico = await fetch('/api/sugestoes/executadas').then(r => r.json());
        montarTabelaHistorico(historico);
    } catch (e) {
        document.getElementById('historico-content').innerHTML =
            `<div class="alerta erro">❌ Erro: ${e.message}</div>`;
    }
}

function montarTabelaHistorico(historico) {
    const cont = document.getElementById('historico-content');
    if (!historico.length) {
        cont.innerHTML = '<div class="alerta info">Nenhuma compra ou transferência executada ainda.</div>';
        return;
    }

    // Ordena por data mais recente primeiro
    historico.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));

    let html = `
        <div class="tabela-historico">
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Produto</th>
                    <th>Origem → Destino</th>
                    <th>Quantidade</th>
                    <th>Detalhes</th>
                </tr>
            </thead>
            <tbody>`;

    historico.forEach(h => {
        const eTransf = h.tipoAcao === 'TRANSFERENCIA';
        const tipoBadge = eTransf
            ? `<span class="tipo-transf-badge">🔄 Transferência</span>`
            : `<span class="tipo-compra-badge">🛒 Compra</span>`;

        const origem = eTransf
            ? `${h.lojaOrigem?.nome || '—'} → ${h.lojaDestino?.nome || '—'}`
            : `${h.fornecedor?.nome || 'Avulsa'} → ${h.lojaDestino?.nome || '—'}`;

        html += `
            <tr>
                <td>${formatarData(h.dataCriacao)}</td>
                <td>${tipoBadge}</td>
                <td><strong>${h.produto.nome}</strong></td>
                <td>${origem}</td>
                <td>${h.quantidadeRecomendada} un.</td>
                <td style="font-size:12px; color:#666; max-width:200px;">${h.justificativa || '—'}</td>
            </tr>`;
    });

    html += '</tbody></table></div>';
    cont.innerHTML = html;
}

// ═══ ABA 5: Cadastros ═══

async function cadastrarProduto() {
    const nome = document.getElementById('prod-nome').value;
    const categoria = document.getElementById('prod-cat').value;
    const preco_venda = parseFloat(document.getElementById('prod-preco').value);
    const limiar_critico = parseInt(document.getElementById('prod-limiar').value);
    const fornecedorId = document.getElementById('prod-fornecedor').value;
    const precoCompra = parseFloat(document.getElementById('prod-preco-compra').value);

    if (!nome || !preco_venda || !limiar_critico) {
        msg('msg-produto', '⚠️ Preencha nome, preço de venda e limiar crítico.', 'erro');
        return;
    }

    // Fornecedor agora é obrigatório
    if (!fornecedorId || !precoCompra || isNaN(precoCompra) || precoCompra <= 0) {
        msg('msg-produto', '⚠️ Selecione um fornecedor e informe o preço de compra.', 'erro');
        return;
    }

    try {
        // Passo 1: cria o produto
        const resp = await fetch('/api/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, categoria, preco_venda, limiar_critico })
        });
        if (!resp.ok) throw new Error(await resp.text());
        const produto = await resp.json();

        // Passo 2: vincula o fornecedor ao produto (agora sempre executa)
        const respCat = await fetch('/api/fornecedores/catalogo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fornecedor: { id: parseInt(fornecedorId) },
                produto: { id: produto.id },
                precoCompra: precoCompra
            })
        });
        if (!respCat.ok) throw new Error('Produto criado, mas erro ao vincular fornecedor: ' + await respCat.text());

        msg('msg-produto', '✅ Produto cadastrado e fornecedor vinculado com sucesso!');
        ['prod-nome', 'prod-cat', 'prod-preco', 'prod-limiar', 'prod-preco-compra']
            .forEach(id => document.getElementById(id).value = '');
        document.getElementById('prod-fornecedor').value = '';
        carregarDropdownsModal();

    } catch (e) {
        msg('msg-produto', `❌ ${e.message}`, 'erro');
    }
}

async function cadastrarFornecedor() {
    const nome = document.getElementById('forn-nome').value;
    const contato = document.getElementById('forn-contato').value;

    if (!nome) {
        msg('msg-forn', '⚠️ Preencha o nome do fornecedor.', 'erro');
        return;
    }
    try {
        const resp = await fetch('/api/fornecedores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, contato })
        });
        if (!resp.ok) throw new Error(await resp.text());
        msg('msg-forn', '✅ Fornecedor cadastrado com sucesso!');
        ['forn-nome', 'forn-contato'].forEach(id =>
            document.getElementById(id).value = '');
        carregarDropdownsModal(); // atualiza o dropdown de fornecedores no cadastro de produto
    } catch (e) {
        msg('msg-forn', `❌ ${e.message}`, 'erro');
    }
}

// ─── Controla qual aba está ativa ───
// Quando muda para Vendas ou Histórico, carrega os dados automaticamente
function mostrarTab(tabId, botao) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('ativo'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('ativo'));
    document.getElementById('tab-' + tabId).classList.add('ativo');
    botao.classList.add('ativo');

    // Carrega os dados quando a aba é aberta pela primeira vez
    if (tabId === 'vendas') carregarVendas();
    if (tabId === 'historico') carregarHistorico();
}

// Inicia tudo
init();