package pe.edu.utp.techzone.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.techzone.dto.ProductoDTO;
import pe.edu.utp.techzone.entity.Producto;
import pe.edu.utp.techzone.exception.BusinessException;
import pe.edu.utp.techzone.exception.NotFoundException;
import pe.edu.utp.techzone.repository.ProductoRepository;

import java.util.List;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class ProductoService {
    private final ProductoRepository productoRepository;
    private final pe.edu.utp.techzone.repository.MovimientoStockRepository movimientos;
    private void movimiento(Producto p, int cantidad, String motivo) {
        movimientos.save(pe.edu.utp.techzone.entity.MovimientoStock.builder()
            .idProducto(p.getIdProducto()).cantidad(cantidad).stockResultante(p.getStock())
            .motivo(motivo).fecha(java.time.LocalDateTime.now()).build());
    }
    private void validar(ProductoDTO dto) {
        if (dto.getStock() == null || dto.getStock() < 0 || dto.getPrecio() == null || dto.getPrecio().signum() < 0)
            throw new BusinessException("Las existencias y el precio no pueden ser negativos.");
    }
    public Producto obtenerParaActualizar(Integer id) {
        return productoRepository.buscarParaActualizar(id).orElseThrow(() -> new NotFoundException("Producto no encontrado"));
    }

    @Transactional(readOnly = true)
    public List<ProductoDTO> listar() {
        return productoRepository.findByActivoTrueOrderByNombreAsc().stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public ProductoDTO buscar(Integer id) {
        return toDTO(obtenerEntidad(id));
    }

    @Transactional(readOnly = true)
    public byte[] obtenerImagen(Integer id) {
        String imagen = obtenerEntidad(id).getImagen();
        if (imagen == null) throw new NotFoundException("El producto no tiene imagen.");
        return Base64.getDecoder().decode(imagen);
    }

    private void validarImagen(String imagen) {
        if (imagen == null) return;
        byte[] datos;
        try {
            datos = Base64.getDecoder().decode(imagen);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("La imagen no es válida.");
        }
        if (datos.length < 16 || datos[8] != 'W' || datos[9] != 'E' || datos[10] != 'B' || datos[11] != 'P') {
            throw new BusinessException("La imagen debe estar en formato WebP.");
        }
    }

    @Transactional
    public ProductoDTO guardar(ProductoDTO dto) {
        validar(dto);
        validarImagen(dto.getImagenDatos());
        if (dto.getIdProducto() == null || productoRepository.existsById(dto.getIdProducto()))
            throw new BusinessException("El código del producto no es válido o ya está registrado.");
        Producto producto = Producto.builder()
                .idProducto(dto.getIdProducto())
                .nombre(dto.getNombre())
                .stock(dto.getStock())
                .precio(dto.getPrecio())
                .categoria(dto.getCategoria())
                .imagen(dto.getImagenDatos())
                .build();
        productoRepository.save(producto);
        movimiento(producto, producto.getStock(), "ALTA");
        return toDTO(producto);
    }

    @Transactional
    public ProductoDTO actualizar(Integer id, ProductoDTO dto) {
        validar(dto);
        validarImagen(dto.getImagenDatos());
        Producto producto = obtenerParaActualizar(id);
        int diferencia = dto.getStock() - producto.getStock();
        producto.setNombre(dto.getNombre());
        producto.setStock(dto.getStock());
        producto.setPrecio(dto.getPrecio());
        producto.setCategoria(dto.getCategoria());
        if (dto.getImagenDatos() != null) producto.setImagen(dto.getImagenDatos());
        productoRepository.save(producto);
        if (diferencia != 0) movimiento(producto, diferencia, "AJUSTE");
        return toDTO(producto);
    }

    @Transactional
    public void eliminar(Integer id) {
        Producto producto = obtenerParaActualizar(id);
        producto.setActivo(false);
        movimiento(producto, 0, "BAJA");
    }

    @Transactional
    public void descontarStock(Producto producto, Integer cantidad) {
        if (cantidad == null || cantidad < 1) throw new BusinessException("La cantidad no es válida.");
        if (producto.getStock() < cantidad) {
            throw new BusinessException("Stock insuficiente para " + producto.getNombre());
        }
        producto.setStock(producto.getStock() - cantidad);
        productoRepository.save(producto);
        movimiento(producto, -cantidad, "VENTA");
    }

    @Transactional(readOnly = true)
    public Producto obtenerEntidad(Integer id) {
        return productoRepository.findById(id).filter(Producto::isActivo)
                .orElseThrow(() -> new NotFoundException("Producto no encontrado"));
    }

    public ProductoDTO toDTO(Producto producto) {
        return ProductoDTO.builder()
                .idProducto(producto.getIdProducto())
                .nombre(producto.getNombre())
                .stock(producto.getStock())
                .precio(producto.getPrecio())
                .categoria(producto.getCategoria())
                .imagen(producto.getImagen() == null ? null : "/productos/" + producto.getIdProducto()
                        + "/imagen?v=" + Integer.toUnsignedString(producto.getImagen().hashCode(), 36))
                .build();
    }
}
