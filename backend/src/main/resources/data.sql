INSERT INTO parametro (id_parametro, valor, descripcion) VALUES
('IGV_PORCENTAJE', '18.00', 'Impuesto General a las Ventas (IGV) en porcentaje, Peru'),
('RUC_EMISOR', '20512345678', 'RUC del emisor para los comprobantes'),
('MONEDA', 'PEN', 'Codigo de moneda ISO 4217');

INSERT INTO tipo_documento VALUES
('TD001', 'Boleta'),
('TD002', 'Factura');

INSERT INTO medio_pago VALUES
('MP001', 'Efectivo'),
('MP002', 'Tarjeta de crédito'),
('MP003', 'Tarjeta de débito'),
('MP004', 'Yape'),
('MP005', 'Plin'),
('MP006', 'Transferencia'),
('MP007', 'Pago contra entrega'),
('MP008', 'Billetera digital'),
('MP009', 'Visa'),
('MP010', 'Mastercard'),
('MP011', 'American Express'),
('MP012', 'Depósito'),
('MP013', 'Crédito empresarial'),
('MP014', 'Pago mixto'),
('MP015', 'PayPal');

INSERT INTO persona VALUES
('PER001', 'Luis', 'García', '1998-05-12', 'luis@gmail.com', '987654321', 'luisg'),
('PER002', 'Ana', 'Torres', '1999-08-20', 'ana@gmail.com', '987654322', 'anat'),
('PER003', 'Carlos', 'Ramos', '1997-03-15', 'carlos@gmail.com', '987654323', 'carlosr'),
('PER004', 'María', 'Flores', '2000-11-10', 'maria@gmail.com', '987654324', 'mariaf'),
('PER005', 'Pedro', 'Castro', '1996-01-25', 'pedro@gmail.com', '987654325', 'pedroc'),
('PER006', 'Lucía', 'Mendoza', '2001-06-30', 'lucia@gmail.com', '987654326', 'luciam'),
('PER007', 'Jorge', 'Paredes', '1995-09-18', 'jorge@gmail.com', '987654327', 'jorgep'),
('PER008', 'Rosa', 'Vargas', '1998-12-05', 'rosa@gmail.com', '987654328', 'rosav'),
('PER009', 'Miguel', 'Salas', '1994-04-22', 'miguel@gmail.com', '987654329', 'miguels'),
('PER010', 'Diana', 'Quispe', '2002-02-14', 'diana@gmail.com', '987654330', 'dianaq'),
('PER011', 'José', 'Reyes', '1999-07-07', 'jose@gmail.com', '987654331', 'joser'),
('PER012', 'Elena', 'Campos', '1997-10-09', 'elena@gmail.com', '987654332', 'elenac'),
('PER013', 'Raúl', 'Navarro', '1996-03-29', 'raul@gmail.com', '987654333', 'rauln'),
('PER014', 'Sofía', 'Herrera', '2001-05-19', 'sofia@gmail.com', '987654334', 'sofiah'),
('PER015', 'Fernando', 'Lozano', '1995-08-11', 'fernando@gmail.com', '987654335', 'fernandol'),
('PERADM', 'Administrador', 'General', '1995-01-01', 'admin@softplex.com', '999999999', 'admin');

