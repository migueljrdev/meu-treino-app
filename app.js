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

// ESTRUTURA GLOBAL (0: Treino A, 1: Treino B, 2: Treino C)
let masterWorkouts = {
    "0": [],
    "1": [],
    "2": []
};

// dayAssignments: Guarda o treino (0, 1, 2) ou 'rest' para cada dia
let dayAssignments = {
    "Segunda-feira": 0,
    "Terça-feira": 1,
    "Quarta-feira": 'rest',
    "Quinta-feira": 2,
    "Sexta-feira": 0,
    "Sábado": 'rest',
    "Domingo": 'rest'
};

let archivedData = {};
let exceptionMode = false;
let exceptionSourceDay = '';
let exceptionExercises = [];

const docRef = doc(db, "treinos", "meu_treino_principal");
const historyRef = doc(db, "treinos", "meu_historico_principal");
const archiveRef = doc(db, "treinos", "meu_arquivados_principal");

async function loadFromFirebase() {
    try {
        const [docSnap, archSnap] = await Promise.all([
            getDoc(docRef),
            getDoc(archiveRef)
        ]);

        if (archSnap.exists()) {
            archivedData = archSnap.data();
        }

        if (docSnap.exists()) {
            const rawData = docSnap.data();
            
            if (rawData.masterWorkouts && rawData.dayAssignments) {
                masterWorkouts = rawData.masterWorkouts;
                dayAssignments = rawData.dayAssignments;
            } else {
                masterWorkouts = { "0": [], "1": [], "2": [] };
                daysOfWeek.forEach(day => { dayAssignments[day] = 0; });

                if (rawData["Segunda-feira"]) {
                    const seg = rawData["Segunda-feira"];
                    if (seg.variants) {
                        const v = seg.variants;
                        masterWorkouts["0"] = v["0"] || v[0] || [];
                        masterWorkouts["1"] = v["1"] || v[1] || [];
                        masterWorkouts["2"] = v["2"] || v[2] || [];
                    } else if (Array.isArray(seg)) {
                        masterWorkouts["0"] = seg;
                    }
                }
            }
        } else {
            masterWorkouts = { "0": [], "1": [], "2": [] };
            daysOfWeek.forEach(day => { dayAssignments[day] = 0; });
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
        const dataToSave = {
            masterWorkouts,
            dayAssignments
        };
        await setDoc(docRef, dataToSave);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Salvo na nuvem';
    } catch (error) {
        console.error("Erro ao salvar:", error);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500 mr-1"></i> Erro ao salvar';
    }
}

function getCurrentExercisesRef() {
    const activeVar = dayAssignments[currentDay];
    if (activeVar === 'rest' || activeVar === undefined) {
        return [];
    }
    if (!masterWorkouts[activeVar]) {
        masterWorkouts[activeVar] = [];
    }
    return masterWorkouts[activeVar];
}

window.renderDays = function() {
    const container = document.getElementById('daysContainer');
    if (!container) return;
    container.innerHTML = '';
    daysOfWeek.forEach(day => {
        const btn = document.createElement('button');
        const assignment = dayAssignments[day] !== undefined ? dayAssignments[day] : 0;
        
        let labelTag = '';
        if (assignment === 'rest') {
            labelTag = `<span class="text-[10px] md:text-xs opacity-70 bg-black/20 px-1.5 py-0.5 rounded text-blue-300">Off</span>`;
        } else {
            const letter = ['A', 'B', 'C'][assignment];
            labelTag = `<span class="text-[10px] md:text-xs opacity-80 bg-black/20 px-1.5 py-0.5 rounded">(${letter})</span>`;
        }

        // Classes adaptadas: largura total nas colunas do desktop e ajuste de texto para não esmagar
        btn.className = `whitespace-nowrap px-3 md:px-1 py-2 rounded-full text-xs md:text-xs font-medium transition-colors flex items-center justify-center gap-1 md:gap-0.5 md:w-full ${day === currentDay ? 'bg-brand text-white' : 'bg-card text-gray-400 hover:text-white border border-gray-800'}`;
        btn.innerHTML = `${day.split('-')[0]} ${labelTag}`;
        
        btn.onclick = () => { 
            if(exceptionMode) {
                if(!confirm("Você está em Modo Exceção. Deseja cancelar a exceção atual e trocar de dia?")) return;
                window.cancelExceptionMode();
            }
            currentDay = day; 
            window.renderDays(); 
            window.renderExercises(); 
        };
        container.appendChild(btn);
    });
}

// Alterna qual treino global (A, B, C ou 'rest') o dia atual vai executar
window.switchVariant = function(varIndex) {
    if (exceptionMode) {
        if(!confirm("Você está em Modo Exceção. Deseja cancelar a exceção atual e trocar de treino?")) return;
        window.cancelExceptionMode();
    }
    dayAssignments[currentDay] = varIndex;
    saveToFirebase();
    window.renderDays();
    window.renderExercises();
}

window.renderExercises = function() {
    const titleContainer = document.getElementById('currentDayTitle');
    if (!titleContainer) return;

    const bannerWrapper = document.getElementById('exceptionBannerWrapper');
    const btnFinishFixed = document.getElementById('btnFinishFixed');
    const btnException = document.getElementById('btnException');
    const variantSelector = document.getElementById('workoutVariantSelector');
    const strengthSection = document.getElementById('strengthSection');
    const cardioSection = document.getElementById('cardioSection');
    const emptyState = document.getElementById('emptyState');

    if (exceptionMode) {
        if (btnFinishFixed) btnFinishFixed.classList.add('hidden');
        if (btnException) btnException.classList.add('hidden');
        if (variantSelector) variantSelector.classList.add('hidden');
        if (bannerWrapper) bannerWrapper.classList.remove('hidden');

        titleContainer.innerHTML = `${currentDay} <span class="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded ml-2">Exceção (Copiado de ${exceptionSourceDay})</span>`;
    } else {
        if (btnException) btnException.classList.remove('hidden');
        if (bannerWrapper) bannerWrapper.classList.add('hidden');

        if (variantSelector) {
            variantSelector.classList.remove('hidden');
            variantSelector.classList.add('flex');
            const activeVar = dayAssignments[currentDay];
            
            // Atualiza classes dos botões A, B, C, Rest
            ['0', '1', '2'].forEach(i => {
                const btnEl = document.getElementById(`varBtn${i}`);
                if(btnEl) {
                    btnEl.className = `px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeVar === Number(i) ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'}`;
                }
            });
            const restBtn = document.getElementById('varBtnRest');
            if(restBtn) {
                restBtn.className = `px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeVar === 'rest' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`;
            }
        }

        const activeVar = dayAssignments[currentDay];
        if (activeVar === 'rest') {
            if (btnFinishFixed) btnFinishFixed.classList.add('hidden');
            titleContainer.innerHTML = `${currentDay} <span class="text-xs text-blue-400 font-bold ml-2"><i class="fa-solid fa-bed mr-1"></i>Dia de Descanso</span>`;
        } else {
            if (btnFinishFixed) btnFinishFixed.classList.remove('hidden');
            const letterName = ['A', 'B', 'C'][activeVar];
            titleContainer.innerHTML = `${currentDay} <span class="text-xs text-brand font-bold ml-2">(Executando Treino ${letterName})</span>`;
        }
    }
    
    // Se for dia de descanso e não estiver em modo exceção
    if (dayAssignments[currentDay] === 'rest' && !exceptionMode) {
        if(strengthSection) strengthSection.classList.add('hidden');
        if(cardioSection) cardioSection.classList.add('hidden');
        if(emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.innerHTML = `
                <div class="py-8">
                    <i class="fa-solid fa-mug-hot text-5xl text-blue-400/60 mb-3"></i>
                    <h4 class="text-white font-semibold text-lg">Dia de Recuperação</h4>
                    <p class="text-gray-400 text-sm mt-1 max-w-sm mx-auto">Aproveite para descansar e deixar seus músculos crescerem. Nenhum treino agendado para hoje.</p>
                </div>
            `;
        }
        return;
    } else {
        if(emptyState) {
            emptyState.innerHTML = `
                <i class="fa-solid fa-folder-open text-4xl text-gray-600 mb-3"></i>
                <p class="text-gray-400">Nenhum exercício para este dia.</p>
            `;
        }
    }
    
    const exercises = exceptionMode ? exceptionExercises : getCurrentExercisesRef();
    const list = document.getElementById('exerciseList');
    const cardioList = document.getElementById('cardioList');
    
    if (!list || !cardioList) return;

    list.innerHTML = '';
    cardioList.innerHTML = '';
    
    if (exercises.length === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        if(strengthSection) strengthSection.classList.add('hidden');
        if(cardioSection) cardioSection.classList.add('hidden');
        return;
    } 

    if(emptyState) emptyState.classList.add('hidden');
    
    const strengthEx = exercises.filter(e => !e.type || e.type === 'strength');
    const cardioEx = exercises.filter(e => e.type === 'cardio');

    if(strengthEx.length > 0) {
        if(strengthSection) strengthSection.classList.remove('hidden');
        strengthEx.forEach((ex, index) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-800 hover:bg-gray-800/30';
            
            const pesoExibicao = (ex.weight > 0) ? `${ex.weight}kg` : '<span class="text-[10px] uppercase text-gray-500">Corporal</span>';
            const isFirst = index === 0;
            const isLast = index === strengthEx.length - 1;

            tr.innerHTML = `
                <td class="py-4 text-white font-medium flex items-center gap-3">
                    <input type="checkbox" id="check-${ex.id}" checked class="w-5 h-5 accent-brand cursor-pointer shrink-0" title="Marcar como realizado">
                    ${ex.name}
                </td>
                <td class="py-4 text-gray-300 text-center">${ex.sets}</td>
                <td class="py-4 text-gray-300 text-center">${ex.reps}</td>
                <td class="py-4 text-brand font-bold text-center">${pesoExibicao}</td>
                <td class="py-4 text-right space-x-1 whitespace-nowrap">
                    <button onclick="moveExercise(${ex.id}, -1)" ${isFirst ? 'disabled' : ''} class="text-gray-500 ${isFirst ? 'opacity-20 cursor-not-allowed' : 'hover:text-white'} p-2" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>
                    <button onclick="moveExercise(${ex.id}, 1)" ${isLast ? 'disabled' : ''} class="text-gray-500 ${isLast ? 'opacity-20 cursor-not-allowed' : 'hover:text-white'} p-2" title="Descer"><i class="fa-solid fa-arrow-down"></i></button>
                    <button onclick="openMediaModal(${ex.id})" class="text-gray-500 hover:text-brand p-2 bg-gray-800/50 rounded" title="Ver execução"><i class="fa-solid fa-play"></i></button>
                    <button onclick="editExercise(${ex.id})" class="text-gray-500 hover:text-white p-2" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteExercise(${ex.id})" class="text-gray-500 hover:text-red-500 p-2" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } else {
        if(strengthSection) strengthSection.classList.add('hidden');
    }

    if(cardioEx.length > 0) {
        if(cardioSection) cardioSection.classList.remove('hidden');
        cardioEx.forEach((ex, index) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-dark border border-gray-800 p-4 rounded-lg';
            const isFirst = index === 0;
            const isLast = index === cardioEx.length - 1;

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
                <div class="text-right flex-shrink-0 flex gap-1 items-center">
                    <button onclick="moveExercise(${ex.id}, -1)" ${isFirst ? 'disabled' : ''} class="text-gray-500 ${isFirst ? 'opacity-20 cursor-not-allowed' : 'hover:text-white'} p-2" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>
                    <button onclick="moveExercise(${ex.id}, 1)" ${isLast ? 'disabled' : ''} class="text-gray-500 ${isLast ? 'opacity-20 cursor-not-allowed' : 'hover:text-white'} p-2" title="Descer"><i class="fa-solid fa-arrow-down"></i></button>
                    <button onclick="editExercise(${ex.id})" class="text-gray-500 hover:text-white p-2" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteExercise(${ex.id})" class="text-gray-500 hover:text-red-500 p-2" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            cardioList.appendChild(div);
        });
    } else {
        if(cardioSection) cardioSection.classList.add('hidden');
    }
}

window.moveExercise = function(id, direction) {
    const exercises = exceptionMode ? exceptionExercises : getCurrentExercisesRef();
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;

    const type = ex.type || 'strength';
    const sameTypeExs = exercises.filter(e => (e.type || 'strength') === type);
    const subIndex = sameTypeExs.findIndex(e => e.id === id);
    
    const targetSubIndex = subIndex + direction;
    if (targetSubIndex < 0 || targetSubIndex >= sameTypeExs.length) return;

    const targetEx = sameTypeExs[targetSubIndex];
    const mainIndex1 = exercises.findIndex(e => e.id === id);
    const mainIndex2 = exercises.findIndex(e => e.id === targetEx.id);

    exercises[mainIndex1] = targetEx;
    exercises[mainIndex2] = ex;

    if (!exceptionMode) saveToFirebase();
    window.renderExercises();
}

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
    if (dayAssignments[currentDay] === 'rest' && !exceptionMode) {
        return alert("Este dia está configurado como Descanso. Mude para o Treino A, B ou C para adicionar exercícios.");
    }
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
    const exercisesList = exceptionMode ? exceptionExercises : getCurrentExercisesRef();
    const ex = exercisesList.find(e => e.id === id);
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

    const currentExs = getCurrentExercisesRef();

    if(id) {
        exerciseObj.id = parseInt(id);
        if (exceptionMode) {
            const index = exceptionExercises.findIndex(e => e.id == id);
            if(index > -1) exceptionExercises[index] = exerciseObj;
        } else {
            const index = currentExs.findIndex(e => e.id == id);
            if(index > -1) currentExs[index] = exerciseObj;
        }
    } else {
        exerciseObj.id = Date.now();
        if (exceptionMode) {
            exceptionExercises.push(exerciseObj);
        } else {
            currentExs.push(exerciseObj);
        }
    }

    if (!exceptionMode) saveToFirebase();
    window.closeModals();
    window.renderExercises();
}

window.deleteExercise = function(id) {
    if(confirm('Tem certeza que deseja excluir?')) {
        if (exceptionMode) {
            exceptionExercises = exceptionExercises.filter(e => e.id !== id);
        } else {
            const activeVar = dayAssignments[currentDay];
            masterWorkouts[activeVar] = masterWorkouts[activeVar].filter(e => e.id !== id);
            saveToFirebase();
        }
        window.renderExercises();
    }
}

window.resetData = function() {
    if(confirm('Isso apagará seus treinos. Continuar?')) {
        masterWorkouts = { "0": [], "1": [], "2": [] };
        daysOfWeek.forEach(day => { dayAssignments[day] = 0; });
        saveToFirebase();
        window.renderDays();
        window.renderExercises();
    }
}

let currentSlide = 0;

window.openMediaModal = function(id) {
    const exercisesList = exceptionMode ? exceptionExercises : getCurrentExercisesRef();
    const ex = exercisesList.find(e => e.id === id);
    if (!ex) return;

    document.getElementById('mediaTitle').innerText = `Execução: ${ex.name}`;
    document.getElementById('youtubeBtn').href = `https://www.youtube.com/results?search_query=${encodeURIComponent('Como fazer ' + ex.name + ' corretamente')}`;

    const carouselContainer = document.querySelector('#mediaModal .carousel-container');
    const images = ex.image ? ex.image.split(',').map(i => i.trim()).filter(i => i.length > 0) : [];

    if (images.length > 0) {
        let slidesHtml = '';
        images.forEach((imgUrl, index) => {
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
    ['formModal', 'mediaModal', 'exceptionModal', 'archiveModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.replace('flex', 'hidden');
    });
}

// --- CONTROLE DE MODO EXCEÇÃO ---
window.openExceptionModal = function() {
    document.getElementById('copyFromDaySelect').value = 'Segunda-feira';
    document.getElementById('exceptionModal').classList.remove('hidden');
    document.getElementById('exceptionModal').classList.add('flex');
}

window.startExceptionMode = function() {
    const sourceDay = document.getElementById('copyFromDaySelect').value;
    const sourceVar = dayAssignments[sourceDay];
    
    if (sourceVar === 'rest') {
        return alert(`O dia ${sourceDay} é um dia de Descanso! Escolha um dia que possua treino.`);
    }

    const sourceExercises = masterWorkouts[sourceVar] || [];
    if (!sourceExercises || sourceExercises.length === 0) {
        return alert(`O treino de ${sourceDay} está vazio! Adicione exercícios a ele primeiro.`);
    }

    exceptionMode = true;
    exceptionSourceDay = sourceDay;
    exceptionExercises = JSON.parse(JSON.stringify(sourceExercises));

    closeModals();
    renderExercises();
}

window.cancelExceptionMode = function() {
    exceptionMode = false;
    exceptionExercises = [];
    exceptionSourceDay = '';
    renderExercises();
}

window.saveExceptionToHistory = async function() {
    if (exceptionExercises.length === 0) return alert("Não há exercícios para salvar!");

    const d = new Date();
    const currentJsDay = d.getDay() === 0 ? 6 : d.getDay() - 1; 
    const targetJsDay = daysOfWeek.indexOf(currentDay);
    const diff = targetJsDay - currentJsDay;
    
    const workoutDate = new Date(d);
    workoutDate.setDate(d.getDate() + diff);

    const targetStr = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth()+1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
    const [y, m, day] = targetStr.split('-');
    const dataFormatada = `${day}/${m}/${y}`;

    if (!confirm(`Confirma salvar este treino adaptado no histórico do dia ${dataFormatada}?`)) return;

    document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin text-purple-500 mr-1"></i> Salvando exceção...';

    try {
        const exercisesSnapshot = exceptionExercises.map(ex => {
            const checkbox = document.getElementById(`check-${ex.id}`);
            const isCompleted = checkbox ? checkbox.checked : true;
            return { ...ex, completed: isCompleted };
        });

        const snap = await getDoc(historyRef);
        let historyData = snap.exists() ? snap.data() : {};

        historyData[targetStr] = {
            dayName: currentDay,
            isException: true,
            copiedFrom: exceptionSourceDay,
            exercises: exercisesSnapshot 
        };

        await setDoc(historyRef, historyData);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Salvo na nuvem';
        alert(`Parabéns! Treino de exceção gravado com sucesso no dia ${dataFormatada}!`);
        
        exceptionMode = false;
        exceptionExercises = [];
        exceptionSourceDay = '';
        renderExercises();
    } catch (error) {
        console.error("Erro ao salvar exceção:", error);
        alert("Erro ao registrar treino de exceção.");
    }
}

window.finishTodayWorkout = async function() {
    const exercisesToday = getCurrentExercisesRef();
    if (!exercisesToday || exercisesToday.length === 0) return alert("Não há exercícios neste dia para concluir!");

    const d = new Date();
    const currentJsDay = d.getDay() === 0 ? 6 : d.getDay() - 1; 
    const targetJsDay = daysOfWeek.indexOf(currentDay);
    const diff = targetJsDay - currentJsDay;
    
    const workoutDate = new Date(d);
    workoutDate.setDate(d.getDate() + diff);

    const targetStr = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth()+1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
    const [y, m, day] = targetStr.split('-');
    const dataFormatada = `${day}/${m}/${y}`;

    if(!confirm(`Deseja registrar este treino para o dia ${dataFormatada} (${currentDay})?`)) return;
    
    document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin text-green-500 mr-1"></i> Registrando histórico...';

    try {
        const exercisesSnapshot = exercisesToday.map(ex => {
            const checkbox = document.getElementById(`check-${ex.id}`);
            const isCompleted = checkbox ? checkbox.checked : true;
            return { ...ex, completed: isCompleted };
        });

        const snap = await getDoc(historyRef);
        let historyData = snap.exists() ? snap.data() : {};

        historyData[targetStr] = {
            dayName: currentDay,
            exercises: exercisesSnapshot 
        };

        await setDoc(historyRef, historyData);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Salvo na nuvem';
        alert(`Parabéns! O treino de ${currentDay} foi registrado no dia ${dataFormatada}!`);
    } catch (error) {
        console.error("Erro ao salvar histórico:", error);
        alert("Erro ao registrar treino no histórico.");
    }
}

// --- SISTEMA DE ARQUIVAR / RESTAURAR TREINOS ---
window.openArchiveModal = function() {
    renderArchiveList();
    document.getElementById('archiveModal').classList.remove('hidden');
    document.getElementById('archiveModal').classList.add('flex');
}

function renderArchiveList() {
    const container = document.getElementById('archivedList');
    if (!container) return;
    container.innerHTML = '';

    const keys = Object.keys(archivedData);
    if (keys.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-sm text-center py-6">Nenhum treino arquivado ainda.</p>`;
        return;
    }

    keys.forEach(key => {
        const item = archivedData[key];
        const dateFormatted = item.savedAt ? new Date(item.savedAt).toLocaleDateString('pt-BR') : '';

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-dark p-3 rounded-lg border border-gray-800 hover:border-gray-700';

        div.innerHTML = `
            <div>
                <h5 class="text-white font-medium text-sm">${item.name}</h5>
                <p class="text-gray-500 text-xs mt-0.5">Arquivado em: ${dateFormatted}</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="restoreArchive('${key}')" class="bg-brand/20 hover:bg-brand text-brand hover:text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
                    <i class="fa-solid fa-download mr-1"></i> Restaurar
                </button>
                <button onclick="deleteArchive('${key}')" class="text-gray-500 hover:text-red-500 p-1.5 transition-colors" title="Excluir Cópia">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.saveCurrentToArchive = async function() {
    const input = document.getElementById('archiveNameInput');
    const archiveName = input.value.trim();
    if (!archiveName) return alert("Digite um nome para identificar esta cópia do treino.");

    document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin text-yellow-500 mr-1"></i> Arquivando...';

    try {
        const archiveKey = `archive_${Date.now()}`;
        const newArchiveItem = {
            name: archiveName,
            savedAt: new Date().toISOString(),
            data: {
                masterWorkouts: JSON.parse(JSON.stringify(masterWorkouts)),
                dayAssignments: JSON.parse(JSON.stringify(dayAssignments))
            }
        };

        const updatedArchives = { ...archivedData, [archiveKey]: newArchiveItem };
        await setDoc(archiveRef, updatedArchives);
        archivedData = updatedArchives;

        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-cloud text-green-500 mr-1"></i> Salvo na nuvem';
        input.value = '';
        renderArchiveList();
        alert(`O treino "${archiveName}" foi arquivado com sucesso!`);
    } catch (error) {
        console.error("Erro ao arquivar treino:", error);
        document.getElementById('statusText').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500 mr-1"></i> Erro ao salvar';
        alert("Erro ao arquivar: " + error.message);
    }
}

window.restoreArchive = async function(key) {
    const item = archivedData[key];
    if (!item) return;
    if (!confirm(`Deseja carregar a rotina "${item.name}" na tela principal? Isso substituirá sua rotina ativa atual.`)) return;

    if (item.data && item.data.masterWorkouts) {
        masterWorkouts = JSON.parse(JSON.stringify(item.data.masterWorkouts));
        dayAssignments = JSON.parse(JSON.stringify(item.data.dayAssignments));
    } else {
        masterWorkouts = { "0": [], "1": [], "2": [] };
        daysOfWeek.forEach(d => dayAssignments[d] = 0);
    }

    await saveToFirebase();
    window.renderDays();
    window.renderExercises();
    window.closeModals();
    alert(`Rotina "${item.name}" restaurada com sucesso!`);
}

window.deleteArchive = async function(key) {
    const item = archivedData[key];
    if (!item) return;
    if (!confirm(`Tem certeza que deseja apagar a cópia arquivada "${item.name}"?`)) return;

    try {
        const updatedArchives = { ...archivedData };
        delete updatedArchives[key];

        await setDoc(archiveRef, updatedArchives);
        archivedData = updatedArchives;
        renderArchiveList();
    } catch (error) {
        console.error("Erro ao excluir arquivo:", error);
        alert("Erro ao excluir: " + error.message);
    }
}

// Inicializa
onAuthStateChanged(auth, async (user) => {
    if (user) { loadFromFirebase(); } 
    else { signInAnonymously(auth); }
});