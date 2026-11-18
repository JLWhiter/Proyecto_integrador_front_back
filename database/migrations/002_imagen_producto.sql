-- Aplicar una vez a instalaciones anteriores sin la columna producto.imagen.
USE proyecto;
ALTER TABLE producto ADD COLUMN imagen MEDIUMTEXT;
