const Attendance = require('../../models/attendance.model');
const Event = require('../../models/event.model');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * @desc    Get attendance summary stats
 * @route   GET /api/reports/events/:eventId/attendance
 * @access  Admin
 */
exports.getAttendanceReport = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Aggregation
        const stats = await Attendance.aggregate([
            { $match: { eventId: event._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const summary = {
            assigned: 0,
            active: 0,
            checkedIn: 0,
            completed: 0,
            absent: 0,
            total: 0
        };

        stats.forEach(s => {
            // Map status to summary keys if needed, or use status directly
            const key = s._id.toLowerCase();
            if (summary.hasOwnProperty(key)) {
                summary[key] = s.count;
            } else if (key === 'checked_in') { // map CHECKED_IN to checkedIn
                summary.checkedIn = s.count;
            }
            summary.total += s.count;
        });

        // Derived stats
        // Note: status 'active' implies checked in too basically, but keeping separate buckets based on enum
        const attendanceRate = summary.total > 0
            ? (((summary.completed + summary.active + summary.checkedIn) / summary.total) * 100).toFixed(1) + '%'
            : '0%';

        res.status(200).json({
            success: true,
            data: {
                eventTitle: event.title,
                summary,
                attendanceRate
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Export attendance report as CSV
 * @route   GET /api/reports/events/:eventId/attendance/csv
 * @access  Admin
 */
exports.exportAttendanceCSV = async (req, res) => {
    try {
        const { eventId } = req.params;

        const attendances = await Attendance.find({ eventId })
            .populate('staffId', 'fullName email')
            .populate('roleId', 'roleName')
            .sort({ 'staffId.fullName': 1 }); // Sort by name

        if (!attendances.length) {
            return res.status(404).json({ success: false, message: 'No attendance data found' });
        }

        const fields = ['Staff Name', 'Email', 'Role', 'Status', 'Check In', 'Check Out', 'Duration'];
        const data = attendances.map(a => ({
            'Staff Name': a.staffId ? a.staffId.fullName : 'Unknown',
            'Email': a.staffId ? a.staffId.email : 'Unknown',
            'Role': a.roleId ? a.roleId.roleName : 'Unknown',
            'Status': a.status,
            'Check In': a.checkIn && a.checkIn.time ? new Date(a.checkIn.time).toLocaleString() : '-',
            'Check Out': a.checkOut && a.checkOut.time ? new Date(a.checkOut.time).toLocaleString() : '-',
            'Duration': a.duration || '-'
        }));

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment(`attendance_report_${eventId}.csv`);
        return res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Export attendance report as PDF
 * @route   GET /api/reports/events/:eventId/attendance/pdf
 * @access  Admin
 */
exports.exportAttendancePDF = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const attendances = await Attendance.find({ eventId })
            .populate('staffId', 'fullName')
            .populate('roleId', 'roleName')
            .sort({ 'staffId.fullName': 1 });

        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${eventId}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Attendance Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Event: ${event.title}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // Table Header
        const tableTop = 150;
        const col1 = 50;  // Staff
        const col2 = 200; // Role
        const col3 = 300; // Status
        const col4 = 400; // Check In

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Staff Name', col1, tableTop);
        doc.text('Role', col2, tableTop);
        doc.text('Status', col3, tableTop);
        doc.text('Check In', col4, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Rows
        let y = tableTop + 25;
        doc.font('Helvetica');

        attendances.forEach(a => {
            if (y > 700) { // Add new page if close to bottom
                doc.addPage();
                y = 50;
            }

            const staffName = a.staffId ? a.staffId.fullName : 'Unknown';
            const roleName = a.roleId ? a.roleId.roleName : 'Unknown';
            const checkInTime = a.checkIn && a.checkIn.time ? new Date(a.checkIn.time).toLocaleTimeString() : '-';

            doc.text(staffName, col1, y);
            doc.text(roleName, col2, y);
            doc.text(a.status, col3, y);
            doc.text(checkInTime, col4, y);

            y += 20;
        });

        // Summary Footer
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text(`Total Records: ${attendances.length}`, { align: 'right' });

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server Error', error: error.message });
        }
    }
};
