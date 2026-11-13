/* Telas: lista de obras e acompanhamento de uma obra. */
(function () {
  'use strict';
  var DEF = window.DEF;
  var ui = DEF.ui;
  var store = DEF.store;
  var calc = DEF.calc;
  var esc = ui.esc;
  var V = (DEF.views = DEF.views || {});

  var ROTULO_TIPO = { material: 'Material', mao: 'Mão de obra', outros: 'Outros' };

  // -------------------------------------------------------------------- Lista
  V.obras = {
    render: function () {
      var obras = store.dados().orcamentos.filter(function (o) { return o.obra; });
      var html = ui.cabecalho('Obras', 'Avanço e custos das obras com orçamento aprovado.');
      html += '<section class="cartao">';
      if (!obras.length) {
        html += '<p class="vazio">Nenhuma obra aberta.</p><p>Para abrir uma obra, mude a situação do orçamento para Aprovado e use o botão Abrir obra.</p>' +
          '<a class="botao" href="#/orcamentos">Ir para os orçamentos</a>';
      } else {
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Orçamento</th><th>Obra</th><th>Cliente</th><th>Situação</th><th class="num">Avanço</th><th class="num">Custo previsto</th><th class="num">Custo lançado</th></tr></thead><tbody>';
        obras.forEach(function (o) {
          var r = calc.obraResumo(o);
          html += '<tr><td>' + esc(o.numero) + '</td><td><a href="#/obra/' + esc(o.id) + '">' + esc(o.titulo || 'Sem título') + '</a></td><td>' + esc(ui.nomeCliente(o)) +
            '</td><td>' + ui.etiqueta(o.obra.status) + '</td><td class="num">' + ui.numero(r.avanco) + '%</td><td class="num">' + ui.dinheiro(r.custoPrevisto) +
            '</td><td class="num">' + ui.dinheiro(r.custoRealizado) + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</section>';
      return html;
    }
  };

  // ------------------------------------------------------------------ Detalhe
  // Desvio = custo lançado menos o custo previsto para o avanço informado.
  function valorDesvio(r) {
    var sinal = r.desvio > 0 ? '+' : r.desvio < 0 ? '-' : '';
    return sinal + ui.dinheiro(Math.abs(r.desvio));
  }

  function notaDesvio(r) {
    if (!r.custoRealizado && !r.custoPrevistoAteAgora) return 'Sem custos lançados nem avanço';
    if (r.desvio > 0) return 'Acima do previsto para o avanço';
    if (r.desvio < 0) return 'Abaixo do previsto para o avanço';
    return 'Dentro do previsto para o avanço';
  }

  function cartoesResumo(r) {
    var cartao = function (rotulo, chave, valor, nota, chaveNota) {
      return '<div class="cartao numero"><span class="rotulo-cartao">' + rotulo + '</span><strong data-out="' + chave + '">' + valor + '</strong>' +
        (nota ? '<span class="valor-cartao"' + (chaveNota ? ' data-out="' + chaveNota + '"' : '') + '>' + nota + '</span>' : '') + '</div>';
    };
    return '<div class="cartoes tres">' +
      cartao('Avanço físico', 'ob-avanco', ui.numero(r.avanco) + '%', 'Ponderado pelo preço das etapas') +
      cartao('Preço contratado', 'ob-preco', ui.dinheiro(r.precoContratado), 'Total da proposta') +
      cartao('Custo previsto', 'ob-previsto', ui.dinheiro(r.custoPrevisto), 'Custo direto do orçamento') +
      cartao('Custo lançado', 'ob-realizado', ui.dinheiro(r.custoRealizado), 'Soma dos custos abaixo') +
      cartao('Saldo de custo', 'ob-saldo', ui.dinheiro(r.saldoCusto), 'Previsto menos lançado') +
      cartao('Desvio de custo', 'ob-desvio', valorDesvio(r), notaDesvio(r), 'ob-desvio-nota') +
      '</div>';
  }

  function atualizarResumo(raiz, orc) {
    var r = calc.obraResumo(orc);
    var por = function (chave, valor) {
      var el = raiz.querySelector('[data-out="' + chave + '"]');
      if (el) el.textContent = valor;
    };
    por('ob-avanco', ui.numero(r.avanco) + '%');
    por('ob-preco', ui.dinheiro(r.precoContratado));
    por('ob-previsto', ui.dinheiro(r.custoPrevisto));
    por('ob-realizado', ui.dinheiro(r.custoRealizado));
    por('ob-saldo', ui.dinheiro(r.saldoCusto));
    por('ob-desvio', valorDesvio(r));
    por('ob-desvio-nota', notaDesvio(r));
    orc.etapas.forEach(function (e) {
      var barra = raiz.querySelector('[data-barra="' + e.id + '"]');
      if (barra) barra.style.width = calc.clamp(orc.obra.avancos[e.id], 0, 100) + '%';
    });
  }

  V.obra = {
    render: function (rota) {
      var orc = store.orcamento(rota.id);
      if (!orc || !orc.obra) {
        return ui.cabecalho('Obra não encontrada', 'O orçamento pode ter sido excluído ou ainda não tem obra aberta.') +
          '<p><a class="botao" href="#/obras">Voltar para as obras</a></p>';
      }
      var obra = orc.obra;
      var t = calc.orcamentoTotais(orc);
      var r = calc.obraResumo(orc);
      var id = esc(orc.id);

      var html = '<a class="voltar" href="#/obras">' + ui.ICONES.voltar + 'Obras</a>' +
        ui.cabecalho(orc.titulo || 'Obra sem título', 'Orçamento ' + orc.numero + ' · ' + ui.nomeCliente(orc),
          '<a class="botao" href="#/orcamento/' + id + '">Ver orçamento</a>');

      html += '<section class="cartao"><div class="grade">' +
        '<label class="rotulo">Início<input type="date" data-obra-campo="inicio" value="' + esc(obra.inicio) + '"></label>' +
        '<label class="rotulo">Previsão de término<input type="date" data-obra-campo="previsaoFim" value="' + esc(obra.previsaoFim) + '"></label>' +
        '<label class="rotulo">Situação<select data-obra-campo="status">' + ui.opcoes(store.STATUS_OBRA, obra.status, ui.ROTULO_STATUS) + '</select></label>' +
        '</div></section>';

      html += cartoesResumo(r);

      html += '<section class="cartao"><h2>Avanço por etapa</h2>';
      if (!orc.etapas.length) {
        html += '<p class="vazio">O orçamento não tem etapas.</p>';
      } else {
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Etapa</th><th class="num">Preço</th><th class="num">Custo previsto</th><th class="num">Executado (%)</th><th>Progresso</th></tr></thead><tbody>';
        orc.etapas.forEach(function (etapa, i) {
          var p = calc.clamp(obra.avancos[etapa.id], 0, 100);
          var eid = esc(etapa.id);
          html += '<tr><td>' + esc(etapa.nome || 'Etapa') + '</td><td class="num">' + ui.dinheiro(t.etapas[i].preco) + '</td><td class="num">' + ui.dinheiro(t.etapas[i].custo) +
            '</td><td class="num"><input class="numero" inputmode="decimal" data-avanco="' + eid + '" value="' + ui.campoNumero(p) + '" placeholder="0" aria-label="Percentual executado de ' + esc(etapa.nome || 'etapa') + '" autocomplete="off"></td>' +
            '<td><div class="barra-progresso" aria-hidden="true"><span data-barra="' + eid + '" style="width: ' + p + '%"></span></div></td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</section>';

      var etapasOpcoes = '<option value="">Geral</option>' + orc.etapas.map(function (e) {
        return '<option value="' + esc(e.id) + '">' + esc(e.nome || 'Etapa') + '</option>';
      }).join('');
      html += '<section class="cartao"><h2>Custos lançados</h2>' +
        '<form class="grade lancamento" data-form="lancamento">' +
        '<label class="rotulo">Data<input type="date" name="data" value="' + store.hoje() + '" required></label>' +
        '<label class="rotulo duplo">Descrição<input name="descricao" required autocomplete="off" placeholder="Exemplo: compra de cabos, diária do eletricista"></label>' +
        '<label class="rotulo">Tipo<select name="tipo">' + ui.opcoes(store.TIPOS_LANCAMENTO, 'material', ROTULO_TIPO) + '</select></label>' +
        '<label class="rotulo">Etapa<select name="etapaId">' + etapasOpcoes + '</select></label>' +
        '<label class="rotulo">Valor, em R$<input name="valor" inputmode="decimal" required autocomplete="off"></label>' +
        '<div class="acoes alinhar-base"><button class="botao primario" type="submit">Lançar custo</button></div></form>';

      if (!obra.lancamentos.length) {
        html += '<p class="vazio">Nenhum custo lançado.</p>';
      } else {
        var nomeEtapa = {};
        orc.etapas.forEach(function (e) { nomeEtapa[e.id] = e.nome || 'Etapa'; });
        var ordenados = obra.lancamentos.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Etapa</th><th class="num">Valor</th><th><span class="oculto">Remover</span></th></tr></thead><tbody>';
        ordenados.forEach(function (l) {
          html += '<tr><td>' + ui.data(l.data) + '</td><td>' + esc(l.descricao) + '</td><td>' + esc(ROTULO_TIPO[l.tipo]) + '</td><td>' + esc(nomeEtapa[l.etapaId] || 'Geral') +
            '</td><td class="num">' + ui.dinheiro(l.valor) + '</td><td><button type="button" class="icone" data-acao="remover-lancamento" data-id="' + esc(l.id) + '" aria-label="Remover lançamento">' + ui.ICONES.lixeira + '</button></td></tr>';
        });
        html += '</tbody><tfoot><tr><td colspan="4">Material ' + ui.dinheiro(r.porTipo.material) + ' · Mão de obra ' + ui.dinheiro(r.porTipo.mao) + ' · Outros ' + ui.dinheiro(r.porTipo.outros) +
          '</td><td class="num">' + ui.dinheiro(r.custoRealizado) + '</td><td></td></tr></tfoot></table></div>';
      }
      html += '</section>';
      return html;
    },
    aoEditar: function (el, evento, rota) {
      var orc = store.orcamento(rota.id);
      if (!orc || !orc.obra) return;
      if (el.dataset.avanco) {
        orc.obra.avancos[el.dataset.avanco] = calc.clamp(calc.parseNum(el.value), 0, 100);
      } else if (el.dataset.obraCampo === 'inicio' || el.dataset.obraCampo === 'previsaoFim') {
        orc.obra[el.dataset.obraCampo] = el.value;
      } else if (el.dataset.obraCampo === 'status' && store.STATUS_OBRA.indexOf(el.value) !== -1) {
        orc.obra.status = el.value;
      } else {
        return;
      }
      store.salvarDepois();
      atualizarResumo(document.getElementById('conteudo'), orc);
    },
    acoes: {
      'remover-lancamento': function (el, evento, rota) {
        var orc = store.orcamento(rota.id);
        if (!orc || !orc.obra) return;
        orc.obra.lancamentos = orc.obra.lancamentos.filter(function (l) { return l.id !== el.dataset.id; });
        store.salvar();
        DEF.app.desenhar();
      }
    },
    aoEnviar: {
      lancamento: function (form, evento, rota) {
        var orc = store.orcamento(rota.id);
        if (!orc || !orc.obra) return;
        var f = new FormData(form);
        var valor = calc.parseNum(f.get('valor'));
        var descricao = String(f.get('descricao') || '').trim();
        if (!descricao || valor <= 0) { ui.aviso('Informe a descrição e um valor maior que zero.', 'erro'); return; }
        var tipo = String(f.get('tipo'));
        orc.obra.lancamentos.push({
          id: store.id(),
          data: String(f.get('data') || store.hoje()),
          descricao: descricao,
          tipo: store.TIPOS_LANCAMENTO.indexOf(tipo) !== -1 ? tipo : 'outros',
          etapaId: String(f.get('etapaId') || ''),
          valor: valor
        });
        store.salvar();
        ui.aviso('Custo lançado.');
        DEF.app.desenhar();
      }
    }
  };
})();
