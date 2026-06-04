# sistema-estoque-blackboard
Sistema de Controle de Estoque com Arquitetura Blackboard

## Pré-requisitos

- Java 17 ou superior
- Maven 3.6.0 ou superior
- PostgreSQL 12 ou superior


## Como configurar o banco de dados

### Passo 1: Criar usuário e banco
1. Abra pgAdmin
2. Clique em "Servers" → "PostgreSQL 18" (ou sua versão)
3. Clique com botão direito em "Login/Group Roles" → "Create" → "Login/Group Role"
4. Preencha:
   - **Em General -> Name**: estoque_user
   - **Em Definition -> Password**: senha_segura_123
5. Clique em "Databases" → "Create" → "Database"
6. Preencha:
   - **Database**: estoque_db
   - **Owner**: estoque_user
  
Obs.: A aplicação cria as tabelas automaticamente (Hibernate).
Os dados de teste são inseridos automaticamente (data.sql).

## Como rodar

1. Clone o repositório;
2. Na pasta do projeto, execute:
```bash
   mvn clean install
   mvn spring-boot:run
```
3. Acesse http://localhost:8080

