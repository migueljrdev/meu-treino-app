import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

// ==========================================
// COLOQUE SUAS CHAVES DO FIREBASE AQUI
// ==========================================
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

// Referências: Histórico e Treino Atual
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
        let nameStyle = 'text-white';
        
        if (ex.completed === false) {
            details = `<span class="text-red-500 font-medium">Não realizado</span>`;
            nameStyle = 'text-gray-500 line-through';
        } else if (ex.type === 'cardio') {
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

// --- COMPARAR EVOLUÇÃO (SEPARANDO MUSCULAÇÃO E CARDIO CORRETAMENTE) ---
window.renderProgress = function() {
    const dayName = document.getElementById('daySelect').value;
    const thead = document.getElementById('progressTableHeader');
    const tbody = document.getElementById('progressTableBody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if(!dayName) return;

    let historyDates = [];
    Object.keys(rawHistoryData).forEach(dateStr => {
        if (rawHistoryData[dateStr].dayName === dayName) {
            historyDates.push(dateStr);
        }
    });

    historyDates.sort((a, b) => b.localeCompare(a));
    let last4Dates = historyDates.slice(0, 4);
    last4Dates.sort((a, b) => a.localeCompare(b));

    let headerHtml = `<th class="pb-3 font-medium whitespace-nowrap">Exercício</th>`;
    last4Dates.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-');
        headerHtml += `<th class="pb-3 font-medium text-center">${d}/${m}</th>`;
    });
    headerHtml += `<th class="pb-3 font-medium text-center text-brand">Atual</th>`;
    thead.innerHTML = headerHtml;

    const currentExercises = currentWorkoutData[dayName] || [];

    const uniqueExNames = new Set(currentExercises.map(e => e.name));
    last4Dates.forEach(dateStr => {
        rawHistoryData[dateStr].exercises.forEach(e => uniqueExNames.add(e.name));
    });

    // Função auxiliar para identificar o tipo do exercício de forma segura
    function getExType(name) {
        let curr = currentExercises.find(e => e.name === name);
        if (curr) return curr.type || 'strength';
        for (let dateStr of last4Dates) {
            let hist = rawHistoryData[dateStr].exercises.find(e => e.name === name);
            if (hist) return hist.type || 'strength';
        }
        return 'strength';
    }

    const strengthNames = [];
    const cardioNames = [];

    // Separa ordenadamente com base no treino atual
    currentExercises.forEach(ex => {
        const type = ex.type || 'strength';
        if (type === 'cardio') {
            if (!cardioNames.includes(ex.name)) cardioNames.push(ex.name);
        } else {
            if (!strengthNames.includes(ex.name)) strengthNames.push(ex.name);
        }
    });

    // Inclui eventuais exercícios antigos que constam no histórico mas não na rotina atual
    uniqueExNames.forEach(name => {
        if (!strengthNames.includes(name) && !cardioNames.includes(name)) {
            const type = getExType(name);
            if (type === 'cardio') {
                cardioNames.push(name);
            } else {
                strengthNames.push(name);
            }
        }
    });

    // Junta mantendo a Musculação sempre no topo e o Cardio na base
    const finalExList = [...strengthNames, ...cardioNames];

    if (finalExList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-500">Nenhum exercício encontrado para este dia.</td></tr>`;
        return;
    }

    finalExList.forEach(exName => {
        let rowHtml = `<tr class="border-b border-gray-800 hover:bg-gray-800/30">
            <td class="py-4 text-white font-medium text-sm whitespace-nowrap pr-4">${exName}</td>`;

        last4Dates.forEach(dateStr => {
            const histEx = rawHistoryData[dateStr].exercises.find(e => e.name === exName);
            if (histEx) {
                rowHtml += `<td class="py-4 text-gray-400 text-center text-sm px-2">${formatCompactData(histEx)}</td>`;
            } else {
                rowHtml += `<td class="py-4 text-gray-600 text-center text-sm px-2">-</td>`;
            }
        });

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

function formatCompactData(ex) {
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