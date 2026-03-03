from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)
DATABASE = 'controle_peso.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        db = get_db()
        with open('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/dados/<data_alvo>')
def get_dados(data_alvo):
    db = get_db()
    # Garante que o dia existe no banco
    db.execute('INSERT OR IGNORE INTO registros_dia (data) VALUES (?)', (data_alvo,))
    db.commit()
    
    query = '''
        SELECT s.nome as setor, h.descricao as horario, p.peso 
        FROM pesos p
        JOIN setores s ON p.setor_id = s.id
        JOIN horarios h ON p.horario_id = h.id
        JOIN registros_dia r ON p.registro_id = r.id
        WHERE r.data = ?
    '''
    rows = db.execute(query, (data_alvo,)).fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/save', methods=['POST'])
def save():
    payload = request.json
    db = get_db()
    try:
        # Busca IDs necessários
        reg_id = db.execute('SELECT id FROM registros_dia WHERE data = ?', (payload['data'],)).fetchone()['id']
        
        # Insere o setor se não existir (dinâmico)
        db.execute('INSERT OR IGNORE INTO setores (nome) VALUES (?)', (payload['setor'],))
        set_id = db.execute('SELECT id FROM setores WHERE nome = ?', (payload['setor'],)).fetchone()['id']
        
        hor_id = db.execute('SELECT id FROM horarios WHERE descricao = ?', (payload['horario'],)).fetchone()['id']

        # Upsert do Peso
        db.execute('''
            INSERT INTO pesos (registro_id, setor_id, horario_id, peso)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(registro_id, setor_id, horario_id) DO UPDATE SET peso = excluded.peso
        ''', (reg_id, set_id, hor_id, payload['peso']))
        
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == '__main__':
    init_db()
    app.run(debug=True)