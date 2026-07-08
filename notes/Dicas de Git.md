# 🐙 Dicas e Atalhos Rápidos de Git

Um guia prático de comandos Git essenciais para usar no dia a dia do desenvolvimento de sistemas e portfólios no GitHub.

## 🛠️ Configuração Inicial
Configure seu nome e e-mail que aparecerão nos commits:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@gmail.com"
```

## 🔄 Fluxo de Trabalho Básico
Os comandos mais usados para versionar arquivos locais:

### 1. Iniciar repositório
```bash
git init
```

### 2. Verificar status dos arquivos
```bash
git status
```

### 3. Adicionar arquivos para a área de preparação (Staging)
```bash
# Adiciona um arquivo específico:
git add nome-do-arquivo.txt

# Adiciona todos os arquivos (respeitando o .gitignore):
git add .
```

### 4. Commitar as alterações com uma mensagem descritiva
```bash
git commit -m "feat: adicionar nova funcionalidade de busca"
```

## 🚀 Enviando para o GitHub (Repositório Remoto)

### Conectar o repositório local ao GitHub
```bash
git remote add origin https://github.com/Vortexyweb/nome-do-repositorio.git
```

### Renomear a branch padrão para main (Recomendado)
```bash
git branch -M main
```

### Enviar os arquivos locais pela primeira vez (Linkando a branch local com a remota)
```bash
git push -u origin main
```

### Enviar atualizações nos próximos commits
```bash
git push
```

## ⚠️ Dica de Ouro: `.gitignore`
Sempre crie um arquivo `.gitignore` na raiz do seu projeto **antes** do primeiro commit para evitar subir lixo de compilação (como `node_modules/` ou `__pycache__/`) e senhas (`.env`).
