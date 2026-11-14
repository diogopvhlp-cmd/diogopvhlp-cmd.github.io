/*
 * Cálculos do orçamento e da obra. Funções puras, sem acesso à tela nem ao
 * armazenamento, para poderem ser testadas com `node --test`.
 *
 * Regra de arredondamento: o preço unitário de cada item já sai com o BDI e
 * arredondado em centavos. O total da linha é quantidade x preço unitário.
 * Assim a conta que o cliente refaz na proposta sempre fecha.
 */
(function (root) {
  'use strict';

  function round2(v) {
    var n = Number(v) || 0;
    return Math.round((n + (n >= 0 ? 1 : -1) * Number.EPSILON) * 100) / 100;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, Number(v) || 0));
  }

  /** Lê um número digitado no padrão brasileiro ("1.234,56") ou com ponto ("12.5"). */
  function parseNum(texto) {
    if (typeof texto === 'number') return isFinite(texto) ? texto : 0;
    var s = String(texto == null ? '' : texto).replace(/\s/g, '').replace(/^R\$/i, '');
    if (!s) return 0;
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function positivo(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /** Custo direto de um item: material e mão de obra, sem BDI. */
  function itemCusto(item) {
    var q = positivo(item.quantidade);
    var material = round2(q * positivo(item.material));
    var maoDeObra = round2(q * positivo(item.maoDeObra));
    return { material: material, maoDeObra: maoDeObra, total: round2(material + maoDeObra) };
  }

  /** Preço unitário de venda do item, já com o BDI. */
  function itemPrecoUnitario(item, bdi) {
    return round2((positivo(item.material) + positivo(item.maoDeObra)) * (1 + positivo(bdi) / 100));
  }

  /** Preço de venda da linha: quantidade x preço unitário com BDI. */
  function itemPreco(item, bdi) {
    return round2(positivo(item.quantidade) * itemPrecoUnitario(item, bdi));
  }

  function etapaTotais(etapa, bdi) {
    var t = { material: 0, maoDeObra: 0, custo: 0, preco: 0 };
    (etapa.itens || []).forEach(function (item) {
      var c = itemCusto(item);
      t.material += c.material;
      t.maoDeObra += c.maoDeObra;
      t.custo += c.total;
      t.preco += itemPreco(item, bdi);
    });
    return { material: round2(t.material), maoDeObra: round2(t.maoDeObra), custo: round2(t.custo), preco: round2(t.preco) };
  }

  /**
   * Totais do orçamento.
   * precoItens = soma das linhas com BDI. total = precoItens - desconto.
   * bdiValor e margem são o que sobra sobre o custo direto.
   */
  function orcamentoTotais(orc) {
    var etapas = (orc.etapas || []).map(function (etapa) {
      var t = etapaTotais(etapa, orc.bdi);
      return { id: etapa.id, nome: etapa.nome, material: t.material, maoDeObra: t.maoDeObra, custo: t.custo, preco: t.preco };
    });
    var soma = function (campo) {
      return round2(etapas.reduce(function (s, e) { return s + e[campo]; }, 0));
    };
    var custoDireto = soma('custo');
    var precoItens = soma('preco');
    var desconto = round2(clamp(orc.desconto, 0, precoItens));
    var total = round2(precoItens - desconto);
    var margem = round2(total - custoDireto);
    return {
      etapas: etapas,
      material: soma('material'),
      maoDeObra: soma('maoDeObra'),
      custoDireto: custoDireto,
      precoItens: precoItens,
      bdiValor: round2(precoItens - custoDireto),
      desconto: desconto,
      total: total,
      margem: margem,
      margemPercentual: total > 0 ? round2((margem / total) * 100) : 0
    };
  }

  /**
   * Resumo da obra: avanço físico ponderado pelo preço de cada etapa e
   * comparação entre o custo previsto e o custo lançado.
   */
  function obraResumo(orc) {
    var t = orcamentoTotais(orc);
    var obra = orc.obra || {};
    var avancos = obra.avancos || {};
    var peso = 0;
    var executado = 0;
    var custoAteAgora = 0;
    var somaPercentuais = 0;
    t.etapas.forEach(function (e) {
      var p = clamp(avancos[e.id], 0, 100) / 100;
      peso += e.preco;
      executado += e.preco * p;
      custoAteAgora += e.custo * p;
      somaPercentuais += p;
    });
    var fracao = peso > 0 ? executado / peso : t.etapas.length ? somaPercentuais / t.etapas.length : 0;
    var porTipo = { material: 0, mao: 0, outros: 0 };
    (obra.lancamentos || []).forEach(function (l) {
      var tipo = Object.prototype.hasOwnProperty.call(porTipo, l.tipo) ? l.tipo : 'outros';
      porTipo[tipo] += positivo(l.valor);
    });
    var realizado = round2(porTipo.material + porTipo.mao + porTipo.outros);
    custoAteAgora = round2(custoAteAgora);
    return {
      avanco: Math.round(fracao * 1000) / 10,
      precoContratado: t.total,
      valorExecutado: round2(t.total * fracao),
      custoPrevisto: t.custoDireto,
      custoRealizado: realizado,
      saldoCusto: round2(t.custoDireto - realizado),
      custoPrevistoAteAgora: custoAteAgora,
      desvio: round2(realizado - custoAteAgora),
      porTipo: { material: round2(porTipo.material), mao: round2(porTipo.mao), outros: round2(porTipo.outros) }
    };
  }

  /** Próximo número de orçamento do ano, no formato 2026-001. */
  function proximoNumero(orcamentos, ano) {
    var prefixo = String(ano) + '-';
    var maior = 0;
    (orcamentos || []).forEach(function (o) {
      var n = String(o.numero || '');
      if (n.indexOf(prefixo) === 0) {
        var seq = parseInt(n.slice(prefixo.length), 10);
        if (isFinite(seq) && seq > maior) maior = seq;
      }
    });
    var texto = String(maior + 1);
    while (texto.length < 3) texto = '0' + texto;
    return prefixo + texto;
  }

  var calc = {
    round2: round2,
    clamp: clamp,
    parseNum: parseNum,
    positivo: positivo,
    itemCusto: itemCusto,
    itemPrecoUnitario: itemPrecoUnitario,
    itemPreco: itemPreco,
    etapaTotais: etapaTotais,
    orcamentoTotais: orcamentoTotais,
    obraResumo: obraResumo,
    proximoNumero: proximoNumero
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = calc;
  root.DEF = root.DEF || {};
  root.DEF.calc = calc;
})(typeof window !== 'undefined' ? window : globalThis);
