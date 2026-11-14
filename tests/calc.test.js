// Testes dos cálculos. Rode na raiz do repositório com: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../sistema/js/calc.js');

test('parseNum lê números no padrão brasileiro e com ponto decimal', () => {
  assert.equal(calc.parseNum('1.234,56'), 1234.56);
  assert.equal(calc.parseNum('12,5'), 12.5);
  assert.equal(calc.parseNum('12.5'), 12.5);
  assert.equal(calc.parseNum('1.500'), 1500);
  assert.equal(calc.parseNum('1.234.567'), 1234567);
  assert.equal(calc.parseNum('R$ 80,00'), 80);
  assert.equal(calc.parseNum(''), 0);
  assert.equal(calc.parseNum('abc'), 0);
  assert.equal(calc.parseNum(7), 7);
});

test('itemCusto separa material e mão de obra', () => {
  const c = calc.itemCusto({ quantidade: 10, material: 12.5, maoDeObra: 7.25 });
  assert.deepEqual(c, { material: 125, maoDeObra: 72.5, total: 197.5 });
});

test('valores negativos ou inválidos contam como zero', () => {
  const c = calc.itemCusto({ quantidade: -3, material: 'x', maoDeObra: 5 });
  assert.equal(c.total, 0);
});

test('preço da linha é quantidade x preço unitário com BDI, em centavos', () => {
  const item = { quantidade: 3, material: 3.33, maoDeObra: 0 };
  assert.equal(calc.itemPrecoUnitario(item, 25), 4.16);
  assert.equal(calc.itemPreco(item, 25), 12.48);
});

test('orcamentoTotais soma etapas, aplica BDI e desconto', () => {
  const orc = {
    bdi: 25,
    desconto: 100,
    etapas: [
      { id: 'a', nome: 'Infraestrutura', itens: [{ quantidade: 100, material: 4, maoDeObra: 6 }] },
      { id: 'b', nome: 'Quadros', itens: [{ quantidade: 2, material: 350, maoDeObra: 150 }] }
    ]
  };
  const t = calc.orcamentoTotais(orc);
  assert.equal(t.material, 1100);
  assert.equal(t.maoDeObra, 900);
  assert.equal(t.custoDireto, 2000);
  assert.equal(t.precoItens, 2500);
  assert.equal(t.bdiValor, 500);
  assert.equal(t.desconto, 100);
  assert.equal(t.total, 2400);
  assert.equal(t.margem, 400);
  assert.equal(t.margemPercentual, 16.67);
  assert.deepEqual(t.etapas.map((e) => e.preco), [1250, 1250]);
});

test('o total é igual à soma das linhas mostradas na proposta', () => {
  const orc = {
    bdi: 27.5,
    desconto: 0,
    etapas: [{ id: 'a', nome: 'x', itens: [
      { quantidade: 7, material: 1.99, maoDeObra: 0.35 },
      { quantidade: 13.5, material: 0.87, maoDeObra: 2.11 },
      { quantidade: 1, material: 1234.56, maoDeObra: 789.01 }
    ] }]
  };
  const linhas = orc.etapas[0].itens.reduce((s, i) => s + Math.round(calc.itemPreco(i, orc.bdi) * 100), 0) / 100;
  assert.equal(calc.orcamentoTotais(orc).total, linhas);
});

test('desconto nunca passa do preço dos itens', () => {
  const orc = { bdi: 0, desconto: 999, etapas: [{ id: 'a', nome: 'x', itens: [{ quantidade: 1, material: 50, maoDeObra: 0 }] }] };
  const t = calc.orcamentoTotais(orc);
  assert.equal(t.desconto, 50);
  assert.equal(t.total, 0);
});

test('orçamento vazio não quebra', () => {
  const t = calc.orcamentoTotais({ etapas: [] });
  assert.equal(t.total, 0);
  assert.equal(t.margemPercentual, 0);
});

test('obraResumo pondera o avanço pelo preço das etapas', () => {
  const orc = {
    bdi: 25,
    desconto: 0,
    etapas: [
      { id: 'a', nome: 'A', itens: [{ quantidade: 1, material: 3000, maoDeObra: 0 }] },
      { id: 'b', nome: 'B', itens: [{ quantidade: 1, material: 1000, maoDeObra: 0 }] }
    ],
    obra: {
      avancos: { a: 100, b: 0 },
      lancamentos: [
        { tipo: 'material', valor: 2800 },
        { tipo: 'mao', valor: 400 },
        { tipo: 'qualquer', valor: 50 }
      ]
    }
  };
  const r = calc.obraResumo(orc);
  assert.equal(r.avanco, 75);
  assert.equal(r.precoContratado, 5000);
  assert.equal(r.valorExecutado, 3750);
  assert.equal(r.custoPrevisto, 4000);
  assert.equal(r.custoRealizado, 3250);
  assert.equal(r.saldoCusto, 750);
  assert.equal(r.custoPrevistoAteAgora, 3000);
  assert.equal(r.desvio, 250);
  assert.deepEqual(r.porTipo, { material: 2800, mao: 400, outros: 50 });
});

test('obraResumo usa média simples quando as etapas não têm preço', () => {
  const orc = { bdi: 0, etapas: [{ id: 'a', nome: 'A', itens: [] }, { id: 'b', nome: 'B', itens: [] }], obra: { avancos: { a: 50, b: 100 } } };
  assert.equal(calc.obraResumo(orc).avanco, 75);
});

test('proximoNumero continua a sequência do ano', () => {
  assert.equal(calc.proximoNumero([], 2026), '2026-001');
  assert.equal(calc.proximoNumero([{ numero: '2026-001' }, { numero: '2026-007' }, { numero: '2025-040' }], 2026), '2026-008');
});
