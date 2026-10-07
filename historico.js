import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

// COLAR SUAS CHAVES AQUI
const firebaseConfig = {
  apiKey: "AIzaSyCVwshlGT_fpe-EdiYZDu0pPNrF9SexsFY",
  authDomain: "meu-treino-eabf2.firebaseapp.com",
  projectId: "meu-treino-eabf2",
  storageBucket: "meu-treino-eabf2.firebasestorage.app",
  messagingSenderId: "1007083750494",
  appId: "1:1007083750494:web:cc75113ed18a78dbbca0cf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

// Duas referências agora: Histórico e o Treino Atual
const historyRef = doc(db, "treinos", "meu_historico_principal");
const workoutRef = doc(db, "treinos", "meu_treino_principal");

let rawHistoryData = {};
let currentWorkoutData = {};
let currentDate = new Date();

// --- CONTROLE DE ABAS ---
window.switchTab = function(tab) {
    document.getElementById('view-calendar').classList.toggle('hidden', tab !== 'calendar');
    document.getElementById('view-progress').classList.toggle('hidden', tab !== 'progress');
    
    document.getElementById('tab-calendar').className = tab === 'calendar' ? 'px-4 py-2 text-brand font-medium border-b-2 border-brand' : 'px-4 py-2 text-gray-500 hover:text-gray-300 font-medium border-b-2 border-transparent';
    document.getElementById('tab-progress').className = tab === 'progress' ? 'px-4 py-2 text-brand font-medium border-b-2 border-brand' : 'px-4 py-2 text-gray-500 hover:text-gray-300 font-medium border-b-2 border-transparent';
}

// --- CARREGAR DADOS ---
async function loadHistory() {
    try {
        // Baixa o histórico e o treino atual ao mesmo tempo
        const [snapHist, snapWork] = await Promise.all([
            getDoc(historyRef),
            getDoc(workoutRef)
        ]);
        
        if (snapHist.exists()) rawHistoryData = snapHist.data();
        if (snapWork.exists()) {
            currentWorkoutData = snapWork.data();
        } else {
            currentWorkoutData = { 'Segunda-feira': [], 'Terça-feira': [], 'Quarta-feira': [], 'Quinta-feira': [], 'Sexta-feira': [], 'Sábado': [], 'Domingo': [] };
        }

        document.getElementById('historyStatus').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Dados atualizados';
        renderCalendar();
    } catch (error) {
        console.error(error);
        document.getElementById('historyStatus').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500 mr-1"></i> Erro ao carregar';
    }
}

// --- CALENDÁRIO ---
window.changeMonth = function(dir) {
    currentDate.setMonth(currentDate.getMonth() + dir);
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('monthTitle').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        calendarDays.innerHTML += `<div></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasWorkout = rawHistoryData[dateStr] !== undefined;
        let btnClass = hasWorkout 
            ? 'bg-green-600 text-white font-bold hover:bg-green-500'
            : 'bg-dark text-gray-400 hover:bg-gray-800 border border-gray-800';

        const today = new Date();
        if(day === today.getDate() && month === today.getMonth() && year === today.getFullYear() && !hasWorkout) {
            btnClass += ' border-brand text-brand'; 
        }

        calendarDays.innerHTML += `
            <button onclick="showDayDetails('${dateStr}')" class="w-full aspect-square rounded-lg flex items-center justify-center transition-colors ${btnClass}">
                ${day}
            </button>
        `;
    }
}

window.showDayDetails = function(dateStr) {
    const detailsDiv = document.getElementById('dayDetails');
    const title = document.getElementById('selectedDateTitle');
    const list = document.getElementById('selectedDayList');
    
    list.innerHTML = '';

    const [y, m, d] = dateStr.split('-');
    const brDate = `${d}/${m}/${y}`;

    if (!rawHistoryData[dateStr]) {
        title.innerHTML = `${brDate} <span class="text-gray-500 font-normal text-sm ml-2">- Nenhum treino</span>`;
        detailsDiv.classList.remove('hidden');
        return;
    }

    const data = rawHistoryData[dateStr];
    title.innerHTML = `${brDate} <span class="text-white text-sm ml-2 bg-gray-800 px-2 py-1 rounded">(${data.dayName})</span>`;

    data.exercises.forEach(ex => {
        let details = '';
        let nameStyle = 'text-white'; // Cor normal
        
        // Verifica se o exercício foi marcado como pulado
        if (ex.completed === false) {
            details = `<span class="text-red-500 font-medium">Não realizado</span>`;
            nameStyle = 'text-gray-500 line-through'; // Deixa o nome cinza e riscado!
        } 
        else if (ex.type === 'cardio') {
            details = `<span class="text-gray-400">${ex.distance}km | ${ex.time}min | ${ex.pace}</span>`;
        } else {
            const pesoExibicao = (ex.weight > 0) ? `${ex.weight}kg` : '<span class="text-[10px] uppercase text-gray-500">Corporal</span>';
            details = `<span class="text-gray-400">${ex.sets} séries x ${ex.reps}</span> - <strong class="text-brand">${pesoExibicao}</strong>`;
        }

        list.innerHTML += `
            <li class="flex justify-between items-center bg-dark p-3 rounded-lg border border-gray-800">
                <span class="${nameStyle} font-medium">${ex.name}</span>
                <span class="text-sm text-right">${details}</span>
            </li>
        `;
    });
    
    detailsDiv.classList.remove('hidden');
}

// --- COMPARAR EVOLUÇÃO (PROGRESSO NAS ÚLTIMAS 4 SEMANAS) ---
window.renderProgress = function() {
    const dayName = document.getElementById('daySelect').value;
    const thead = document.getElementById('progressTableHeader');
    const tbody = document.getElementById('progressTableBody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if(!dayName) return;

    // 1. Achar as datas em que esse dia da semana foi feito no histórico
    let historyDates = [];
    Object.keys(rawHistoryData).forEach(dateStr => {
        if (rawHistoryData[dateStr].dayName === dayName) {
            historyDates.push(dateStr);
        }
    });

    // 2. Ordenar do mais novo pro mais velho e pegar só os 4 últimos
    historyDates.sort((a, b) => b.localeCompare(a));
    let last4Dates = historyDates.slice(0, 4);
    
    // 3. Voltar pra ordem cronológica (antigo -> novo) para ler da esquerda pra direita
    last4Dates.sort((a, b) => a.localeCompare(b));

    // 4. Montar o Cabeçalho (Exercício | Data 1 | Data 2... | Atual)
    let headerHtml = `<th class="pb-3 font-medium whitespace-nowrap">Exercício</th>`;
    last4Dates.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-');
        headerHtml += `<th class="pb-3 font-medium text-center">${d}/${m}</th>`;
    });
    headerHtml += `<th class="pb-3 font-medium text-center text-brand">Atual</th>`;
    thead.innerHTML = headerHtml;

    // 5. Pegar os exercícios ATUAIS desse dia
    const currentExercises = currentWorkoutData[dayName] || [];

    // Lógica para pegar exercícios do atual E do passado (pra caso você tenha removido algum)
    const uniqueExNames = new Set(currentExercises.map(e => e.name));
    last4Dates.forEach(dateStr => {
        rawHistoryData[dateStr].exercises.forEach(e => uniqueExNames.add(e.name));
    });

    // Põe os atuais primeiro, depois os antigos
    const finalExList = [];
    currentExercises.forEach(ex => finalExList.push(ex.name));
    Array.from(uniqueExNames).forEach(name => {
        if (!finalExList.includes(name)) finalExList.push(name);
    });

    if (finalExList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-500">Nenhum exercício encontrado para este dia.</td></tr>`;
        return;
    }

    // 6. Montar as Linhas da Tabela
    finalExList.forEach(exName => {
        let rowHtml = `<tr class="border-b border-gray-800 hover:bg-gray-800/30">
            <td class="py-4 text-white font-medium text-sm whitespace-nowrap pr-4">${exName}</td>`;

        // Busca o exercício nas 4 últimas semanas
        last4Dates.forEach(dateStr => {
            const histEx = rawHistoryData[dateStr].exercises.find(e => e.name === exName);
            if (histEx) {
                rowHtml += `<td class="py-4 text-gray-400 text-center text-sm px-2">${formatCompactData(histEx)}</td>`;
            } else {
                rowHtml += `<td class="py-4 text-gray-600 text-center text-sm px-2">-</td>`;
            }
        });

        // Busca o exercício no painel "Atual"
        const currEx = currentExercises.find(e => e.name === exName);
        if (currEx) {
            rowHtml += `<td class="py-4 text-brand font-bold text-center text-sm px-2">${formatCompactData(currEx)}</td>`;
        } else {
            rowHtml += `<td class="py-4 text-gray-600 text-center text-sm px-2">-</td>`;
        }

        rowHtml += `</tr>`;
        tbody.innerHTML += rowHtml;
    });
}

// Função para formatar os dados pequenos na tabela (ex: "4x10 \n 20kg")
function formatCompactData(ex) {
    // Se não foi realizado, exibe a etiqueta vermelha
    if (ex.completed === false) {
        return `<span class="text-xs font-medium text-red-500 uppercase">Não<br>Feito</span>`;
    }
    
    if (ex.type === 'cardio') {
        return `${ex.distance}km<br><span class="text-xs font-normal text-gray-500">${ex.time}m | ${ex.pace.charAt(0)}</span>`;
    } else {
        const peso = ex.weight > 0 ? `<span class="text-green-500">${ex.weight}kg</span>` : `<span class="text-[10px] uppercase text-gray-500">Corporal</span>`;
        return `${ex.sets}x${ex.reps}<br><span class="text-xs font-normal">${peso}</span>`;
    }
}

// Inicializa
onAuthStateChanged(auth, async (user) => {
    if (user) { loadHistory(); } 
    else { await signInAnonymously(auth); }
});