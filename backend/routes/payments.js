// ============================================
// PAYMENT ROUTES - Enhanced with automatic status updates
// ============================================
const express = require('express');
const router = express.Router();

// Middleware to verify JWT token (assuming you have this)
// const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/payments/loan/:loanId
 * Get all payments for a specific loan
 */
router.get('/loan/:loanId', async (req, res) => {
    try {
        const { loanId } = req.params;
        const connection = req.app.locals.db;

        const [payments] = await connection.execute(
            `SELECT 
                p.*,
                u.full_name as borrower_name
             FROM payments p
             JOIN loans l ON p.loan_id = l.id
             JOIN users u ON l.borrower_id = u.id
             WHERE p.loan_id = ?
             ORDER BY p.created_at DESC`,
            [loanId]
        );

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
});

/**
 * POST /api/payments/record
 * Record a new payment
 * The database trigger will automatically update loan status
 */
router.post('/record', async (req, res) => {
    try {
        const {
            loan_id,
            amount,
            payment_method,
            payment_reference,
            notes
        } = req.body;

        const connection = req.app.locals.db;

        // Validate input
        if (!loan_id || !amount || !payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Loan ID, amount, and payment method are required'
            });
        }

        // Validate amount is positive
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }

        // Check if loan exists and is active
        const [loans] = await connection.execute(
            'SELECT id, status, outstanding_balance FROM loans WHERE id = ?',
            [loan_id]
        );

        if (loans.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        const loan = loans[0];

        if (loan.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'This loan is already fully paid and closed'
            });
        }

        if (loan.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Cannot record payment for loan with status: ${loan.status}`
            });
        }

        // Warning if payment exceeds outstanding balance
        if (parseFloat(amount) > parseFloat(loan.outstanding_balance)) {
            console.warn(`Payment amount (${amount}) exceeds outstanding balance (${loan.outstanding_balance}) for loan ${loan_id}`);
        }

        // Insert payment record
        const [result] = await connection.execute(
            `INSERT INTO payments 
             (loan_id, amount, payment_method, payment_reference, notes, status, completed_at, created_at)
             VALUES (?, ?, ?, ?, ?, 'completed', NOW(), NOW())`,
            [loan_id, amount, payment_method, payment_reference || null, notes || null]
        );

        // The database trigger will automatically:
        // 1. Update outstanding balance
        // 2. Update repayment schedule
        // 3. Mark loan as 'closed' if fully paid

        // Fetch updated loan status
        const [updatedLoan] = await connection.execute(
            'SELECT id, status, outstanding_balance FROM loans WHERE id = ?',
            [loan_id]
        );

        const isFullyPaid = updatedLoan[0].status === 'closed';

        res.json({
            success: true,
            message: isFullyPaid 
                ? '🎉 Payment recorded! Loan is now fully paid and closed.' 
                : 'Payment recorded successfully',
            payment_id: result.insertId,
            loan_status: updatedLoan[0].status,
            outstanding_balance: updatedLoan[0].outstanding_balance,
            fully_paid: isFullyPaid
        });

    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record payment'
        });
    }
});

/**
 * GET /api/payments/loan/:loanId/summary
 * Get payment summary for a loan
 */
router.get('/loan/:loanId/summary', async (req, res) => {
    try {
        const { loanId } = req.params;
        const connection = req.app.locals.db;

        const [summary] = await connection.execute(
            `SELECT 
                l.id,
                l.total_amount,
                l.outstanding_balance,
                l.status as loan_status,
                COUNT(p.id) as total_payments,
                COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as pending_amount,
                MAX(p.completed_at) as last_payment_date
             FROM loans l
             LEFT JOIN payments p ON l.id = p.loan_id
             WHERE l.id = ?
             GROUP BY l.id`,
            [loanId]
        );

        if (summary.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        res.json({
            success: true,
            summary: summary[0]
        });
    } catch (error) {
        console.error('Error fetching payment summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment summary'
        });
    }
});

module.exports = router;
