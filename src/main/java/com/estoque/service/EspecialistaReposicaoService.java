package com.estoque.service;

import com.estoque.model.*;
import com.estoque.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class EspecialistaReposicaoService {

    @Autowired
    private EstoqueRepository estoqueRepository;

    @Autowired
    private FornecedorCatalogoRepository fornecedorCatalogoRepository;

    @Autowired
    private SugestaoReposicaoRepository sugestaoReposicaoRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private LojaRepository lojaRepository;

    /**
     * Método principal acionado pelo trigger via pg_notify.
     * Recebe o ID do produto e da loja que ficaram com estoque crítico.
     */
    public void analisarReposicao(Long produtoId, Long lojaDestinoId) {
        Produto produto = produtoRepository.findById(produtoId).orElseThrow();
        Loja lojaDestino = lojaRepository.findById(lojaDestinoId).orElseThrow();
        Estoque estoqueCritico = estoqueRepository
            .findByProdutoAndLoja(produto, lojaDestino).orElseThrow();

        int limiar = produto.getLimiar_critico();
        // Regra de transferência: a loja de origem precisa ter >= 6x o limiar para
        // ser considerada "com excedente". A quantidade transferida é sempre
        // exatamente 3x o limiar.
        int limiarExcedente = limiar * 6;
        int quantidadeTransferencia = limiar * 3;

        // Primeira tentativa: verificar se outra loja tem excedente suficiente
        List<Estoque> estoquesDaRede = estoqueRepository.findByProduto(produto);

        for (Estoque estoque : estoquesDaRede) {
            if (estoque.getLoja().getId().equals(lojaDestinoId)) continue;
            boolean temExcedente = estoque.getQuantidadeAtual() >= limiarExcedente;
            if (temExcedente) {
                SugestaoReposicao sugestao = new SugestaoReposicao();
                sugestao.setTipoAcao("TRANSFERENCIA");
                sugestao.setProduto(produto);
                sugestao.setLojaOrigem(estoque.getLoja());
                sugestao.setLojaDestino(lojaDestino);
                sugestao.setQuantidadeRecomendada(quantidadeTransferencia);
                sugestao.setJustificativa(
                    "Estoque crítico em " + lojaDestino.getNome() +
                    " (" + estoqueCritico.getQuantidadeAtual() + " unidades, limiar " + limiar + "). " +
                    estoque.getLoja().getNome() + " possui excedente de " +
                    estoque.getQuantidadeAtual() + " unidades (>= 6x o limiar crítico). " +
                    "Sugerida transferência de " + quantidadeTransferencia + " unidades (3x o limiar)."
                );
                sugestaoReposicaoRepository.save(sugestao);
                return;
            }
        }

        // Segunda tentativa: nenhuma loja com excedente suficiente -> sugere compra de 3 * limiar
        int quantidadeCompra = limiar * 3;
        List<FornecedorCatalogo> fornecedores =
            fornecedorCatalogoRepository.findByProduto(produto);
        if (!fornecedores.isEmpty()) {
            FornecedorCatalogo melhorOpcao = fornecedores.stream()
                .min((a, b) -> a.getPrecoCompra().compareTo(b.getPrecoCompra())).orElseThrow();
            SugestaoReposicao sugestao = new SugestaoReposicao();
            sugestao.setTipoAcao("ORDEM_COMPRA");
            sugestao.setProduto(produto);
            sugestao.setLojaDestino(lojaDestino);
            sugestao.setFornecedor(melhorOpcao.getFornecedor());
            sugestao.setQuantidadeRecomendada(quantidadeCompra);
            sugestao.setJustificativa(
                "Estoque crítico em " + lojaDestino.getNome() +
                " (" + estoqueCritico.getQuantidadeAtual() + " unidades). " +
                "Nenhuma loja com excedente suficiente (>= 6x o limiar) para transferência. " +
                "Fornecedor sugerido: " + melhorOpcao.getFornecedor().getNome() +
                " com preço de R$ " + melhorOpcao.getPrecoCompra() + " por unidade."
            );
            sugestaoReposicaoRepository.save(sugestao);
        }
    }
}