INSERT INTO usuario (usuario, contrasena, id_persona) VALUES
('luisg', 'pbkdf2$600000$OXf+Cm/KcaS6IA1OrzZ6IQ==$G42Bj1QRnixr5NKuy0SsZCya9GKnUCgXLhkveuXw7xU=', 'PER001'),
('anat', 'pbkdf2$600000$hqL3daZ58EV850sSWS/J1g==$97DWaLwlQ0zvaCO8Xn2ej8h/hqExRSCex+MGhNjVI7g=', 'PER002'),
('carlosr', 'pbkdf2$600000$3MU8GHZFgFcfZ+2wwa226w==$wyd0Js7EM0AbQAGA0yZd/o2+hdWetJ+bP30FFiO+R4Y=', 'PER003'),
('mariaf', 'pbkdf2$600000$kQUaMbqHJ2VG1ShthHFQqw==$RMsuumzRt6numgDSzBt+aJ+cGl85qSaTXfb0wBM0h5M=', 'PER004'),
('pedroc', 'pbkdf2$600000$I2EtKrZ2oK/kq3fL7wfv/g==$7QVeuQkHa3Y/jOYql+SVJx414+T7pTSurzP19JuRtgA=', 'PER005'),
('luciam', 'pbkdf2$600000$KOKlaq0+tSCZPR3kaFVIBA==$6OooWhgq9pyiNk8xmQXMhiFYlbLp7m/yyoqwKAvl3ro=', 'PER006'),
('jorgep', 'pbkdf2$600000$NJpdLAM/QAXswak97b/85g==$4WLK14xY5IWYw0L09GxXKh6yUXEJf6k38G7INLChz+4=', 'PER007'),
('rosav', 'pbkdf2$600000$x8ETY1L+7amhVrdTm5DVfA==$IcNwnQfAWFEv4aIO6ADd1L8ZiLp8a4zariKTfZnZoVg=', 'PER008'),
('miguels', 'pbkdf2$600000$lUlYVyBc3uqtCj3Y/P95Xg==$EKpnhhw1On0j+P1jf7xVwdAxw7lM+11koegM21DZd4I=', 'PER009'),
('dianaq', 'pbkdf2$600000$C1hOWWHx/EMl0b8GBm+Bbg==$qTRjT1IUNivkdEvCIfpG6wE1dsfrbRvb19wapnxL4GM=', 'PER010'),
('joser', 'pbkdf2$600000$XPFo6ssFxmMvUIv+xaaF4Q==$aQOjhP1ibaXkhWkVa0goeFhC5ZM7Yg+1MdA/j/Y/Ens=', 'PER011'),
('elenac', 'pbkdf2$600000$pYUsBEuiHsq1zak+Utw4Hg==$fxHbYmeJzJql/gt5WcSPsxSmJnMmiVW1wQB4FoxBYk0=', 'PER012'),
('rauln', 'pbkdf2$600000$+X45Lv7f1RqJC0ssdsL30g==$y0MAGWpJiv+IK6m6Td3LR18MS7gJn+B7ekpMXPKGxIw=', 'PER013'),
('sofiah', 'pbkdf2$600000$DAg3/MXJulbJ4o0ZvBFp6Q==$JtV7Gs0gqFlf55hnv1h/cn8TuDLeTnFdHaztnf2FyOk=', 'PER014'),
('fernandol', 'pbkdf2$600000$Yp5ntOznFZGXBul7/Ty5ig==$HixZFdUDh1rxqbEw4OBB92AsOWSlJ1pUKNHWmeiu8MU=', 'PER015'),
('admin', 'pbkdf2$600000$YYvd7utd7xmbiJA/OJriLA==$YRncIGcZ0qF25isaACNkKvaoPRKFBXkg7RDLLJ4NDYU=', 'PERADM');

