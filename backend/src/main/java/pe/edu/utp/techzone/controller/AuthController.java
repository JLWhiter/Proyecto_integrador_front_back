package pe.edu.utp.techzone.controller;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.techzone.dto.AuthResponseDTO;
import pe.edu.utp.techzone.config.SesionApi;
import pe.edu.utp.techzone.dto.LoginRequest;
import pe.edu.utp.techzone.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public AuthResponseDTO login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        var usuario = authService.login(request);
        SesionApi.iniciar(http, usuario);
        return usuario;
    }

    @GetMapping("/sesion")
    public AuthResponseDTO sesion(HttpServletRequest http) {
        return SesionApi.usuario(http);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cerrarSesion(HttpServletRequest http) {
        http.getSession(false).invalidate();
    }
}
