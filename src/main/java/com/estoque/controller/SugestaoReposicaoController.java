package com.estoque.controller;

import com.estoque.dto.CompraAvulsoRequestDTO;
import com.estoque.model.SugestaoReposicao;
import com.estoque.service.SugestaoReposicaoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sugestoes")
public class SugestaoReposicaoController {

    @Autowired
    private SugestaoReposicaoService sugestaoService;

    @GetMapping
    public List<SugestaoReposicao> obterTodas() {
        return sugestaoService.obterTodas();
    }

    @GetMapping("/pendentes")
    public List<SugestaoReposicao> obterPendentes() {
        return sugestaoService.obterPendentes();
    }

  
    @GetMapping("/executadas")
    public List<SugestaoReposicao> obterExecutadas() {
        return sugestaoService.obterExecutadas();
    }
    
    @GetMapping("/aprovadas")
    public List<SugestaoReposicao> obterAprovadas() {
        return sugestaoService.obterAprovadas();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SugestaoReposicao> obterPorId(@PathVariable Long id) {
        return sugestaoService.obterPorId(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/aprovar")
    public ResponseEntity<?> aprovar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(sugestaoService.aprovar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/rejeitar")
    public ResponseEntity<?> rejeitar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(sugestaoService.rejeitar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/executada")
    public ResponseEntity<?> marcarExecutada(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(sugestaoService.marcarExecutada(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

  
    @PostMapping("/compra-avulso")
    public ResponseEntity<?> compraAvulso(@RequestBody CompraAvulsoRequestDTO request) {
        try {
            return ResponseEntity.ok(sugestaoService.compraAvulso(
                request.getProdutoId(),
                request.getLojaId(),
                request.getQuantidade()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}