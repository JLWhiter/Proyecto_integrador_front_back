package pe.edu.utp.techzone.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.techzone.dto.ConsultaDocumentoRequest;
import pe.edu.utp.techzone.dto.DocumentoConsultadoDTO;
import pe.edu.utp.techzone.service.ApiPeruService;
import java.util.Map;

@RestController
@RequestMapping("/api/documentos")
@RequiredArgsConstructor
public class DocumentoController {
    private final ApiPeruService apiPeru;

    @GetMapping("/estado")
    public Map<String, Boolean> estado() {
        return Map.of("disponible", apiPeru.disponible());
    }

    @PostMapping("/consulta")
    public DocumentoConsultadoDTO consultar(@Valid @RequestBody ConsultaDocumentoRequest request) {
        return apiPeru.consultar(request.tipo(), request.numero());
    }
}
