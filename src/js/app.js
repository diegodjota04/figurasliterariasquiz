import { QuizEngine } from './QuizEngine.js';

/**
 * ❄️ Módulo de Interfaz y Control de Pantallas True Winter
 * Controla la transición entre 'pantalla-inicio' y 'pantalla-juego', la captura de Alias,
 * la selección visual de Misión A/B/C (con borde fucsia brillante) y el flujo del quiz.
 */
document.addEventListener('DOMContentLoaded', () => {

  let quizEngine = null;
  let selectedMissionKey = 'version_a'; // Por defecto Misión A

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playSoundEffect(type) {
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    if (type === 'hover') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'correct') {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.12);
      });
    } else if (type === 'incorrect') {
      [280, 220].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.14);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.14);
      });
    }
  }

  // Registro de Elementos DOM
  const elements = {
    pantallaInicio: document.getElementById('pantallaInicio'),
    pantallaJuego: document.getElementById('pantallaJuego'),
    summaryScreen: document.getElementById('summaryScreen'),

    startForm: document.getElementById('startForm'),
    userAliasInput: document.getElementById('userAliasInput'),
    missionButtons: document.querySelectorAll('.mission-btn'),
    btnStartGame: document.getElementById('btnStartGame'),

    userGreetingTag: document.getElementById('userGreetingTag'),
    livesCount: document.getElementById('livesCount'),
    scoreValue: document.getElementById('scoreValue'),
    streakCount: document.getElementById('streakCount'),
    multiplierPill: document.getElementById('multiplierPill'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressText: document.getElementById('progressText'),

    categoryBadge: document.getElementById('categoryBadge'),
    bonusTag: document.getElementById('bonusTag'),
    enunciadoText: document.getElementById('enunciadoText'),
    poemText: document.getElementById('poemText'),
    optionsGrid: document.getElementById('optionsGrid'),

    feedbackModal: document.getElementById('feedbackModal'),
    modalCard: document.getElementById('modalCard'),
    statusIcon: document.getElementById('statusIcon'),
    modalTitle: document.getElementById('modalTitle'),
    pointsBanner: document.getElementById('pointsBanner'),
    pointsEarnedVal: document.getElementById('pointsEarnedVal'),
    bonusEarnedText: document.getElementById('bonusEarnedText'),
    feedbackText: document.getElementById('feedbackText'),
    correctAnswerReveal: document.getElementById('correctAnswerReveal'),
    correctAnswerText: document.getElementById('correctAnswerText'),
    btnNextQuestion: document.getElementById('btnNextQuestion'),

    summaryTitleHeading: document.getElementById('summaryTitleHeading'),
    summarySubtext: document.getElementById('summarySubtext'),
    finalScore: document.getElementById('finalScore'),
    finalStreak: document.getElementById('finalStreak'),
    finalAccuracy: document.getElementById('finalAccuracy'),
    btnRestart: document.getElementById('btnRestart'),
    btnChangeVersion: document.getElementById('btnChangeVersion')
  };

  /**
   * Manejador de Selección Visual de Misiones (Misión A, Misión B, Misión C)
   */
  elements.missionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playSoundEffect('hover');
      elements.missionButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMissionKey = btn.getAttribute('data-mission') || 'version_a';
    });
  });

  /**
   * Transición de Pantallas ('inicio' | 'juego' | 'resumen')
   */
  function showScreen(screen) {
    elements.pantallaInicio?.classList.add('hidden');
    elements.pantallaJuego?.classList.add('hidden');
    elements.summaryScreen?.classList.add('hidden');
    elements.feedbackModal?.classList.add('hidden');

    if (screen === 'inicio') {
      elements.pantallaInicio?.classList.remove('hidden');
    } else if (screen === 'juego') {
      elements.pantallaJuego?.classList.remove('hidden');
    } else if (screen === 'resumen') {
      elements.summaryScreen?.classList.remove('hidden');
    }
  }

  /**
   * Inicializa la sesión usando Fetch para cargar los datos
   */
  function handleStartGame() {
    const alias = elements.userAliasInput?.value.trim() || 'Estudiante';

    if (elements.btnStartGame) {
      elements.btnStartGame.textContent = 'CARGANDO...';
      elements.btnStartGame.disabled = true;
    }

    fetch('.src/data/versions.json')
      .then(respuesta => {
        if (!respuesta.ok) {
          throw new Error('No se pudo acceder al archivo JSON.');
        }
        return respuesta.json();
      })
      .then(versionsData => {
        if (elements.btnStartGame) {
          elements.btnStartGame.textContent = 'COMENZAR JUEGO';
          elements.btnStartGame.disabled = false;
        }

        const rawQuestions = versionsData[selectedMissionKey] || versionsData['version_a'];
        quizEngine = new QuizEngine(rawQuestions, alias, selectedMissionKey);

        if (elements.userGreetingTag) {
          elements.userGreetingTag.textContent = `👤 ${quizEngine.alias}`;
        }

        showScreen('juego');
        renderCurrentQuestion();
      })
      .catch(error => {
        console.error("Error al cargar los datos:", error);
        alert("Hubo un problema al cargar los ejercicios. Asegúrate de que el archivo JSON esté publicado correctamente.");

        if (elements.btnStartGame) {
          elements.btnStartGame.textContent = 'COMENZAR JUEGO';
          elements.btnStartGame.disabled = false;
        }
      });
  }

  /**
   * Actualiza el Banner HUD Superior Azul Real.
   */
  function updateHUD() {
    if (!quizEngine) return;
    const hud = quizEngine.getHUDState();

    if (elements.scoreValue) elements.scoreValue.textContent = hud.score.toLocaleString();
    if (elements.streakCount) elements.streakCount.textContent = hud.streak;
    if (elements.multiplierPill) elements.multiplierPill.textContent = `${hud.multiplier.toFixed(1)}x`;

    const percentage = (hud.totalAnswered / hud.totalQuestions) * 100;
    if (elements.progressBarFill) elements.progressBarFill.style.width = `${percentage}%`;
    if (elements.progressText) elements.progressText.textContent = `Poema ${hud.currentQuestionIndex} de ${hud.totalQuestions}`;
  }

  /**
   * Función para desordenar un arreglo aleatoriamente (Fisher-Yates)
   */
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Renderiza el ejercicio activo en la tarjeta minimalista blanca.
   */
  function renderCurrentQuestion() {
    const currentQ = quizEngine.currentQuestion;

    if (!currentQ) {
      showSummaryScreen();
      return;
    }

    elements.feedbackModal?.classList.add('hidden');

    if (elements.categoryBadge) {
      elements.categoryBadge.textContent = currentQ.categoria_evaluada === 'significado'
        ? 'FIGURA DE SIGNIFICADO'
        : 'FIGURA DE CONSTRUCCIÓN';
    }

    if (elements.enunciadoText) {
      elements.enunciadoText.textContent = currentQ.enunciado
        || 'Identifica la figura literaria presente en el fragmento destacado:';
    }

    if (elements.bonusTag) {
      if (currentQ.es_bono) {
        elements.bonusTag.classList.remove('hidden');
      } else {
        elements.bonusTag.classList.add('hidden');
      }
    }

    if (elements.poemText) {
      elements.poemText.innerHTML = currentQ.poema_fragmento;
    }

    if (elements.optionsGrid) {
      elements.optionsGrid.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];

      // Aplicamos la mezcla aleatoria a las opciones
      const opcionesDesordenadas = shuffleArray(currentQ.opciones);

      opcionesDesordenadas.forEach((opcionText, index) => {
        const button = document.createElement('button');
        button.className = 'option-pill-btn';
        button.type = 'button';

        button.innerHTML = `
          <span class="pill-letter-badge">${letters[index]}</span>
          <span class="pill-text-content">${opcionText}</span>
        `;

        button.addEventListener('mouseenter', () => playSoundEffect('hover'));
        button.addEventListener('click', () => handleOptionSelect(opcionText, button));
        elements.optionsGrid.appendChild(button);
      });
    }

    updateHUD();
  }

  /**
   * Manejo de selección con transición temporal a Verde Esmeralda o Rojo Carmesí.
   */
  function handleOptionSelect(selectedOption, targetBtn) {
    if (!elements.optionsGrid) return;
    const allBtns = elements.optionsGrid.querySelectorAll('.option-pill-btn');
    allBtns.forEach(btn => btn.style.pointerEvents = 'none');

    const result = quizEngine.evaluateAnswer(selectedOption);

    if (result.isCorrect) {
      targetBtn.classList.add('btn-correct');
      playSoundEffect('correct');
    } else {
      targetBtn.classList.add('btn-incorrect');
      playSoundEffect('incorrect');
    }

    updateHUD();

    setTimeout(() => {
      showFeedbackModal(result);
    }, 350);
  }

  /**
   * Despliega el modal de feedback pedagógico.
   */
  function showFeedbackModal(result) {
    if (!elements.modalCard) return;
    elements.modalCard.className = 'modal-dialog-winter';

    if (result.isCorrect) {
      elements.modalCard.classList.add('correct');
      if (elements.statusIcon) elements.statusIcon.textContent = '✨';
      if (elements.modalTitle) {
        elements.modalTitle.textContent = result.isBonusQuestion
          ? '¡Pregunta Bono Ganada!'
          : '¡Excelente!';
      }

      elements.pointsBanner?.classList.remove('hidden');
      if (elements.pointsEarnedVal) elements.pointsEarnedVal.textContent = result.pointsEarned;

      if (result.bonusExtraPoints > 0) {
        elements.bonusEarnedText?.classList.remove('hidden');
      } else {
        elements.bonusEarnedText?.classList.add('hidden');
      }

      elements.correctAnswerReveal?.classList.add('hidden');
    } else {
      elements.modalCard.classList.add('incorrect');
      if (elements.statusIcon) elements.statusIcon.textContent = '❄️';
      if (elements.modalTitle) elements.modalTitle.textContent = 'Respuesta Incorrecta';

      elements.pointsBanner?.classList.add('hidden');
      elements.correctAnswerReveal?.classList.remove('hidden');
      if (elements.correctAnswerText) elements.correctAnswerText.textContent = result.respuestaCorrecta;
    }

    if (elements.feedbackText) elements.feedbackText.textContent = result.feedback;
    elements.feedbackModal?.classList.remove('hidden');
  }

  function handleNextQuestion() {
    playSoundEffect('hover');
    const nextQ = quizEngine.nextQuestion();
    if (nextQ) {
      renderCurrentQuestion();
    } else {
      showSummaryScreen();
    }
  }

  function showSummaryScreen() {
    playSoundEffect('correct');
    const hud = quizEngine.getHUDState();

    const missionNames = {
      version_a: 'Misión A',
      version_b: 'Misión B',
      version_c: 'Misión C'
    };

    if (elements.summaryTitleHeading) {
      elements.summaryTitleHeading.textContent = `¡Misión Completada, ${hud.alias}!`;
    }
    if (elements.summarySubtext) {
      elements.summarySubtext.textContent = `Has finalizado con éxito todos los ejercicios de la ${missionNames[hud.versionKey] || 'misión'}.`;
    }

    if (elements.finalScore) elements.finalScore.textContent = hud.score.toLocaleString();

    const maxStreak = quizEngine.history.reduce((max, curr) => Math.max(max, curr.streak), 0);
    if (elements.finalStreak) elements.finalStreak.textContent = maxStreak;

    const accuracy = quizEngine.totalAnswered > 0
      ? Math.round((quizEngine.correctAnswersCount / quizEngine.totalAnswered) * 100)
      : 0;
    if (elements.finalAccuracy) elements.finalAccuracy.textContent = `${accuracy}%`;

    showScreen('resumen');
  }

  function restartGame() {
    playSoundEffect('hover');
    if (quizEngine) {
      quizEngine.resetGame();
      showScreen('juego');
      renderCurrentQuestion();
    }
  }

  function returnToStartScreen() {
    playSoundEffect('hover');
    showScreen('inicio');
  }

  // Event Listeners
  elements.startForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleStartGame();
  });

  elements.btnNextQuestion?.addEventListener('click', handleNextQuestion);
  elements.btnRestart?.addEventListener('click', restartGame);
  elements.btnChangeVersion?.addEventListener('click', returnToStartScreen);

  // Iniciar en pantalla-inicio
  showScreen('inicio');
});