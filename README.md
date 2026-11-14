# DEF Engenharia

Repositório do site e dos sistemas da DEF Engenharia, empresa de engenharia elétrica de Porto Velho, Rondônia.

| Pasta | O que tem |
| --- | --- |
| `index.html` e `assets/site/` | Site da empresa, que abre na raiz do endereço |
| `sistema/` | DEF Obras, o sistema de orçamento e controle de obras |
| `assets/logo/` | Logo da empresa em SVG e PNG, com um guia rápido de uso |
| `tests/` | Testes automáticos dos cálculos e do sistema no navegador |

## Site

Página única com os serviços, como funciona o atendimento, para quem a empresa trabalha e os contatos. Com o GitHub Pages ativo, abre em `https://diogopvhlp-cmd.github.io/`.

Os contatos ficam no fim do arquivo `index.html`, na seção "Contato": telefone e WhatsApp, e-mail e responsável técnico. O número do WhatsApp e o e-mail aparecem duas vezes cada um, no botão (links `wa.me` e `mailto:`) e na lista de dados, e precisam ser trocados nos dois lugares.

## DEF Obras

Sistema para montar orçamentos de serviços elétricos, gerar a proposta em PDF e acompanhar a obra depois da aprovação. O nome é provisório.

Com o GitHub Pages ativo, o sistema abre em `https://diogopvhlp-cmd.github.io/sistema/`. Para usar sem internet, baixe o repositório e abra o arquivo `sistema/index.html` no navegador.

### O que ele faz

- **Clientes**: cadastro com documento, contato e endereço.
- **Catálogo**: serviços e materiais com custo unitário de material e de mão de obra, para preencher os orçamentos mais rápido.
- **Orçamentos**: etapas e itens com quantidade, material e mão de obra. O BDI é aplicado sobre o custo e o desconto é abatido no final. Os totais são recalculados enquanto você digita.
- **Proposta**: página pronta para imprimir ou salvar em PDF, com logo, dados do cliente, itens, total, condições e assinaturas. O BDI e os custos internos não aparecem para o cliente.
- **Obras**: um orçamento aprovado vira obra, com avanço por etapa, lançamento de custos e comparação entre o previsto e o realizado.
- **Painel**: orçamentos em aberto, obras em andamento e lembrete de backup.

### Onde os dados ficam

Os dados ficam guardados só no navegador do aparelho em que foram digitados. Nada é enviado para o GitHub nem para outro servidor, e quem abrir o mesmo endereço em outro aparelho vê um sistema vazio.

Por isso:

- faça backup com frequência em **Configurações > Baixar backup**;
- para trocar de computador ou de navegador, baixe o backup no antigo e use **Restaurar backup** no novo;
- limpar os dados de navegação do site apaga os orçamentos que não estiverem em um backup.

### Como os valores são calculados

- Custo unitário = material + mão de obra.
- Preço unitário = custo unitário × (1 + BDI), arredondado para centavos.
- Preço do item = quantidade × preço unitário.
- Total do orçamento = soma dos itens − desconto.
- Avanço da obra = média do avanço das etapas, ponderada pelo preço de cada etapa.
- Desvio de custo = custo realizado − custo previsto para o avanço atual.

O BDI padrão de 25% e a validade de 15 dias são valores de partida. Ajuste em **Configurações** conforme os seus custos e impostos.

## Desenvolvimento

O sistema é feito em HTML, CSS e JavaScript puros, sem etapa de compilação e sem dependências.

| Arquivo | Função |
| --- | --- |
| `sistema/js/calc.js` | Cálculos de orçamento e de obra, sem acesso à tela |
| `sistema/js/store.js` | Leitura, gravação, backup e restauração dos dados |
| `sistema/js/ui.js` | Formatação de valores e datas, avisos e utilitários de tela |
| `sistema/js/views-*.js` | As telas do sistema |
| `sistema/js/app.js` | Navegação e ligação dos eventos |

Testes dos cálculos, na raiz do repositório:

```
node --test
```

Teste do sistema inteiro no navegador. Precisa do [Playwright](https://playwright.dev) instalado e de um servidor local:

```
python3 -m http.server 8765
node tests/e2e/smoke.js http://localhost:8765 /tmp/def-obras-teste
```
