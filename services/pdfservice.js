const PDFDocument = require('pdfkit');

class PDFService {
    /**
     * Get display-friendly payment method name
     */
    static getPaymentMethodDisplay(method) {
        if (!method) return 'Not specified';
        
        const methodLower = String(method).toLowerCase();
        
        if (methodLower === 'stripe' || methodLower === 'card' || methodLower === 'credit_card' || methodLower === 'debit_card') {
            return 'Credit/Debit Card (Online)';
        }
        if (methodLower === 'cash') return 'Cash';
        if (methodLower === 'bank_transfer' || methodLower === 'bank') return 'Bank Transfer';
        if (methodLower === 'paypal') return 'PayPal';
        
        return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    /**
     * Get payment status display
     */
    static getPaymentStatusDisplay(status) {
        if (!status) return 'Pending';
        
        const s = String(status).toLowerCase();
        if (s === 'completed' || s === 'paid' || s === 'succeeded') return 'Paid ✓';
        if (s === 'pending' || s === 'processing') return 'Pending';
        if (s === 'failed') return 'Failed ✗';
        if (s === 'refunded') return 'Refunded';
        
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Generate booking receipt PDF
     */
    static async generateReceipt(booking, guest, room, payments, services = []) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                
                // ========== HOTEL HEADER ==========
                doc.fontSize(20)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text(process.env.HOTEL_NAME || 'GEEOOH HOTEL', { align: 'center' });
                
                doc.moveDown(0.3);
                doc.fontSize(9)
                   .font('Helvetica')
                   .fillColor('#666666')
                   .text(process.env.HOTEL_ADDRESS || '123 Luxury Avenue, Beverly Hills, CA 90210', { align: 'center' })
                   .text(`Tel: ${process.env.HOTEL_PHONE || '+1 (555) 123-4567'}  |  Email: ${process.env.HOTEL_EMAIL || 'reservations@geeooohotel.com'}`, { align: 'center' });
                
                doc.moveDown(0.5);
                doc.strokeColor('#B8860B').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.8);
                
                // ========== RECEIPT TITLE ==========
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .fillColor('#1a2a3a')
                   .text('BOOKING RECEIPT', { align: 'center' });
                
                doc.moveDown(0.8);
                
                // ========== REFERENCE & STATUS ==========
                const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#1a2a3a')
                   .text('Reference: ', { continued: true })
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(booking.booking_reference);
                
                doc.fontSize(9).fillColor('#666666').text(`Date: ${today}`, { align: 'right' });
                
                // Booking Status badge
                const bookingStatus = booking.status || 'pending';
                const statusColors = {
                    'confirmed': '#28a745',
                    'pending': '#ffc107',
                    'checked_in': '#17a2b8',
                    'checked_out': '#6c757d',
                    'cancelled': '#dc3545'
                };
                const statusColor = statusColors[bookingStatus] || '#333333';
                
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#1a2a3a')
                   .text('Booking Status: ', { continued: true })
                   .font('Helvetica')
                   .fillColor(statusColor)
                   .text(bookingStatus.replace(/_/g, ' ').toUpperCase());
                
                doc.moveDown(0.8);
                
                // ========== GUEST INFO ==========
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Guest Information');
                
                doc.moveDown(0.2);
                doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.5);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(`Name: ${guest.first_name || ''} ${guest.last_name || ''}`)
                   .text(`Email: ${guest.email || 'N/A'}`)
                   .text(`Phone: ${guest.phone || 'N/A'}`);
                
                doc.moveDown(0.8);
                
                // ========== BOOKING DETAILS ==========
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Booking Details');
                
