/* Telas: lista de orçamentos, editor do orçamento e proposta para impressão. */
(function () {
  'use strict';
  var DEF = window.DEF;
  var ui = DEF.ui;
  var store = DEF.store;
  var calc = DEF.calc;
  var esc = ui.esc;
  var V = (DEF.views = DEF.views || {});

  function naoEncontrado() {
    return ui.cabecalho('Orçamento não encontrado', 'Ele pode ter sido excluído.') +
      '<p><a class="botao" href="#/orcamentos">Voltar para os orçamentos</a></p>';
  }
  ui.naoEncontrado = naoEncontrado;

  function nomeCliente(orc) {
    var c = store.cliente(orc.clienteId);
    return c ? c.nome : 'Sem cliente';
  }
  ui.nomeCliente = nomeCliente;

  // ------------------------------------------------------- Lista de orçamentos
  var filtro = '';

  V.orcamentos = {
    aoEntrar: function (rota) {
      if (rota.id === 'novo') return '#/orcamento/' + store.novoOrcamento().id;
      return null;
    },
    render: function () {
      var d = store.dados();
      var lista = d.orcamentos.filter(function (o) { return !filtro || o.status === filtro; });
      var html = ui.cabecalho('Orçamentos', 'Do rascunho à proposta aprovada.',
        '<a class="botao primario" href="#/orcamentos/novo">' + ui.ICONES.mais + 'Novo orçamento</a>');
      html += '<section class="cartao">';
      if (!d.orcamentos.length) {
        html += '<p class="vazio">Nenhum orçamento ainda.</p></section>';
        return html;
      }
      html += '<label class="rotulo filtro">Mostrar<select data-filtro="status"><option value="">Todos</option>' +
        ui.opcoes(store.STATUS_ORCAMENTO, filtro, ui.ROTULO_STATUS) + '</select></label>';
      if (!lista.length) {
        html += '<p class="vazio">Nenhum orçamento nesta situação.</p>';
      } else {
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Número</th><th>Título</th><th>Cliente</th><th>Data</th><th>Situação</th><th class="num">Total</th><th><span class="oculto">Ações</span></th></tr></thead><tbody>';
        lista.forEach(function (o) {
          var id = esc(o.id);
          html += '<tr><td><a href="#/orcamento/' + id + '">' + esc(o.numero) + '</a></td><td>' + esc(o.titulo || 'Sem título') + '</td><td>' + esc(nomeCliente(o)) +
            '</td><td>' + ui.data(o.data) + '</td><td>' + ui.etiqueta(o.status) + '</td><td class="num">' + ui.dinheiro(calc.orcamentoTotais(o).total) +
            '</td><td class="acoes-linha"><a class="botao pequeno" href="#/orcamento/' + id + '">Abrir</a>' +
            '<a class="botao pequeno" href="#/proposta/' + id + '">Proposta</a>' +
            '<button type="button" class="botao pequeno" data-acao="duplicar" data-id="' + id + '">Duplicar</button>' +
            '<button type="button" class="botao pequeno perigo" data-acao="excluir" data-id="' + id + '">Excluir</button></td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</section>';
      return html;
    },
    acoes: {
      duplicar: function (el) {
        var copia = store.duplicarOrcamento(el.dataset.id);
        if (copia) { ui.aviso('Orçamento duplicado.'); location.hash = '#/orcamento/' + copia.id; }
      },
      excluir: function (el) {
        var d = store.dados();
        var o = store.orcamento(el.dataset.id);
        if (!o) return;
        var extra = o.obra ? ' A obra e os custos lançados também serão apagados.' : '';
        if (!window.confirm('Excluir o orçamento ' + o.numero + '?' + extra)) return;
        d.orcamentos = d.orcamentos.filter(function (x) { return x.id !== o.id; });
        store.salvar();
        DEF.app.desenhar();
      }
    },
    aoMudar: function (el) {
      if (el.dataset.filtro === 'status') { filtro = el.value; DEF.app.desenhar(); }
    }
  };

  // ------------------------------------------------------ Editor do orçamento
  var focoPendente = null;

  function linhaItem(item, bdi) {
    var id = esc(item.id);
    return (
      '<tr data-item="' + id + '">' +
      '<td><input class="texto" data-item-campo="descricao" list="lista-catalogo" value="' + esc(item.descricao) + '" aria-label="Descrição do item" autocomplete="off"></td>' +
      '<td><input class="curto" data-item-campo="unidade" value="' + esc(item.unidade) + '" aria-label="Unidade" autocomplete="off"></td>' +
      '<td><input class="numero" inputmode="decimal" data-item-campo="quantidade" value="' + ui.campoNumero(item.quantidade) + '" aria-label="Quantidade" autocomplete="off"></td>' +
      '<td><input class="numero" inputmode="decimal" data-item-campo="material" value="' + ui.campoNumero(item.material) + '" aria-label="Custo de material por unidade" autocomplete="off"></td>' +
      '<td><input class="numero" inputmode="decimal" data-item-campo="maoDeObra" value="' + ui.campoNumero(item.maoDeObra) + '" aria-label="Custo de mão de obra por unidade" autocomplete="off"></td>' +
      '<td class="num" data-out="item-custo:' + id + '">' + ui.dinheiro(calc.itemCusto(item).total) + '</td>' +
      '<td class="num" data-out="item-preco:' + id + '">' + ui.dinheiro(calc.itemPreco(item, bdi)) + '</td>' +
      '<td><button type="button" class="icone" data-acao="remover-item" data-id="' + id + '" aria-label="Remover item">' + ui.ICONES.lixeira + '</button></td></tr>'
    );
  }

  function cartaoEtapa(etapa, orc, totais) {
    var id = esc(etapa.id);
    var html = '<section class="cartao etapa" data-etapa="' + id + '"><div class="etapa-topo">' +
      '<label class="rotulo crescer">Nome da etapa<input data-etapa-campo="nome" list="lista-etapas" value="' + esc(etapa.nome) + '" autocomplete="off"></label>' +
      '<button type="button" class="botao pequeno perigo" data-acao="remover-etapa" data-id="' + id + '">Remover etapa</button></div>' +
      '<div class="rolagem"><table class="tabela itens"><thead><tr><th>Descrição</th><th>Un.</th><th class="num">Qtd.</th><th class="num">Material (R$/un.)</th><th class="num">Mão de obra (R$/un.)</th><th class="num">Custo</th><th class="num">Preço com BDI</th><th><span class="oculto">Remover</span></th></tr></thead><tbody>';
    etapa.itens.forEach(function (item) { html += linhaItem(item, orc.bdi); });
    html += '</tbody><tfoot><tr><td colspan="5">Subtotal da etapa</td><td class="num" data-out="etapa-custo:' + id + '">' + ui.dinheiro(totais.custo) +
      '</td><td class="num" data-out="etapa-preco:' + id + '">' + ui.dinheiro(totais.preco) + '</td><td></td></tr></tfoot></table></div>' +
      '<div class="acoes"><button type="button" class="botao pequeno" data-acao="novo-item" data-id="' + id + '">' + ui.ICONES.mais + 'Adicionar item</button></div></section>';
    return html;
  }

  function resumo(t) {
    var linha = function (rotulo, chave, valor, classe) {
      return '<div class="linha-resumo ' + (classe || '') + '"><span>' + rotulo + '</span><strong data-out="' + chave + '">' + valor + '</strong></div>';
    };
    return (
      '<section class="cartao resumo" aria-label="Resumo do orçamento"><h2>Resumo</h2>' +
      linha('Material', 'res-material', ui.dinheiro(t.material)) +
      linha('Mão de obra', 'res-mao', ui.dinheiro(t.maoDeObra)) +
      linha('Custo direto', 'res-custo', ui.dinheiro(t.custoDireto), 'destaque') +
      linha('BDI', 'res-bdi', ui.dinheiro(t.bdiValor)) +
      linha('Desconto', 'res-desconto', ui.dinheiro(-t.desconto)) +
      linha('Total da proposta', 'res-total', ui.dinheiro(t.total), 'total') +
      linha('Margem sobre o total', 'res-margem', ui.dinheiro(t.margem) + ' (' + ui.numero(t.margemPercentual) + '%)') +
      '</section>'
    );
  }

  function atualizarTotais(raiz, orc) {
    var t = calc.orcamentoTotais(orc);
    var por = function (chave, valor) {
      var el = raiz.querySelector('[data-out="' + chave + '"]');
      if (el) el.textContent = valor;
    };
    orc.etapas.forEach(function (etapa) {
      etapa.itens.forEach(function (item) {
        por('item-custo:' + item.id, ui.dinheiro(calc.itemCusto(item).total));
        por('item-preco:' + item.id, ui.dinheiro(calc.itemPreco(item, orc.bdi)));
      });
    });
    t.etapas.forEach(function (e) {
      por('etapa-custo:' + e.id, ui.dinheiro(e.custo));
      por('etapa-preco:' + e.id, ui.dinheiro(e.preco));
    });
    por('res-material', ui.dinheiro(t.material));
    por('res-mao', ui.dinheiro(t.maoDeObra));
    por('res-custo', ui.dinheiro(t.custoDireto));
    por('res-bdi', ui.dinheiro(t.bdiValor));
    por('res-desconto', ui.dinheiro(-t.desconto));
    por('res-total', ui.dinheiro(t.total));
    por('res-margem', ui.dinheiro(t.margem) + ' (' + ui.numero(t.margemPercentual) + '%)');
  }

  function acharEtapa(orc, id) {
    for (var i = 0; i < orc.etapas.length; i++) if (orc.etapas[i].id === id) return orc.etapas[i];
    return null;
  }

  function acharItem(etapa, id) {
    for (var i = 0; i < etapa.itens.length; i++) if (etapa.itens[i].id === id) return etapa.itens[i];
    return null;
  }

  var CAMPOS_NUMERICOS = { bdi: 500, desconto: 1e12, validadeDias: 3650 };

  V.orcamento = {
    render: function (rota) {
      var orc = store.orcamento(rota.id);
      if (!orc) return naoEncontrado();
      var d = store.dados();
      var t = calc.orcamentoTotais(orc);
      var id = esc(orc.id);
      var botoes = '<a class="botao" href="#/proposta/' + id + '">Ver proposta</a>' +
        '<button type="button" class="botao" data-acao="duplicar">Duplicar</button>';
      if (orc.obra) botoes += '<a class="botao primario" href="#/obra/' + id + '">Ver obra</a>';
      else if (orc.status === 'aprovado') botoes += '<button type="button" class="botao primario" data-acao="abrir-obra">Abrir obra</button>';

      var clientes = '<option value="">Selecione</option>' + d.clientes.map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (c.id === orc.clienteId ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
      }).join('');

      var html = '<a class="voltar" href="#/orcamentos">' + ui.ICONES.voltar + 'Orçamentos</a>' +
        ui.cabecalho('Orçamento ' + orc.numero, 'As alterações são salvas automaticamente.', botoes);
      if (orc.obra) {
        html += '<div class="alerta">Este orçamento já tem uma obra aberta. Mudar itens ou preços altera o custo previsto da obra.</div>';
      }
      html += '<section class="cartao"><h2>Dados</h2><div class="grade">' +
        '<label class="rotulo duplo">Título do orçamento<input data-campo="titulo" value="' + esc(orc.titulo) + '" placeholder="Exemplo: instalação elétrica de sobrado" autocomplete="off"></label>' +
        '<label class="rotulo">Cliente<select data-campo="clienteId">' + clientes + '</select><a class="auxiliar" href="#/clientes/novo">Cadastrar cliente</a></label>' +
        '<label class="rotulo">Situação<select data-campo="status">' + ui.opcoes(store.STATUS_ORCAMENTO, orc.status, ui.ROTULO_STATUS) + '</select></label>' +
        '<label class="rotulo duplo">Local da obra<input data-campo="local" value="' + esc(orc.local) + '" autocomplete="off"></label>' +
        '<label class="rotulo">Data<input type="date" data-campo="data" value="' + esc(orc.data) + '"></label>' +
        '<label class="rotulo">Validade, em dias<input inputmode="numeric" data-campo="validadeDias" value="' + ui.campoNumero(orc.validadeDias) + '" autocomplete="off"></label>' +
        '<label class="rotulo">BDI, em %<input inputmode="decimal" data-campo="bdi" value="' + ui.campoNumero(orc.bdi) + '" autocomplete="off"></label>' +
        '<label class="rotulo">Desconto, em R$<input inputmode="decimal" data-campo="desconto" value="' + ui.campoNumero(orc.desconto) + '" autocomplete="off"></label>' +
        '<label class="rotulo duplo">Condições e observações desta proposta<textarea data-campo="observacoes" rows="3" placeholder="Exemplo: prazo de execução, forma de pagamento, itens não incluídos.">' + esc(orc.observacoes) + '</textarea></label>' +
        '</div></section>';

      html += '<datalist id="lista-catalogo">' + d.catalogo.map(function (c) {
        return '<option value="' + esc(c.descricao) + '"></option>';
      }).join('') + '</datalist>';

      if (!d.catalogo.length) {
        html += '<p class="sub dica">Dica: cadastre materiais e serviços no <a href="#/catalogo">Catálogo</a> para preencher os itens mais rápido.</p>';
      } else {
        html += '<p class="sub dica">Ao digitar a descrição, escolha um item do catálogo para preencher a unidade e os custos.</p>';
      }

      orc.etapas.forEach(function (etapa, i) { html += cartaoEtapa(etapa, orc, t.etapas[i]); });
      html += '<div class="acoes"><button type="button" class="botao" data-acao="nova-etapa">' + ui.ICONES.mais + 'Adicionar etapa</button></div>';
      html += resumo(t);
      return html;
    },
    aposRender: function (raiz) {
      if (!focoPendente) return;
      var el = raiz.querySelector(focoPendente);
      focoPendente = null;
      if (el) el.focus();
    },
    aoEditar: function (el, evento, rota) {
      var orc = store.orcamento(rota.id);
      if (!orc) return;
      var raiz = document.getElementById('conteudo');
      if (el.dataset.campo) {
        var k = el.dataset.campo;
        if (Object.prototype.hasOwnProperty.call(CAMPOS_NUMERICOS, k)) orc[k] = calc.clamp(calc.parseNum(el.value), 0, CAMPOS_NUMERICOS[k]);
        else orc[k] = el.value;
      } else if (el.dataset.etapaCampo) {
        var etapa = acharEtapa(orc, el.closest('[data-etapa]').dataset.etapa);
        if (etapa) etapa.nome = el.value;
      } else if (el.dataset.itemCampo) {
        var dona = acharEtapa(orc, el.closest('[data-etapa]').dataset.etapa);
        var item = dona && acharItem(dona, el.closest('tr[data-item]').dataset.item);
        if (!item) return;
        var campo = el.dataset.itemCampo;
        if (campo === 'descricao' || campo === 'unidade') item[campo] = el.value;
        else item[campo] = Math.max(0, calc.parseNum(el.value));
      } else {
        return;
      }
      store.salvarDepois();
      atualizarTotais(raiz, orc);
    },
    aoMudar: function (el, evento, rota) {
      var orc = store.orcamento(rota.id);
      if (!orc) return;
      if (el.dataset.campo === 'status') {
        orc.status = el.value;
        store.salvar();
        DEF.app.desenhar();
        return;
      }
      if (el.dataset.itemCampo !== 'descricao') return;
      // Descrição igual à de um item do catálogo: preenche unidade e custos, sem apagar o que já foi digitado.
      var procurado = el.value.trim().toLowerCase();
      var doCatalogo = null;
      store.dados().catalogo.forEach(function (c) {
        if (!doCatalogo && c.descricao.trim().toLowerCase() === procurado) doCatalogo = c;
      });
      if (!doCatalogo) return;
      var linha = el.closest('tr[data-item]');
      var etapa = acharEtapa(orc, el.closest('[data-etapa]').dataset.etapa);
      var item = etapa && acharItem(etapa, linha.dataset.item);
      if (!item || item.material || item.maoDeObra) return;
      item.unidade = doCatalogo.unidade || item.unidade;
      item.material = doCatalogo.material;
      item.maoDeObra = doCatalogo.maoDeObra;
      linha.querySelector('[data-item-campo="unidade"]').value = item.unidade;
      linha.querySelector('[data-item-campo="material"]').value = ui.campoNumero(item.material);
      linha.querySelector('[data-item-campo="maoDeObra"]').value = ui.campoNumero(item.maoDeObra);
      store.salvar();
      atualizarTotais(document.getElementById('conteudo'), orc);
    },
    acoes: {
      'novo-item': function (el, evento, rota) {
        var orc = store.orcamento(rota.id);
        var etapa = orc && acharEtapa(orc, el.dataset.id);
        if (!etapa) return;
        var item = store.itemEmBranco();
        etapa.itens.push(item);
        store.salvar();
        focoPendente = 'tr[data-item="' + item.id + '"] [data-item-campo="descricao"]';
        DEF.app.desenhar();
      },
      'remover-item': function (el, evento, rota) {
        var orc = store.orcamento(rota.id);
        var etapa = orc && acharEtapa(orc, el.closest('[data-etapa]').dataset.etapa);
        if (!etapa) return;
        etapa.itens = etapa.itens.filter(function (i) { return i.id !== el.dataset.id; });
        store.salvar();
        DEF.app.desenhar();
      },
      'nova-etapa': function (el, evento, rota) {
        var orc = store.orcamento(rota.id);
        if (!orc) return;
        var etapa = { id: store.id(), nome: 'Etapa ' + (orc.etapas.length + 1), itens: [store.itemEmBranco()] };
        orc.etapas.push(etapa);
        store.salvar();
        focoPendente = '[data-etapa="' + etapa.id + '"] [data-etapa-campo="nome"]';
        DEF.app.desenhar();
      },
      'remover-etapa': function (el, evento, rota) {
        var orc = store.orcamento(rota.id);
        var etapa = orc && acharEtapa(orc, el.dataset.id);
        if (!etapa) return;
        var preenchidos = etapa.itens.filter(function (i) { return i.descricao || i.material || i.maoDeObra; }).length;
        if (preenchidos && !window.confirm('Remover a etapa "' + etapa.nome + '" e os ' + preenchidos + ' item(ns) dela?')) return;
        orc.etapas = orc.etapas.filter(function (e) { return e.id !== etapa.id; });
        store.salvar();
        DEF.app.desenhar();
      },
      duplicar: function (el, evento, rota) {
        var copia = store.duplicarOrcamento(rota.id);
        if (copia) { ui.aviso('Orçamento duplicado. Você está na cópia.'); location.hash = '#/orcamento/' + copia.id; }
      },
      'abrir-obra': function (el, evento, rota) {
        var orc = store.orcamento(rota.id);
        if (!orc) return;
        store.abrirObra(orc);
        location.hash = '#/obra/' + orc.id;
      }
    }
  };

  // ------------------------------------------------------------------ Proposta
  var detalhar = true;
  // Larguras fixas para as colunas ficarem alinhadas entre as tabelas das etapas.
  var COLUNAS_PROPOSTA = '<colgroup><col class="c-item"><col><col class="c-un"><col class="c-qtd"><col class="c-valor"><col class="c-valor"></colgroup>';

  function bloco(titulo, linhas) {
    var conteudo = linhas.filter(Boolean).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('');
    return conteudo ? '<section class="folha-bloco"><h2>' + titulo + '</h2><div class="folha-linhas">' + conteudo + '</div></section>' : '';
  }

  V.proposta = {
    render: function (rota) {
      var orc = store.orcamento(rota.id);
      if (!orc) return naoEncontrado();
      var e = store.dados().empresa;
      var c = store.cliente(orc.clienteId);
      var t = calc.orcamentoTotais(orc);
      var id = esc(orc.id);

      var faltas = [];
      if (!c) faltas.push('o cliente');
      if (!orc.titulo) faltas.push('o título do orçamento');
      if (!e.responsavel || !e.registro) faltas.push('o responsável técnico e o registro no CREA, em Configurações');
      if (!t.total) faltas.push('itens com preço');

      var html = '<div class="barra nao-imprimir"><a class="voltar" href="#/orcamento/' + id + '">' + ui.ICONES.voltar + 'Voltar ao orçamento</a>' +
        '<div class="acoes"><label class="marcar"><input type="checkbox" data-opcao="detalhar"' + (detalhar ? ' checked' : '') + '>Mostrar os itens de cada etapa</label>' +
        '<button type="button" class="botao primario" data-acao="imprimir">Imprimir ou salvar em PDF</button></div></div>';
      if (faltas.length) {
        html += '<div class="alerta nao-imprimir">Antes de enviar, falta preencher: ' + esc(faltas.join('; ')) + '.</div>';
      }

      html += '<article class="folha"><header class="folha-topo"><img class="folha-logo" src="../assets/logo/def-engenharia-principal.svg" alt="DEF Engenharia">' +
        '<div class="folha-empresa"><strong>' + esc(e.nome) + '</strong>' +
        [e.documento, e.endereco, [e.telefone, e.email].filter(Boolean).join(' · ')].filter(Boolean).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') +
        '</div></header>';

      var validade = orc.validadeDias ? 'Válida até ' + ui.data(ui.somarDias(orc.data, orc.validadeDias)) : '';
      html += '<div class="folha-titulo"><h1>Proposta comercial nº ' + esc(orc.numero) + '</h1><p>' +
        [ui.data(orc.data), validade].filter(Boolean).map(esc).join(' · ') + '</p></div>';

      html += '<div class="folha-duas">' +
        bloco('Cliente', c ? [c.nome, c.documento, c.contato, c.endereco, [c.telefone, c.email].filter(Boolean).join(' · ')] : []) +
        bloco('Objeto', [orc.titulo, orc.local ? 'Local: ' + orc.local : '']) + '</div>';

      html += '<section class="folha-bloco"><h2>Serviços e valores</h2>';
      var numeroEtapa = 0;
      orc.etapas.forEach(function (etapa, i) {
        var itens = etapa.itens.filter(function (item) { return item.descricao || calc.itemPreco(item, orc.bdi); });
        if (!itens.length) return;
        numeroEtapa += 1;
        html += '<table class="folha-tabela">' + (detalhar ? COLUNAS_PROPOSTA : '') + '<thead><tr><th colspan="' + (detalhar ? 5 : 1) + '">' + numeroEtapa + '. ' + esc(etapa.nome || 'Etapa') + '</th>' +
          '<th class="num">' + (detalhar ? 'Total' : ui.dinheiro(t.etapas[i].preco)) + '</th></tr></thead>';
        if (detalhar) {
          html += '<tbody>';
          itens.forEach(function (item, j) {
            html += '<tr><td class="item">' + numeroEtapa + '.' + (j + 1) + '</td><td>' + esc(item.descricao) + '</td><td>' + esc(item.unidade) + '</td><td class="num">' + ui.numero(item.quantidade) +
              '</td><td class="num">' + ui.dinheiro(calc.itemPrecoUnitario(item, orc.bdi)) + '</td><td class="num">' + ui.dinheiro(calc.itemPreco(item, orc.bdi)) + '</td></tr>';
          });
          html += '</tbody><tfoot><tr><td colspan="5">Subtotal</td><td class="num">' + ui.dinheiro(t.etapas[i].preco) + '</td></tr></tfoot>';
        }
        html += '</table>';
      });
      html += '<div class="folha-total">';
      if (t.desconto) {
        html += '<div><span>Subtotal</span><span>' + ui.dinheiro(t.precoItens) + '</span></div><div><span>Desconto</span><span>' + ui.dinheiro(-t.desconto) + '</span></div>';
      }
      html += '<div class="final"><span>Total</span><span>' + ui.dinheiro(t.total) + '</span></div></div></section>';

      var condicoes = [orc.observacoes, e.condicoes].filter(function (x) { return x && x.trim(); });
      if (condicoes.length) {
        html += '<section class="folha-bloco"><h2>Condições</h2>' + condicoes.map(function (x) { return '<p class="folha-texto">' + esc(x.trim()) + '</p>'; }).join('') + '</section>';
      }

      html += '<section class="folha-assinaturas"><div><span class="traco"></span><strong>' + esc(e.responsavel || e.nome) + '</strong>' +
        (e.registro ? '<span>CREA ' + esc(e.registro) + '</span>' : '') + '<span>' + esc(e.nome) + '</span></div>' +
        '<div><span class="traco"></span><strong>' + esc(c ? c.nome : 'Cliente') + '</strong><span>De acordo</span></div></section></article>';
      return html;
    },
    acoes: { imprimir: function () { window.print(); } },
    aoMudar: function (el) {
      if (el.dataset.opcao === 'detalhar') { detalhar = el.checked; DEF.app.desenhar(); }
    }
  };
})();
