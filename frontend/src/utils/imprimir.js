export function imprimir(elemento) {
  if (!elemento) return;

  const hoja = document.createElement('div');
  hoja.className = 'documentoImpresionModal';
  hoja.append(elemento.cloneNode(true));
  document.body.append(hoja);
  const limpiar = () => hoja.remove();
  window.addEventListener('afterprint', limpiar, { once: true });
  try {
    window.print();
  } catch (error) {
    window.removeEventListener('afterprint', limpiar);
    limpiar();
    throw error;
  }
}
