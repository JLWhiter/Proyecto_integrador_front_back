import { useEffect, useRef } from 'react';
import { useDialogo } from '../context/DialogoContext';

// Centraliza todos los avisos existentes en el modal del sistema.
export default function Alerta({ tipo = 'info', mensaje }) {
  const { notificar } = useDialogo();
  const ultimo = useRef(null);
  useEffect(() => {
    if (!mensaje) { ultimo.current = null; return; }
    const clave = `${tipo}:${mensaje}`;
    if (ultimo.current === clave) return;
    ultimo.current = clave;
    notificar({ tipo, mensaje });
  }, [tipo, mensaje, notificar]);
  return null;
}
