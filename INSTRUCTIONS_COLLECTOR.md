# Guia de Uso: Agente Coletor de Inventário

Este guia descreve como configurar e executar o **Agente Coletor (`coletor.py`)** em computadores para realizar o inventário automático de hardware.

## 📋 Pré-requisitos

1.  **Python 3.x** instalado na máquina.
    *   [Download Python para Windows](https://www.python.org/downloads/windows/)
2.  **Acesso à Internet** para enviar os dados para o servidor.

## 🚀 Instalação

### 1. Baixe o Script
Você pode baixar o script diretamente pelo **Painel Web**:
1.  Vá em **Configurações > API & Conexões**.
2.  Clique no botão **"Baixar Script (.py)"**.
3.  Salve o arquivo na pasta desejada (ex: `C:\Inventario`).

Alternativamente, o arquivo está em `public/scripts/coletor.py` no projeto.

### 2. Instale as Dependências
Abra o terminal (PowerShell ou Bash) na pasta do arquivo e execute:

```bash
pip install requests
```

> **Nota:** O script utiliza comandos nativos do sistema (`wmic` no Windows e `dmidecode`/arquivos de sistema no Linux), então não são necessárias bibliotecas pesadas.

## ⚙️ Configuração e Execução

O script precisa de duas variáveis de ambiente para funcionar: `SUPABASE_URL` e `SUPABASE_KEY`.

### 🏦 Obter a Chave (API Key)
1.  Acesse o Painel Web do Inventário.
2.  Vá em **Configurações > API & Conexões**.
3.  Gere uma nova chave (ex: "Computadores RH" ou "Servidor 01").
4.  **Copie o Hash da chave** (será usado como `SUPABASE_KEY`).
5.  A `SUPABASE_URL` é a URL do seu projeto Supabase (ex: `https://seu-projeto.supabase.co`).

### 💻 Executando no Windows

Crie um arquivo `executar.bat` na mesma pasta com o seguinte conteúdo (substitua os valores):

```batch
@echo off
set SUPABASE_URL=https://SUA_URL_DO_PROJETO.supabase.co
set SUPABASE_KEY=SUA_CHAVE_AQUI (copiada do painel)

python coletor.py
pause
```

Para rodar, basta clicar duas vezes no `executar.bat`.

### 🐧 Executando no Linux

No terminal:

```bash
export SUPABASE_URL="https://SUA_URL_DO_PROJETO.supabase.co"
export SUPABASE_KEY="SUA_CHAVE_AQUI"

python3 coletor.py
```

## 📅 Agendamento Automático (Opcional)

Para manter o inventário sempre atualizado, você pode agendar a execução.

### Windows (Agendador de Tarefas)
1.  Abra o **Agendador de Tarefas**.
2.  Crie uma nova tarefa básica.
3.  Defina o disparador (ex: Diariamente às 09:00, Ao fazer logon, Ao conectar na rede).
4.  Na ação, escolha "Iniciar um programa".
5.  Programa/Script: `python` (ou caminho completo do executável python).
6.  Argumentos: `coletor.py` (caminho completo).
7.  **Importante:** As variáveis de ambiente devem ser definidas no sistema ou passadas no script `.bat` que será agendado em vez de chamar o python direto. Recomenda-se agendar o `.bat` criado acima.

### Linux (Crontab)
Edite o crontab (`crontab -e`) e adicione uma linha para rodar todo dia às 8h:

```cron
0 8 * * * export SUPABASE_URL=... && export SUPABASE_KEY=... && /usr/bin/python3 /path/to/coletor.py >> /var/log/inventario.log 2>&1
```

## 🛠️ Solução de Problemas

*   **Erro "Requests module not found":** Rode `pip install requests` novamente.
*   **Erro de Conexão:** Verifique se a URL do Supabase está correta e se há internet.
*   **Dados não aparecem no painel:** Verifique se a Chave da API (Key) está correta e não foi revogada. O script exibe `✅ Dados enviados com sucesso` quando funciona.
