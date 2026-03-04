const setores = ["Pediatria", "Clínica Médica", "Clinica Cirúrgica", "Clínica G.O", "Uti Adulto", "Uti Neo/Ucinco", "Bloco De Imagem", "Casa Do Residente", "Registro", "PPP", "Ambulatório I/Triagem Da Go", "Ambulatório Ii", "Ambulatório Iiii", "Svo", "Banco De Leite", "Banco De Sangue", "Farmácia", "Laboratório", "Centro Cirúrgico", "Simulação"];
const horarios = ["05:30", "08:00", "13:00", "16:00", "20:00"];
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

let dataSelecionada = "";
let mesSelecionado = "";
let anoSelecionado = "2026";

const menuDatas = document.getElementById("menu-datas");
meses.forEach((mes, idx) => {
    const mesNum = String(idx + 1).padStart(2, "0");
    let diasHtml = "";
    for(let d=1; d<=31; d++) {
        const dFmt = `${String(d).padStart(2, "0")}-${mesNum}-2026`;
        diasHtml += `<li><a href="#" class="menu-dia" data-dia="${dFmt}">${dFmt}</a></li>`;
    }
    menuDatas.innerHTML += `
        <li class="has-submenu">
            <div class="menu-item">
                <span class="menu-text">${mes}</span>
                <span class="menu-arrow">▼</span>
            </div>
            <ul class="submenu-mes">${diasHtml}</ul>
        </li>`;
});

const corpo = document.getElementById("tabela-corpo");
if (corpo) {
    corpo.innerHTML = setores.map(s => `
        <tr data-setor="${s}">
            <td class="itens">${s}</td>
            ${horarios.map(h => `<td><input type="number" step="0.01" class="input-peso" data-horario="${h}"></td>`).join("")}
            <td class="total-linha">0.00</td>
        </tr>
    `).join("");
}

document.addEventListener("input", (e) => {
    if (e.target.classList.contains("input-peso")) {
        if (e.target.value < 0) e.target.value = 0;
        calcularTotais();
        salvarDados(e.target);
    }
});

async function salvarDados(input) {
    if (!dataSelecionada) return;
    const tr = input.closest("tr");
    const payload = {
        data: dataSelecionada,
        setor: tr.dataset.setor,
        horario: input.dataset.horario,
        peso: parseFloat(input.value) || 0
    };
    input.classList.add("saving");
    try {
        await fetch("/api/save", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });
    } catch (e) { console.error(e); }
    input.classList.remove("saving");
}

function calcularTotais() {
    const linhas = document.querySelectorAll("#tabela-corpo tr");
    const totaisColunas = new Array(horarios.length).fill(0);
    let somaGeral = 0;
    linhas.forEach(linha => {
        let totalLinha = 0;
        const inputs = linha.querySelectorAll(".input-peso");
        inputs.forEach((input, index) => {
            const valor = parseFloat(input.value) || 0;
            totalLinha += valor;
            totaisColunas[index] += valor;
        });
        linha.querySelector(".total-linha").innerText = totalLinha.toFixed(2);
        somaGeral += totalLinha;
    });
    const celulasSomaFooter = document.querySelectorAll("#linha-totais td[data-col]");
    totaisColunas.forEach((total, index) => {
        if (celulasSomaFooter[index]) celulasSomaFooter[index].innerText = total.toFixed(2);
    });
    const elementoSomaGeral = document.getElementById("soma-geral");
    if (elementoSomaGeral) elementoSomaGeral.innerText = somaGeral.toFixed(2);
}

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("menu-arrow") || e.target.classList.contains("menu-text")) {
        const menuItem = e.target.closest(".menu-item");
        if (menuItem) {
            const submenu = menuItem.nextElementSibling;
            if (submenu && submenu.classList.contains("submenu-mes")) {
                submenu.classList.toggle("active");
                if (e.target.classList.contains("menu-text")) {
                    const mesNome = e.target.innerText;
                    if (meses.includes(mesNome)) carregarVisaoMensal(mesNome);
                }
            }
        }
    }
    if (e.target.classList.contains("menu-dia")) {
        e.preventDefault();
        carregarVisaoDiaria(e.target.dataset.dia);
        document.querySelectorAll(".menu-dia").forEach(el => el.classList.remove("selecionado"));
        // Remove destaque de meses ao selecionar um dia
        document.querySelectorAll(".menu-item .menu-text").forEach(el => el.classList.remove("selecionado"));
        e.target.classList.add("selecionado");
    }
});

async function carregarVisaoDiaria(data) {
    dataSelecionada = data;
    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("month-content").style.display = "none";
    document.getElementById("data-content").style.display = "block";
    document.getElementById("data-titulo").innerText = `Data: ${data}`;
    const res = await fetch(`/api/dados/${data}`);
    const dados = await res.json();
    document.querySelectorAll(".input-peso").forEach(i => i.value = "");
    dados.forEach(d => {
        const input = document.querySelector(`tr[data-setor="${d.setor}"] input[data-horario="${d.horario}"]`);
        if (input) input.value = d.peso;
    });
    calcularTotais();
}

async function carregarVisaoMensal(mesNome) {
    const mesIndex = String(meses.indexOf(mesNome) + 1).padStart(2, "0");
    mesSelecionado = mesIndex;
    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("data-content").style.display = "none";
    document.getElementById("month-content").style.display = "block";
    document.getElementById("mes-titulo").innerText = `Resumo Mensal: ${mesNome} / ${anoSelecionado}`;
    const res = await fetch(`/api/consolidado/${anoSelecionado}/${mesIndex}`);
    const dados = await res.json();
    renderizarTabelaMensal(dados);

    // Remove destaque de dias ao selecionar um mês
    document.querySelectorAll(".menu-dia").forEach(el => el.classList.remove("selecionado"));
    // Adiciona destaque ao mês selecionado
    const mesMenuItem = document.querySelector(`.menu-item .menu-text:contains('${mesNome}')`);
    if (mesMenuItem) mesMenuItem.classList.add("selecionado");
}

function renderizarTabelaMensal(dados) {
    const corpoMensal = document.getElementById("tabela-mensal-corpo");
    let totalGeral = 0;
    corpoMensal.innerHTML = dados.map(d => {
        totalGeral += d.total_peso;
        return `<tr><td class="itens">${d.setor}</td><td style="font-weight: bold;">${d.total_peso.toFixed(2)}</td></tr>`;
    }).join("");
    document.getElementById("soma-geral-mes").innerText = totalGeral.toFixed(2);
}

document.getElementById("btn-exportar").addEventListener("click", () => {
    if (mesSelecionado) window.location.href = `/api/exportar/${anoSelecionado}/${mesSelecionado}`;
});
