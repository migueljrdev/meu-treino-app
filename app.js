import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
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
const auth = getAuth(app); // Inicializa o serviço de autenticação

const daysOfWeek = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
let currentDay = 'Segunda-feira';
let workoutData = {};

const defaultData = {
    'Segunda-feira': [
        { id: 1, name: 'Supino', sets: 4, reps: 10, weight: 11.5 },
        { id: 2, name: 'Flexão', sets: 3, reps: 15, weight: 0 },
        { id: 3, name: 'Crucifixo', sets: 3, reps: 15, weight: 5 },
        { id: 4, name: 'Pullover', sets: 3, reps: 15, weight: 11.5 },
        { id: 5, name: 'Tríceps francês', sets: 3, reps: 12, weight: 10 },
        { id: 6, name: 'Tríceps coice', sets: 3, reps: 12, weight: 7.5 }
    ],
    'Terça-feira': [], 'Quarta-feira': [], 'Quinta-feira': [], 'Sexta-feira': [], 'Sábado': [], 'Domingo': []
};

const docRef = doc(db, "treinos", "meu_treino_principal");

async function loadFromFirebase() {
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            workoutData = docSnap.data();
        } else {
            workoutData = defaultData;
            await setDoc(docRef, workoutData);
        }
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Salvo na nuvem';
        document.getElementById('loadingOverlay').classList.add('hidden');
        window.renderDays();
        window.renderExercises();
    } catch (error) {
        console.error("Erro ao carregar do Firebase:", error);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500 mr-1"></i> Erro de conexão';
    }
}

async function saveToFirebase() {
    try {
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin text-brand mr-1"></i> Salvando...';
        await setDoc(docRef, workoutData);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Salvo na nuvem';
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
}

// Expõe as funções para o HTML chamá-las (por usarmos type="module")
window.renderDays = function() {
    const container = document.getElementById('daysContainer');
    container.innerHTML = '';
    daysOfWeek.forEach(day => {
        const btn = document.createElement('button');
        btn.className = `whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${day === currentDay ? 'bg-brand text-white' : 'bg-card text-gray-400 hover:text-white border border-gray-800'}`;
        btn.innerText = day.split('-')[0];
        btn.onclick = () => { currentDay = day; window.renderDays(); window.renderExercises(); };
        container.appendChild(btn);
    });
}

window.renderExercises = function() {
    document.getElementById('currentDayTitle').innerText = currentDay;
    const list = document.getElementById('exerciseList');
    const emptyState = document.getElementById('emptyState');
    list.innerHTML = '';
    
    const exercises = workoutData[currentDay] || [];
    if (exercises.length === 0) {
        emptyState.classList.remove('hidden');
        list.parentElement.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.parentElement.classList.remove('hidden');
        exercises.forEach(ex => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-800 hover:bg-gray-800/30';
            tr.innerHTML = `
                <td class="py-4 text-white font-medium">${ex.name}</td>
                <td class="py-4 text-gray-300 text-center">${ex.sets}</td>
                <td class="py-4 text-gray-300 text-center">${ex.reps}</td>
                <td class="py-4 text-brand font-bold text-center">${ex.weight > 0 ? ex.weight : '-'}</td>
                <td class="py-4 text-right space-x-2">
                    <button onclick="openMediaModal('${ex.name}')" class="text-gray-500 hover:text-brand p-2 bg-gray-800/50 rounded"><i class="fa-solid fa-play"></i></button>
                    <button onclick="editExercise(${ex.id})" class="text-gray-500 hover:text-white p-2"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteExercise(${ex.id})" class="text-gray-500 hover:text-red-500 p-2"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    }
}

window.openAddModal = function() {
    document.getElementById('modalTitle').innerText = 'Adicionar Exercício';
    document.getElementById('editId').value = '';
    ['exName', 'exSets', 'exReps', 'exWeight'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('formModal').classList.remove('hidden');
    document.getElementById('formModal').classList.add('flex');
}

window.editExercise = function(id) {
    const ex = workoutData[currentDay].find(e => e.id === id);
    if(ex) {
        document.getElementById('modalTitle').innerText = 'Editar Exercício';
        document.getElementById('editId').value = ex.id;
        document.getElementById('exName').value = ex.name;
        document.getElementById('exSets').value = ex.sets;
        document.getElementById('exReps').value = ex.reps;
        document.getElementById('exWeight').value = ex.weight;
        document.getElementById('formModal').classList.remove('hidden');
        document.getElementById('formModal').classList.add('flex');
    }
}

window.saveExercise = function() {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('exName').value;
    const sets = parseInt(document.getElementById('exSets').value) || 0;
    const reps = parseInt(document.getElementById('exReps').value) || 0;
    const weight = parseFloat(document.getElementById('exWeight').value) || 0;

    if(!name) return alert('Digite o nome do exercício.');

    if(id) {
        const index = workoutData[currentDay].findIndex(e => e.id == id);
        if(index > -1) workoutData[currentDay][index] = { id: parseInt(id), name, sets, reps, weight };
    } else {
        if(!workoutData[currentDay]) workoutData[currentDay] = [];
        workoutData[currentDay].push({ id: Date.now(), name, sets, reps, weight });
    }

    saveToFirebase();
    window.closeModals();
    window.renderExercises();
}

window.deleteExercise = function(id) {
    if(confirm('Tem certeza que deseja excluir?')) {
        workoutData[currentDay] = workoutData[currentDay].filter(e => e.id !== id);
        saveToFirebase();
        window.renderExercises();
    }
}

window.resetData = function() {
    if(confirm('Isso apagará seus treinos no banco de dados e recarregará o modelo inicial. Continuar?')) {
        workoutData = JSON.parse(JSON.stringify(defaultData));
        saveToFirebase();
        window.renderDays();
        window.renderExercises();
    }
}

let currentSlide = 0;
window.openMediaModal = function(exName) {
    document.getElementById('mediaTitle').innerText = `Execução: ${exName}`;
    document.getElementById('youtubeBtn').href = `https://www.youtube.com/results?search_query=${encodeURIComponent('Como fazer ' + exName + ' corretamente musculação')}`;
    currentSlide = 0;
    updateSlideVisibility();
    document.getElementById('mediaModal').classList.remove('hidden');
    document.getElementById('mediaModal').classList.add('flex');
}

window.moveSlide = function(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    if (currentSlide >= slides.length) currentSlide = 0;
    updateSlideVisibility();
}

function updateSlideVisibility() {
    document.querySelectorAll('.carousel-slide').forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlide);
    });
}

window.closeModals = function() {
    document.getElementById('formModal').classList.replace('flex', 'hidden');
    document.getElementById('mediaModal').classList.replace('flex', 'hidden');
}

// Monitora o estado de autenticação (Faz login invisível antes de buscar os dados)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Já está autenticado, carrega o treino
        loadFromFirebase();
    } else {
        // Se não tiver sessão ativa, autentica anonimamente
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Erro no login anônimo:", error);
            document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500 mr-1"></i> Erro de autenticação';
        }
    }
});