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
const auth = getAuth(app); 

const daysOfWeek = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
let currentDay = 'Segunda-feira';
let workoutData = {};

const docRef = doc(db, "treinos", "meu_treino_principal");
const historyRef = doc(db, "treinos", "meu_historico_principal");

async function loadFromFirebase() {
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            workoutData = docSnap.data();
        } else {
            workoutData = { 'Segunda-feira': [], 'Terça-feira': [], 'Quarta-feira': [], 'Quinta-feira': [], 'Sexta-feira': [], 'Sábado': [], 'Domingo': [] };
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
    
    const exercises = workoutData[currentDay] || [];
    const emptyState = document.getElementById('emptyState');
    const strengthSection = document.getElementById('strengthSection');
    const cardioSection = document.getElementById('cardioSection');
    const list = document.getElementById('exerciseList');
    const cardioList = document.getElementById('cardioList');
    
    list.innerHTML = '';
    cardioList.innerHTML = '';
    
    if (exercises.length === 0) {
        emptyState.classList.remove('hidden');
        strengthSection.classList.add('hidden');
        cardioSection.classList.add('hidden');
        return;
    } 

    emptyState.classList.add('hidden');
    
    const strengthEx = exercises.filter(e => !e.type || e.type === 'strength');
    const cardioEx = exercises.filter(e => e.type === 'cardio');

    // Renderiza Musculação
    if(strengthEx.length > 0) {
        strengthSection.classList.remove('hidden');
        strengthEx.forEach(ex => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-800 hover:bg-gray-800/30';
            
            const pesoExibicao = (ex.weight > 0) ? `${ex.weight}kg` : '<span class="text-[10px] uppercase text-gray-500">Corporal</span>';

            tr.innerHTML = `
                <td class="py-4 text-white font-medium flex items-center gap-3">
                    <input type="checkbox" id="check-${ex.id}" checked class="w-5 h-5 accent-brand cursor-pointer shrink-0" title="Marcar como realizado">
                    ${ex.name}
                </td>
                <td class="py-4 text-gray-300 text-center">${ex.sets}</td>
                <td class="py-4 text-gray-300 text-center">${ex.reps}</td>
                <td class="py-4 text-brand font-bold text-center">${pesoExibicao}</td>
                <td class="py-4 text-right space-x-2">
                    <button onclick="openMediaModal(${ex.id})" class="text-gray-500 hover:text-brand p-2 bg-gray-800/50 rounded" title="Ver execução"><i class="fa-solid fa-play"></i></button>
                    <button onclick="editExercise(${ex.id})" class="text-gray-500 hover:text-white p-2"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteExercise(${ex.id})" class="text-gray-500 hover:text-red-500 p-2"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } else {
        strengthSection.classList.add('hidden');
    }

    // Renderiza Cardio
    if(cardioEx.length > 0) {
        cardioSection.classList.remove('hidden');
        cardioEx.forEach(ex => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-dark border border-gray-800 p-4 rounded-lg';
            div.innerHTML = `
                <div class="flex items-center gap-4 w-full">
                    <input type="checkbox" id="check-${ex.id}" checked class="w-6 h-6 accent-red-500 cursor-pointer shrink-0" title="Marcar como realizado">
                    <div class="bg-red-500/10 p-3 rounded-full text-red-500 hidden sm:block">
                        <i class="fa-solid fa-person-running text-xl"></i>
                    </div>
                    <div>
                        <h4 class="text-white font-medium text-lg">${ex.name}</h4>
                        <p class="text-gray-400 text-sm mt-1">
                            <i class="fa-solid fa-route text-gray-500 mr-1"></i> ${ex.distance}km &nbsp;•&nbsp; 
                            <i class="fa-regular fa-clock text-gray-500 mr-1"></i> ${ex.time}min &nbsp;•&nbsp; 
                            <i class="fa-solid fa-fire text-gray-500 mr-1"></i> ${ex.pace}
                        </p>
                    </div>
                </div>
                <div class="text-right flex-shrink-0 flex gap-2">
                    <button onclick="editExercise(${ex.id})" class="text-gray-500 hover:text-white p-2"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteExercise(${ex.id})" class="text-gray-500 hover:text-red-500 p-2"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            cardioList.appendChild(div);
        });
    } else {
        cardioSection.classList.add('hidden');
    }
}

