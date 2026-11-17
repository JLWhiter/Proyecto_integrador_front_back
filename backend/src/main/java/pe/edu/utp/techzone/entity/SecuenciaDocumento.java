package pe.edu.utp.techzone.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="secuencia_documento") @Data @NoArgsConstructor
public class SecuenciaDocumento {
    @Id private String serie;
    @Column(nullable=false) private Long ultimo;
}
