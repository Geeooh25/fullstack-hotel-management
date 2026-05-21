const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.APP_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        // Join admin room for private notifications
        socket.join('admin_room');

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Real-time notification functions
const sendNewBookingNotification = (booking) => {
    if (io) {
        io.to('admin_room').emit('new_booking', {
            type: 'booking',
            title: 'New Booking Received',
            message: `New booking #${booking.id} - Total: $${booking.total_amount}`,
            data: booking,
            timestamp: new Date(),
            icon: 'bi-calendar-check',
            color: booking.color || (booking.status === 'pending' ? 'warning' : 'success')
        });
    }
};
const sendNewRequestNotification = (request) => {
    if (io) {
        io.to('admin_room').emit('new_request', {
            type: 'request',
            title: 'New Service Request',
            message: `${request.guest_name} requested: ${request.request_type}`,
            data: request,
            timestamp: new Date(),
            icon: 'bi-chat-dots',
            color: 'info'
        });
    }
};

const sendPaymentNotification = (payment, booking) => {
    if (io) {
        io.to('admin_room').emit('payment_received', {
            type: 'payment',
            title: 'Payment Received',
            message: `$${payment.amount} received for Booking #${booking.id}`,
            data: { payment, booking },
            timestamp: new Date(),
            icon: 'bi-credit-card',
            color: 'success'
        });
    }
};

const sendAdminActionNotification = (admin, action, details) => {
    if (io) {
        io.to('admin_room').emit('admin_action', {
            type: 'admin_action',
            title: `Admin Action: ${action}`,
            message: `${admin.username} ${details}`,
            data: { admin, action, details },
            timestamp: new Date(),
            icon: 'bi-person-badge',
            color: 'secondary'
        });
    }
};

const sendSystemNotification = (title, message, type = 'info') => {
    if (io) {
        io.to('admin_room').emit('system_notification', {
            type: 'system',
            title: title,
            message: message,
            timestamp: new Date(),
            icon: type === 'error' ? 'bi-exclamation-triangle' : 'bi-bell',
            color: type === 'error' ? 'danger' : 'primary'
        });
    }
};

module.exports = {
    initSocket,
    getIO,
    sendNewBookingNotification,
    sendNewRequestNotification,
    sendPaymentNotification,
    sendAdminActionNotification,
    sendSystemNotification
};