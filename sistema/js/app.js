/* Inicialização e navegação. As telas ficam em DEF.views e são escolhidas pelo endereço (#/tela/id). */
(function () {
  'use strict';
  var DEF = window.DEF;
  var V = DEF.views;
  var conteudo = document.getElementById('conteudo');

  // Telas filhas marcam o item de menu da tela principal.
  var MENU = { orcamento: 'orcamentos', proposta: 'orcamentos', obra: 'obras' };

  function rota() {
    var partes = location.hash.replace(/^#\/?/, '').split('/');
    var nome = Object.prototype.hasOwnProperty.call(V, partes[0]) ? partes[0] : 'painel';
    return { nome: nome, id: partes[1] ? decodeURIComponent(partes[1]) : '' };
  }

  function desenhar() {
    var r = rota();
    var tela = V[r.nome];
    conteudo.innerHTML = tela.render(r);
    document.body.dataset.tela = r.nome;
    var ativo = MENU[r.nome] || r.nome;
    Array.prototype.forEach.call(document.querySelectorAll('.menu a'), function (link) {
      if (link.dataset.tela === ativo) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (tela.aposRender) tela.aposRender(conteudo, r);
  }

  function aoMudarRota() {
    var r = rota();
    var tela = V[r.nome];
    if (tela.aoEntrar) {
      var destino = tela.aoEntrar(r);
      if (destino) { location.replace(destino); return; }
    }
    desenhar();
    window.scrollTo(0, 0);
  }

  conteudo.addEventListener('click', function (evento) {
    var el = evento.target.closest('[data-acao]');
    if (!el || !conteudo.contains(el)) return;
    var r = rota();
    var acao = V[r.nome].acoes && V[r.nome].acoes[el.dataset.acao];
    if (acao) { evento.preventDefault(); acao(el, evento, r); }
  });

  conteudo.addEventListener('input', function (evento) {
    var r = rota();
    if (V[r.nome].aoEditar) V[r.nome].aoEditar(evento.target, evento, r);
  });

  conteudo.addEventListener('change', function (evento) {
    var r = rota();
    if (V[r.nome].aoMudar) V[r.nome].aoMudar(evento.target, evento, r);
  });

  conteudo.addEventListener('submit', function (evento) {
    var r = rota();
    var form = evento.target;
    var acao = V[r.nome].aoEnviar && V[r.nome].aoEnviar[form.dataset.form];
    if (acao) { evento.preventDefault(); acao(form, evento, r); }
  });

  // O link "pular para o conteúdo" não pode mudar o endereço, que é usado para a navegação.
  document.querySelector('.pular').addEventListener('click', function (evento) {
    evento.preventDefault();
    conteudo.focus();
  });

  // Grava o que estiver pendente antes de a aba fechar.
  window.addEventListener('pagehide', function () { DEF.store.salvar(); });
  window.addEventListener('hashchange', aoMudarRota);

  DEF.app = { desenhar: desenhar, rota: rota };
  DEF.store.carregar();
  aoMudarRota();
})();
