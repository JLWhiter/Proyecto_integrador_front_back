import { CreditCard, Trash2, WalletCards, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatoMoneda } from '../utils/format';
import { ventaService, catalogoService, documentoService } from '../services/api';
import Alerta from '../components/Alerta';

export default function Carrito({ setVista, setVentaGenerada }) {
  const { cliente, carrito, total, cambiarCantidad, quitarProducto, limpiarCarrito } = useApp();
  const [tipoDocumento, setTipoDocumento] = useState('TD001');
  const [medioPago, setMedioPago] = useState('MP004');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [consultaDisponible, setConsultaDisponible] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [resultadoConsulta, setResultadoConsulta] = useState(null);
  const [errorConsulta, setErrorConsulta] = useState('');
  const consultaActual = useRef(null);
  const [docError, setDocError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const medios = [
    { id: 'MP004', nombre: 'Yape' },
    { id: 'MP005', nombre: 'Plin' },
    { id: 'MP002', nombre: 'Crédito' },
    { id: 'MP003', nombre: 'Débito' },
    { id: 'MP001', nombre: 'Efectivo' },
    { id: 'MP006', nombre: 'Transferencia' }
  ];

  const [igvPorcentaje, setIgvPorcentaje] = useState(null);
  useEffect(() => {
    catalogoService.parametros().then((p) => setIgvPorcentaje(Number(p.igvPorcentaje)))
      .catch(() => setMensaje('No se pudo cargar el impuesto de la compra. Recarga la página.'));
  }, []);
  useEffect(() => {
    let vigente = true;
    documentoService.estado().then((estado) => {
      if (vigente) setConsultaDisponible(estado.disponible === true);
    }).catch(() => { if (vigente) setConsultaDisponible(false); });
    return () => { vigente = false; consultaActual.current?.abort(); };
  }, []);
  const subtotal = igvPorcentaje === null ? 0 : total / (1 + igvPorcentaje / 100);
  const igv = total - subtotal;

  const handleDocumentChange = (e) => {
    limpiarConsulta();
    const val = e.target.value;
    setNumeroDocumento(val);
    validarDocumento(tipoDocumento, val);
  };

  const validarDocumento = (tipo, valor) => {
    if (!valor) {
      setDocError('El número de documento es obligatorio.');
      return false;
    }
    if (tipo === 'TD001') {
      const regex = /^\d{8}$/;
      if (!regex.test(valor)) {
        setDocError('El DNI debe tener exactamente 8 dígitos numéricos.');
        return false;
      }
    } else if (tipo === 'TD002') {
      const regex = /^\d{11}$/;
      if (!regex.test(valor)) {
        setDocError('El RUC debe tener exactamente 11 dígitos numéricos.');
        return false;
      }
    }
    setDocError('');
    return true;
  };

  const handleTipoDocChange = (e) => {
    limpiarConsulta();
    const nuevoTipo = e.target.value;
    setTipoDocumento(nuevoTipo);
    setNumeroDocumento('');
    setRazonSocial('');
    setDocError('');
  };

  function limpiarConsulta() {
    consultaActual.current?.abort();
    consultaActual.current = null;
    setConsultando(false);
    setResultadoConsulta(null);
    setErrorConsulta('');
    setNombreCliente('');
    setRazonSocial('');
    setDireccionCliente('');
  }

  async function consultarDocumento() {
    if (!validarDocumento(tipoDocumento, numeroDocumento)) return;
    consultaActual.current?.abort();
    const controller = new AbortController();
    consultaActual.current = controller;
    setConsultando(true);
    setErrorConsulta('');
    setResultadoConsulta(null);
    try {
      const datos = await documentoService.consultar(tipoDocumento === 'TD002' ? 'RUC' : 'DNI', numeroDocumento, controller.signal);
      if (consultaActual.current !== controller || controller.signal.aborted) return;
      setNombreCliente(datos.nombre || '');
      setRazonSocial(datos.razonSocial || '');
      setDireccionCliente(datos.direccion || '');
      setResultadoConsulta(datos);
    } catch (error) {
      if (!controller.signal.aborted && consultaActual.current === controller) setErrorConsulta(error.message);
    } finally {
      if (consultaActual.current === controller) {
        setConsultando(false);
        consultaActual.current = null;
      }
    }
  }

  const handleCantidadChange = (id, stock, value) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      cambiarCantidad(id, '');
      return;
    }
    if (num < 1) {
      cambiarCantidad(id, 1);
    } else if (num > stock) {
      cambiarCantidad(id, stock);
    } else {
      cambiarCantidad(id, num);
    }
  };

  async function registrarVenta() {
    if (consultando) return;
    setMensaje('');
    setExito('');

    if (!cliente) {
      setMensaje('Debes iniciar sesión como cliente antes de pagar.');
      setVista('login');
      return;
    }

    if (carrito.length === 0) {
      setMensaje('Tu carrito está vacío.');
      return;
    }

    if (igvPorcentaje === null) { setMensaje('Espera a que se cargue el impuesto de la compra.'); return; }

    // Validar stock
    for (const item of carrito) {
      if (item.cantidad > item.stock) {
        setMensaje(`La cantidad del producto "${item.nombre}" supera el stock disponible (${item.stock}).`);
        return;
      }
    }

    if (!validarDocumento(tipoDocumento, numeroDocumento)) {
      setMensaje('Corrige los errores en el documento antes de continuar.');
      return;
    }

    if (tipoDocumento === 'TD002' && !razonSocial.trim()) {
      setMensaje('La razón social es obligatoria para emitir una factura.');
      return;
    }

    const request = {
      idCliente: cliente.id,
      tipoDocumento,
      medioPago,
      docCliente: numeroDocumento,
      razonSocial: tipoDocumento === 'TD002' ? razonSocial : undefined,
      nombreCliente: nombreCliente.trim() || undefined,
      direccionCliente: direccionCliente.trim() || undefined,
      items: carrito.map((item) => ({ idProducto: item.idProducto, cantidad: item.cantidad }))
    };

    setCargando(true);
    try {
      const venta = await ventaService.registrar(request);
      setVentaGenerada(venta);
      limpiarCarrito();
      setExito('Compra registrada correctamente.');
      setVista('comprobante');
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section>
      <div className="heroPanel carritoHero">
        <div>
          <span className="miniTag">Carrito</span>
          <h2>Resumen de compra</h2>
          <p>Selecciona el comprobante y el método de pago antes de confirmar.</p>
        </div>
      </div>

      <Alerta tipo="error" mensaje={mensaje} />
      <Alerta tipo="ok" mensaje={exito} />

      {carrito.length === 0 ? (
        <div className="panelVacio">No tienes productos en el carrito.</div>
      ) : (
        <div className="carritoLayout">
          <div className="tablaCard">
            <div className="tablaHeader">
              <div>
                <h3>Productos seleccionados</h3>
                <p>{carrito.length} producto(s) en tu pedido.</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => (
                  <tr key={item.idProducto}>
                    <td>{item.nombre}</td>
                    <td data-label="Precio unitario">{formatoMoneda(item.precio)}</td>
                    <td data-label="Cantidad">
                      <input
                        className="cantidadInput"
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.cantidad}
                        onChange={(e) => handleCantidadChange(item.idProducto, item.stock, e.target.value)}
                      />
                    </td>
                    <td data-label="Subtotal">{formatoMoneda(Number(item.precio) * item.cantidad)}</td>
                    <td>
                      <button className="btnIcono" aria-label={`Quitar ${item.nombre} del carrito`} onClick={() => quitarProducto(item.idProducto)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="resumenCard resumenPagoModerno">
            <div className="pagoIcono"><WalletCards size={24} /></div>
            <h3>Pago</h3>
            <label>
              Tipo de documento
              <select value={tipoDocumento} onChange={handleTipoDocChange} disabled={cargando}>
                <option value="TD001">Boleta</option>
                <option value="TD002">Factura</option>
              </select>
            </label>
            <label>
              Medio de pago
              <div className="metodosPago">
                {medios.map((medio) => (
                  <button
                    type="button"
                    key={medio.id}
                    className={medioPago === medio.id ? 'seleccionado' : ''}
                    onClick={() => setMedioPago(medio.id)}
                  >
                    <CreditCard size={15} /> {medio.nombre}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Documento del cliente
              <input value={numeroDocumento} onChange={handleDocumentChange} disabled={cargando} inputMode="numeric" maxLength={tipoDocumento === 'TD001' ? 8 : 11} placeholder={tipoDocumento === 'TD001' ? "DNI (8 dígitos)" : "RUC (11 dígitos)"} />
              {docError && <div className="mensajeErrorCampo"><AlertCircle size={14} />{docError}</div>}
            </label>

            <button type="button" className="btnPrincipal" disabled={!consultaDisponible || consultando || cargando || !!docError || !numeroDocumento}
              onClick={consultarDocumento}>
              {consultando ? 'Consultando...' : `Consultar ${tipoDocumento === 'TD002' ? 'RUC' : 'DNI'}`}
            </button>
            {!consultaDisponible && <p>La consulta automática no está disponible. Puedes ingresar los datos manualmente.</p>}
            <div aria-live="polite">
              {errorConsulta && <Alerta tipo="error" mensaje={errorConsulta} />}
              {resultadoConsulta && <Alerta tipo="exito" mensaje={`Datos encontrados: ${resultadoConsulta.nombre}${resultadoConsulta.estado ? ` · ${resultadoConsulta.estado}` : ''}${resultadoConsulta.condicion ? ` · ${resultadoConsulta.condicion}` : ''}`} />}
            </div>

            {tipoDocumento === 'TD001' && (
              <label>
                Nombre del titular (opcional)
                <input value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} maxLength={200} disabled={cargando || consultando} placeholder="Nombre completo" />
              </label>
            )}
            
            {tipoDocumento === 'TD002' && (
              <label>
                Razón social
                <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} maxLength={200} disabled={cargando || consultando} placeholder="Razón social" />
              </label>
            )}

            <label>
              Dirección del cliente (opcional)
              <input value={direccionCliente} onChange={(e) => setDireccionCliente(e.target.value)} maxLength={255} disabled={cargando || consultando} placeholder="Dirección" />
            </label>

            <div className="totalBox" style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#666' }}>
                <span>Base imponible</span>
                <span>{formatoMoneda(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#666' }}>
                <span>IGV ({igvPorcentaje ?? '...'}%)</span>
                <span>{formatoMoneda(igv)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total</span>
                <strong>{formatoMoneda(total)}</strong>
              </div>
            </div>
            <button className="btnPrincipal btnGrande" disabled={cargando || consultando} onClick={registrarVenta}>
              {cargando ? 'Registrando...' : 'Realizar pago'}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