// Troca os campos visíveis no Modal dependendo do que foi selecionado
window.toggleType = function() {
    const type = document.querySelector('input[name="exType"]:checked').value;
    
    if (type === 'cardio') {
        document.getElementById('strengthFields').classList.remove('grid');
        document.getElementById('strengthFields').classList.add('hidden');
        document.getElementById('cardioFields').classList.remove('hidden');
        document.getElementById('cardioFields').classList.add('grid');
    } else {
        document.getElementById('cardioFields').classList.remove('grid');
        document.getElementById('cardioFields').classList.add('hidden');
        document.getElementById('strengthFields').classList.remove('hidden');
        document.getElementById('strengthFields').classList.add('grid');
    }
}

window.openAddModal = function() {
    document.getElementById('modalTitle').innerText = 'Adicionar Exercício';
    document.getElementById('editId').value = '';
    ['exName', 'exImage', 'exSets', 'exReps', 'exWeight', 'exDistance', 'exTime'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    
    document.getElementById('exRepsUnit').value = ''; 
    document.getElementById('exPace').value = 'Leve';
    
    document.querySelector('input[value="strength"]').checked = true;
    window.toggleType();

    document.getElementById('formModal').classList.remove('hidden');
    document.getElementById('formModal').classList.add('flex');
}

window.editExercise = function(id) {
    const ex = workoutData[currentDay].find(e => e.id === id);
    if(ex) {
        document.getElementById('modalTitle').innerText = 'Editar Exercício';
        document.getElementById('editId').value = ex.id;
        document.getElementById('exName').value = ex.name;
        document.getElementById('exImage').value = ex.image || '';
        
        const type = ex.type || 'strength';
        document.querySelector(`input[value="${type}"]`).checked = true;
        window.toggleType();

        if (type === 'strength') {
            document.getElementById('exSets').value = ex.sets;
            
            let repsStr = String(ex.reps || "");
            if (repsStr.includes('min')) {
                document.getElementById('exReps').value = repsStr.replace('min', '').trim();
                document.getElementById('exRepsUnit').value = 'min';
            } else if (repsStr.includes('s')) {
                document.getElementById('exReps').value = repsStr.replace('s', '').trim();
                document.getElementById('exRepsUnit').value = 's';
            } else {
                document.getElementById('exReps').value = repsStr;
                document.getElementById('exRepsUnit').value = '';
            }

            document.getElementById('exWeight').value = ex.weight;
        } else {
            document.getElementById('exDistance').value = ex.distance;
            document.getElementById('exTime').value = ex.time;
            document.getElementById('exPace').value = ex.pace;
        }

        document.getElementById('formModal').classList.remove('hidden');
        document.getElementById('formModal').classList.add('flex');
    }
}

window.saveExercise = function() {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('exName').value;
    const imageUrl = document.getElementById('exImage').value.trim();
    const type = document.querySelector('input[name="exType"]:checked').value;

    if(!name) return alert('Digite o nome do exercício.');

    let exerciseObj = { name, type, image: imageUrl };

    if (type === 'strength') {
        exerciseObj.sets = Math.abs(parseInt(document.getElementById('exSets').value) || 0);
        
        const repsValue = Math.abs(parseInt(document.getElementById('exReps').value) || 0);
        const repsUnit = document.getElementById('exRepsUnit').value;
        
        if (!document.getElementById('exReps').value) {
            exerciseObj.reps = "0";
        } else if (repsUnit === "") {
            exerciseObj.reps = repsValue.toString(); 
        } else {
            exerciseObj.reps = repsValue + repsUnit; 
        }
        
        exerciseObj.weight = Math.abs(parseFloat(document.getElementById('exWeight').value) || 0);
    } else {
        exerciseObj.distance = Math.abs(parseFloat(document.getElementById('exDistance').value) || 0);
        exerciseObj.time = Math.abs(parseInt(document.getElementById('exTime').value) || 0);
        exerciseObj.pace = document.getElementById('exPace').value;
    }

    if(id) {
        exerciseObj.id = parseInt(id);
        const index = workoutData[currentDay].findIndex(e => e.id == id);
        if(index > -1) workoutData[currentDay][index] = exerciseObj;
    } else {
        exerciseObj.id = Date.now();
        if(!workoutData[currentDay]) workoutData[currentDay] = [];
        workoutData[currentDay].push(exerciseObj);
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
    if(confirm('Isso apagará seus treinos. Continuar?')) {
        workoutData = { 'Segunda-feira': [], 'Terça-feira': [], 'Quarta-feira': [], 'Quinta-feira': [], 'Sexta-feira': [], 'Sábado': [], 'Domingo': [] };
        saveToFirebase();
        window.renderDays();
        window.renderExercises();
    }
}

// Media / Carrossel e Fechar
let currentSlide = 0;

window.openMediaModal = function(id) {
    const ex = workoutData[currentDay].find(e => e.id === id);
    if (!ex) return;

    document.getElementById('mediaTitle').innerText = `Execução: ${ex.name}`;
    document.getElementById('youtubeBtn').href = `https://www.youtube.com/results?search_query=${encodeURIComponent('Como fazer ' + ex.name + ' corretamente')}`;

    const carouselContainer = document.querySelector('#mediaModal .carousel-container');
    
    const images = ex.image ? ex.image.split(',').map(i => i.trim()).filter(i => i.length > 0) : [];

    if (images.length > 0) {
        let slidesHtml = '';
        
        images.forEach((imgUrl, index) => {
            // Força a altura 100% do container
            slidesHtml += `
                <div class="carousel-slide ${index === 0 ? 'active' : ''} flex items-center justify-center bg-black/50 rounded-lg overflow-hidden w-full h-full" style="height: 100%;">
                    <img src="${imgUrl}" alt="${ex.name}" class="w-full h-full object-contain" style="max-height: 100%; object-fit: contain;">
                </div>
            `;
        });

        if (images.length > 1) {
            slidesHtml += `
                <button class="carousel-btn prev" onclick="moveSlide(-1)"><i class="fa-solid fa-chevron-left"></i></button>
                <button class="carousel-btn next" onclick="moveSlide(1)"><i class="fa-solid fa-chevron-right"></i></button>
            `;
        }

        carouselContainer.innerHTML = slidesHtml;
    } else {
        carouselContainer.innerHTML = `
            <div class="carousel-slide active flex flex-col items-center justify-center p-8 bg-dark rounded-lg text-center border border-gray-800 w-full h-full">
                <i class="fa-solid fa-image text-4xl text-gray-600 mb-3"></i>
                <p class="text-gray-400 text-sm">Nenhuma imagem cadastrada para este exercício.</p>
            </div>
        `;
    }

    currentSlide = 0;
    document.getElementById('mediaModal').classList.remove('hidden');
    document.getElementById('mediaModal').classList.add('flex');
}

window.moveSlide = function(direction) {
    const slides = document.querySelectorAll('#mediaModal .carousel-slide');
    if (slides.length <= 1) return;

    slides[currentSlide].classList.remove('active');
    
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    if (currentSlide >= slides.length) currentSlide = 0;

    slides[currentSlide].classList.add('active');
}

window.closeModals = function() {
    document.getElementById('formModal').classList.replace('flex', 'hidden');
    document.getElementById('mediaModal').classList.replace('flex', 'hidden');
}

// Salvar treino do dia no Histórico (respeitando checkboxes)
window.finishTodayWorkout = async function() {
    const exercisesToday = workoutData[currentDay];
    
    if (!exercisesToday || exercisesToday.length === 0) {
        return alert("Não há exercícios neste dia para concluir!");
    }

    const d = new Date();
    const currentJsDay = d.getDay() === 0 ? 6 : d.getDay() - 1; 
    const targetJsDay = daysOfWeek.indexOf(currentDay);
    
    const diff = targetJsDay - currentJsDay;
    
    const workoutDate = new Date(d);
    workoutDate.setDate(d.getDate() + diff);

    const targetStr = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth()+1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
    const [y, m, day] = targetStr.split('-');
    const dataFormatada = `${day}/${m}/${y}`;

    if(!confirm(`Deseja registrar este treino para o dia ${dataFormatada} (${currentDay})?`)) {
        return;
    }
    
    document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin text-green-500 mr-1"></i> Registrando histórico...';

    try {
        const exercisesSnapshot = exercisesToday.map(ex => {
            const checkbox = document.getElementById(`check-${ex.id}`);
            const isCompleted = checkbox ? checkbox.checked : true;
            return {
                ...ex,
                completed: isCompleted
            };
        });

        const snap = await getDoc(historyRef);
        let historyData = snap.exists() ? snap.data() : {};

        historyData[targetStr] = {
            dayName: currentDay,
            exercises: exercisesSnapshot 
        };

        await setDoc(historyRef, historyData);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-check text-green-500 mr-1"></i> Treino salvo!';
        
        alert(`Parabéns! O treino de ${currentDay} foi registrado no dia ${dataFormatada}!`);
    } catch (error) {
        console.error("Erro ao salvar histórico:", error);
        alert("Erro ao registrar treino no histórico.");
    }
}

// Inicializa
onAuthStateChanged(auth, async (user) => {
    if (user) { loadFromFirebase(); } 
    else { await signInAnonymously(auth); }
});