INSERT INTO cliente VALUES
('CLI001', 'Luis', 'García', '987654321', 'pbkdf2$600000$AaFV6MzFt9HQR33Mzux9QA==$/+bBATj6g41iNvnGDhSskrEVTqpIk1jBT1P++M62XDU=', 'luis@gmail.com'),
('CLI002', 'Ana', 'Torres', '987654322', 'pbkdf2$600000$jAm/Xcc1TSpeeKk0Y87D/w==$XE1PwyaMkDBMiYs475iVeJRhX0mAC67BedVxH5n9W+A=', 'ana@gmail.com'),
('CLI003', 'Carlos', 'Ramos', '987654323', 'pbkdf2$600000$dOQvaWhqkbImS9YdLLKiFg==$p46iKmdFc+FwRdfE2ISimOxJfrbnxidiJe1NY5yjNoI=', 'carlos@gmail.com'),
('CLI004', 'María', 'Flores', '987654324', 'pbkdf2$600000$pw51KwbqrZo6ub9ul6ftIw==$pqVUQaC0a4ZP1LSjSQwiDoNx9jQHz4/wI1GVoUM2WxY=', 'maria@gmail.com'),
('CLI005', 'Pedro', 'Castro', '987654325', 'pbkdf2$600000$qskucDuVnGAIh397K9Ns9g==$vnh45UeU2Hem/HlqHG5EyLwesoZEq9qtla1SK2JvxtY=', 'pedro@gmail.com'),
('CLI006', 'Lucía', 'Mendoza', '987654326', 'pbkdf2$600000$OIhVwqLvZkjCrz/JF6mnUg==$AYJqdLGeYfN3vYtWdNPOCW1wTdGFUKkFFusLem3BfHE=', 'lucia@gmail.com'),
('CLI007', 'Jorge', 'Paredes', '987654327', 'pbkdf2$600000$TXvliIU5b59ImQJjalsmmg==$JBc+yZRVlbg52Klhzad1GO8KNDQsFwb1aBaW7QMjNGQ=', 'jorge@gmail.com'),
('CLI008', 'Rosa', 'Vargas', '987654328', 'pbkdf2$600000$ZPTUUwOBcgzUZSPdSKcqew==$OA2/7sxUVZhPnX5TBM7kyDvDhrBrrNRufNxwpkryG/o=', 'rosa@gmail.com'),
('CLI009', 'Miguel', 'Salas', '987654329', 'pbkdf2$600000$+4RlbidFQF0LzGAqW/oPow==$8ec8axBUj3D2RMXu46QZK3/sr/XbWd8uApQr9c/6efA=', 'miguel@gmail.com'),
('CLI010', 'Diana', 'Quispe', '987654330', 'pbkdf2$600000$Sy6L1viAZkKCFWJxChQjjQ==$gSvMJDAGrA+wPY7YtRaYH5WJibMEna1VCXENYPvSKbA=', 'diana@gmail.com'),
('CLI011', 'José', 'Reyes', '987654331', 'pbkdf2$600000$XEP26TAXYKL4bC2n2/k5IA==$OmqAfhuYO/myIIPbyZU5FW6qdZNNk2dWxCvYAgaqU6c=', 'jose@gmail.com'),
('CLI012', 'Elena', 'Campos', '987654332', 'pbkdf2$600000$8IoQDtA1TmxRqY0tWnFgAA==$8uFCMu/4rnTozskKKxedxcWoVKkiCWQ25tQvL6Me0eA=', 'elena@gmail.com'),
('CLI013', 'Raúl', 'Navarro', '987654333', 'pbkdf2$600000$Y37RvSpdGIDPFWiB2mSfmQ==$H08aJ0+x865oz96tCdbG7TJ5oCivm+S9SM34aWl8FNM=', 'raul@gmail.com'),
('CLI014', 'Sofía', 'Herrera', '987654334', 'pbkdf2$600000$3Jfj3Ilh87dc7ZF8IUMHiw==$k3Kt4jXROFCZD+a/JMiqLSJKLvPZvzDukq2AqZfwQFs=', 'sofia@gmail.com'),
('CLI015', 'Fernando', 'Lozano', '987654335', 'pbkdf2$600000$5WhRXxArXKVDqE0vDG0RFg==$6LQCueC0UWDv5Rit0NtSmDjOpR9ah9i0f5hYO8mOnLI=', 'fernando@gmail.com');

INSERT INTO producto(id_producto,nombre,stock,precio,categoria) VALUES
(1, 'Laptop Lenovo', 20, 2500.00, 'Laptops'),
(2, 'Mouse Logitech', 50, 45.00, 'Periféricos'),
(3, 'Teclado Mecánico', 35, 150.00, 'Periféricos'),
(4, 'Monitor Samsung', 18, 780.00, 'Monitores'),
(5, 'Impresora Epson', 12, 650.00, 'Impresión'),
(6, 'USB 32GB', 100, 25.00, 'Almacenamiento'),
(7, 'Disco SSD 480GB', 40, 230.00, 'Almacenamiento'),
(8, 'Audífonos Sony', 30, 120.00, 'Audio'),
(9, 'Parlante JBL', 25, 180.00, 'Audio'),
(10, 'Tablet Samsung', 15, 950.00, 'Tablets'),
(11, 'Cámara Web', 22, 90.00, 'Accesorios'),
(12, 'Router TP-Link', 28, 160.00, 'Redes'),
(13, 'Cable HDMI', 60, 30.00, 'Cables'),
(14, 'Silla Gamer', 10, 520.00, 'Gaming'),
(15, 'Micrófono USB', 17, 210.00, 'Audio');

