import { test, expect } from '@playwright/test';

const api = 'http://localhost:8080/api';
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', async (dialog) => {
    errors.push(`Dialogo nativo inesperado: ${dialog.type()}`);
    await dialog.dismiss();
  });
  // External product photos are not dependencies of the application flows.
  await page.route('https://**/*', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>'
  }));
});
test.afterEach(() => expect(errors).toEqual([]));

async function login(page, username = 'CLI001', password = '123456') {
  await page.goto('/');
  await page.locator('input[name="usuario"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button.btnPrincipal').click();
  await expect(page.locator('.sidebar')).toBeVisible();
}
async function cerrarAviso(page) {
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', {name:'Entendido',exact:true}).click();
  await expect(modal).toHaveCount(0);
}
async function cart(page) {
  await login(page);
  await page.locator('.productoCard').first().getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: /Mi carrito/ }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de compra' })).toBeVisible();
  await expect(page.getByText('IGV (18%)', { exact: true })).toBeVisible();
}

test('API: catalogs, dashboard, auth, validation, CORS, and missing API key', async ({ request }) => {
  for (const path of ['/productos','/clientes','/ventas','/dashboard','/catalogos/parametros','/catalogos/tipos-documento','/catalogos/medios-pago','/ventas/cliente/CLI001']) {
    const response = await request.get(api + path);
    expect(response.status(), path + ': ' + await response.text()).toBe(200);
  }
  const loginResponse = await request.post(api+'/auth/login', { data: { idCliente:'admin',password:'123456' } });
  expect(loginResponse.status()).toBe(200);
  expect((await loginResponse.json()).rol).toBe('ADMIN');
  expect((await request.post(api+'/auth/login',{ data:{ idCliente:'admin',password:'wrong' }})).status()).toBe(400);
  expect((await request.post(api+'/clientes/registro',{ data:{idCliente:'invalid',nombre:'Prueba',apellido:'Cliente'} })).status()).toBe(400);
  expect((await request.post(api+'/clientes/registro',{ data:{idCliente:'admin',nombre:'Prueba',apellido:'Cliente',password:'Prueba123'} })).status()).toBe(400);
  expect((await request.post(api+'/productos',{ data:{idProducto:999999,nombre:'Invalido',stock:-1,precio:-10,categoria:'Pruebas'} })).status()).toBe(400);
  expect((await request.post(api+'/documentos/consulta',{ data:{ tipo:'DNI',numero:'123' }})).status()).toBe(400);
  expect((await request.post(api+'/documentos/consulta',{ data:'{broken',headers:{'Content-Type':'application/json'} })).status()).toBe(400);
  const state = await (await request.get(api+'/documentos/estado')).json();
  expect(Object.keys(state)).toEqual(['disponible']);
  if (!state.disponible) {
    expect((await request.post(api+'/documentos/consulta',{ data:{tipo:'DNI',numero:'12345678'} })).status()).toBe(503);
  }
  const cors = await request.fetch(api+'/documentos/consulta', { method:'OPTIONS', headers: { Origin:'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type' } });
  expect(cors.status()).toBe(200);
  expect(cors.headers()['access-control-allow-origin']).toBe('http://localhost:5173');
  const loopback = await request.fetch(api+'/documentos/consulta', { method:'OPTIONS', headers: { Origin:'http://127.0.0.1:5173','Access-Control-Request-Method':'POST' } });
  expect(loopback.headers()['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
  const untrusted = await request.fetch(api+'/documentos/consulta', { method:'OPTIONS', headers: { Origin:'https://example.test','Access-Control-Request-Method':'POST' } });
  expect(untrusted.status()).toBe(403);
});

test('admin navigates dashboard, reports, clients, sales and both receipt layouts', async ({ page }) => {
  await login(page,'admin');
  await expect(page.getByRole('heading', { name: 'Resumen de la tienda' })).toBeVisible();
  for (const label of ['Reportes de ventas','Clientes','Todas las ventas','Productos','Comprobantes']) {
    await page.getByRole('button', { name: label, exact:true }).click();
    await expect(page.locator('main.contenido')).not.toBeEmpty();
    await expect(page.locator('.alerta.error')).toHaveCount(0);
  }
  await page.getByRole('button',{name:'Formato Ticket',exact:false}).click();
  await expect(page.locator('.ticketQrImg')).toBeVisible();
  await page.getByRole('button',{name:'Formato A4',exact:false}).click();
  await expect(page.locator('.a4QrImg')).toBeVisible();
});

test('inventory creates, edits and archives products', async ({ page, request }) => {
  await login(page,'admin');
  await page.getByRole('button',{name:'Productos',exact:true}).click();
  await page.getByRole('button',{name:'Nuevo producto',exact:false}).click();
  const form = page.locator('.modalFormulario');
  const productId = 800000 + Math.floor(Math.random()*100000);
  await form.getByLabel('Código del producto').fill(String(productId));
  await form.getByLabel('Nombre del producto').fill('Producto E2E');
  await form.getByLabel('Categoría',{exact:true}).fill('Pruebas');
  const numeric = form.locator('input[type="number"]');
  await numeric.nth(1).fill('118');
  await numeric.nth(2).fill('4');
  await form.locator('button[type="submit"]').click();
  await cerrarAviso(page);
  let row = page.locator('.inventarioCard').filter({hasText:'Producto E2E'});
  await expect(row).toBeVisible();
  await row.locator('button').first().click();
  await form.getByLabel('Nombre del producto').fill('Producto E2E Editado');
  await form.locator('button[type="submit"]').click();
  await cerrarAviso(page);
  row = page.locator('.inventarioCard').filter({hasText:'Producto E2E Editado'});
  await expect(row).toBeVisible();
  await row.locator('button').last().click();
  let confirmacion = page.getByRole('dialog',{name:'Eliminar producto',exact:true});
  await expect(confirmacion).toContainText('Producto E2E Editado');
  await confirmacion.getByRole('button',{name:'Cancelar',exact:true}).click();
  expect((await request.get(api+'/productos/'+productId)).status()).toBe(200);
  await row.locator('button').last().click();
  await expect(confirmacion).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirmacion).toHaveCount(0);
  await expect(row).toBeVisible();
  await row.locator('button').last().click();
  await confirmacion.getByRole('button',{name:'Eliminar producto',exact:true}).click();
  await cerrarAviso(page);
  await expect(row).toHaveCount(0);
  expect((await request.get(api+'/productos/'+productId)).status()).toBe(404);
});

test('manual checkout creates a persistent receipt and updates stock', async ({ page, request }) => {
  await cart(page);
  const current = await (await request.get(api+'/productos')).json();
  const productName = await page.locator('tbody tr').first().locator('td').first().innerText();
  const product = current.find(p => p.nombre===productName);
  await page.getByLabel('Documento del cliente').fill('12345678');
  await page.getByLabel('Nombre del titular (opcional)').fill('CLIENTE E2E');
  await page.getByLabel('Dirección del cliente (opcional)').fill('DIRECCION E2E');
  const saved = page.waitForResponse(r => r.url()===api+'/ventas' && r.request().method()==='POST');
  await page.getByRole('button',{name:'Realizar pago',exact:true}).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const sale = await response.json();
  expect(sale.cliente).toBe('CLIENTE E2E');
  expect(sale.docCliente).toBe('12345678');
  expect(sale.direccionCliente).toBe('DIRECCION E2E');
  expect(sale.numeroDocumento).toMatch(/^B001-\d{8}$/);
  await expect(page.locator('.a4QrImg')).toBeVisible();
  await expect(page.getByText('CLIENTE E2E',{exact:true})).toBeVisible();
  expect((await (await request.get(api+'/productos/'+product.idProducto)).json()).stock).toBe(product.stock-1);
  await page.getByRole('button',{name:'Mis compras',exact:true}).click();
  await expect(page.getByText('CLIENTE E2E',{exact:true}).first()).toBeVisible();
});

test('API Peru UI fills RUC and DNI, clears old data, and keeps manual fallback', async ({ page }) => {
  await page.route('**/api/documentos/estado',route => route.fulfill({json:{disponible:true}}));
  let fail = false;
  await page.route('**/api/documentos/consulta',async route => {
    if (fail) return route.fulfill({status:503,json:{mensaje:'Servicio temporalmente no disponible'}});
    const {tipo,numero} = route.request().postDataJSON();
    await route.fulfill({json:{tipo,numero,nombre:tipo==='RUC'?'EMPRESA E2E':'PERSONA E2E',razonSocial:tipo==='RUC'?'EMPRESA E2E':'',direccion:'DIRECCION CONSULTADA',estado:tipo==='RUC'?'ACTIVO':'',condicion:tipo==='RUC'?'HABIDO':''}});
  });
  await cart(page);
  await page.getByLabel('Tipo de documento').selectOption('TD002');
  await page.getByLabel('Documento del cliente').fill('20100100100');
  await page.getByRole('button',{name:'Consultar RUC',exact:true}).click();
  await expect(page.getByLabel('Razón social',{exact:true})).toHaveValue('EMPRESA E2E');
  await expect(page.getByLabel('Dirección del cliente (opcional)')).toHaveValue('DIRECCION CONSULTADA');
  await expect(page.getByText(/ACTIVO.*HABIDO/)).toBeVisible();
  await cerrarAviso(page);
  const save = page.waitForResponse(r => r.url()===api+'/ventas' && r.request().method()==='POST');
  await page.getByRole('button',{name:'Realizar pago',exact:true}).click();
  const response = await save;
  expect(response.status()).toBe(200);
  const invoice = await response.json();
  expect(invoice.razonSocial).toBe('EMPRESA E2E');
  expect(invoice.numeroDocumento).toMatch(/^F001-\d{8}$/);
  await expect(page.getByText('EMPRESA E2E',{exact:true})).toBeVisible();
  // New cart for the remaining editing/fallback checks.
  await page.getByRole('button',{name:'Tienda',exact:true}).click();
  await page.locator('.productoCard').first().getByRole('button',{name:'Agregar',exact:true}).click();
  await page.getByRole('button',{name:/Mi carrito/}).click();
  await page.getByLabel('Tipo de documento').selectOption('TD002');
  await page.getByLabel('Documento del cliente').fill('20100100101');
  await expect(page.getByLabel('Razón social',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Dirección del cliente (opcional)')).toHaveValue('');
  await page.getByLabel('Tipo de documento').selectOption('TD001');
  await page.getByLabel('Documento del cliente').fill('12345678');
  await page.getByRole('button',{name:'Consultar DNI',exact:true}).click();
  await expect(page.getByLabel('Nombre del titular (opcional)')).toHaveValue('PERSONA E2E');
  await cerrarAviso(page);
  fail = true;
  await page.getByRole('button',{name:'Consultar DNI',exact:true}).click();
  await expect(page.getByText('Servicio temporalmente no disponible',{exact:true})).toBeVisible();
  await cerrarAviso(page);
  await expect(page.getByRole('button',{name:'Realizar pago',exact:true})).toBeEnabled();
});

test('a late document response cannot fill a different document',async ({page}) => {
  await page.route('**/api/documentos/estado',route => route.fulfill({json:{disponible:true}}));
  let complete;
  const gate = new Promise(resolve => { complete = resolve; });
  await page.route('**/api/documentos/consulta',async route => {
    await gate;
    try { await route.fulfill({json:{tipo:'DNI',numero:'12345678',nombre:'TITULAR ANTERIOR',direccion:'DIRECCION ANTERIOR'}}); }
    catch { /* Client deliberately cancelled the obsolete request. */ }
  });
  await cart(page);
  await page.getByLabel('Documento del cliente').fill('12345678');
  const pending = page.waitForRequest('**/api/documentos/consulta');
  await page.getByRole('button',{name:'Consultar DNI',exact:true}).click();
  await pending;
  await page.getByLabel('Documento del cliente').fill('87654321');
  complete();
  await expect(page.getByRole('button',{name:'Consultar DNI',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Nombre del titular (opcional)')).toHaveValue('');
  await expect(page.getByLabel('Dirección del cliente (opcional)')).toHaveValue('');
  await expect(page.getByText('TITULAR ANTERIOR',{exact:true})).toHaveCount(0);
});

test('registration and login work with hashed passwords',async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:/Crear cuenta|Registr/}).click();
  const name = 'qa'+Date.now();
  await page.locator('input[name="usuario"]').fill(name);
  await page.locator('input[name="nombre"]').fill('Prueba');
  await page.locator('input[name="apellido"]').fill('Cliente');
  await page.locator('input[name="telefono"]').fill('987654321');
  await page.locator('input[name="correo"]').fill(name+'@example.test');
  await page.locator('input[name="password"]').fill('Prueba123');
  await page.locator('form button.btnPrincipal').click();
  await expect(page.getByRole('heading',{name:'Elige tus productos'})).toBeVisible();
});

test('invalid saved browser state recovers to login',async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('sesion','{broken-json');
    localStorage.setItem('carrito','{"not":"an array"}');
  });
  await page.goto('/');
  await expect(page.locator('input[name="usuario"]')).toBeVisible();
  await expect(page.locator('form button.btnPrincipal')).toBeEnabled();
});
