import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const DialogoContext = createContext(null);

export function DialogoProvider({ children }) {
  const [cola, setCola] = useState([]);
  const secuencia = useRef(0);
  const dialogo = useRef(null);
  const actual = cola[0];

  const notificar = useCallback(({ mensaje, tipo = 'info' }) => {
    const entrada = { id: ++secuencia.current, mensaje, tipo };
    setCola((pendientes) => [...pendientes, entrada]);
  }, []);
  const confirmar = useCallback(({ titulo, mensaje, aceptar = 'Confirmar' }) => new Promise((resolver) => {
    const entrada = { id: ++secuencia.current, titulo, mensaje, aceptar, tipo: 'confirmacion', resolver };
    setCola((pendientes) => [...pendientes, entrada]);
  }), []);

  const finalizar = (respuesta = false) => {
    actual?.resolver?.(respuesta);
    setCola((pendientes) => pendientes.filter((entrada) => entrada.id !== actual?.id));
  };

  useEffect(() => {
    if (!actual) return;
    const elemento = dialogo.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    elemento.showModal();
    return () => {
      elemento.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, [actual?.id]);

  const contexto = useMemo(() => ({ notificar, confirmar }), [notificar, confirmar]);
  const confirmacion = actual?.tipo === 'confirmacion';
  const error = actual?.tipo === 'error';
  const exito = ['ok', 'exito', 'success'].includes(actual?.tipo);
  const Icono = confirmacion ? AlertTriangle : error ? XCircle : exito ? CheckCircle2 : Info;
  const titulo = actual?.titulo || (error ? 'No se pudo completar la acción' : exito ? 'Operación completada' : 'Información');

  return (
    <DialogoContext.Provider value={contexto}>
      {children}
      {actual && (
        <dialog ref={dialogo} className={`dialogoSistema ${confirmacion ? 'confirmacion' : error ? 'error' : exito ? 'exito' : 'info'}`}
          aria-labelledby="dialogoSistemaTitulo" aria-describedby="dialogoSistemaMensaje"
          onCancel={(event) => { event.preventDefault(); finalizar(false); }}>
          <button type="button" className="dialogoCerrar" aria-label="Cerrar mensaje" onClick={() => finalizar(false)}><X size={20} /></button>
          <div className="dialogoIcono"><Icono size={30} /></div>
          <h2 id="dialogoSistemaTitulo">{titulo}</h2>
          <p id="dialogoSistemaMensaje">{actual.mensaje}</p>
          <div className="dialogoAcciones">
            {confirmacion && <button type="button" className="btnSecundario" autoFocus onClick={() => finalizar(false)}>Cancelar</button>}
            <button type="button" className={confirmacion ? 'dialogoConfirmar' : 'btnPrincipal'} autoFocus={!confirmacion} onClick={() => finalizar(true)}>
              {confirmacion ? actual.aceptar : 'Entendido'}
            </button>
          </div>
        </dialog>
      )}
    </DialogoContext.Provider>
  );
}

export function useDialogo() {
  const contexto = useContext(DialogoContext);
  if (!contexto) throw new Error('useDialogo requiere DialogoProvider');
  return contexto;
}
