package pe.edu.utp.techzone.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.techzone.entity.Producto;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Integer> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Producto p where p.idProducto = :id and p.activo = true")
    java.util.Optional<Producto> buscarParaActualizar(@org.springframework.data.repository.query.Param("id") Integer id);
    long countByActivoTrue();
    List<Producto> findByActivoTrueOrderByNombreAsc();
    long countByActivoTrueAndStockLessThanEqual(Integer stock);
}
