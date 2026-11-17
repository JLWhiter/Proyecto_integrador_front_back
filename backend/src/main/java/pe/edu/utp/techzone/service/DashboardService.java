package pe.edu.utp.techzone.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.techzone.dto.DashboardDTO;
import pe.edu.utp.techzone.repository.ClienteRepository;
import pe.edu.utp.techzone.repository.ProductoRepository;
import pe.edu.utp.techzone.repository.VentaRepository;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final ProductoRepository productoRepository;
    private final ClienteRepository clienteRepository;
    private final VentaRepository ventaRepository;
    private final ParametroService parametroService;

    @Transactional(readOnly = true)
    public DashboardDTO obtenerResumen() {
        var desde = java.time.LocalDate.now().minusDays(7).atStartOfDay();
        String masVendidoMes = normalizarTexto(ventaRepository.obtenerProductoMasVendidoMes());
        String masVendidoSemana = normalizarTexto(ventaRepository.obtenerProductoMasVendidoSemana(desde));

        return DashboardDTO.builder()
                .totalProductos(productoRepository.countByActivoTrue())
                .totalClientes(clienteRepository.count())
                .productosAgotados(productoRepository.countByActivoTrueAndStockLessThanEqual(0))
                .stockCritico((int) productoRepository.countByActivoTrueAndStockLessThanEqual(5))
                .ventasSemana(ventaRepository.contarVentasSemana(desde))
                .clientesCompraron(ventaRepository.contarClientesCompraron())
                .ingresosSemana(valor(ventaRepository.obtenerIngresosSemana(desde)))
                .ingresosMes(valor(ventaRepository.obtenerIngresosMes()))
                .igvPorcentaje(parametroService.obtenerIgvPorcentaje())
                .productoMasVendidoMes(masVendidoMes)
                .productoMasVendidoSemana(masVendidoSemana)
                .build();
    }

    private String normalizarTexto(String texto) {
        return texto == null || texto.isBlank() ? "Sin ventas" : texto;
    }

    private BigDecimal valor(BigDecimal monto) {
        return monto == null ? BigDecimal.ZERO : monto;
    }
}
