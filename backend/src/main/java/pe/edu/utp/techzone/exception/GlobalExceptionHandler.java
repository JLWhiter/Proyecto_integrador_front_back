package pe.edu.utp.techzone.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConsultaDocumentoException.class)
    public ResponseEntity<Map<String, Object>> consultaDocumento(ConsultaDocumentoException ex) {
        return response(ex.getStatus(), ex.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(NotFoundException ex) {
        return response(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> business(BusinessException ex) {
        return response(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
        return response(HttpStatus.BAD_REQUEST, "Datos incompletos o inválidos");
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> integrity(Exception ex) {
        return response(HttpStatus.CONFLICT, "La operación no se puede completar porque el registro tiene datos asociados o valores duplicados.");
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> invalidJson(Exception ex) {
        return response(HttpStatus.BAD_REQUEST, "El formato de la solicitud no es válido.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> general(Exception ex) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo completar la operación. Intenta nuevamente.");
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("fecha", LocalDateTime.now());
        body.put("estado", status.value());
        body.put("mensaje", message);
        return ResponseEntity.status(status).body(body);
    }
}
