package pe.edu.utp.techzone.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utp.techzone.entity.Venta;

import java.math.BigDecimal;
import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, String> {
    List<Venta> findByClienteIdClienteOrderByFechaEmisionDesc(String idCliente);
    List<Venta> findAllByOrderByFechaEmisionDesc();

    @Query(value = """
        SELECT COALESCE(p.nombre, 'Sin ventas')
        FROM detalle_venta dv
        INNER JOIN producto p ON dv.id_producto = p.id_producto
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        WHERE EXTRACT(MONTH FROM v.fecha_emision) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM v.fecha_emision) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY p.nombre
        ORDER BY SUM(dv.cantidad) DESC
        LIMIT 1
        """, nativeQuery = true)
    String obtenerProductoMasVendidoMes();

    @Query(value = """
        SELECT COALESCE(p.nombre, 'Sin ventas')
        FROM detalle_venta dv
        INNER JOIN producto p ON dv.id_producto = p.id_producto
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        WHERE v.fecha_emision >= :desde
        GROUP BY p.nombre
        ORDER BY SUM(dv.cantidad) DESC
        LIMIT 1
        """, nativeQuery = true)
    String obtenerProductoMasVendidoSemana(@org.springframework.data.repository.query.Param("desde") java.time.LocalDateTime desde);

    @Query(value = """
        SELECT COUNT(*) FROM venta
        WHERE fecha_emision >= :desde
        """, nativeQuery = true)
    long contarVentasSemana(@org.springframework.data.repository.query.Param("desde") java.time.LocalDateTime desde);

    @Query(value = """
        SELECT COUNT(DISTINCT id_cliente) FROM venta
        """, nativeQuery = true)
    long contarClientesCompraron();

    @Query(value = """
        SELECT COALESCE(SUM(dv.subtotal), 0)
        FROM detalle_venta dv
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        WHERE v.fecha_emision >= :desde
        """, nativeQuery = true)
    BigDecimal obtenerIngresosSemana(@org.springframework.data.repository.query.Param("desde") java.time.LocalDateTime desde);

    @Query(value = """
        SELECT COALESCE(SUM(dv.subtotal), 0)
        FROM detalle_venta dv
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        WHERE EXTRACT(MONTH FROM v.fecha_emision) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM v.fecha_emision) = EXTRACT(YEAR FROM CURRENT_DATE)
        """, nativeQuery = true)
    BigDecimal obtenerIngresosMes();
}
