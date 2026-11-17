package pe.edu.utp.techzone.repository;
import pe.edu.utp.techzone.entity.SecuenciaDocumento;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface SecuenciaDocumentoRepository extends JpaRepository<SecuenciaDocumento, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SecuenciaDocumento s where s.serie = :serie")
    Optional<SecuenciaDocumento> bloquear(@Param("serie") String serie);
}
