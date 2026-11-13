/*
 * Dados do sistema. Tudo fica guardado no navegador (localStorage), em uma
 * única chave. Não há servidor: o backup é um arquivo JSON que o usuário
 * exporta e importa na tela de Configurações.
 */
(function () {
  'use strict';
  var DEF = (window.DEF = window.DEF || {});
  var calc = DEF.calc;

  var CHAVE = 'def-obras-v1';
  var STATUS_ORCAMENTO = ['rascunho', 'enviado', 'aprovado', 'recusado'];
  var STATUS_OBRA = ['andamento', 'pausada', 'concluida'];
  var TIPOS_LANCAMENTO = ['material', 'mao', 'outros'];

  var estado = null;
  var persistente = true;
  var temporizador = null;

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function texto(v) {
    return v == null ? '' : String(v);
  }

  function lista(v) {
    return Array.isArray(v) ? v.filter(function (x) { return x && typeof x === 'object'; }) : [];
  }

  function hoje() {
    var d = new Date();
    var dois = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate());
  }

  function padrao() {
    return {
      versao: 1,
      criadoEm: new Date().toISOString(),
      ultimoBackup: null,
      empresa: {
        nome: 'DEF Engenharia',
        responsavel: '',
        registro: '',
        documento: '',
        telefone: '',
        email: '',
        endereco: '',
        bdiPadrao: 25,
        validadeDias: 15,
        condicoes: ''
      },
      clientes: [],
      catalogo: [],
      orcamentos: []
    };
  }

  function itemEmBranco() {
    return { id: id(), descricao: '', unidade: 'un', quantidade: 1, material: 0, maoDeObra: 0 };
  }

  function normalizarObra(b) {
    var avancos = {};
    Object.keys(b.avancos || {}).forEach(function (k) {
      avancos[k] = calc.clamp(b.avancos[k], 0, 100);
    });
    return {
      inicio: texto(b.inicio),
      previsaoFim: texto(b.previsaoFim),
      status: STATUS_OBRA.indexOf(b.status) !== -1 ? b.status : 'andamento',
      avancos: avancos,
      lancamentos: lista(b.lancamentos).map(function (l) {
        return {
          id: texto(l.id) || id(),
          data: texto(l.data),
          descricao: texto(l.descricao),
          tipo: TIPOS_LANCAMENTO.indexOf(l.tipo) !== -1 ? l.tipo : 'outros',
          etapaId: texto(l.etapaId),
          valor: calc.positivo(l.valor)
        };
      })
    };
  }

  function normalizarOrcamento(o) {
    return {
      id: texto(o.id) || id(),
      numero: texto(o.numero),
      titulo: texto(o.titulo),
      clienteId: texto(o.clienteId),
      local: texto(o.local),
      data: texto(o.data) || hoje(),
      validadeDias: calc.positivo(o.validadeDias),
      status: STATUS_ORCAMENTO.indexOf(o.status) !== -1 ? o.status : 'rascunho',
      bdi: calc.positivo(o.bdi),
      desconto: calc.positivo(o.desconto),
      observacoes: texto(o.observacoes),
      etapas: lista(o.etapas).map(function (e) {
        return {
          id: texto(e.id) || id(),
          nome: texto(e.nome),
          itens: lista(e.itens).map(function (i) {
            return {
              id: texto(i.id) || id(),
              descricao: texto(i.descricao),
              unidade: texto(i.unidade),
              quantidade: calc.positivo(i.quantidade),
              material: calc.positivo(i.material),
              maoDeObra: calc.positivo(i.maoDeObra)
            };
          })
        };
      }),
      obra: o.obra && typeof o.obra === 'object' ? normalizarObra(o.obra) : null
    };
  }

  /** Garante o formato dos dados, venha ele do navegador ou de um arquivo de backup. */
  function normalizar(d) {
    var p = padrao();
    if (!d || typeof d !== 'object') return p;
    p.criadoEm = texto(d.criadoEm) || p.criadoEm;
    p.ultimoBackup = d.ultimoBackup ? texto(d.ultimoBackup) : null;
    var e = d.empresa && typeof d.empresa === 'object' ? d.empresa : {};
    Object.keys(p.empresa).forEach(function (k) {
      if (e[k] == null) return;
      p.empresa[k] = k === 'bdiPadrao' || k === 'validadeDias' ? calc.positivo(e[k]) : texto(e[k]);
    });
    p.clientes = lista(d.clientes).map(function (c) {
      return {
        id: texto(c.id) || id(),
        nome: texto(c.nome),
        documento: texto(c.documento),
        contato: texto(c.contato),
        telefone: texto(c.telefone),
        email: texto(c.email),
        endereco: texto(c.endereco),
        obs: texto(c.obs)
      };
    });
    p.catalogo = lista(d.catalogo).map(function (c) {
      return {
        id: texto(c.id) || id(),
        descricao: texto(c.descricao),
        unidade: texto(c.unidade),
        categoria: texto(c.categoria),
        material: calc.positivo(c.material),
        maoDeObra: calc.positivo(c.maoDeObra)
      };
    });
    p.orcamentos = lista(d.orcamentos).map(normalizarOrcamento);
    return p;
  }

  function carregar() {
    var bruto = null;
    try {
      bruto = window.localStorage.getItem(CHAVE);
    } catch (erro) {
      persistente = false;
    }
    var dados = null;
    if (bruto) {
      try {
        dados = JSON.parse(bruto);
      } catch (erro) {
        dados = null;
      }
    }
    estado = normalizar(dados);
    return estado;
  }

  function salvar() {
    if (temporizador) {
      clearTimeout(temporizador);
      temporizador = null;
    }
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(estado));
      persistente = true;
    } catch (erro) {
      persistente = false;
    }
    return persistente;
  }

  /** Para digitação: junta várias alterações em uma gravação só. */
  function salvarDepois() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(salvar, 250);
  }

  function achar(colecao, idProcurado) {
    for (var i = 0; i < colecao.length; i++) if (colecao[i].id === idProcurado) return colecao[i];
    return null;
  }

  function novoOrcamento() {
    var orc = normalizarOrcamento({
      numero: calc.proximoNumero(estado.orcamentos, new Date().getFullYear()),
      data: hoje(),
      validadeDias: estado.empresa.validadeDias,
      bdi: estado.empresa.bdiPadrao,
      etapas: [{ nome: 'Etapa 1', itens: [itemEmBranco()] }]
    });
    estado.orcamentos.unshift(orc);
    salvar();
    return orc;
  }

  function duplicarOrcamento(idOrigem) {
    var origem = achar(estado.orcamentos, idOrigem);
    if (!origem) return null;
    var copia = JSON.parse(JSON.stringify(origem));
    copia.id = '';
    copia.obra = null;
    copia.status = 'rascunho';
    copia.data = hoje();
    copia.numero = calc.proximoNumero(estado.orcamentos, new Date().getFullYear());
    copia.titulo = origem.titulo ? origem.titulo + ' (cópia)' : '';
    copia.etapas.forEach(function (e) {
      e.id = '';
      e.itens.forEach(function (i) { i.id = ''; });
    });
    var orc = normalizarOrcamento(copia);
    estado.orcamentos.unshift(orc);
    salvar();
    return orc;
  }

  /** Abre a obra de um orçamento aprovado. Não faz nada se ela já existe. */
  function abrirObra(orc) {
    if (!orc.obra) {
      orc.obra = normalizarObra({ inicio: hoje(), status: 'andamento' });
      salvar();
    }
    return orc.obra;
  }

  function exportar() {
    estado.ultimoBackup = new Date().toISOString();
    salvar();
    return JSON.stringify(estado, null, 2);
  }

  /** Substitui todos os dados pelos do arquivo. Lança erro se o arquivo não for um backup válido. */
  function importar(textoJson) {
    var dados;
    try {
      dados = JSON.parse(textoJson);
    } catch (erro) {
      throw new Error('O arquivo não é um JSON válido.');
    }
    if (!dados || typeof dados !== 'object' || !Array.isArray(dados.orcamentos) || !Array.isArray(dados.clientes)) {
      throw new Error('O arquivo não parece ser um backup deste sistema.');
    }
    estado = normalizar(dados);
    salvar();
    return estado;
  }

  function apagarTudo() {
    estado = padrao();
    salvar();
    return estado;
  }

  DEF.store = {
    STATUS_ORCAMENTO: STATUS_ORCAMENTO,
    STATUS_OBRA: STATUS_OBRA,
    TIPOS_LANCAMENTO: TIPOS_LANCAMENTO,
    id: id,
    hoje: hoje,
    carregar: carregar,
    dados: function () { return estado; },
    salvar: salvar,
    salvarDepois: salvarDepois,
    persistente: function () { return persistente; },
    cliente: function (i) { return achar(estado.clientes, i); },
    itemCatalogo: function (i) { return achar(estado.catalogo, i); },
    orcamento: function (i) { return achar(estado.orcamentos, i); },
    itemEmBranco: itemEmBranco,
    novoOrcamento: novoOrcamento,
    duplicarOrcamento: duplicarOrcamento,
    abrirObra: abrirObra,
    exportar: exportar,
    importar: importar,
    apagarTudo: apagarTudo
  };
})();
