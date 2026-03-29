const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware, getUserById } = require('./auth');
const { send500 } = require('../lib/httpError');
const { getShopPriceForLesson } = require('../lib/shopPrices');
const ALLOWED_AVATAR_PATHS = require('../lib/allowedAvatars');

const router = express.Router();

// Все роуты требуют авторизации
router.use(authMiddleware);

// GET /api/users/:uid/profile
router.get('/:uid/profile', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const user = await getUserById(req.params.uid);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, data: user });
    } catch (err) {
        return send500(res, err, 'Get profile error');
    }
});

// PUT /api/users/:uid/profile
router.put('/:uid/profile', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { username, displayName, bio } = req.body || {};
        const updates = [];
        const params = { uid: req.params.uid };
        if (username !== undefined) {
            const un = String(username).trim();
            if (un.length < 3) {
                return res.status(400).json({ success: false, error: 'Логин должен быть не менее 3 символов' });
            }
            const dup = await query(
                `SELECT Uid FROM Users WHERE Username = @username AND Uid <> @uid`,
                { username: un, uid: req.params.uid }
            );
            if (dup.recordset.length > 0) {
                return res.status(400).json({ success: false, error: 'Этот логин уже занят' });
            }
            updates.push('Username = @username');
            params.username = un;
        }
        if (displayName !== undefined) {
            updates.push('DisplayName = @displayName');
            params.displayName = String(displayName).trim().slice(0, 120);
        }
        if (bio !== undefined) {
            updates.push('Bio = @bio');
            params.bio = String(bio).slice(0, 4000);
        }
        if (updates.length === 0) {
            const user = await getUserById(req.params.uid);
            return res.json({ success: true, user });
        }
        await query(
            `UPDATE Users SET ${updates.join(', ')} WHERE Uid = @uid`,
            params
        );
        const user = await getUserById(req.params.uid);
        return res.json({ success: true, user });
    } catch (err) {
        return send500(res, err, 'Update profile error');
    }
});

// PUT /api/users/:uid/avatar
router.put('/:uid/avatar', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { avatarIndex } = req.body || {};
        const idx = avatarIndex != null ? parseInt(avatarIndex, 10) : NaN;
        if (!Number.isFinite(idx) || idx < 0 || idx >= ALLOWED_AVATAR_PATHS.length) {
            return res.status(400).json({ success: false, error: 'Неверный индекс аватара' });
        }
        const photoURL = ALLOWED_AVATAR_PATHS[idx];
        await query(
            `UPDATE Users SET AvatarIndex = @avatarIndex, PhotoURL = @photoURL WHERE Uid = @uid`,
            { uid: req.params.uid, avatarIndex: idx, photoURL }
        );
        const user = await getUserById(req.params.uid);
        return res.json({ success: true, photoURL: user.photoURL });
    } catch (err) {
        return send500(res, err, 'Update avatar error');
    }
});

async function applySessionToUser(uid, session) {
    const { speed = 0, accuracy = 0, time = 0, errors = 0, mode = '', layout = '', lessonKey = null, timestamp = Date.now() } = session;
    await query(
        `INSERT INTO UserSessions (UserId, Speed, Accuracy, TimeSeconds, Errors, Mode, Layout, LessonKey, Timestamp)
         VALUES (@uid, @speed, @accuracy, @time, @errors, @mode, @layout, @lessonKey, @timestamp)`,
        { uid, speed, accuracy, time, errors, mode, layout, lessonKey, timestamp }
    );
    const userRow = await query(
        `SELECT TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson FROM Users WHERE Uid = @uid`,
        { uid }
    );
    if (userRow.recordset.length === 0) return;
    const u = userRow.recordset[0];
    let recentSessions = [];
    try { recentSessions = JSON.parse(u.RecentSessionsJson || '[]'); } catch (e) {}
    recentSessions.push({ speed, accuracy, time, errors, mode, layout, lessonKey, timestamp });
    if (recentSessions.length > 100) recentSessions = recentSessions.slice(-100);
    const totalSessions = (u.TotalSessions || 0) + 1;
    const totalTime = (u.TotalTime || 0) + time;
    const bestSpeed = Math.max(u.BestSpeed || 0, speed);
    const totalErrors = (u.TotalErrors || 0) + errors;
    const totalAccuracy = recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
    const averageAccuracy = recentSessions.length > 0 ? Math.round(totalAccuracy / recentSessions.length) : 0;
    // Completed lessons - считаем за всё время по UserSessions, а не по последним 100
    const countResult = await query(
        `SELECT COUNT(DISTINCT LessonKey) AS cnt FROM UserSessions WHERE UserId = @uid AND LessonKey IS NOT NULL AND LessonKey != ''`,
        { uid }
    );
    const completedLessons = (countResult.recordset[0] && countResult.recordset[0].cnt) || 0;
    await query(
        `UPDATE Users SET TotalSessions = @totalSessions, TotalTime = @totalTime, BestSpeed = @bestSpeed, AverageAccuracy = @averageAccuracy, CompletedLessonsCount = @completedLessons, TotalErrors = @totalErrors, RecentSessionsJson = @recentJson WHERE Uid = @uid`,
        { uid, totalSessions, totalTime, bestSpeed, averageAccuracy, completedLessons, totalErrors, recentJson: JSON.stringify(recentSessions) }
    );
}

