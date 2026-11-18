import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Printer, Receipt, Search, UserRound } from 'lucide-react';
import ComprobanteA4 from '../components/ComprobanteA4';
import ComprobanteTicket from '../components/ComprobanteTicket';
import { clienteService, ventaService } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatoFecha, formatoMoneda } from '../utils/format';
import { imprimir } from '../utils/imprimir';
import Modal from '../components/Modal';

function normalizarBusqueda(valor) {
  return String(valor ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

export default function Comprobante({ abrirComprobante, clienteInicial = '' }) {
  const { esAdmin, cliente } = useApp();
  const [idSeleccionado, setIdSeleccionado] = useState(clienteInicial);
  const [tipo, setTipo] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaComprobante, setBusquedaComprobante] = useState('');
  const [clientes, setClientes] = useState(null);
  const [ventas, setVentas] = useState(null);
  const [errorClientes, setErrorClientes] = useState('');
  const [errorVentas, setErrorVentas] = useState('');
  const idCliente = esAdmin ? idSeleccionado : cliente?.id;

  useEffect(() => {
    if (!esAdmin) return;
    let vigente = true;
    clienteService.listar()
      .then((datos) => { if (vigente) setClientes(datos || []); })
      .catch(() => { if (vigente) setErrorClientes('No se pudieron cargar los clientes.'); });
    return () => { vigente = false; };
  }, [esAdmin]);

  useEffect(() => {
    if (!idCliente) return;
    let vigente = true;
    ventaService.historialCliente(idCliente)
      .then((datos) => { if (vigente) setVentas(datos || []); })
      .catch(() => { if (vigente) setErrorVentas('No se pudieron cargar los comprobantes del cliente.'); });
    return () => { vigente = false; };
  }, [idCliente]);

  function cambiarCliente(id) {
    if (id === idSeleccionado) return;
    setVentas(null);
    setErrorVentas('');
    setTipo('');
    setBusquedaComprobante('');
    setIdSeleccionado(id);
  }

  const consultaCliente = normalizarBusqueda(busquedaCliente);
  const consultaComprobante = normalizarBusqueda(busquedaComprobante);
  const clienteSeleccionado = clientes?.find((item) => item.idCliente === idCliente);
  const clientesVisibles = clientes?.filter((item) =>
    normalizarBusqueda(`${item.nombre} ${item.apellido} ${item.idCliente}`).includes(consultaCliente));
  const filtradas = ventas?.filter((item) =>
    (!tipo || item.tipoDocumento?.toLowerCase() === tipo)
    && normalizarBusqueda(item.numeroDocumento).includes(consultaComprobante));

  return (
    <section className="no-print">
      <div className={`comprobantesPaneles ${esAdmin ? 'comprobantesPanelesAdmin' : ''}`}>
        {esAdmin && (
          <section className="comprobantesPanel comprobantesDirectorio" aria-labelledby="comprobantes-clientes">
            <div className="comprobantesPanelCabecera">
              <h3 id="comprobantes-clientes">Clientes</h3>
              <label htmlFor="buscar-cliente-comprobante">Buscar cliente</label>
              <div className="inputIcono">
                <Search size={17} aria-hidden="true" />
                <input id="buscar-cliente-comprobante" type="search" placeholder="Nombre o código"
                  value={busquedaCliente} onChange={(event) => setBusquedaCliente(event.target.value)} />
              </div>
            </div>
            {errorClientes && <p role="alert" className="comprobantesEstado">{errorClientes}</p>}
            {!clientes && !errorClientes && <p role="status" className="comprobantesEstado">Cargando clientes…</p>}
            {clientesVisibles?.length === 0 && (
              <p className="comprobantesEstado">{clientes.length ? 'No se encontraron clientes.' : 'Aún no hay clientes registrados.'}</p>
            )}
            <ul className="comprobantesClientes">
              {clientesVisibles?.map((item) => (
                <li key={item.idCliente}>
                  <button type="button" aria-pressed={item.idCliente === idCliente}
                    onClick={() => cambiarCliente(item.idCliente)}>
                    <UserRound size={17} aria-hidden="true" />
                    <span><strong>{item.nombre} {item.apellido}</strong><small>{item.idCliente}</small></span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="comprobantesPanel" aria-labelledby="comprobantes-documentos">
          <div className="comprobantesPanelCabecera">
            <h3 id="comprobantes-documentos">{esAdmin ? 'Documentos emitidos' : 'Mis documentos'}</h3>
            {clienteSeleccionado && <p>{clienteSeleccionado.nombre} {clienteSeleccionado.apellido} · {idCliente}</p>}
          </div>
          {!idCliente && (
            <div className="comprobantesSinCliente">
              <Receipt size={28} aria-hidden="true" />
              <strong>Selecciona un cliente</strong>
              <p>Sus boletas y facturas aparecerán aquí.</p>
            </div>
          )}
          {idCliente && (
            <div className="comprobantesFiltros">
              <label>
                Tipo de comprobante
                <select value={tipo} onChange={(event) => setTipo(event.target.value)} disabled={!ventas?.length}>
                  <option value="">Todos</option>
                  <option value="boleta">Boletas</option>
                  <option value="factura">Facturas</option>
                </select>
              </label>
              <label>
                Número de comprobante
                <input type="search" placeholder="Buscar por serie o número" value={busquedaComprobante}
                  onChange={(event) => setBusquedaComprobante(event.target.value)} disabled={!ventas?.length} />
              </label>
            </div>
          )}
          {errorVentas && <p role="alert" className="comprobantesEstado">{errorVentas}</p>}
          {idCliente && !ventas && !errorVentas && <p role="status" className="comprobantesEstado">Cargando comprobantes…</p>}
          {filtradas?.length === 0 && (
            <p role="status" className="comprobantesEstado">
              {ventas.length ? 'Ningún comprobante coincide con los filtros.' : 'Aún no hay comprobantes para este cliente.'}
            </p>
          )}
          {filtradas?.length > 0 && (
            <ul className="comprobantesLista" aria-label="Comprobantes encontrados">
              {filtradas.map((item) => (
                <li key={item.idVenta}>
                  <FileText size={20} className="comprobantesDocumentoIcono" aria-hidden="true" />
                  <div>
                    <strong>{item.tipoDocumento} {item.numeroDocumento}</strong>
                    <span>{formatoFecha(item.fechaEmision)}</span>
                  </div>
                  <b className="comprobantesImporte">{formatoMoneda(item.total)}</b>
                  <button type="button" className="btnSecundario"
                    aria-label={`Ver ${item.tipoDocumento?.toLowerCase()} ${item.numeroDocumento}`}
                    onClick={() => abrirComprobante(item)}>
                    Ver <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

export function ModalComprobante({ venta, onCerrar, volverAlListado }) {
  const [formato, setFormato] = useState('a4');
  const documento = useRef(null);

  return (
    <Modal titulo={`${venta.tipoDocumento} ${venta.numeroDocumento}`} onCerrar={onCerrar} className="modalComprobante">
      <section className="comprobanteSeccion">
        <div className="comprobanteControlBar no-print">
          <div className="comprobanteSelectorWrapper">
            <div className="comprobanteSelector" role="group" aria-label="Formato de impresión">
              <button type="button" className={`btnSelectorFormato ${formato === 'a4' ? 'activo' : ''}`}
                aria-pressed={formato === 'a4'} onClick={() => setFormato('a4')}>
                <FileText size={16} aria-hidden="true" /> Formato A4
              </button>
              <button type="button" className={`btnSelectorFormato ${formato === 'ticket' ? 'activo' : ''}`}
                aria-pressed={formato === 'ticket'} onClick={() => setFormato('ticket')}>
                <Receipt size={16} aria-hidden="true" /> Formato Ticket 80mm
              </button>
            </div>
            <div className="comprobanteAcciones">
              <button type="button" className="btnPrincipal" onClick={() => imprimir(documento.current)}>
                <Printer size={18} aria-hidden="true" /> Imprimir / Guardar PDF
              </button>
              <button type="button" className="btnSecundario" onClick={volverAlListado}>
                <ArrowLeft size={16} aria-hidden="true" /> Volver a comprobantes
              </button>
            </div>
          </div>
        </div>
        <div className="comprobantePrevisualizacion" ref={documento}>
          {formato === 'a4' ? <ComprobanteA4 venta={venta} /> : <ComprobanteTicket venta={venta} />}
        </div>
      </section>
    </Modal>
  );
}
