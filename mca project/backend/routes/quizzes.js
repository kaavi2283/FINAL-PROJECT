const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

function formatQuiz(quizRow, questionRows, optionRows, removeCorrect = true) {
  const quiz = {
    id: quizRow.id,
    title: quizRow.title,
    description: quizRow.description,
    time_limit: quizRow.time_limit,
    difficulty: quizRow.difficulty || 'easy',
    created_at: quizRow.created_at,
    questions: []
  };

  const optionsByQuestion = {};
  for (let i = 0; i < optionRows.length; i++) {
    const opt = optionRows[i];
    if (!optionsByQuestion[opt.question_id]) {
      optionsByQuestion[opt.question_id] = [];
    }
    const optObj = {
      id: opt.id,
      text: opt.text
    };
    if (!removeCorrect) {
      optObj.is_correct = opt.is_correct === 1 || opt.is_correct === true;
    }
    optionsByQuestion[opt.question_id].push(optObj);
  }

  for (let i = 0; i < questionRows.length; i++) {
    const q = questionRows[i];
    quiz.questions.push({
      id: q.id,
      text: q.text,
      type: q.type,
      points: q.points,
      options: optionsByQuestion[q.id] || []
    });
  }

  return quiz;
}

router.get('/', async (req, res) => {
  try {
    const quizzes = await db.query('SELECT * FROM quizzes ORDER BY created_at DESC');
    res.json(quizzes);
  } catch (err) {
    console.error('get quizzes error:', err);
    res.status(500).json({ error: 'Failed to retrieve quizzes' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const showAnswers = req.user.role === 'admin';

  try {
    const quizzes = await db.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (quizzes.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = await db.query('SELECT * FROM questions WHERE quiz_id = ?', [quizId]);
    
    let options = [];
    if (questions.length > 0) {
      options = await db.query('SELECT * FROM options WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', [quizId]);
    }

    const formattedQuiz = formatQuiz(quizzes[0], questions, options, !showAnswers);
    res.json(formattedQuiz);
  } catch (err) {
    console.error('get quiz error:', err);
    res.status(500).json({ error: 'Failed to retrieve quiz details' });
  }
});

router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, time_limit, difficulty, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Quiz title and at least one question are required' });
  }

  try {
    const quizResult = await db.query(
      'INSERT INTO quizzes (title, description, time_limit, difficulty) VALUES (?, ?, ?, ?)',
      [title, description || '', time_limit || 600, difficulty || 'easy']
    );
    const quizId = quizResult.insertId;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text || !q.type || !q.options || !Array.isArray(q.options)) {
        continue;
      }
      
      const qResult = await db.query(
        'INSERT INTO questions (quiz_id, text, type, points) VALUES (?, ?, ?, ?)',
        [quizId, q.text, q.type, q.points || 1]
      );
      const questionId = qResult.insertId;

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        if (!opt.text) continue;
        await db.query(
          'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
          [questionId, opt.text, opt.is_correct ? 1 : 0]
        );
      }
    }

    res.status(201).json({ message: 'Quiz created successfully', quizId });
  } catch (err) {
    console.error('create quiz error:', err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const quizId = req.params.id;
  const { title, description, time_limit, difficulty, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Quiz title and at least one question are required' });
  }

  try {
    const quizzes = await db.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (quizzes.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    await db.query(
      'UPDATE quizzes SET title = ?, description = ?, time_limit = ?, difficulty = ? WHERE id = ?',
      [title, description || '', time_limit || 600, difficulty || 'easy', quizId]
    );

    const existingQuestions = await db.query('SELECT id FROM questions WHERE quiz_id = ?', [quizId]);
    const existingQuestionIds = existingQuestions.map(q => q.id);
    const incomingQuestionIds = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text || !q.type || !q.options || !Array.isArray(q.options)) {
        continue;
      }

      let questionId;
      const isExistingQuestion = q.id && existingQuestionIds.includes(Number(q.id));

      if (isExistingQuestion) {
        questionId = Number(q.id);
        incomingQuestionIds.push(questionId);
        await db.query(
          'UPDATE questions SET text = ?, type = ?, points = ? WHERE id = ? AND quiz_id = ?',
          [q.text, q.type, q.points || 1, questionId, quizId]
        );
      } else {
        const qResult = await db.query(
          'INSERT INTO questions (quiz_id, text, type, points) VALUES (?, ?, ?, ?)',
          [quizId, q.text, q.type, q.points || 1]
        );
        questionId = qResult.insertId;
      }

      const existingOptions = isExistingQuestion
        ? await db.query('SELECT id FROM options WHERE question_id = ?', [questionId])
        : [];
      const existingOptionIds = existingOptions.map(opt => opt.id);
      const incomingOptionIds = [];

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        if (!opt.text) continue;

        const isExistingOption = opt.id && existingOptionIds.includes(Number(opt.id));

        if (isExistingOption) {
          const optionId = Number(opt.id);
          incomingOptionIds.push(optionId);
          await db.query(
            'UPDATE options SET text = ?, is_correct = ? WHERE id = ? AND question_id = ?',
            [opt.text, opt.is_correct ? 1 : 0, optionId, questionId]
          );
        } else {
          await db.query(
            'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)',
            [questionId, opt.text, opt.is_correct ? 1 : 0]
          );
        }
      }

      for (const existingOptId of existingOptionIds) {
        if (!incomingOptionIds.includes(existingOptId)) {
          await db.query('DELETE FROM options WHERE id = ? AND question_id = ?', [existingOptId, questionId]);
        }
      }
    }

    for (const existingQId of existingQuestionIds) {
      if (!incomingQuestionIds.includes(existingQId)) {
        await db.query('DELETE FROM questions WHERE id = ? AND quiz_id = ?', [existingQId, quizId]);
      }
    }

    res.json({ message: 'Quiz updated successfully' });
  } catch (err) {
    console.error('update quiz error:', err);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const quizId = req.params.id;

  try {
    const result = await db.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('delete quiz error:', err);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

router.post('/:id/attempt', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.id;

  try {
    const quizzes = await db.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (quizzes.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const result = await db.query(
      'INSERT INTO attempts (user_id, quiz_id, score, started_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP)',
      [userId, quizId]
    );

    res.json({
      message: 'Quiz attempt started',
      attemptId: result.insertId,
      timeLimit: quizzes[0].time_limit
    });
  } catch (err) {
    console.error('start quiz error:', err);
    res.status(500).json({ error: 'Failed to start quiz attempt' });
  }
});

router.post('/:id/submit', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.id;
  const { attemptId, userAnswers } = req.body; 

  if (!attemptId || !Array.isArray(userAnswers)) {
    return res.status(400).json({ error: 'Attempt ID and answers list are required' });
  }

  try {
    const attempts = await db.query(
      'SELECT * FROM attempts WHERE id = ? AND user_id = ? AND quiz_id = ?',
      [attemptId, userId, quizId]
    );
    if (attempts.length === 0) {
      return res.status(404).json({ error: 'Quiz attempt not found' });
    }

    const attempt = attempts[0];
    if (attempt.completed_at) {
      return res.status(400).json({ error: 'This attempt is already submitted' });
    }

    const quizzes = await db.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    const questions = await db.query('SELECT * FROM questions WHERE quiz_id = ?', [quizId]);
    
    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions in this quiz' });
    }

    const options = await db.query('SELECT * FROM options WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', [quizId]);

    const optionMap = {};
    for (let i = 0; i < options.length; i++) {
      optionMap[options[i].id] = options[i];
    }

    let totalScore = 0;
    const submissionMap = {};
    for (let i = 0; i < userAnswers.length; i++) {
      submissionMap[userAnswers[i].questionId] = userAnswers[i].optionId;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const selectedOptionId = submissionMap[q.id] || null;
      let isCorrect = false;

      if (selectedOptionId) {
        const option = optionMap[selectedOptionId];
        if (option && option.question_id === q.id && (option.is_correct === 1 || option.is_correct === true)) {
          isCorrect = true;
          totalScore += q.points;
        }
      }

      await db.query(
        'INSERT INTO answers (attempt_id, question_id, option_id, is_correct) VALUES (?, ?, ?, ?)',
        [attemptId, q.id, selectedOptionId, isCorrect ? 1 : 0]
      );
    }

    await db.query(
      'UPDATE attempts SET score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [totalScore, attemptId]
    );

    res.json({
      message: 'Quiz submitted successfully',
      score: totalScore,
      totalQuestions: questions.length,
      maxPossibleScore: questions.reduce((sum, q) => sum + q.points, 0)
    });
  } catch (err) {
    console.error('submit quiz error:', err);
    res.status(500).json({ error: 'Failed to submit quiz assessment' });
  }
});

module.exports = router;
