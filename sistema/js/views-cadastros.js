/* Telas: Painel, Clientes, Catálogo e Configurações. */
(function () {
  'use strict';
  var DEF = window.DEF;
  var ui = DEF.ui;
  var store = DEF.store;
  var calc = DEF.calc;
  var esc = ui.esc;
  var V = (DEF.views = DEF.views || {});

  function cabecalho(titulo, descricao, botoes) {
    return (
      '<div class="cabecalho"><div><h1>' + esc(titulo) + '</h1>' +
      (descricao ? '<p class="sub">' + esc(descricao) + '</p>' : '') +
      '</div>' + (botoes ? '<div class="acoes">' + botoes + '</div>' : '') + '</div>'
    );
  }
  ui.cabecalho = cabecalho;

  function campo(rotulo, nome, valor, extras) {
    return (
      '<label class="rotulo ' + ((extras && extras.classe) || '') + '">' + esc(rotulo) +
      '<input name="' + nome + '" value="' + esc(valor) + '"' + ((extras && extras.atributos) || '') + '></label>'
    );
  }

  function fazerBackup() {
    var conteudo = store.exportar();
    ui.baixar('def-obras-backup-' + store.hoje() + '.json', conteudo);
    ui.aviso('Backup baixado. Guarde o arquivo em um lugar seguro.');
  }

  // ------------------------------------------------------------------ Painel
  function avisoBackup(d) {
    if (!store.persistente()) {
      return '<div class="alerta erro"><strong>O navegador bloqueou a gravação.</strong> O que você digitar será perdido ao fechar esta aba. Saia do modo anônimo ou libere o armazenamento do site.</div>';
    }
    var temDados = d.clientes.length || d.orcamentos.length || d.catalogo.length;
    if (!temDados) return '';
    var dias = ui.diasDesde(d.ultimoBackup);
    if (dias !== null && dias < 7) return '';
    var texto = dias === null ? 'Você ainda não fez nenhum backup.' : 'O último backup foi há ' + dias + ' dias.';
    return (
      '<div class="alerta"><div><strong>' + texto + '</strong> Os dados ficam guardados só neste navegador. Se ele for limpo ou o computador trocar, tudo se perde.</div>' +
      '<button type="button" class="botao" data-acao="backup">Baixar backup agora</button></div>'
    );
  }

  V.painel = {
    render: function () {
      var d = store.dados();
      var grupos = { rascunho: [], enviado: [], aprovado: [], recusado: [] };
      d.orcamentos.forEach(function (o) { grupos[o.status].push(o); });
      var soma = function (l) {
        return l.reduce(function (s, o) { return s + calc.orcamentoTotais(o).total; }, 0);
      };
      var obras = d.orcamentos.filter(function (o) { return o.obra && o.obra.status === 'andamento'; });
      var html = cabecalho('Painel', 'Resumo dos orçamentos e das obras.',
        '<a class="botao primario" href="#/orcamentos/novo">' + ui.ICONES.mais + 'Novo orçamento</a>');
      html += avisoBackup(d);

      if (!d.clientes.length && !d.orcamentos.length) {
        html +=
          '<section class="cartao"><h2>Primeiros passos</h2><ol class="passos">' +
          '<li><a href="#/config">Preencha os dados da empresa</a>, que aparecem no cabeçalho das propostas.</li>' +
          '<li><a href="#/clientes/novo">Cadastre o primeiro cliente</a>.</li>' +
          '<li><a href="#/catalogo">Monte o catálogo</a> com os materiais e serviços que você mais usa.</li>' +
          '<li><a href="#/orcamentos/novo">Crie um orçamento</a> e gere a proposta em PDF.</li>' +
          '</ol></section>';
        return html;
      }

      var cartao = function (rotulo, quantidade, valor, link) {
        return (
          '<a class="cartao numero" href="' + link + '"><span class="rotulo-cartao">' + rotulo + '</span>' +
          '<strong>' + quantidade + '</strong><span class="valor-cartao">' + valor + '</span></a>'
        );
      };
      html += '<div class="cartoes">' +
        cartao('Em elaboração', grupos.rascunho.length, ui.dinheiro(soma(grupos.rascunho)), '#/orcamentos') +
        cartao('Enviados', grupos.enviado.length, ui.dinheiro(soma(grupos.enviado)), '#/orcamentos') +
        cartao('Aprovados', grupos.aprovado.length, ui.dinheiro(soma(grupos.aprovado)), '#/orcamentos') +
        cartao('Obras em andamento', obras.length, obras.length === 1 ? '1 obra aberta' : obras.length + ' obras abertas', '#/obras') +
        '</div>';

      var recentes = d.orcamentos.slice(0, 5);
      html += '<section class="cartao"><h2>Orçamentos recentes</h2>';
      if (!recentes.length) {
        html += '<p class="vazio">Nenhum orçamento ainda.</p>';
      } else {
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Número</th><th>Título</th><th>Cliente</th><th>Situação</th><th class="num">Total</th></tr></thead><tbody>';
        recentes.forEach(function (o) {
          var c = store.cliente(o.clienteId);
          html += '<tr><td><a href="#/orcamento/' + esc(o.id) + '">' + esc(o.numero) + '</a></td><td>' + esc(o.titulo || 'Sem título') +
            '</td><td>' + esc(c ? c.nome : 'Sem cliente') + '</td><td>' + ui.etiqueta(o.status) +
            '</td><td class="num">' + ui.dinheiro(calc.orcamentoTotais(o).total) + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</section>';
      return html;
    },
    acoes: { backup: function () { fazerBackup(); DEF.app.desenhar(); } }
  };

  // ---------------------------------------------------------------- Clientes
  var clienteEmEdicao = null; // null = formulário fechado, 'novo' ou o id

  function formularioCliente(c) {
    var novo = !c.id;
    return (
      '<form class="cartao" data-form="cliente"><h2>' + (novo ? 'Novo cliente' : 'Editar cliente') + '</h2><div class="grade">' +
      campo('Nome ou razão social', 'nome', c.nome, { classe: 'duplo', atributos: ' required autocomplete="off"' }) +
      campo('CPF ou CNPJ', 'documento', c.documento, { atributos: ' autocomplete="off"' }) +
      campo('Pessoa de contato', 'contato', c.contato) +
      campo('Telefone', 'telefone', c.telefone, { atributos: ' type="tel"' }) +
      campo('E-mail', 'email', c.email, { atributos: ' type="email"' }) +
      campo('Endereço', 'endereco', c.endereco, { classe: 'duplo' }) +
      campo('Observações', 'obs', c.obs, { classe: 'duplo' }) +
      '</div><div class="acoes"><button class="botao primario" type="submit">Salvar cliente</button>' +
      '<button class="botao" type="button" data-acao="cancelar">Cancelar</button></div></form>'
    );
  }

  V.clientes = {
    aoEntrar: function (rota) { clienteEmEdicao = rota.id === 'novo' ? 'novo' : null; },
    render: function () {
      var d = store.dados();
      var html = cabecalho('Clientes', 'Quem contrata os seus serviços.',
        clienteEmEdicao === null ? '<button type="button" class="botao primario" data-acao="novo">' + ui.ICONES.mais + 'Novo cliente</button>' : '');
      if (clienteEmEdicao !== null) {
        html += formularioCliente(clienteEmEdicao === 'novo' ? {} : store.cliente(clienteEmEdicao) || {});
      }
      html += '<section class="cartao">';
      if (!d.clientes.length) {
        html += '<p class="vazio">Nenhum cliente cadastrado.</p>';
      } else {
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Nome</th><th>CPF ou CNPJ</th><th>Contato</th><th>Telefone</th><th>Orçamentos</th><th><span class="oculto">Ações</span></th></tr></thead><tbody>';
        d.clientes.forEach(function (c) {
          var usados = d.orcamentos.filter(function (o) { return o.clienteId === c.id; }).length;
          html += '<tr><td>' + esc(c.nome) + '</td><td>' + esc(c.documento) + '</td><td>' + esc(c.contato) + '</td><td>' + esc(c.telefone) +
            '</td><td>' + usados + '</td><td class="acoes-linha"><button type="button" class="botao pequeno" data-acao="editar" data-id="' + esc(c.id) + '">Editar</button>' +
            '<button type="button" class="botao pequeno perigo" data-acao="excluir" data-id="' + esc(c.id) + '">Excluir</button></td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</section>';
      return html;
    },
    aposRender: function (raiz) {
      var primeiro = raiz.querySelector('form[data-form="cliente"] input[name="nome"]');
      if (primeiro) primeiro.focus();
    },
    acoes: {
      novo: function () { clienteEmEdicao = 'novo'; DEF.app.desenhar(); },
      editar: function (el) { clienteEmEdicao = el.dataset.id; DEF.app.desenhar(); },
      cancelar: function () { clienteEmEdicao = null; DEF.app.desenhar(); },
      excluir: function (el) {
        var d = store.dados();
        var c = store.cliente(el.dataset.id);
        if (!c) return;
        var usados = d.orcamentos.filter(function (o) { return o.clienteId === c.id; }).length;
        if (usados) {
          ui.aviso('Este cliente tem ' + usados + ' orçamento(s). Exclua ou troque o cliente deles antes.', 'erro');
          return;
        }
        if (!window.confirm('Excluir o cliente "' + c.nome + '"?')) return;
        d.clientes = d.clientes.filter(function (x) { return x.id !== c.id; });
        store.salvar();
        DEF.app.desenhar();
      }
    },
    aoEnviar: {
      cliente: function (form) {
        var d = store.dados();
        var f = new FormData(form);
        var nome = String(f.get('nome') || '').trim();
        if (!nome) { ui.aviso('Informe o nome do cliente.', 'erro'); return; }
        var c = clienteEmEdicao !== 'novo' ? store.cliente(clienteEmEdicao) : null;
        if (!c) { c = { id: store.id() }; d.clientes.push(c); }
        c.nome = nome;
        ['documento', 'contato', 'telefone', 'email', 'endereco', 'obs'].forEach(function (k) {
          c[k] = String(f.get(k) || '').trim();
        });
        d.clientes.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
        store.salvar();
        clienteEmEdicao = null;
        ui.aviso('Cliente salvo.');
        DEF.app.desenhar();
      }
    }
  };

  // ---------------------------------------------------------------- Catálogo
  var itemEmEdicao = null;

  // Itens de exemplo, sem preço: os valores dependem do fornecedor e da região.
  var EXEMPLOS = [
    ['Ponto de tomada 2P+T 10 A, com caixa e placa', 'un', 'Iluminação e tomadas'],
    ['Ponto de iluminação no teto, com caixa', 'un', 'Iluminação e tomadas'],
    ['Interruptor simples, com caixa e placa', 'un', 'Iluminação e tomadas'],
    ['Cabo de cobre flexível 2,5 mm² 750 V', 'm', 'Cabeamento'],
    ['Cabo de cobre flexível 4 mm² 750 V', 'm', 'Cabeamento'],
    ['Cabo de cobre flexível 6 mm² 750 V', 'm', 'Cabeamento'],
    ['Eletroduto corrugado 25 mm', 'm', 'Infraestrutura'],
    ['Eletroduto de PVC rígido 3/4"', 'm', 'Infraestrutura'],
    ['Disjuntor termomagnético monopolar 20 A', 'un', 'Quadros e proteção'],
    ['Interruptor diferencial residual tetrapolar 40 A 30 mA', 'un', 'Quadros e proteção'],
    ['Dispositivo de proteção contra surtos classe II 275 V', 'un', 'Quadros e proteção'],
    ['Quadro de distribuição de embutir para 24 disjuntores', 'un', 'Quadros e proteção'],
    ['Haste de aterramento cobreada 5/8" x 2,40 m, com conector', 'un', 'SPDA e aterramento'],
    ['Projeto elétrico, hora técnica', 'h', 'Projeto e documentação'],
    ['Visita técnica', 'un', 'Projeto e documentação'],
    ['Anotação de Responsabilidade Técnica (ART)', 'un', 'Projeto e documentação']
  ];

  function formularioCatalogo(i) {
    var novo = !i.id;
    return (
      '<form class="cartao" data-form="catalogo"><h2>' + (novo ? 'Novo item do catálogo' : 'Editar item') + '</h2><div class="grade">' +
      campo('Descrição', 'descricao', i.descricao, { classe: 'duplo', atributos: ' required autocomplete="off"' }) +
      campo('Unidade', 'unidade', i.unidade || 'un', { atributos: ' autocomplete="off"' }) +
      campo('Categoria', 'categoria', i.categoria, { atributos: ' list="lista-etapas" autocomplete="off"' }) +
      campo('Material, R$ por unidade', 'material', ui.campoNumero(i.material), { atributos: ' inputmode="decimal" autocomplete="off"' }) +
      campo('Mão de obra, R$ por unidade', 'maoDeObra', ui.campoNumero(i.maoDeObra), { atributos: ' inputmode="decimal" autocomplete="off"' }) +
      '</div><div class="acoes"><button class="botao primario" type="submit">Salvar item</button>' +
      '<button class="botao" type="button" data-acao="cancelar">Cancelar</button></div></form>'
    );
  }

  V.catalogo = {
    aoEntrar: function () { itemEmEdicao = null; },
    render: function () {
      var d = store.dados();
      var html = cabecalho('Catálogo', 'Materiais e serviços com preço de custo, para reaproveitar nos orçamentos.',
        itemEmEdicao === null ? '<button type="button" class="botao primario" data-acao="novo">' + ui.ICONES.mais + 'Novo item</button>' : '');
      if (itemEmEdicao !== null) {
        html += formularioCatalogo(itemEmEdicao === 'novo' ? {} : store.itemCatalogo(itemEmEdicao) || {});
      }
      html += '<section class="cartao">';
      if (!d.catalogo.length) {
        html += '<p class="vazio">O catálogo está vazio.</p><p>Você pode começar com uma lista de itens comuns de instalação elétrica. Eles vêm sem preço, para você preencher com os seus custos.</p>' +
          '<button type="button" class="botao" data-acao="exemplos">Carregar itens de exemplo</button>';
      } else {
        html += '<div class="rolagem"><table class="tabela"><thead><tr><th>Descrição</th><th>Un.</th><th>Categoria</th><th class="num">Material</th><th class="num">Mão de obra</th><th><span class="oculto">Ações</span></th></tr></thead><tbody>';
        d.catalogo.forEach(function (i) {
          var semPreco = !i.material && !i.maoDeObra;
          html += '<tr><td>' + esc(i.descricao) + (semPreco ? ' <span class="etiqueta etiqueta-pendente">sem preço</span>' : '') + '</td><td>' + esc(i.unidade) + '</td><td>' + esc(i.categoria) +
            '</td><td class="num">' + ui.dinheiro(i.material) + '</td><td class="num">' + ui.dinheiro(i.maoDeObra) +
            '</td><td class="acoes-linha"><button type="button" class="botao pequeno" data-acao="editar" data-id="' + esc(i.id) + '">Editar</button>' +
            '<button type="button" class="botao pequeno perigo" data-acao="excluir" data-id="' + esc(i.id) + '">Excluir</button></td></tr>';
        });
        html += '</tbody></table></div>';
      }
      html += '</section>';
      return html;
    },
    aposRender: function (raiz) {
      var primeiro = raiz.querySelector('form[data-form="catalogo"] input[name="descricao"]');
      if (primeiro) primeiro.focus();
    },
    acoes: {
      novo: function () { itemEmEdicao = 'novo'; DEF.app.desenhar(); },
      editar: function (el) { itemEmEdicao = el.dataset.id; DEF.app.desenhar(); },
      cancelar: function () { itemEmEdicao = null; DEF.app.desenhar(); },
      exemplos: function () {
        var d = store.dados();
        EXEMPLOS.forEach(function (e) {
          d.catalogo.push({ id: store.id(), descricao: e[0], unidade: e[1], categoria: e[2], material: 0, maoDeObra: 0 });
        });
        store.salvar();
        ui.aviso('Itens de exemplo carregados. Preencha os preços de custo.');
        DEF.app.desenhar();
      },
      excluir: function (el) {
        var d = store.dados();
        var i = store.itemCatalogo(el.dataset.id);
        if (!i || !window.confirm('Excluir "' + i.descricao + '" do catálogo? Os orçamentos já feitos não mudam.')) return;
        d.catalogo = d.catalogo.filter(function (x) { return x.id !== i.id; });
        store.salvar();
        DEF.app.desenhar();
      }
    },
    aoEnviar: {
      catalogo: function (form) {
        var d = store.dados();
        var f = new FormData(form);
        var descricao = String(f.get('descricao') || '').trim();
        if (!descricao) { ui.aviso('Informe a descrição do item.', 'erro'); return; }
        var i = itemEmEdicao !== 'novo' ? store.itemCatalogo(itemEmEdicao) : null;
        if (!i) { i = { id: store.id() }; d.catalogo.push(i); }
        i.descricao = descricao;
        i.unidade = String(f.get('unidade') || '').trim() || 'un';
        i.categoria = String(f.get('categoria') || '').trim();
        i.material = Math.max(0, calc.parseNum(f.get('material')));
        i.maoDeObra = Math.max(0, calc.parseNum(f.get('maoDeObra')));
        store.salvar();
        itemEmEdicao = null;
        ui.aviso('Item salvo.');
        DEF.app.desenhar();
      }
    }
  };

  // ----------------------------------------------------------- Configurações
  V.config = {
    render: function () {
      var d = store.dados();
      var e = d.empresa;
      var dias = ui.diasDesde(d.ultimoBackup);
      var ultimo = dias === null ? 'Nenhum backup feito ainda.' : dias === 0 ? 'Último backup: hoje.' : 'Último backup: há ' + dias + ' dia(s).';
      return (
        cabecalho('Configurações', 'Dados da empresa, valores padrão e backup.') +
        '<form class="cartao" data-form="empresa"><h2>Dados da empresa</h2><p class="sub">Aparecem no cabeçalho e na assinatura das propostas.</p><div class="grade">' +
        campo('Nome da empresa', 'nome', e.nome, { classe: 'duplo' }) +
        campo('CNPJ ou CPF', 'documento', e.documento) +
        campo('Responsável técnico', 'responsavel', e.responsavel) +
        campo('Registro no CREA', 'registro', e.registro) +
        campo('Telefone', 'telefone', e.telefone, { atributos: ' type="tel"' }) +
        campo('E-mail', 'email', e.email, { atributos: ' type="email"' }) +
        campo('Endereço', 'endereco', e.endereco, { classe: 'duplo' }) +
        '</div><h2>Valores padrão dos novos orçamentos</h2><div class="grade">' +
        campo('BDI, em %', 'bdiPadrao', ui.campoNumero(e.bdiPadrao), { atributos: ' inputmode="decimal"' }) +
        campo('Validade da proposta, em dias', 'validadeDias', ui.campoNumero(e.validadeDias), { atributos: ' inputmode="numeric"' }) +
        '<label class="rotulo duplo">Condições gerais da proposta<textarea name="condicoes" rows="4" placeholder="Exemplo: forma de pagamento, prazo de execução e o que não está incluído.">' + esc(e.condicoes) + '</textarea></label>' +
        '</div><p class="sub">O BDI é o percentual aplicado sobre o custo direto para cobrir despesas indiretas, impostos e lucro. O valor inicial de 25% é só um ponto de partida: ajuste ao seu caso.</p>' +
        '<div class="acoes"><button class="botao primario" type="submit">Salvar configurações</button></div></form>' +
        '<section class="cartao"><h2>Backup</h2><p>Os dados ficam guardados só neste navegador. Baixe um backup com frequência e guarde o arquivo fora do computador.</p><p class="sub">' + ultimo + '</p>' +
        '<div class="acoes"><button type="button" class="botao primario" data-acao="backup">Baixar backup</button>' +
        '<label class="botao arquivo">Restaurar de um arquivo<input type="file" accept=".json,application/json" data-arquivo="restaurar"></label></div></section>' +
        '<section class="cartao"><h2>Apagar tudo</h2><p>Remove clientes, catálogo, orçamentos e obras deste navegador. Não tem como desfazer.</p>' +
        '<div class="acoes"><button type="button" class="botao perigo" data-acao="apagar">Apagar todos os dados</button></div></section>'
      );
    },
    acoes: {
      backup: function () { fazerBackup(); DEF.app.desenhar(); },
      apagar: function () {
        if (!window.confirm('Apagar TODOS os dados deste navegador? Esta ação não pode ser desfeita.')) return;
        store.apagarTudo();
        ui.aviso('Dados apagados.');
        DEF.app.desenhar();
      }
    },
    aoMudar: function (el) {
      if (el.dataset.arquivo !== 'restaurar' || !el.files || !el.files[0]) return;
      var arquivo = el.files[0];
      var leitor = new FileReader();
      leitor.onload = function () {
        if (!window.confirm('Restaurar o backup "' + arquivo.name + '"? Os dados atuais deste navegador serão substituídos.')) { el.value = ''; return; }
        try {
          store.importar(String(leitor.result));
          ui.aviso('Backup restaurado.');
        } catch (erro) {
          ui.aviso(erro.message, 'erro');
        }
        DEF.app.desenhar();
      };
      leitor.onerror = function () { ui.aviso('Não foi possível ler o arquivo.', 'erro'); };
      leitor.readAsText(arquivo);
    },
    aoEnviar: {
      empresa: function (form) {
        var e = store.dados().empresa;
        var f = new FormData(form);
        ['nome', 'documento', 'responsavel', 'registro', 'telefone', 'email', 'endereco', 'condicoes'].forEach(function (k) {
          e[k] = String(f.get(k) || '').trim();
        });
        e.bdiPadrao = calc.clamp(calc.parseNum(f.get('bdiPadrao')), 0, 500);
        e.validadeDias = Math.round(calc.clamp(calc.parseNum(f.get('validadeDias')), 0, 3650));
        store.salvar();
        ui.aviso('Configurações salvas.');
        DEF.app.desenhar();
      }
    }
  };
})();
