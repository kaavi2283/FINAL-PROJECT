const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const attempts = await db.query(
      `SELECT a.id, a.quiz_id, q.title as quiz_title, a.score, a.started_at, a.completed_at,
      (SELECT SUM(points) FROM questions WHERE quiz_id = q.id) as max_score
      FROM attempts a 
      JOIN quizzes q ON a.quiz_id = q.id 
      WHERE a.user_id = ? 
      ORDER BY a.started_at DESC`,
      [userId]
    );
    res.json(attempts);
  } catch (err) {
    console.error('history error:', err);
    res.status(500).json({ error: 'Failed to retrieve attempt history' });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const attempts = await db.query(
      `SELECT a.id, a.user_id, u.username, a.quiz_id, q.title as quiz_title, a.score, a.started_at, a.completed_at,
      (SELECT SUM(points) FROM questions WHERE quiz_id = q.id) as max_score
      FROM attempts a
      JOIN users u ON a.user_id = u.id
      JOIN quizzes q ON a.quiz_id = q.id
      ORDER BY a.started_at DESC`
    );
    res.json(attempts);
  } catch (err) {
    console.error('admin all error:', err);
    res.status(500).json({ error: 'Failed to retrieve all attempts' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const attemptId = req.params.id;
  const userId = req.user.id;
  const adminCheck = req.user.role === 'admin';

  try {
    const attempts = await db.query(
      `SELECT a.*, q.title as quiz_title, q.description as quiz_description
      FROM attempts a 
      JOIN quizzes q ON a.quiz_id = q.id 
      WHERE a.id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const attempt = attempts[0];
    if (attempt.user_id !== userId && !adminCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const questions = await db.query('SELECT * FROM questions WHERE quiz_id = ?', [attempt.quiz_id]);

    let options = [];
    let answers = [];

    if (questions.length > 0) {
      options = await db.query('SELECT * FROM options WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', [attempt.quiz_id]);
      answers = await db.query('SELECT * FROM answers WHERE attempt_id = ?', [attemptId]);
    }

    const answerMap = {};
    for (let i = 0; i < answers.length; i++) {
      const ans = answers[i];
      answerMap[ans.question_id] = {
        option_id: ans.option_id,
        is_correct: ans.is_correct === 1 || ans.is_correct === true
      };
    }

    const optionsByQuestion = {};
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!optionsByQuestion[opt.question_id]) {
        optionsByQuestion[opt.question_id] = [];
      }
      optionsByQuestion[opt.question_id].push({
        id: opt.id,
        text: opt.text,
        is_correct: opt.is_correct === 1 || opt.is_correct === true
      });
    }

    const reviewQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAnswer = answerMap[q.id] || { option_id: null, is_correct: false };
      reviewQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        options: optionsByQuestion[q.id] || [],
        user_answer: {
          selected_option_id: userAnswer.option_id,
          is_correct: userAnswer.is_correct
        }
      });
    }

    let maxScore = 0;
    for (let i = 0; i < questions.length; i++) {
      maxScore += questions[i].points;
    }

    res.json({
      attemptId: attempt.id,
      quizId: attempt.quiz_id,
      quizTitle: attempt.quiz_title,
      quizDescription: attempt.quiz_description,
      score: attempt.score,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
      maxScore: maxScore,
      questions: reviewQuestions
    });

  } catch (err) {
    console.error('review error:', err);
    res.status(500).json({ error: 'Failed to retrieve attempt review' });
  }
});

module.exports = router;
