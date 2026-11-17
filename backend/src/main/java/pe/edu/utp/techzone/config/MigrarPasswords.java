package pe.edu.utp.techzone.config;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.techzone.repository.*;
import pe.edu.utp.techzone.service.PasswordService;
@Component @RequiredArgsConstructor
public class MigrarPasswords implements ApplicationRunner {
    private final ClienteRepository clientes;
    private final UsuarioRepository usuarios;
    private final PasswordService passwords;
    @Override @Transactional
    public void run(ApplicationArguments args) {
        clientes.findAll().forEach(c -> { if (!c.getContrasena().startsWith("pbkdf2$")) c.setContrasena(passwords.preparar(c.getContrasena())); });
        usuarios.findAll().forEach(u -> { if (!u.getContrasena().startsWith("pbkdf2$")) u.setContrasena(passwords.preparar(u.getContrasena())); });
    }
}
