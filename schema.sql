CREATE TABLE IF NOT EXISTS setores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT UNIQUE NOT NULL 
);

CREATE TABLE IF NOT EXISTS registros_dia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pesos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registro_id INTEGER,
    setor_id INTEGER,
    horario_id INTEGER,
    peso DECIMAL(10,2),
    FOREIGN KEY (registro_id) REFERENCES registros_dia(id) ON DELETE CASCADE,
    FOREIGN KEY (setor_id) REFERENCES setores(id),
    FOREIGN KEY (horario_id) REFERENCES horarios(id),
    UNIQUE(registro_id, setor_id, horario_id)
);

-- População inicial básica
INSERT OR IGNORE INTO horarios (descricao) VALUES ('05:30'), ('08:00'), ('13:00'), ('16:00'), ('20:00');