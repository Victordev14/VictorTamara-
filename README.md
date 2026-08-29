# VictorLeads

Aplicação de captação, organização e prospecção de leads — por **VictorTech**.

Fluxo: **Captar → Organizar → Qualificar → Prospectar**

## Estrutura

- **Buscar Leads** — seleção de localização em mapa, categorias/segmentos, fonte de dados (Google Maps / Foursquare) e filtro de captura, com busca simulada.
- **Leads** — lista de leads com abas (Ativos, Qualificados, Em Contato, Arquivados), busca, importação de CSV, escaneamento de presença digital e detalhes do lead.
- **Automação** — automações de prospecção agendadas (ativa, pausada, concluída).
- **VictorZap** — WhatsApp integrado: painel, conexão, campanhas, conversas e scripts.
- **Configurações** — DDI, chaves de API (Google Maps / Foursquare), automação e dados locais.

## Rodando localmente

Como é uma aplicação estática (sem backend), basta servir a pasta com qualquer servidor HTTP, por exemplo:

```bash
python3 -m http.server 8080
```

E abrir `http://localhost:8080`.

## Armazenamento

Todo o estado (leads, automações, campanhas, conversas, scripts e configurações) é salvo no `localStorage` do navegador. Não há backend nem autenticação neste protótipo.
