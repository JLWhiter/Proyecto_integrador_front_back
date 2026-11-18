import { useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialogo({ children, onCerrar, bloqueado, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const elemento = ref.current;
    elemento.showModal();
    return () => elemento.close();
  }, []);

  return (
    <dialog {...props} ref={ref} onCancel={(event) => {
      event.preventDefault();
      if (!bloqueado) onCerrar();
    }} onClick={(event) => {
      if (!bloqueado && event.target === event.currentTarget) onCerrar();
    }}>
      {children}
    </dialog>
  );
}

export default function Modal({ titulo, onCerrar, bloqueado = false, className = '', children }) {
  const id = useId();
  return (
    <Dialogo className={`modalVentana ${className}`} aria-labelledby={id}
      bloqueado={bloqueado} onCerrar={onCerrar}>
      <header className="modalVentanaCabecera">
        <h2 id={id}>{titulo}</h2>
        <button type="button" className="btnCerrarModal" onClick={onCerrar} disabled={bloqueado}
          aria-label={`Cerrar ${titulo}`}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="modalVentanaCuerpo">{children}</div>
    </Dialogo>
  );
}
