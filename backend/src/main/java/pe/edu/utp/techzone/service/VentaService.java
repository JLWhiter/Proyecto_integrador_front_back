package pe.edu.utp.techzone.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.techzone.dto.DetalleVentaDTO;
import pe.edu.utp.techzone.dto.ItemVentaRequest;
import pe.edu.utp.techzone.dto.RegistrarVentaRequest;
import pe.edu.utp.techzone.dto.VentaDTO;
import pe.edu.utp.techzone.entity.Cliente;
import pe.edu.utp.techzone.entity.DetalleVenta;
import pe.edu.utp.techzone.entity.MedioPago;
import pe.edu.utp.techzone.entity.Producto;
import pe.edu.utp.techzone.entity.TipoDocumento;
import pe.edu.utp.techzone.entity.Venta;
import pe.edu.utp.techzone.exception.NotFoundException;
import pe.edu.utp.techzone.repository.DetalleVentaRepository;
import pe.edu.utp.techzone.repository.MedioPagoRepository;
import pe.edu.utp.techzone.repository.TipoDocumentoRepository;
import pe.edu.utp.techzone.repository.VentaRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VentaService {
    private final pe.edu.utp.techzone.repository.SecuenciaDocumentoRepository secuenciaRepository;
    private final VentaRepository ventaRepository;
    private final DetalleVentaRepository detalleVentaRepository;
    private final TipoDocumentoRepository tipoDocumentoRepository;
    private final MedioPagoRepository medioPagoRepository;
    private final ClienteService clienteService;
    private final ProductoService productoService;
    private final ParametroService parametroService;

    @Transactional
    public VentaDTO registrar(RegistrarVentaRequest request) {
        Cliente cliente = clienteService.obtenerEntidad(request.getIdCliente());
        // Online checkout has no employee acting as seller.
        TipoDocumento tipoDocumento = tipoDocumentoRepository.findById(request.getTipoDocumento())
                .orElseThrow(() -> new NotFoundException("Tipo de documento no encontrado"));
        MedioPago medioPago = medioPagoRepository.findById(request.getMedioPago())
                .orElseThrow(() -> new NotFoundException("Medio de pago no encontrado"));

        String idVenta = UUID.randomUUID().toString();
        String documento = request.getDocCliente();
        boolean factura = "TD002".equals(request.getTipoDocumento());
        if (documento == null || !documento.matches(factura ? "[0-9]{11}" : "[0-9]{8}")) {
            throw new pe.edu.utp.techzone.exception.BusinessException("El DNI o RUC no es válido.");
        }
        if (factura && (request.getRazonSocial() == null || request.getRazonSocial().isBlank())) {
            throw new pe.edu.utp.techzone.exception.BusinessException("La razón social es obligatoria.");
        }
        String serie = factura ? "F001" : "B001";
        var secuencia = secuenciaRepository.bloquear(serie).orElseThrow();
        secuencia.setUltimo(secuencia.getUltimo() + 1);
        String numeroDocumento = serie + "-" + String.format("%08d", secuencia.getUltimo());
        BigDecimal tasa = parametroService.obtenerIgvPorcentaje();

        Venta venta = Venta.builder()
                .idVenta(idVenta)
                .cliente(cliente)
                .persona(null)
                .docCliente(documento)
                .razonSocial(factura ? request.getRazonSocial().trim() : null)
                .direccionCliente(request.getDireccionCliente())
                .nombreCliente(request.getNombreCliente() != null && !request.getNombreCliente().isBlank()
                        ? request.getNombreCliente().trim() : cliente.getNombre() + " " + cliente.getApellido())
                .igvPorcentaje(tasa)
                .tipoDocumento(tipoDocumento)
                .numeroDocumento(numeroDocumento)
                .medioPago(medioPago)
                .fechaEmision(LocalDateTime.now())
                .build();
        ventaRepository.save(venta);

        for (ItemVentaRequest item : request.getItems().stream().sorted(java.util.Comparator.comparing(ItemVentaRequest::getIdProducto)).toList()) {
            Producto producto = productoService.obtenerParaActualizar(item.getIdProducto());
            productoService.descontarStock(producto, item.getCantidad());
            BigDecimal precio = producto.getPrecio();
            BigDecimal subtotal = precio.multiply(BigDecimal.valueOf(item.getCantidad()));

            DetalleVenta detalle = DetalleVenta.builder()
                    .venta(venta)
                    .producto(producto)
                    .cantidad(item.getCantidad())
                    .nombreProducto(producto.getNombre())
                    .igv(subtotal.multiply(tasa).divide(new BigDecimal("100").add(tasa), 2, RoundingMode.HALF_UP))
                    .precioUnitario(precio)
                    .subtotal(subtotal)
                    .build();
            detalleVentaRepository.save(detalle);
        }

        return buscar(idVenta);
    }

    @Transactional(readOnly = true)
    public VentaDTO buscar(String idVenta) {
        Venta venta = ventaRepository.findById(idVenta)
                .orElseThrow(() -> new NotFoundException("Venta no encontrada"));
        return toDTO(venta);
    }

    @Transactional(readOnly = true)
    public List<VentaDTO> historialCliente(String idCliente) {
        return ventaRepository.findByClienteIdClienteOrderByFechaEmisionDesc(idCliente)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VentaDTO> listarTodas() {
        return ventaRepository.findAllByOrderByFechaEmisionDesc()
                .stream()
                .map(this::toDTO)
                .toList();
    }

    public VentaDTO toDTO(Venta venta) {
        List<DetalleVentaDTO> detalles = detalleVentaRepository.findByVentaIdVenta(venta.getIdVenta())
                .stream()
                .map(detalle -> {
                    BigDecimal cantidad = BigDecimal.valueOf(detalle.getCantidad());
                    BigDecimal igvLinea = detalle.getIgv();
                    // El valor de venta es el resto, asi la linea siempre cierra:
                    // valorTotal + igv == subtotal, sin centimos perdidos.
                    BigDecimal valorTotal = detalle.getSubtotal().subtract(igvLinea).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal valorUnitario = valorTotal.divide(cantidad, 2, RoundingMode.HALF_UP);

                    return DetalleVentaDTO.builder()
                            .idProducto(detalle.getProducto().getIdProducto())
                            .producto(detalle.getNombreProducto())
                            .cantidad(detalle.getCantidad())
                            .precioUnitario(detalle.getPrecioUnitario())
                            .valorUnitario(valorUnitario)
                            .valorTotal(valorTotal)
                            .igv(igvLinea)
                            .subtotal(detalle.getSubtotal())
                            .build();
                })
                .toList();

        BigDecimal total = detalles.stream()
                .map(DetalleVentaDTO::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // SUNAT exige redondear por linea, no sobre el total. Asi los importes
        // impresos siempre cuadran: suma(valorTotal) + suma(igv) == total.
        BigDecimal opGravada = detalles.stream()
                .map(DetalleVentaDTO::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal igv = detalles.stream()
                .map(DetalleVentaDTO::getIgv)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        return VentaDTO.builder()
                .idVenta(venta.getIdVenta())
                .idCliente(venta.getCliente().getIdCliente())
                .cliente(venta.getRazonSocial() != null ? venta.getRazonSocial() : venta.getNombreCliente())
                .docCliente(venta.getDocCliente())
                .razonSocial(venta.getRazonSocial())
                .direccionCliente(venta.getDireccionCliente())
                .tipoDocumento(venta.getTipoDocumento().getNombre())
                .numeroDocumento(venta.getNumeroDocumento())
                .medioPago(venta.getMedioPago().getDescripcion())
                .fechaEmision(venta.getFechaEmision())
                .total(total)
                .opGravada(opGravada)
                .igv(igv)
                .igvPorcentaje(venta.getIgvPorcentaje())
                .detalles(detalles)
                .build();
    }
}
