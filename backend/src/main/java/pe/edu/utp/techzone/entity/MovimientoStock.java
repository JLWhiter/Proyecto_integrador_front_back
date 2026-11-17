package pe.edu.utp.techzone.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="movimiento_stock") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MovimientoStock {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="id_producto", nullable=false) private Integer idProducto;
    @Column(nullable=false) private Integer cantidad;
    @Column(name="stock_resultante", nullable=false) private Integer stockResultante;
    @Column(nullable=false) private String motivo;
    @Column(nullable=false) private LocalDateTime fecha;
}