-- Comprador en id_cliente (CLI001..CLI015). Vendedor en id_persona (PERADM,
-- el administrador que registro la carga inicial).
INSERT INTO venta (id_venta, id_cliente, id_persona, id_tipo_documento, numero_documento, id_medio_pago, fecha_emision) VALUES
('VEN001', 'CLI001', 'PERADM', 'TD001', 'B001-000001', 'MP004', CURRENT_TIMESTAMP),
('VEN002', 'CLI002', 'PERADM', 'TD002', 'F001-000002', 'MP002', CURRENT_TIMESTAMP),
('VEN003', 'CLI003', 'PERADM', 'TD001', 'B001-000003', 'MP001', CURRENT_TIMESTAMP),
('VEN004', 'CLI004', 'PERADM', 'TD002', 'F001-000004', 'MP006', CURRENT_TIMESTAMP),
('VEN005', 'CLI005', 'PERADM', 'TD001', 'B001-000005', 'MP005', CURRENT_TIMESTAMP),
('VEN006', 'CLI006', 'PERADM', 'TD002', 'F001-000006', 'MP009', CURRENT_TIMESTAMP),
('VEN007', 'CLI007', 'PERADM', 'TD001', 'B001-000007', 'MP003', CURRENT_TIMESTAMP),
('VEN008', 'CLI008', 'PERADM', 'TD002', 'F001-000008', 'MP010', CURRENT_TIMESTAMP),
('VEN009', 'CLI009', 'PERADM', 'TD001', 'B001-000009', 'MP001', CURRENT_TIMESTAMP),
('VEN010', 'CLI010', 'PERADM', 'TD002', 'F001-000010', 'MP004', CURRENT_TIMESTAMP),
('VEN011', 'CLI011', 'PERADM', 'TD001', 'B001-000011', 'MP005', CURRENT_TIMESTAMP),
('VEN012', 'CLI012', 'PERADM', 'TD002', 'F001-000012', 'MP006', CURRENT_TIMESTAMP),
('VEN013', 'CLI013', 'PERADM', 'TD001', 'B001-000013', 'MP007', CURRENT_TIMESTAMP),
('VEN014', 'CLI014', 'PERADM', 'TD002', 'F001-000014', 'MP013', CURRENT_TIMESTAMP),
('VEN015', 'CLI015', 'PERADM', 'TD001', 'B001-000015', 'MP015', CURRENT_TIMESTAMP);

INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES
('VEN001', 1, 1, 2500.00, 2500.00),
('VEN001', 2, 2, 45.00, 90.00),
('VEN002', 4, 1, 780.00, 780.00),
('VEN002', 3, 1, 150.00, 150.00),
('VEN003', 6, 3, 25.00, 75.00),
('VEN004', 5, 1, 650.00, 650.00),
('VEN005', 7, 1, 230.00, 230.00),
('VEN006', 8, 2, 120.00, 240.00),
('VEN007', 9, 1, 180.00, 180.00),
('VEN008', 10, 1, 950.00, 950.00),
('VEN009', 11, 2, 90.00, 180.00),
('VEN010', 12, 1, 160.00, 160.00),
('VEN011', 13, 4, 30.00, 120.00),
('VEN012', 14, 1, 520.00, 520.00),
('VEN013', 15, 1, 210.00, 210.00),
('VEN014', 1, 1, 2500.00, 2500.00),
('VEN015', 2, 1, 45.00, 45.00);


INSERT INTO secuencia_documento VALUES ('B001',15),('F001',15);
INSERT INTO movimiento_stock(id_producto,cantidad,stock_resultante,motivo) SELECT id_producto,stock,stock,'SALDO_INICIAL' FROM producto;
UPDATE venta SET nombre_cliente=(SELECT CONCAT(c.nombre,' ',c.apellido) FROM cliente c WHERE c.id_cliente=venta.id_cliente);
UPDATE detalle_venta SET nombre_producto=(SELECT p.nombre FROM producto p WHERE p.id_producto=detalle_venta.id_producto), igv=ROUND(subtotal*18/118,2);
