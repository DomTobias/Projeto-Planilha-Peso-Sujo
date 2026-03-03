const setores = ["Pediatria", "Clínica Médica", "Clinica Cirúrgica", "Clínica G.O", "Uti Adulto", "Uti Neo/Ucinco", "Bloco De Imagem", "Casa Do Residente", "Registro", "PPP", "Ambulatório I/Triagem Da Go", "Ambulatório Ii", "Ambulatório Iiii", "Svo", "Banco De Leite", "Banco De Sangue", "Farmácia", "Laboratório", "Centro Cirúrgico", "Simulação"];
const horarios = ["05:30", "08:00", "13:00", "16:00", "20:00"];
let dataSelecionada = "";

// 1. Gerar Menu Lateral
const menuDatas = document.getElementById('menu-datas');
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

meses.forEach((mes, idx) => {
    const mesNum = String(idx + 1).padStart(2, '0');
    let diasHtml = "";
    for(let d=1; d<=31; d++) {
        const dFmt = `${String(d).padStart(2, '0')}-${mesNum}-2026`;
        diasHtml += `<li><a href="#" class="menu-dia" data-dia="${dFmt}">${dFmt}</a></li>`;
    }
    menuDatas.innerHTML += `
        <li class="has-submenu">
            <div class="menu-item"><span class="menu-text">${mes}</span><span class="menu-arrow">▼</span></div>
            <ul class="submenu-mes">${diasHtml}</ul>
        </li>`;
});

// 2. Renderizar Tabela
const corpo = document.getElementById('tabela-corpo');
corpo.innerHTML = setores.map(s => `
    <tr data-setor="${s}">
        <td class="itens">${s}</td>
        ${horarios.map(h => `<td><input type="number" step="0.01" class="input-peso" data-horario="${h}"></td>`).join('')}
        <td class="total-linha">0.00</td>
    </tr>
`).join('');

// 3. Auto-Save e Cálculos
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-peso')) {
        calcularTotais();
        salvarDados(e.target);
    }
});

async function salvarDados(input) {
    if (!dataSelecionada) return;
    const tr = input.closest('tr');
    const payload = {
        data: dataSelecionada,
        setor: tr.dataset.setor,
        horario: input.dataset.horario,
        peso: parseFloat(input.value) || 0
    };
    
    input.classList.add('saving'); // Efeito visual opcional
    await fetch('/api/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    input.classList.remove('saving');
}

// 4. Carregamento de Dados
document.querySelectorAll('.menu-dia').forEach(link => {
    link.addEventListener('click', async (e) => {
        dataSelecionada = e.target.dataset.dia;
        document.getElementById('data-titulo').innerText = `Data: ${dataSelecionada}`;
        
        const res = await fetch(`/api/dados/${dataSelecionada}`);
        const dados = await res.json();
        
        // Limpar e Preencher
        document.querySelectorAll('.input-peso').forEach(i => i.value = "");
        dados.forEach(d => {
            const input = document.querySelector(`tr[data-setor="${d.setor}"] input[data-horario="${d.horario}"]`);
            if (input) input.value = d.peso;
        });
        calcularTotais();
    });
});

function calcularTotais() {
    let geral = 0;
    // Lógica de soma por linha e coluna aqui (omitida por brevidade, mas essencial)
}

// Lógica de Toggle do Menu
document.addEventListener('click', e => {
    if (e.target.classList.contains('menu-arrow')) {
        e.target.closest('.menu-item').nextElementSibling.classList.toggle('active');
    }
});

// Função principal para atualizar todos os cálculos da tabela
function calcularTotais() {
    const linhas = document.querySelectorAll('#tabela-corpo tr');
    const totaisColunas = new Array(horarios.length).fill(0);
    let somaGeral = 0;

    linhas.forEach(linha => {
        let totalLinha = 0;
        const inputs = linha.querySelectorAll('.input-peso');

        inputs.forEach((input, index) => {
            const valor = parseFloat(input.value) || 0;
            totalLinha += valor;
            totaisColunas[index] += valor;
        });

        // Atualiza o total da linha (Setor)
        linha.querySelector('.total-linha').innerText = totalLinha.toFixed(2);
        somaGeral += totalLinha;
    });

    // Atualiza os totais das colunas (Horários) no rodapé
    const celulasSomaFooter = document.querySelectorAll('#linha-totais td[data-col]');
    totaisColunas.forEach((total, index) => {
        if (celulasSomaFooter[index]) {
            celulasSomaFooter[index].innerText = total.toFixed(2);
        }
    });

    // Atualiza a soma geral (canto inferior direito)
    const elementoSomaGeral = document.getElementById('soma-geral');
    if (elementoSomaGeral) {
        elementoSomaGeral.innerText = somaGeral.toFixed(2);
    }
}

// Ouvinte de evento para cálculos automáticos ao digitar
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-peso')) {
        // Validação simples para garantir apenas números positivos
        if (e.target.value < 0) e.target.value = 0;
        
        calcularTotais();
    }
});