const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware, getUserById, rowToUser } = require('./auth');

const router = express.Router();

router.use(authMiddleware);

async function requireAdmin(req, res, next) {
    const user = await getUserById(req.uid);
    if (!user || !user.isAdmin) {
        return res.status(403).json({ success: false, error: 'Доступ запрещён' });
    }
    next();
}

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT Uid, Username, DisplayName, Email, CreatedAt, LastLogin, IsAdmin, Ip, Country, City,
             Balance, PurchasedLessonsJson, TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson
             FROM Users ORDER BY LastLogin DESC`
        );
        const users = result.recordset.map(row => ({
            id: row.Uid,
            ...rowToUser(row)
        }));
        return res.json({ success: true, users });
    } catch (err) {
        console.error('Get all users error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/admin/users/:uid
router.delete('/users/:uid', requireAdmin, async (req, res) => {
    try {
        const uid = req.params.uid;
        await query(`DELETE FROM Users WHERE Uid = @uid`, { uid });
        return res.json({ success: true });
    } catch (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

