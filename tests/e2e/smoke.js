// Teste do DEF Obras inteiro no navegador. Precisa do Playwright instalado e de um servidor local na raiz do repositório.
// Uso: node tests/e2e/smoke.js <endereço-base> <pasta-de-saída>
// Exemplo: node tests/e2e/smoke.js http://localhost:8765 /tmp/def-obras-teste
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true, locale: 'pt-BR' });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.accept());
  const shot = (name) => page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  const main = page.locator('#conteudo');

  const nav = async (tela, titulo) => {
    await page.click('.menu a[data-tela="' + tela + '"]');
    await main.getByRole('heading', { level: 1, name: titulo, exact: true }).waitFor();
  };

  // 1. Primeiro acesso
  await page.goto(base + '/sistema/');
  await main.getByRole('heading', { name: 'Primeiros passos' }).waitFor();
  await shot('01-painel-vazio');

  // 2. Configurações
  await page.goto(base + '/sistema/#/config');
  await page.fill('input[name="responsavel"]', 'Eng. Teste da Silva');
  await page.fill('input[name="registro"]', '000000-RO');
  await page.fill('input[name="telefone"]', '(69) 90000-0000');
  await page.fill('textarea[name="condicoes"]', 'Pagamento: 50% na aprovação e 50% na entrega.\nPrazo: 20 dias úteis.');
  await page.click('form[data-form="empresa"] button[type="submit"]');

  // 3. Clientes (com HTML no nome, para conferir que o texto é exibido sem ser executado)
  await nav('clientes', 'Clientes');
  await page.click('[data-acao="novo"]');
  await page.fill('input[name="nome"]', 'Construtora <img src=x onerror="window.__xss=1"> Teste');
  await page.fill('input[name="documento"]', '00.000.000/0001-00');
  await page.fill('input[name="endereco"]', 'Av. Exemplo, 100, Porto Velho, RO');
  await page.click('form[data-form="cliente"] button[type="submit"]');
  await main.locator('table tbody tr').first().waitFor();
  assert.equal(await main.locator('table tbody tr').count(), 1);
  assert.equal(await page.evaluate(() => window.__xss), undefined, 'HTML no nome do cliente não pode ser executado');

  // 4. Catálogo
  await nav('catalogo', 'Catálogo');
  await page.click('[data-acao="exemplos"]');
  assert.equal(await main.locator('table tbody tr').count(), 16);
  await main.locator('table tbody tr').nth(3).locator('[data-acao="editar"]').click();
  const catDesc = await page.inputValue('input[name="descricao"]');
  await page.fill('input[name="material"]', '3,20');
  await page.fill('input[name="maoDeObra"]', '1,80');
  await page.click('form[data-form="catalogo"] button[type="submit"]');
  await shot('02-catalogo');

  // 5. Orçamento
  await page.goto(base + '/sistema/#/orcamentos/novo');
  await page.waitForURL(/#\/orcamento\//);
  await page.fill('[data-campo="titulo"]', 'Instalação elétrica de sobrado');
  await page.selectOption('[data-campo="clienteId"]', { index: 1 });
  await page.fill('[data-campo="local"]', 'Rua de Teste, 10');
  const row1 = main.locator('tr[data-item]').first();
  await row1.locator('[data-item-campo="descricao"]').fill(catDesc);
  await row1.locator('[data-item-campo="descricao"]').dispatchEvent('change');
  assert.equal(await row1.locator('[data-item-campo="material"]').inputValue(), '3,2', 'material preenchido pelo catálogo');
  assert.equal(await row1.locator('[data-item-campo="unidade"]').inputValue(), 'm');
  await row1.locator('[data-item-campo="quantidade"]').fill('100');
  await main.locator('[data-acao="novo-item"]').first().click();
  const row2 = main.locator('tr[data-item]').nth(1);
  await row2.locator('[data-item-campo="descricao"]').fill('Quadro de distribuição montado');
  await row2.locator('[data-item-campo="quantidade"]').fill('2');
  await row2.locator('[data-item-campo="material"]').fill('350');
  await row2.locator('[data-item-campo="maoDeObra"]').fill('150,00');
  await main.locator('[data-acao="nova-etapa"]').click();
  const etapa2 = main.locator('section.etapa').nth(1);
  await etapa2.locator('[data-etapa-campo="nome"]').fill('SPDA e aterramento');
  const row3 = etapa2.locator('tr[data-item]').first();
  await row3.locator('[data-item-campo="descricao"]').fill('Haste de aterramento');
  await row3.locator('[data-item-campo="quantidade"]').fill('4');
  await row3.locator('[data-item-campo="material"]').fill('1.250,00');
  await page.fill('[data-campo="desconto"]', '125');
  // custo direto: 100*5 + 2*500 + 4*1250 = 6500 ; BDI 25% => 8125 ; desconto 125 => 8000
  const txt = async (k) => (await main.locator(`[data-out="${k}"]`).textContent()).replace(/ /g, ' ');
  assert.equal(await txt('res-custo'), 'R$ 6.500,00');
  assert.equal(await txt('res-bdi'), 'R$ 1.625,00');
  assert.equal(await txt('res-total'), 'R$ 8.000,00');
  await shot('03-orcamento');

  // 6. Proposta
  const orcUrl = page.url();
  const id = orcUrl.split('/').pop();
  await page.goto(base + '/sistema/#/proposta/' + id);
  await main.locator('.folha').waitFor();
  const folha = (await main.locator('.folha').textContent()).replace(/ /g, ' ');
  assert.ok(folha.includes('R$ 8.000,00'), 'total na proposta');
  assert.ok(folha.includes('Eng. Teste da Silva'));
  assert.ok(!folha.includes('BDI'), 'a proposta não pode mostrar o BDI');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  await shot('04-proposta');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(out, 'proposta.pdf'), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.uncheck('[data-opcao="detalhar"]');
  await shot('05-proposta-resumida');
  await page.check('[data-opcao="detalhar"]');

  // 7. Aprovar e abrir a obra
  await page.goto(orcUrl);
  await page.selectOption('[data-campo="status"]', 'aprovado');
  await main.locator('[data-acao="abrir-obra"]').click();
  await page.waitForURL(/#\/obra\//);
  await main.locator('[data-avanco]').first().fill('100');
  await page.fill('form[data-form="lancamento"] input[name="descricao"]', 'Compra de cabos');
  await page.fill('form[data-form="lancamento"] input[name="valor"]', '1.700,50');
  await page.click('form[data-form="lancamento"] button[type="submit"]');
  await main.locator('table tbody tr').last().waitFor();
  // preço da etapa 1 = 625 + 1250 = 1875 de 8125 => 23,1% ; custo previsto até agora = 1500 ; desvio = 200,50
  assert.equal(await txt('ob-avanco'), '23,1%');
  assert.equal(await txt('ob-realizado'), 'R$ 1.700,50');
  assert.equal(await txt('ob-desvio'), '+R$ 200,50');
  assert.equal(await txt('ob-desvio-nota'), 'Acima do previsto para o avanço');
  await shot('06-obra');

  // 8. Listas e painel
  await nav('obras', 'Obras');
  await shot('07-obras');
  await nav('orcamentos', 'Orçamentos');
  await shot('08-orcamentos');
  await nav('painel', 'Painel');
  await shot('09-painel');

  // 9. Os dados continuam depois de recarregar
  await page.reload();
  await nav('orcamentos', 'Orçamentos');
  assert.equal(await main.locator('table tbody tr').count(), 1);

  // 10. Backup e restauração
  await nav('config', 'Configurações');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-acao="backup"]')]);
  const backupPath = path.join(out, 'backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.equal(backup.orcamentos.length, 1);
  assert.equal(backup.clientes.length, 1);
  await page.click('[data-acao="apagar"]');
  await nav('orcamentos', 'Orçamentos');
  assert.equal(await main.locator('table tbody tr').count(), 0);
  await nav('config', 'Configurações');
  await page.setInputFiles('[data-arquivo="restaurar"]', backupPath);
  await page.waitForTimeout(300);
  await nav('orcamentos', 'Orçamentos');
  assert.equal(await main.locator('table tbody tr').count(), 1);
  // arquivo inválido é recusado e os dados continuam
  const bad = path.join(out, 'ruim.json');
  fs.writeFileSync(bad, '{"qualquer":1}');
  await nav('config', 'Configurações');
  await page.setInputFiles('[data-arquivo="restaurar"]', bad);
  await page.waitForTimeout(300);
  await nav('orcamentos', 'Orçamentos');
  assert.equal(await main.locator('table tbody tr').count(), 1);

  // 11. Duplicar e excluir
  await main.locator('[data-acao="duplicar"]').first().click();
  await page.waitForURL(/#\/orcamento\//);
  await main.locator('h1', { hasText: '-002' }).waitFor({ timeout: 5000 });
  await nav('orcamentos', 'Orçamentos');
  assert.equal(await main.locator('table tbody tr').count(), 2);
  await main.locator('[data-acao="excluir"]').first().click();
  assert.equal(await main.locator('table tbody tr').count(), 1);

  // 12. O link de pular para o conteúdo não muda a tela
  await page.goto(base + '/sistema/#/catalogo');
  await page.focus('.pular');
  await page.keyboard.press('Enter');
  assert.ok(page.url().endsWith('#/catalogo'));

  // 13. Largura de celular
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(orcUrl);
  await main.locator('section.etapa').first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, 'sem rolagem horizontal da página no celular, sobrou ' + overflow);
  await shot('10-orcamento-celular');
  await page.goto(base + '/sistema/#/proposta/' + id);
  await shot('11-proposta-celular');

  assert.deepEqual(errors, [], 'sem erros de console ou de página');
  await browser.close();
  console.log('SMOKE OK');
})().catch((e) => { console.error('SMOKE FAILED\n', e); process.exit(1); });
