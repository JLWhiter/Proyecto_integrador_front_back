-- MySQL 8.0.16+. Run ONCE on the original schema, with the application stopped.
-- Does not drop tables or delete sales. DDL in MySQL commits implicitly.
USE proyecto;
DROP PROCEDURE IF EXISTS migrar_integridad_001;
DELIMITER $$
CREATE PROCEDURE migrar_integridad_001()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='venta' AND column_name='doc_cliente') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Migracion ya iniciada/aplicada: revise el esquema antes de continuar';
    END IF;
    IF EXISTS (SELECT usuario FROM usuario GROUP BY usuario HAVING COUNT(*)>1)
       OR EXISTS (SELECT 1 FROM producto WHERE stock<0 OR precio<0)
       OR EXISTS (SELECT 1 FROM detalle_venta WHERE cantidad<=0 OR precio_unitario<0 OR subtotal<0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Hay usuarios duplicados o importes/stock invalidos; corregir antes de migrar';
    END IF;
    ALTER TABLE usuario ADD CONSTRAINT uk_usuario_nombre UNIQUE(usuario);
    ALTER TABLE producto ADD activo BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE producto ADD CONSTRAINT ck_producto_stock CHECK(stock>=0), ADD CONSTRAINT ck_producto_precio CHECK(precio>=0);
    ALTER TABLE venta
        MODIFY id_persona VARCHAR(25) NULL,
        ADD doc_cliente VARCHAR(11),
        ADD razon_social VARCHAR(200),
        ADD direccion_cliente VARCHAR(255),
        ADD nombre_cliente VARCHAR(200) NOT NULL DEFAULT '',
        ADD igv_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 18 CHECK(igv_porcentaje>=0),
        ADD numero_documento_anterior VARCHAR(36);
    ALTER TABLE detalle_venta
        ADD nombre_producto VARCHAR(100) NOT NULL DEFAULT '',
        ADD igv DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK(igv>=0),
        ADD CONSTRAINT ck_detalle_cantidad CHECK(cantidad>0),
        ADD CONSTRAINT ck_detalle_precio CHECK(precio_unitario>=0),
        ADD CONSTRAINT ck_detalle_subtotal CHECK(subtotal>=0);

    -- Preserve every old identifier. DNI/RUC accidentally stored as receipt number
    -- is recovered when its format makes that possible. Unknown identity stays NULL.
    UPDATE venta SET numero_documento_anterior=numero_documento;
    UPDATE venta SET doc_cliente=numero_documento
    WHERE (id_tipo_documento='TD001' AND numero_documento REGEXP '^[0-9]{8}$')
       OR (id_tipo_documento='TD002' AND numero_documento REGEXP '^(10|20)[0-9]{9}$');
    -- Existing receipt numbers are preserved when valid and unique. Invalid or
    -- duplicate legacy identifiers get an explicit internal identifier, not a tax receipt.
    CREATE TEMPORARY TABLE numeros_repetidos AS
        SELECT numero_documento FROM venta GROUP BY numero_documento HAVING COUNT(*)>1;
    UPDATE venta v LEFT JOIN numeros_repetidos n ON n.numero_documento=v.numero_documento
    SET v.numero_documento=CONCAT('LEG-',REPLACE(v.id_venta,'-',''))
    WHERE n.numero_documento IS NOT NULL OR v.numero_documento NOT REGEXP '^[BF][0-9]{3}-[0-9]+$';
    DROP TEMPORARY TABLE numeros_repetidos;
    ALTER TABLE venta ADD CONSTRAINT uk_venta_documento UNIQUE(numero_documento);

    -- Historical tax rates/names were not recorded by the old application.
    -- Backfill uses today's master data and configured rate; verify before running.
    UPDATE venta v JOIN cliente c ON c.id_cliente=v.id_cliente
    SET v.nombre_cliente=CONCAT(c.nombre,' ',c.apellido),
        v.igv_porcentaje=COALESCE((SELECT CAST(valor AS DECIMAL(5,2)) FROM parametro WHERE id_parametro='IGV_PORCENTAJE'),18);
    UPDATE detalle_venta d JOIN venta v ON v.id_venta=d.id_venta JOIN producto p ON p.id_producto=d.id_producto
    SET d.nombre_producto=p.nombre, d.igv=ROUND(d.subtotal*v.igv_porcentaje/(100+v.igv_porcentaje),2);

    CREATE TABLE secuencia_documento(serie VARCHAR(4) PRIMARY KEY, ultimo BIGINT NOT NULL CHECK(ultimo>=0));
    INSERT INTO secuencia_documento
    SELECT 'B001',COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_documento,'-',-1) AS UNSIGNED)),0) FROM venta WHERE numero_documento REGEXP '^B001-[0-9]+$'
    UNION ALL
    SELECT 'F001',COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_documento,'-',-1) AS UNSIGNED)),0) FROM venta WHERE numero_documento REGEXP '^F001-[0-9]+$';
    CREATE TABLE movimiento_stock(
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        id_producto INT NOT NULL,
        cantidad INT NOT NULL,
        stock_resultante INT NOT NULL CHECK(stock_resultante>=0),
        motivo VARCHAR(255) NOT NULL,
        fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(id_producto) REFERENCES producto(id_producto)
    );
    INSERT INTO movimiento_stock(id_producto,cantidad,stock_resultante,motivo)
    SELECT id_producto,stock,stock,'SALDO_MIGRACION' FROM producto;
    CREATE OR REPLACE VIEW historial_compras AS
    SELECT v.id_venta,v.fecha_emision,td.nombre AS tipo_documento,
        v.nombre_cliente AS cliente,c.apellido,d.nombre_producto AS producto,
        d.cantidad,d.precio_unitario,d.subtotal,mp.descripcion AS medio_pago,p.nombre AS vendedor
    FROM venta v JOIN cliente c ON c.id_cliente=v.id_cliente
    LEFT JOIN persona p ON p.id_persona=v.id_persona
    JOIN tipo_documento td ON td.id_documento=v.id_tipo_documento
    JOIN medio_pago mp ON mp.id_medio_pago=v.id_medio_pago
    JOIN detalle_venta d ON d.id_venta=v.id_venta;
END$$
DELIMITER ;
CALL migrar_integridad_001();
DROP PROCEDURE migrar_integridad_001;