// POST /api/users/:uid/session - одна сессия
router.post('/:uid/session', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) return res.status(403).json({ success: false, error: 'Forbidden' });
        await applySessionToUser(req.params.uid, req.body);
        return res.json({ success: true });
    } catch (err) {
        return send500(res, err, 'Add session error');
    }
});

// POST /api/users/:uid/sessions - несколько сессий (batch)
router.post('/:uid/sessions', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) return res.status(403).json({ success: false, error: 'Forbidden' });
        const sessions = Array.isArray(req.body) ? req.body : (req.body.sessions || []);
        for (const s of sessions) {
            await applySessionToUser(req.params.uid, { ...s, timestamp: s.timestamp || Date.now() });
        }
        return res.json({ success: true });
    } catch (err) {
        return send500(res, err, 'Add sessions error');
    }
});

// POST /api/users/:uid/coins
router.post('/:uid/coins', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const amount = parseInt(req.body.amount, 10) || 0;
        if (amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });
        await query(
            `UPDATE Users SET Balance = Balance + @amount WHERE Uid = @uid`,
            { uid: req.params.uid, amount }
        );
        const user = await getUserById(req.params.uid);
        return res.json({ success: true, balance: user.balance });
    } catch (err) {
        return send500(res, err, 'Add coins error');
    }
});

// POST /api/users/:uid/purchase
router.post('/:uid/purchase', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { lessonId } = req.body || {};
        if (!lessonId) {
            return res.status(400).json({ success: false, error: 'lessonId required' });
        }
        const price = getShopPriceForLesson(lessonId);
        if (price == null) {
            return res.status(400).json({ success: false, error: 'Неизвестный урок' });
        }
        const uid = req.params.uid;
        const userRow = await query(`SELECT Balance, PurchasedLessonsJson FROM Users WHERE Uid = @uid`, { uid });
        if (userRow.recordset.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
        const row = userRow.recordset[0];
        let purchased = [];
        try { purchased = JSON.parse(row.PurchasedLessonsJson || '[]'); } catch (e) {}
        if (purchased.includes(lessonId)) {
            return res.status(400).json({ success: false, error: 'Урок уже куплен' });
        }
        const balance = row.Balance ?? 0;
        if (balance < price) {
            return res.status(400).json({ success: false, error: 'Недостаточно монет' });
        }
        purchased.push(lessonId);
        await query(
            `UPDATE Users SET Balance = Balance - @price, PurchasedLessonsJson = @json WHERE Uid = @uid`,
            { uid, price, json: JSON.stringify(purchased) }
        );
        const user = await getUserById(uid);
        return res.json({ success: true, balance: user.balance });
    } catch (err) {
        return send500(res, err, 'Purchase error');
    }
});

// GET /api/users/:uid/balance
router.get('/:uid/balance', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const user = await getUserById(req.params.uid);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, balance: user.balance });
    } catch (err) {
        return send500(res, err, 'Balance error');
    }
});

// GET /api/users/:uid/lesson-purchased/:lessonId
router.get('/:uid/lesson-purchased/:lessonId', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const user = await getUserById(req.params.uid);
        if (!user) return res.json({ purchased: false });
        const purchased = user.purchasedLessons && user.purchasedLessons.includes(req.params.lessonId);
        return res.json({ purchased: !!purchased });
    } catch (err) {
        return send500(res, err, 'Lesson purchased check error');
    }
});

module.exports = router;

