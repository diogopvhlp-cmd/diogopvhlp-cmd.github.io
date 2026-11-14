/* Utilidades de tela: formatação, escape de HTML, avisos e download de arquivo. */
(function () {
  'use strict';
  var DEF = (window.DEF = window.DEF || {});

  var formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  var formatoCampoDinheiro = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Todo texto digitado pelo usuário passa por aqui antes de entrar no HTML. */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESCAPES[c]; });
  }

  function dinheiro(v) {
    return formatoMoeda.format(Number(v) || 0);
  }

  function numero(v) {
    return formatoNumero.format(Number(v) || 0);
  }

  /** Valor para mostrar dentro de um campo de digitação: vazio quando é zero. */
  function campoNumero(v) {
    var n = Number(v) || 0;
    return n === 0 ? '' : String(n).replace('.', ',');
  }

  /** Valor em reais para um campo de digitação: vazio quando é zero, sempre com centavos (1.450,00). */
  function campoDinheiro(v) {
    var n = Number(v) || 0;
    return n === 0 ? '' : formatoCampoDinheiro.format(n);
  }

  function data(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 && p[0] ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  function somarDias(iso, dias) {
    var p = String(iso || '').slice(0, 10).split('-').map(Number);
    if (p.length !== 3 || !p[0]) return '';
    var d = new Date(p[0], p[1] - 1, p[2] + (Number(dias) || 0));
    var dois = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate());
  }

  function diasDesde(isoCompleto) {
    if (!isoCompleto) return null;
    var t = Date.parse(isoCompleto);
    return isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
  }

  var temporizadorAviso = null;
  function aviso(mensagem, tipo) {
    var caixa = document.getElementById('avisos');
    if (!caixa) return;
    caixa.textContent = mensagem;
    caixa.className = 'avisos visivel' + (tipo === 'erro' ? ' erro' : '');
    if (temporizadorAviso) clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { caixa.className = 'avisos'; }, 4000);
  }

  function baixar(nomeArquivo, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo || 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var ROTULO_STATUS = {
    rascunho: 'Em elaboração',
    enviado: 'Enviado',
    aprovado: 'Aprovado',
    recusado: 'Recusado',
    andamento: 'Em andamento',
    pausada: 'Pausada',
    concluida: 'Concluída'
  };

  function etiqueta(status) {
    return '<span class="etiqueta etiqueta-' + esc(status) + '">' + esc(ROTULO_STATUS[status] || status) + '</span>';
  }

  function opcoes(valores, selecionado, rotulos) {
    return valores
      .map(function (v) {
        return '<option value="' + esc(v) + '"' + (v === selecionado ? ' selected' : '') + '>' + esc((rotulos && rotulos[v]) || v) + '</option>';
      })
      .join('');
  }

  var ICONES = {
    lixeira: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/></svg>',
    mais: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    voltar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'
  };

  DEF.ui = {
    esc: esc,
    dinheiro: dinheiro,
    numero: numero,
    campoNumero: campoNumero,
    campoDinheiro: campoDinheiro,
    data: data,
    somarDias: somarDias,
    diasDesde: diasDesde,
    aviso: aviso,
    baixar: baixar,
    ROTULO_STATUS: ROTULO_STATUS,
    etiqueta: etiqueta,
    opcoes: opcoes,
    ICONES: ICONES
  };
})();
