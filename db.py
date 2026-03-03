import sqlite3

# 1. Caminho para o seu banco de dados
caminho_banco = 'controle_pesos.db'

# 2. Lista de horários extraída da imagem fornecida
horarios = [
    ('05:30',),
    ('08:00',),
    ('13:00',),
    ('16:00',),
    ('20:00',)
]

try:
    # 3. Estabelecer conexão
    conn = sqlite3.connect(caminho_banco)
    cursor = conn.cursor()

    # 4. Executar o INSERT em massa na tabela 'horarios'
    # Usamos o placeholder '?' por segurança e organização
    cursor.executemany('INSERT INTO horarios (descricao) VALUES (?)', horarios)

    # 5. Salvar as alterações
    conn.commit()
    print(f"Sucesso! {cursor.rowcount} horários inseridos com êxito.")

except sqlite3.Error as e:
    print(f"Ocorreu um erro ao inserir os horários: {e}")

finally:
    if conn:
        conn.close()