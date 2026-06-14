package com.estoque.service;

import com.estoque.model.*;
import com.estoque.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class SugestaoReposicaoService {

    @Autowired
    private SugestaoReposicaoRepository sugestaoRepository;

    @Autowired
    private EstoqueRepository estoqueRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private LojaRepository lojaRepository;

    @Autowired
    private FornecedorCatalogoRepository fornecedorCatalogoRepository;

    public List<SugestaoReposicao> obterTodas() {
        return sugestaoRepository.findAll();
    }

    public List<SugestaoReposicao> obterPendentes() {
        return sugestaoRepository.findByStatus("PENDENTE");
    }

    // Retorna transferências e compras que já foram executadas (histórico)
    public List<SugestaoReposicao> obterExecutadas() {
        return sugestaoRepository.findByStatus("EXECUTADA");
    }

    public Optional<SugestaoReposicao> obterPorId(Long id) {
        return sugestaoRepository.findById(id);
    }

    public SugestaoReposicao aprovar(Long id) {
        return atualizarStatus(id, "APROVADA");
    }

    public SugestaoReposicao rejeitar(Long id) {
        return atualizarStatus(id, "REJEITADA");
    }

    @Transactional
    public SugestaoReposicao marcarExecutada(Long id) {
        SugestaoReposicao sugestao = sugestaoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sugestão não encontrada: ID " + id));
        if ("TRANSFERENCIA".equals(sugestao.getTipoAcao())) {
            executarTransferencia(sugestao);
        } else if ("ORDEM_COMPRA".equals(sugestao.getTipoAcao())) {
            executarOrdemCompra(sugestao);
        }
        sugestao.setStatus("EXECUTADA");
        return sugestaoRepository.save(sugestao);
    }

  
    @Transactional
    public SugestaoReposicao compraAvulso(Long produtoId, Long lojaId, Integer quantidade) {

        Produto produto = produtoRepository.findById(produtoId)
            .orElseThrow(() -> new RuntimeException("Produto não encontrado: ID " + produtoId));
        Loja loja = lojaRepository.findById(lojaId)
            .orElseThrow(() -> new RuntimeException("Loja não encontrada: ID " + lojaId));
        Estoque estoque = estoqueRepository.findByProdutoAndLoja(produto, loja)
            .orElseGet(() -> {
                Estoque novo = new Estoque();
                novo.setProduto(produto);
                novo.setLoja(loja);
                novo.setQuantidadeAtual(0);
                return estoqueRepository.save(novo);
            });

        List<FornecedorCatalogo> fornecedores = fornecedorCatalogoRepository.findByProduto(produto);
        FornecedorCatalogo melhorFornecedor = fornecedores.stream()
            .min((a, b) -> a.getPrecoCompra().compareTo(b.getPrecoCompra()))
            .orElse(null);
        int novoEstoque = estoque.getQuantidadeAtual() + quantidade;
        estoque.setQuantidadeAtual(novoEstoque);
        estoqueRepository.save(estoque);
        SugestaoReposicao compra = new SugestaoReposicao();
        compra.setTipoAcao("ORDEM_COMPRA");
        compra.setProduto(produto);
        compra.setLojaDestino(loja);
        compra.setQuantidadeRecomendada(quantidade);
        compra.setStatus("EXECUTADA");
        String justificativa = "Compra avulsa de " + quantidade + "x " + produto.getNome()
            + " para " + loja.getNome() + ".";

        if (melhorFornecedor != null) {
            compra.setFornecedor(melhorFornecedor.getFornecedor());
            justificativa += " Fornecedor: " + melhorFornecedor.getFornecedor().getNome()
                + " | Preço unitário: R$ " + String.format("%.2f", melhorFornecedor.getPrecoCompra());
        } else {
            justificativa += " Nenhum fornecedor cadastrado para este produto.";
        }
        compra.setJustificativa(justificativa);
        System.out.println("[COMPRA AVULSA] " + quantidade + "x " + produto.getNome()
            + " → " + loja.getNome() + " | Novo estoque: " + novoEstoque);
        return sugestaoRepository.save(compra);
    }
    
    
    private void executarTransferencia(SugestaoReposicao sugestao) {
        int quantidade = sugestao.getQuantidadeRecomendada();
        Estoque estoqueOrigem = estoqueRepository
            .findByProdutoAndLoja(sugestao.getProduto(), sugestao.getLojaOrigem())
            .orElseThrow(() -> new RuntimeException(
                "Estoque de origem não encontrado para o produto "
                + sugestao.getProduto().getNome()
                + " na loja " + sugestao.getLojaOrigem().getNome()));

        int novaQuantidadeOrigem = estoqueOrigem.getQuantidadeAtual() - quantidade;
        if (novaQuantidadeOrigem < 0) {
            throw new RuntimeException(
                "Estoque insuficiente na loja de origem. "
                + "Disponível: " + estoqueOrigem.getQuantidadeAtual()
                + " | Necessário: " + quantidade);
        }
        estoqueOrigem.setQuantidadeAtual(novaQuantidadeOrigem);
        estoqueRepository.save(estoqueOrigem);

        Estoque estoqueDestino = estoqueRepository
            .findByProdutoAndLoja(sugestao.getProduto(), sugestao.getLojaDestino())
            .orElseThrow(() -> new RuntimeException(
                "Estoque de destino não encontrado para o produto "
                + sugestao.getProduto().getNome()
                + " na loja " + sugestao.getLojaDestino().getNome()));

        estoqueDestino.setQuantidadeAtual(estoqueDestino.getQuantidadeAtual() + quantidade);
        estoqueRepository.save(estoqueDestino);

        System.out.println("[BLACKBOARD] Transferência executada: "
            + quantidade + "x " + sugestao.getProduto().getNome()
            + " | De: " + sugestao.getLojaOrigem().getNome()
            + " → Para: " + sugestao.getLojaDestino().getNome());
    }

    private void executarOrdemCompra(SugestaoReposicao sugestao) {
        int quantidade = sugestao.getQuantidadeRecomendada();
        Estoque estoqueDestino = estoqueRepository
            .findByProdutoAndLoja(sugestao.getProduto(), sugestao.getLojaDestino())
            .orElseThrow(() -> new RuntimeException(
                "Estoque de destino não encontrado para o produto "
                + sugestao.getProduto().getNome()
                + " na loja " + sugestao.getLojaDestino().getNome()));

        estoqueDestino.setQuantidadeAtual(estoqueDestino.getQuantidadeAtual() + quantidade);
        estoqueRepository.save(estoqueDestino);

        System.out.println("[BLACKBOARD] Ordem de compra executada: "
            + quantidade + "x " + sugestao.getProduto().getNome()
            + " | Fornecedor: " + sugestao.getFornecedor().getNome()
            + " | Loja destino: " + sugestao.getLojaDestino().getNome());
    }

    private SugestaoReposicao atualizarStatus(Long id, String novoStatus) {
        return sugestaoRepository.findById(id).map(sugestao -> {
            sugestao.setStatus(novoStatus);
            return sugestaoRepository.save(sugestao);
        }).orElseThrow(() -> new RuntimeException("Sugestão não encontrada: ID " + id));
    }
}