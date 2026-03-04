from flask import Flask, render_template, request, jsonify, send_file
import sqlite3
import os
import pandas as pd
from io import BytesIO

app = Flask(__name__)
DATABASE = 'controle_peso.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists(DATABASE):
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
        reg_id = db.execute('SELECT id FROM registros_dia WHERE data = ?', (payload['data'],)).fetchone()['id']
        
        db.execute('INSERT OR IGNORE INTO setores (nome) VALUES (?)', (payload['setor'],))
        set_id = db.execute('SELECT id FROM setores WHERE nome = ?', (payload['setor'],)).fetchone()['id']
        
        hor_id = db.execute('SELECT id FROM horarios WHERE descricao = ?', (payload['horario'],)).fetchone()['id']

        db.execute('''
            INSERT INTO pesos (registro_id, setor_id, horario_id, peso)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(registro_id, setor_id, horario_id) DO UPDATE SET peso = excluded.peso
        ''', (reg_id, set_id, hor_id, payload['peso']))
        
        db.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/consolidado/<ano>/<mes>')
def get_consolidado_mes(ano, mes):
    db = get_db()
    query = '''
        SELECT s.nome as setor, SUM(p.peso) as total_peso
        FROM pesos p
        JOIN setores s ON p.setor_id = s.id
        JOIN registros_dia r ON p.registro_id = r.id
        WHERE r.data LIKE ?
        GROUP BY s.nome
    '''
    filtro = f'%-{mes}-{ano}'
    rows = db.execute(query, (filtro,)).fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/exportar/<ano>/<mes>')
def exportar_excel(ano, mes):
    db = get_db()
    
    query_detalhado = '''
        SELECT r.data as Data, s.nome as Setor, h.descricao as Horario, p.peso as Peso
        FROM pesos p
        JOIN setores s ON p.setor_id = s.id
        JOIN horarios h ON p.horario_id = h.id
        JOIN registros_dia r ON p.registro_id = r.id
        WHERE r.data LIKE ?
        ORDER BY r.data, s.nome, h.descricao
    '''
    filtro = f'%-{mes}-{ano}'
    df_detalhado = pd.read_sql_query(query_detalhado, db, params=(filtro,))

    if not df_detalhado.empty:
        df_pivot = df_detalhado.pivot_table(index=['Data', 'Setor'], columns='Horario', values='Peso', fill_value=0).reset_index()
        horarios_disponiveis = [h['descricao'] for h in db.execute('SELECT descricao FROM horarios ORDER BY id').fetchall()]
        for h in horarios_disponiveis:
            if h not in df_pivot.columns:
                df_pivot[h] = 0
        df_pivot['Total Diário por Setor'] = df_pivot[horarios_disponiveis].sum(axis=1)
        cols = ['Data', 'Setor'] + horarios_disponiveis + ['Total Diário por Setor']
        df_pivot = df_pivot[cols]
    else:
        horarios_disponiveis = [h['descricao'] for h in db.execute('SELECT descricao FROM horarios ORDER BY id').fetchall()]
        df_pivot = pd.DataFrame(columns=['Data', 'Setor'] + horarios_disponiveis + ['Total Diário por Setor'])

    query_resumo = '''
        SELECT s.nome as Setor, SUM(p.peso) as 'Total Peso (KG)'
        FROM pesos p
        JOIN setores s ON p.setor_id = s.id
        JOIN registros_dia r ON p.registro_id = r.id
        WHERE r.data LIKE ?
        GROUP BY s.nome
    '''
    df_resumo = pd.read_sql_query(query_resumo, db, params=(filtro,))
    
    if df_resumo.empty:
        df_resumo = pd.DataFrame(columns=['Setor', 'Total Peso (KG)'])
    
    total_geral_mes = df_resumo['Total Peso (KG)'].sum()
    df_resumo.loc[len(df_resumo)] = ['TOTAL GERAL DO MÊS', total_geral_mes]

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_pivot.to_excel(writer, index=False, sheet_name=f'Detalhes_{mes}_{ano}')
        df_resumo.to_excel(writer, index=False, sheet_name=f'Resumo_{mes}_{ano}')
    
    output.seek(0)
    return send_file(output, 
                     download_name=f'Relatorio_Mensal_Completo_{mes}_{ano}.xlsx',
                     as_attachment=True,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
