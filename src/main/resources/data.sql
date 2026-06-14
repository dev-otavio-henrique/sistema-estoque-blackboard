-- Lojas da rede
INSERT INTO loja (nome, endereco) VALUES
('Loja Norte', 'Rua A, 100 - Zona Norte'),
('Loja Sul', 'Avenida B, 200 - Zona Sul');

-- Produtos com limiares críticos definidos
INSERT INTO produto (nome, categoria, preco_venda, limiar_critico) VALUES
('Água Mineral 1.5L', 'Bebidas', 3.50, 20),
('Feijão 1kg', 'Alimentos', 8.00, 15),
('Arroz 5kg', 'Alimentos', 25.00, 10);

-- Fornecedores
INSERT INTO fornecedor (nome, contato) VALUES
('Fornecedor A','contato@fornecedora.com'),
('Fornecedor B', 'contato@fornecedorb.com');

-- Quais produtos cada fornecedor vende
INSERT INTO fornecedor_catalogo (fornecedor_id, produto_id, preco_compra) VALUES
(1, 1, 2.00),
(1, 2, 5.00),
(2, 3, 15.00);

-- Estoque inicial das lojas (a Loja Sul tem mais estoque para demonstrar transferência)
INSERT INTO estoque (produto_id, loja_id, quantidade_atual) VALUES
(1, 1, 25),
(1, 2, 50),
(2, 1, 18),
(2, 2, 30),
(3, 1, 12),
(3, 2, 20);