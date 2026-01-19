const Payment = require('../../models/payment.model');
const Attendance = require('../../models/attendance.model');
const Role = require('../../models/role.model');
const { validationResult } = require('express-validator');
const { logAudit } = require('../../services/audit.service');
const mongoose = require('mongoose');

// Helper to convert Decimal128 to float string
const toDecimal = (val) => val ? val.toString() : "0.00";

/**
 * @desc    Calculate payments for COMPLETED attendance
 * @route   POST /api/payments/calculate/:eventId
 * @access  Admin
 */
exports.calculatePayments = async (req, res) => {
    try {
        const { eventId } = req.params;

        // 1. Find all COMPLETED attendance records for this event
        const completedAttendances = await Attendance.find({
            eventId,
            status: 'COMPLETED'
        }).populate('roleId');

        if (!completedAttendances.length) {
            return res.status(200).json({ success: true, message: 'No completed attendance records found for this event to calculate payments for', data: { generatedCount: 0, totalAmount: "0.00" } });
        }

        let generatedCount = 0;
        let totalAmount = 0;

        // 2. Process each attendance
        for (const attendance of completedAttendances) {
            // Check if payment already exists
            const existingPayment = await Payment.findOne({ attendanceId: attendance._id });
            if (existingPayment) continue;

            // Calculate amount (Simple: Role Price * 1)
            const amount = attendance.roleId ? attendance.roleId.price : 0;

            // Create Payment Record
            await Payment.create({
                userId: attendance.staffId,
                eventId,
                roleId: attendance.roleId._id,
                attendanceId: attendance._id,
                amount: amount, // Mongoose handles casting Number/String to Decimal128
                currency: 'NGN',
                status: 'calculated', // Lowercase as per model enum
                calculatedAt: new Date(),
                // Required by model but redundant for MVP flat rate?
                // Setting strict defaults from model: 
                workHours: 1, // Defaulting to 1 "shift" as per instructions "1 event"
                hourlyRate: amount // Treating the flat fee as "hourlyRate" for the 1 unit of work
            });

            generatedCount++;
            totalAmount += amount;
        }

        res.status(200).json({
            success: true,
            message: 'Payments calculated successfully',
            data: {
                generatedCount,
                totalAmount: totalAmount.toFixed(2)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get payments for an event
 * @route   GET /api/payments/events/:eventId
 * @access  Admin
 */
exports.getEventPayments = async (req, res) => {
    try {
        const { eventId } = req.params;

        const payments = await Payment.find({ eventId })
            .populate('userId', 'fullName email') // Assuming User model has fullName
            .populate('roleId', 'roleName')
            .sort({ createdAt: -1 });

        // Fetch Bank Details for all users involved
        const userIds = payments.map(p => p.userId?._id);
        const Bank = require('../../models/bank.model'); // Import Bank model
        const bankRecords = await Bank.find({ userId: { $in: userIds } });

        // Map userId -> Bank Details
        const bankMap = {};
        bankRecords.forEach(b => {
            bankMap[b.userId.toString()] = b;
        });

        // Format for response
        const formattedPayments = payments.map(p => {
            const bank = p.userId ? bankMap[p.userId._id.toString()] : null;
            return {
                ...p.toObject(),
                amount: toDecimal(p.amount),
                staffName: p.userId ? p.userId.fullName : 'Unknown',
                role: p.roleId ? p.roleId.roleName : 'Unknown',
                bankDetails: bank ? {
                    bankName: bank.bankName,
                    accountNumber: bank.accountNumber,
                    accountName: bank.accountName
                } : null
            };
        });

        res.status(200).json({
            success: true,
            data: {
                payments: formattedPayments
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Approve a payment
 * @route   PATCH /api/payments/:paymentId/approve
 * @access  Admin
 */
exports.approvePayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'calculated' && payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Cannot approve payment in status: ${payment.status}` });
        }

        const oldStatus = payment.status;

        // Update
        payment.status = 'approved';
        payment.approvedAt = new Date();
        payment.approvedBy = req.user.id;
        await payment.save();

        // Audit Log
        await logAudit({
            actor: req.user,
            action: 'PAYMENT_APPROVED',
            entityType: 'payment',
            entityId: payment._id,
            metadata: { oldStatus, newStatus: 'approved' },
            req
        });

        res.status(200).json({
            success: true,
            message: 'Payment approved',
            data: {
                paymentId: payment._id,
                status: 'approved'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Mark payment as paid
 * @route   PATCH /api/payments/:paymentId/paid
 * @access  Admin
 */
exports.markAsPaid = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Payment must be APPROVED before paying' });
        }

        const oldStatus = payment.status;

        // Update
        payment.status = 'paid';
        payment.paidAt = new Date();
        await payment.save();

        // Audit Log
        await logAudit({
            actor: req.user,
            action: 'PAYMENT_PAID',
            entityType: 'payment',
            entityId: payment._id,
            metadata: { oldStatus, newStatus: 'paid' },
            req
        });

        res.status(200).json({
            success: true,
            message: 'Payment marked as PAID',
            data: {
                paymentId: payment._id,
                status: 'paid'
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get my earnings
 * @route   GET /api/payments/my-earnings
 * @access  Staff
 */
exports.getMyEarnings = async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id })
            .populate('eventId', 'title eventDate') // Assuming Event model fields
            .populate('roleId', 'roleName')
            .sort({ createdAt: -1 });

        let totalEarnings = 0;
        const history = payments.map(p => {
            const amountVal = parseFloat(p.amount.toString());
            if (p.status === 'paid') {
                totalEarnings += amountVal;
            }
            return {
                ...p.toObject(),
                amount: toDecimal(p.amount),
                eventTitle: p.eventId ? p.eventId.title : 'Unknown Event',
                role: p.roleId ? p.roleId.roleName : 'Unknown Role'
            };
        });

        res.status(200).json({
            success: true,
            data: {
                totalEarnings: totalEarnings.toFixed(2),
                history
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
