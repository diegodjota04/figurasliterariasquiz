/**
 * @class QuizEngine
 * @description Módulo de gestión del estado y reglas de juego para la herramienta de análisis lírico.
 * Maneja el sistema de puntuación, contador de rachas, multiplicadores dinámicos,
 * alias del estudiante, versión seleccionada y evaluación de respuestas.
 */
export class QuizEngine {
  /**
   * @param {Array<Object>} rawQuestions - Arreglo con los ejercicios en formato JSON.
   * @param {string} alias - Alias o nombre del estudiante.
   * @param {string} versionKey - Identificador de la versión (version_a, version_b, version_c).
   */
  constructor(rawQuestions = [], alias = 'Estudiante', versionKey = 'version_a') {
    this.alias = alias.trim() || 'Estudiante';
    this.versionKey = versionKey;

    // Clonamos las preguntas para evitar mutar el origen de datos
    this.allQuestions = JSON.parse(JSON.stringify(rawQuestions));

    // Separación de bancos de preguntas normales y de bonificación
    this.normalPool = this.allQuestions.filter(q => !q.es_bono);
    this.bonusPool = this.allQuestions.filter(q => q.es_bono);

    // Registro de IDs de preguntas ya respondidas
    this.usedIds = new Set();

    // Estado interno del juego
    this.score = 0;
    this.streak = 0;
    this.multiplier = 1.0;
    this.currentQuestion = null;
    this.history = [];
    this.totalAnswered = 0;
    this.correctAnswersCount = 0;

    // Cargar la primera pregunta
    this.nextQuestion();
  }

  /**
   * Calcula el multiplicador de puntos en función del contador de racha.
   * Reglas:
   * - Racha < 3  => 1.0x
   * - Racha 3 a 4 => 1.5x
   * - Racha >= 5 => 2.0x
   * @returns {number} Multiplicador de puntos actual.
   */
  calculateMultiplier() {
    if (this.streak >= 5) {
      return 2.0;
    } else if (this.streak >= 3) {
      return 1.5;
    }
    return 1.0;
  }

  /**
   * Selecciona y devuelve la siguiente pregunta según las reglas del juego:
   * - Si el estudiante mantiene una racha >= 3 y existen preguntas bono disponibles, inyecta una pregunta bono.
   * - De lo contrario, toma de las preguntas normales no utilizadas.
   * @returns {Object|null} Objeto con la pregunta activa o null si se han terminado las preguntas.
   */
  nextQuestion() {
    let candidate = null;

    // Inyección de Bono si cumple la condición de racha y quedan bonos sin usar
    const availableBonus = this.bonusPool.filter(q => !this.usedIds.has(q.id));
    if (this.streak >= 3 && availableBonus.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableBonus.length);
      candidate = availableBonus[randomIndex];
    } else {
      const availableNormal = this.normalPool.filter(q => !this.usedIds.has(q.id));
      if (availableNormal.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNormal.length);
        candidate = availableNormal[randomIndex];
      } else if (availableBonus.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableBonus.length);
        candidate = availableBonus[randomIndex];
      }
    }

    if (candidate) {
      this.usedIds.add(candidate.id);
      this.currentQuestion = candidate;
    } else {
      this.currentQuestion = null;
    }

    return this.currentQuestion;
  }

  /**
   * Evalúa la opción seleccionada por el estudiante y actualiza el estado del juego.
   * @param {string} selectedOption - Texto exacto de la opción elegida por el usuario.
   * @returns {Object} Resultado de la evaluación con estado, puntos, racha, multiplicador y feedback.
   */
  evaluateAnswer(selectedOption) {
    if (!this.currentQuestion) {
      throw new Error("No hay una pregunta activa para evaluar.");
    }

    const isCorrect = selectedOption === this.currentQuestion.respuesta_correcta;
    const isBonusQuestion = Boolean(this.currentQuestion.es_bono);

    let pointsEarned = 0;
    let bonusExtraPoints = 0;

    if (isCorrect) {
      this.streak += 1;
      this.correctAnswersCount += 1;
      this.multiplier = this.calculateMultiplier();

      const BASE_POINTS = 100;
      pointsEarned = Math.round(BASE_POINTS * this.multiplier);

      if (isBonusQuestion) {
        bonusExtraPoints = 300;
      }

      this.score += pointsEarned + bonusExtraPoints;
    } else {
      // Reinicio de racha y multiplicador en caso de fallo
      this.streak = 0;
      this.multiplier = 1.0;
    }

    this.totalAnswered += 1;

    const result = {
      isCorrect,
      selectedOption,
      respuestaCorrecta: this.currentQuestion.respuesta_correcta,
      pointsEarned: isCorrect ? (pointsEarned + bonusExtraPoints) : 0,
      basePointsEarned: isCorrect ? pointsEarned : 0,
      bonusExtraPoints,
      totalScore: this.score,
      streak: this.streak,
      multiplier: this.multiplier,
      isBonusQuestion,
      feedback: isCorrect 
        ? this.currentQuestion.feedback_correcto 
        : this.currentQuestion.feedback_incorrecto,
      poemaFragmento: this.currentQuestion.poema_fragmento
    };

    this.history.push(result);
    return result;
  }

  /**
   * Obtiene el estado del HUD (Score, Racha, Multiplicador, Progreso, Alias).
   * @returns {Object} Datos para actualizar la interfaz.
   */
  getHUDState() {
    return {
      alias: this.alias,
      versionKey: this.versionKey,
      score: this.score,
      streak: this.streak,
      multiplier: this.multiplier,
      totalAnswered: this.totalAnswered,
      totalQuestions: this.allQuestions.length,
      currentQuestionIndex: Math.min(this.totalAnswered + 1, this.allQuestions.length),
      isFinished: this.currentQuestion === null
    };
  }

  /**
   * Reinicia completamente el juego a su estado inicial.
   */
  resetGame() {
    this.usedIds.clear();
    this.score = 0;
    this.streak = 0;
    this.multiplier = 1.0;
    this.history = [];
    this.totalAnswered = 0;
    this.correctAnswersCount = 0;
    this.nextQuestion();
  }
}
