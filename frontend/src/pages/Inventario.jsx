import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { productoService } from '../services/api';
import { formatoMoneda } from '../utils/format';
import Alerta from '../components/Alerta';
import { obtenerImagenProducto, optimizarFotoProducto } from '../utils/productImages';
import { useDialogo } from '../context/DialogoContext';
import Modal from '../components/Modal';

export default function Inventario() {
  const { confirmar } = useDialogo();
  const [eliminando, setEliminando] = useState(null);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [exito, setExito] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [foto, setFoto] = useState(null);
  const [errorFoto, setErrorFoto] = useState('');
  const [form, setForm] = useState({
    idProducto: '',
    nombre: '',
    stock: '',
    precio: '',
    categoria: 'Laptops'
  });
  const [erroresModal, setErroresModal] = useState({});

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    try {
      const data = await productoService.listar();
      setProductos(data || []);
    } catch (err) {
      setMensaje(err.message || 'Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }

  const categorias = useMemo(() => {
    const cats = productos.map((p) => p.categoria).filter(Boolean);
    return ['Todas', ...new Set(cats)];
  }, [productos]);

  const filtrados = productos.filter((p) => {
    const coincideTexto = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || String(p.idProducto).includes(busqueda);
    const coincideCat = categoria === 'Todas' || p.categoria === categoria;
    return coincideTexto && coincideCat;
  });

  function abrirModalNuevo() {
    setModoEdicion(false);
    setFoto(null);
    setErrorFoto('');
    const maxId = productos.reduce((max, p) => Math.max(max, Number(p.idProducto) || 0), 0);
    setForm({
      idProducto: maxId + 1,
      nombre: '',
      stock: 10,
      precio: '',
      categoria: 'Laptops'
    });
    setErroresModal({});
    setModalAbierto(true);
    setMensaje('');
    setExito('');
  }

  function abrirModalEditar(prod) {
    setModoEdicion(true);
    setFoto(null);
    setErrorFoto('');
    setForm({
      idProducto: prod.idProducto,
      nombre: prod.nombre,
      stock: prod.stock,
      precio: prod.precio,
      categoria: prod.categoria || 'General',
      imagen: prod.imagen
    });
    setErroresModal({});
    setModalAbierto(true);
    setMensaje('');
    setExito('');
  }

  function validarModal() {
    const errores = {};
    if (!form.nombre || form.nombre.trim().length < 3) {
      errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
    }
    const precioNum = Number(form.precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      errores.precio = 'El precio debe ser mayor a 0.';
    }
    const stockNum = Number(form.stock);
    if (isNaN(stockNum) || !Number.isInteger(stockNum) || stockNum < 0) {
      errores.stock = 'El stock debe ser un entero mayor o igual a 0.';
    }
    if (!form.categoria || form.categoria.trim() === '') {
      errores.categoria = 'La categoría es requerida.';
    }
    setErroresModal(errores);
    return Object.keys(errores).length === 0;
  }

  async function seleccionarFoto(event) {
    const archivo = event.currentTarget.files[0];
    event.currentTarget.value = '';
    if (!archivo) return;
    setProcesandoFoto(true);
    setErrorFoto('');
    try {
      const vistaPrevia = await optimizarFotoProducto(archivo);
      setFoto({ nombre: archivo.name, vistaPrevia });
    } catch (error) {
      setErrorFoto(error instanceof DOMException ? 'No se pudo abrir la foto. Selecciona una imagen compatible.' : error.message);
    } finally {
      setProcesandoFoto(false);
    }
  }

  const modalOcupado = guardando || procesandoFoto;

  function cerrarModal() {
    if (!modalOcupado) setModalAbierto(false);
  }

  async function guardarProducto(e) {
    e.preventDefault();
    
    if (modalOcupado || errorFoto || !validarModal()) {
      return;
    }

    const errorServidorImagen = 'El servidor no admite guardar fotos de productos. Abre la versión actualizada del sistema y vuelve a intentarlo.';
    const productoDeReferencia = modoEdicion ? form : productos[0];
    if (foto && productoDeReferencia && productoDeReferencia.imagen === undefined) {
      setErroresModal({ general: errorServidorImagen });
      return;
    }

    setGuardando(true);
    setMensaje('');
    setExito('');

    try {
      const payload = {
        idProducto: Number(form.idProducto),
        nombre: form.nombre.trim(),
        stock: Number(form.stock),
        precio: Number(form.precio),
        categoria: form.categoria,
        imagenDatos: foto?.vistaPrevia.split(',')[1]
      };

      const guardado = await (modoEdicion
        ? productoService.actualizar(payload.idProducto, payload)
        : productoService.crear(payload));
      if (foto && !guardado?.imagen) {
        if (!modoEdicion && guardado?.idProducto) {
          // The product exists. Retry the image as an edit so the ID stays valid.
          setModoEdicion(true);
          setForm((actual) => ({ ...actual, idProducto: guardado.idProducto, imagen: guardado.imagen }));
          cargarProductos();
        }
        throw new Error(errorServidorImagen);
      }

      const accion = modoEdicion ? 'actualizado' : 'creado';
      setExito(`Producto "${payload.nombre}" ${accion} correctamente.`);
      setModalAbierto(false);
      cargarProductos();
    } catch (err) {
      setErroresModal((errores) => ({ ...errores, general: err.message || 'Error al guardar producto.' }));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarProducto(id, nombre) {
    if (eliminando !== null) return;
    setEliminando(id);
    setMensaje('');
    setExito('');
    try {
      const aceptado = await confirmar({
        titulo: 'Eliminar producto',
        mensaje: `¿Quieres eliminar "${nombre}" del catálogo? Su historial de ventas se conservará.`,
        aceptar: 'Eliminar producto'
      });
      if (!aceptado) return;
      await productoService.eliminar(id);
      setExito(`Producto "${nombre}" eliminado.`);
      cargarProductos();
    } catch (err) {
      setMensaje(err.message || 'Error al eliminar producto.');
    } finally {
      setEliminando(null);
    }
  }

  return (
    <section className="inventarioSeccion">
      <div className="heroPanel no-print">
        <div>
          <span className="miniTag">Catálogo de productos</span>
          <h2>Inventario de productos</h2>
          <p>Actualiza precios, revisa las existencias y administra el catálogo de la tienda.</p>
        </div>
        <button className="btnPrincipal" onClick={abrirModalNuevo}>
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      <Alerta tipo="error" mensaje={mensaje} />
      <Alerta tipo="ok" mensaje={exito} />

      {/* Barra de Filtros */}
      <div className="filtrosAvanzadosBar no-print">
        <div className="inputIcono inputBusquedaHistorial">
          <Search size={18} />
          <input
            placeholder="Buscar por código o nombre de producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="btnLimpiarSearch" onClick={() => setBusqueda('')}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="filtroTipoTabs">
          {categorias.map((cat) => (
            <button
              key={cat}
              className={`tabFiltro ${categoria === cat ? 'activo' : ''}`}
              onClick={() => setCategoria(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="inventarioResultados" aria-live="polite">
        <span>{filtrados.length} productos</span>
        <span>Precio unitario con IGV incluido</span>
      </div>
      {cargando ? (
        <div className="panelVacio">Cargando inventario de productos...</div>
      ) : filtrados.length === 0 ? (
        <div className="panelVacio">No hay productos que coincidan con la búsqueda.</div>
      ) : (
        <div className="inventarioGrid">
          {filtrados.map((prod) => {
            const stockNum = Number(prod.stock || 0);
            const estado = stockNum <= 0 ? 'agotado' : stockNum <= 15 ? 'critico' : 'disponible';
            return (
              <article key={prod.idProducto} className="inventarioCard">
                <div className="inventarioCardImagen">
                  <img src={obtenerImagenProducto(prod)} alt={prod.nombre} loading="lazy"
                    className={prod.imagen ? 'fotoProductoAjustada' : undefined}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/producto-placeholder.svg';
                    }} />
                  <span className={`inventarioEstado ${estado}`}>
                    {estado === 'agotado' ? 'Agotado' : estado === 'critico' ? 'Stock bajo' : 'Disponible'}
                  </span>
                </div>
                <div className="inventarioCardCuerpo">
                  <div className="inventarioCardMeta">
                    <span>{prod.categoria || 'General'}</span>
                    <span>#{prod.idProducto}</span>
                  </div>
                  <h3>{prod.nombre}</h3>
                  <div className="inventarioCardDatos">
                    <div><span>Precio unitario</span><strong>{formatoMoneda(prod.precio)}</strong></div>
                    <div><span>Stock disponible</span><strong>{stockNum} <small>unidades</small></strong></div>
                  </div>
                </div>
                <div className="inventarioCardAcciones">
                  <button type="button" className="inventarioEditar" onClick={() => abrirModalEditar(prod)} aria-label={`Editar ${prod.nombre}`}>
                    <Edit2 size={16} /> Editar
                  </button>
                  <button type="button" className="inventarioEliminar" disabled={eliminando !== null} onClick={() => eliminarProducto(prod.idProducto, prod.nombre)} aria-label={`Eliminar ${prod.nombre}`}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal para Crear / Editar producto */}
      {modalAbierto && (
        <Modal titulo={modoEdicion ? 'Editar producto' : 'Registrar producto'}
          className="modalProducto" onCerrar={cerrarModal} bloqueado={modalOcupado}>
            <form onSubmit={guardarProducto} className="formulario modalFormulario">
              <label>
                Código del producto
                <input
                  type="number"
                  value={form.idProducto}
                  onChange={(e) => setForm({ ...form, idProducto: e.target.value })}
                  disabled={modoEdicion}
                  required
                />
              </label>

              <label>
                Nombre del producto
                <input
                  className={erroresModal.nombre ? 'inputConError' : ''}
                  value={form.nombre}
                  onChange={(e) => {
                    setForm({ ...form, nombre: e.target.value });
                    if (erroresModal.nombre) setErroresModal({ ...erroresModal, nombre: null });
                  }}
                  placeholder="Ej: Laptop Lenovo ThinkPad"
                  required
                />
                {erroresModal.nombre && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {erroresModal.nombre}</div>}
              </label>

              <div className="gridDosCampos">
                <label>
                  Categoría
                  <input
                    className={erroresModal.categoria ? 'inputConError' : ''}
                    value={form.categoria}
                    onChange={(e) => {
                      setForm({ ...form, categoria: e.target.value });
                      if (erroresModal.categoria) setErroresModal({ ...erroresModal, categoria: null });
                    }}
                    placeholder="Ej: Laptops, Audio, Gaming"
                    required
                  />
                  {erroresModal.categoria && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {erroresModal.categoria}</div>}
                </label>

                <label>
                  Precio con IGV (S/)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={erroresModal.precio ? 'inputConError' : ''}
                    value={form.precio}
                    onChange={(e) => {
                      setForm({ ...form, precio: e.target.value });
                      if (erroresModal.precio) setErroresModal({ ...erroresModal, precio: null });
                    }}
                    placeholder="Ej: 150.00"
                    required
                  />
                  {erroresModal.precio && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {erroresModal.precio}</div>}
                </label>
              </div>

              <label>
                Unidades disponibles
                <input
                  type="number"
                  min="0"
                  className={erroresModal.stock ? 'inputConError' : ''}
                  value={form.stock}
                  onChange={(e) => {
                    setForm({ ...form, stock: e.target.value });
                    if (erroresModal.stock) setErroresModal({ ...erroresModal, stock: null });
                  }}
                  required
                />
                {erroresModal.stock && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {erroresModal.stock}</div>}
              </label>

              <label>
                Foto del producto
                <input type="file" accept="image/*" onChange={seleccionarFoto} disabled={modalOcupado} />
              </label>
              {procesandoFoto && <span role="status">Ajustando foto…</span>}
              {foto && !procesandoFoto && !errorFoto && (
                <small className="fotoProductoEstado" role="status">
                  {foto.nombre}. Pulsa {modoEdicion ? 'Guardar cambios' : 'Crear producto'} para aplicar la foto.
                </small>
              )}
              {errorFoto && (
                <div role="alert" className="mensajeErrorCampo">
                  {errorFoto}
                  <button type="button" className="btnSecundario" onClick={() => setErrorFoto('')}>Descartar selección</button>
                </div>
              )}
              {(foto || modoEdicion) && (
                <img className="fotoProductoVistaPrevia" src={foto?.vistaPrevia || obtenerImagenProducto(form)}
                  alt="Vista previa de la foto del producto"
                  onError={(event) => { event.currentTarget.src = '/producto-placeholder.svg'; }} />
              )}
              {erroresModal.general && (
                <div role="alert" className="mensajeErrorCampo">{erroresModal.general}</div>
              )}
              <div className="modalAcciones">
                <button
                  type="button"
                  className="btnSecundario"
                  onClick={cerrarModal}
                  disabled={modalOcupado}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btnPrincipal"
                  disabled={modalOcupado || Boolean(errorFoto)}
                >
                  {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </section>
  );
}