                doc.moveDown(0.2);
                doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.5);
                
                const roomName = room.RoomType ? room.RoomType.name : 'Standard Room';
                const roomNumber = room.room_number || 'N/A';
                
                const checkInFormatted = new Date(booking.check_in).toLocaleDateString('en-US', { 
                    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' 
                });
                const checkOutFormatted = new Date(booking.check_out).toLocaleDateString('en-US', { 
                    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' 
                });
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(`Room: ${roomName} (Room ${roomNumber})`)
                   .text(`Check-in: ${checkInFormatted} at 3:00 PM`)
                   .text(`Check-out: ${checkOutFormatted} at 11:00 AM`)
                   .text(`Duration: ${booking.total_nights || 1} night(s)`)
                   .text(`Guests: ${booking.adults || 1} Adult(s)${booking.children > 0 ? ', ' + booking.children + ' Child(ren)' : ''}`);
                
                if (booking.special_requests) {
                    doc.moveDown(0.3);
                    doc.font('Helvetica-Oblique').fillColor('#666666')
                       .text(`Special Requests: ${booking.special_requests}`);
                }
                
                doc.moveDown(0.8);
                
                // ========== CHARGES ==========
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Charges');
                
                doc.moveDown(0.2);
                doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.5);
                
                const roomTotal = parseFloat(booking.total_amount) || 0;
                const servicesTotal = services.reduce((sum, s) => sum + (parseFloat(s.price_at_time || 0) * (s.quantity || 1)), 0);
                const roomOnly = roomTotal - servicesTotal;
                const nightsForDisplay = booking.total_nights || 1;
                const ratePerNight = roomOnly / nightsForDisplay;
                
                // Table header
                let yPos = doc.y;
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#333333')
                   .text('Description', 50, yPos)
                   .text('Amount', 450, yPos, { width: 95, align: 'right' });
                
                doc.moveDown(0.3);
                
                // Room charge
                yPos = doc.y;
                doc.font('Helvetica')
                   .fillColor('#333333')
                   .text(`Room - ${nightsForDisplay} night(s) × $${ratePerNight.toFixed(2)}`, 50, yPos)
                   .text(`$${roomOnly.toFixed(2)}`, 450, yPos, { width: 95, align: 'right' });
                
                doc.moveDown(0.5);
                
                // Services
                if (services.length > 0) {
                    for (const service of services) {
                        yPos = doc.y;
                        const menuItem = service.menu_item || service.MenuItem || {};
                        const itemName = menuItem.name || 'Service';
                        const qty = service.quantity || 1;
                        const unitPrice = parseFloat(service.price_at_time || 0);
                        const lineTotal = unitPrice * qty;
                        
                        doc.fontSize(9)
                           .font('Helvetica')
                           .fillColor('#555555')
                           .text(`${itemName} (×${qty})`, 60, yPos)
                           .text(`$${lineTotal.toFixed(2)}`, 450, yPos, { width: 95, align: 'right' });
                        
                        doc.moveDown(0.4);
                    }
                }
                
                // Total line
                doc.moveDown(0.3);
                doc.strokeColor('#B8860B').lineWidth(0.8).moveTo(350, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.5);
                
                yPos = doc.y;
                doc.fontSize(13)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('TOTAL', 50, yPos)
                   .text(`$${roomTotal.toFixed(2)}`, 450, yPos, { width: 95, align: 'right' });
                
                doc.moveDown(1);
                
                // ========== PAYMENT INFO (LIVE DATA) ==========
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Payment');
                
                doc.moveDown(0.2);
                doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.5);
                
                if (payments && payments.length > 0) {
                    payments.forEach((payment, index) => {
                        const methodDisplay = PDFService.getPaymentMethodDisplay(payment.payment_method);
                        const statusDisplay = PDFService.getPaymentStatusDisplay(payment.status);
                        
                        doc.fontSize(10)
                           .font('Helvetica-Bold')
                           .fillColor('#333333')
                           .text('Method: ', { continued: true })
                           .font('Helvetica')
                           .text(methodDisplay);
                        
                        if (payment.transaction_id) {
                            doc.font('Helvetica-Bold')
                               .text('Transaction: ', { continued: true })
                               .font('Helvetica')
                               .text(payment.transaction_id);
                        }
                        
                        doc.font('Helvetica-Bold')
                           .text('Amount Paid: ', { continued: true })
                           .font('Helvetica')
                           .text(`$${parseFloat(payment.amount || 0).toFixed(2)}`);
                        
                        // Status with correct color based on CURRENT status
                        const statusColor = payment.status === 'completed' ? '#28a745' : 
                                           payment.status === 'pending' ? '#ffc107' : '#dc3545';
                        
                        doc.font('Helvetica-Bold')
                           .fillColor('#333333')
                           .text('Status: ', { continued: true })
                           .font('Helvetica')
                           .fillColor(statusColor)
                           .text(statusDisplay);
                        
                        if (payments.length > 1 && index < payments.length - 1) {
                            doc.moveDown(0.3);
                            doc.strokeColor('#EEEEEE').lineWidth(0.3).moveTo(60, doc.y).lineTo(535, doc.y).stroke();
                            doc.moveDown(0.5);
                        }
                    });
                    
                    // Calculate and show balance
                    const totalPaid = payments
                        .filter(p => p.status === 'completed')
                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                    const balance = roomTotal - totalPaid;
                    
                    doc.moveDown(0.3);
                    if (balance > 0.01) {
                        doc.fontSize(10)
                           .font('Helvetica-Bold')
                           .fillColor('#dc3545')
                           .text(`Remaining Balance: $${balance.toFixed(2)}`);
                    } else if (totalPaid > 0) {
                        doc.fontSize(10)
                           .font('Helvetica-Bold')
                           .fillColor('#28a745')
                           .text('Fully Paid ✓');
                    }
                } else {
                    doc.fontSize(10)
                       .font('Helvetica')
                       .fillColor('#ffc107')
                       .text('Payment pending - Please pay at check-in');
                }
                
                doc.moveDown(1.5);
                
                // ========== FOOTER ==========
                doc.strokeColor('#B8860B').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.8);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#666666')
                   .text('Thank you for choosing GEEOOH HOTEL!', { align: 'center' })
                   .text('We look forward to welcoming you.', { align: 'center' });
                
                doc.end();
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Generate simple walk-in receipt
     */
    static async generateWalkinReceipt(booking, guest, room, payment) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                
                // Header
                doc.fontSize(18)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text(process.env.HOTEL_NAME || 'GEEOOH HOTEL', { align: 'center' });
                
                doc.moveDown(0.3);
                doc.fontSize(9)
                   .font('Helvetica')
                   .fillColor('#666666')
                   .text('PAYMENT RECEIPT', { align: 'center' });
                
                doc.moveDown(0.5);
                doc.strokeColor('#B8860B').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.8);
                
                // Reference
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .fillColor('#1a2a3a')
                   .text(`Receipt #: ${booking.booking_reference}`)
                   .font('Helvetica')
                   .fillColor('#666666')
                   .text(`Date: ${new Date().toLocaleString()}`, { align: 'right' });
                
                doc.moveDown(0.8);
                
                // Guest
                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Guest');
                doc.moveDown(0.3);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(`${guest.first_name || ''} ${guest.last_name || ''}`)
                   .text(`${guest.email || ''}`)
                   .text(`${guest.phone || ''}`);
                
                doc.moveDown(0.8);
                
                // Booking
                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Booking');
                doc.moveDown(0.3);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#333333')
                   .text(`Room: ${room.room_number || 'N/A'} (${room.RoomType ? room.RoomType.name : 'Standard'})`)
                   .text(`Check-in: ${new Date(booking.check_in).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}`)
                   .text(`Check-out: ${new Date(booking.check_out).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}`)
                   .text(`Nights: ${booking.total_nights || 1}`);
                
                doc.moveDown(0.8);
                
                // Payment
                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .fillColor('#B8860B')
                   .text('Payment');
                doc.moveDown(0.3);
                
                const totalAmount = parseFloat(booking.total_amount || 0);
                
                if (payment) {
                    const methodDisplay = PDFService.getPaymentMethodDisplay(payment.payment_method);
                    
                    doc.fontSize(10)
                       .font('Helvetica')
                       .fillColor('#333333')
                       .text(`Amount: $${totalAmount.toFixed(2)}`)
                       .text(`Method: ${methodDisplay}`);
                    
                    if (payment.transaction_id) {
                        doc.text(`Transaction: ${payment.transaction_id}`);
                    }
                    
                    doc.fillColor('#28a745').text('Status: Paid ✓');
                } else {
                    doc.fontSize(10)
                       .font('Helvetica')
                       .fillColor('#333333')
                       .text(`Amount: $${totalAmount.toFixed(2)}`)
                       .text('Method: Counter Payment')
                       .fillColor('#28a745')
                       .text('Status: Paid ✓');
                }
                
                doc.moveDown(2);
                
                // Footer
                doc.strokeColor('#B8860B').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.8);
                
                doc.fontSize(10)
                   .font('Helvetica')
                   .fillColor('#666666')
                   .text('Thank you for choosing GEEOOH HOTEL!', { align: 'center' });
                
                doc.end();
                
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PDFService;