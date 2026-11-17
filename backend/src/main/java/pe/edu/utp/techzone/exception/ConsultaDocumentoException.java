package pe.edu.utp.techzone.exception;

import org.springframework.http.HttpStatus;

public class ConsultaDocumentoException extends RuntimeException {
    private final HttpStatus status;

    public ConsultaDocumentoException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}
