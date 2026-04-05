const { Resend } = require('resend');

// Initialize Resend only if API key is provided
let resend = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder') {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend email service initialized');
} else {
    console.log('⚠️ Resend not configured. Emails will be logged to console.');
}

class EmailService {
    
    /**
     * Send booking confirmation email (NO TAX)
     */
    static async sendBookingConfirmation(booking, guest, room, priceDetails) {
        const checkIn = new Date(booking.check_in).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const checkOut = new Date(booking.check_out).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const nights = booking.total_nights;
        const totalAmount = parseFloat(booking.total_amount).toFixed(2);
        const depositPaid = parseFloat(booking.deposit_paid).toFixed(2);
        const remainingBalance = parseFloat(booking.remaining_balance).toFixed(2);
        
        // Get room type data safely
        const roomTypeData = room.RoomType || room.room_type || room.roomType || null;
        const roomName = roomTypeData ? roomTypeData.name : 'Standard Room';
        let roomAmenities = 'Free WiFi, TV, Air Conditioning';
        if (roomTypeData && roomTypeData.amenities) {
            try {
                const amenities = typeof roomTypeData.amenities === 'string' 
                    ? JSON.parse(roomTypeData.amenities) 
                    : roomTypeData.amenities;
                roomAmenities = amenities.slice(0, 3).join(', ');
            } catch (e) {
                roomAmenities = 'Free WiFi, TV, Air Conditioning';
            }
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Booking Confirmation</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #1a2a3a;
                        background-color: #f5f7fa;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 40px auto;
                        background: white;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #1a2a3a 0%, #0f1a24 100%);
                        color: #c5a028;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                        letter-spacing: 1px;
                    }
                    .header p {
                        margin: 10px 0 0;
                        opacity: 0.9;
                        font-size: 14px;
                    }
                    .content {
                        padding: 30px;
                    }
                    .greeting {
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 10px;
                        color: #1a2a3a;
                    }
                    .booking-details {
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 20px 0;
                        border-left: 4px solid #c5a028;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .detail-label {
                        font-weight: 600;
                        color: #495057;
                    }
                    .detail-value {
                        color: #1a2a3a;
                        font-weight: 500;
                    }
                    .price-breakdown {
                        background: #e9ecef;
                        border-radius: 12px;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .price-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                    }
                    .price-total {
                        font-size: 18px;
                        font-weight: 700;
                        color: #c5a028;
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 2px solid #c5a028;
                    }
                    .button {
                        display: inline-block;
                        background: #c5a028;
                        color: #1a2a3a;
                        text-decoration: none;
                        padding: 12px 30px;
                        border-radius: 8px;
                        font-weight: 600;
                        margin-top: 20px;
                        transition: all 0.3s;
                    }
                    .button:hover {
                        background: #9b7b1c;
                        color: white;
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #6c757d;
                        border-top: 1px solid #e9ecef;
                    }
                    .hotel-info {
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #e9ecef;
                        font-size: 12px;
                        color: #6c757d;
                        text-align: center;
                    }
                    @media (max-width: 600px) {
                        .container { margin: 20px; }
                        .content { padding: 20px; }
                        .detail-row { flex-direction: column; }
                        .detail-value { margin-top: 4px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${process.env.HOTEL_NAME || 'GEEOOH HOTEL'}</h1>
                        <p>Booking Confirmation</p>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Dear ${guest.first_name} ${guest.last_name},</div>
                        <p>Thank you for choosing ${process.env.HOTEL_NAME || 'Geeooh Hotel'}. Your booking has been confirmed!</p>
                        
                        <div class="booking-details">
                            <div class="detail-row">
                                <span class="detail-label">Booking Reference:</span>
                                <span class="detail-value">${booking.booking_reference}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Room Type:</span>
                                <span class="detail-value">${roomName} (Room ${room.room_number})</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Floor:</span>
                                <span class="detail-value">Floor ${room.floor || 'Ground'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Check-in:</span>
                                <span class="detail-value">${checkIn} (3:00 PM)</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Check-out:</span>
                                <span class="detail-value">${checkOut} (11:00 AM)</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Nights:</span>
                                <span class="detail-value">${nights} night(s)</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Guests:</span>
                                <span class="detail-value">${booking.adults} adults, ${booking.children} children</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Amenities:</span>
                                <span class="detail-value">${roomAmenities}</span>
                            </div>
                        </div>
                        
                        <div class="price-breakdown">
                            <div class="price-row">
                                <span>Room Rate (${nights} nights):</span>
                                <span>$${roomTypeData?.base_price || '0.00'}/night</span>
                            </div>
                            <div class="price-row">
                                <span>Total Amount:</span>
                                <span>$${totalAmount}</span>
                            </div>
                            <div class="price-row" style="margin-top: 10px;">
                                <span>Amount Paid:</span>
                                <span style="color: #28a745; font-weight: bold;">$${depositPaid}</span>
                            </div>
                            <div class="price-row">
                                <span>Remaining Balance:</span>
                                <span style="color: #c5a028;">$${remainingBalance}</span>
                            </div>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/booking-lookup.html" class="button">
                                View My Booking
                            </a>
                        </div>
                        
                        <div class="hotel-info">
                            <strong>${process.env.HOTEL_NAME || 'Geeooh Hotel'}</strong><br>
                            ${process.env.HOTEL_ADDRESS || '123 Luxury Avenue, Beverly Hills, CA 90210'}<br>
                            Phone: ${process.env.HOTEL_PHONE || '+1 (555) 123-4567'}<br>
                            Email: ${process.env.HOTEL_EMAIL || 'reservations@geeooohotel.com'}
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Need help? Contact our 24/7 support at ${process.env.HOTEL_PHONE || '+1 (555) 123-4567'}</p>
                        <p>&copy; ${new Date().getFullYear()} ${process.env.HOTEL_NAME || 'Geeooh Hotel'}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
GEEOOH HOTEL - Booking Confirmation

Dear ${guest.first_name} ${guest.last_name},

Thank you for choosing Geeooh Hotel. Your booking has been confirmed!

Booking Reference: ${booking.booking_reference}
Room: ${roomName} (Room ${room.room_number})
Check-in: ${checkIn} (3:00 PM)
Check-out: ${checkOut} (11:00 AM)
Nights: ${nights}
Guests: ${booking.adults} adults, ${booking.children} children

Total Amount: $${totalAmount}
Amount Paid: $${depositPaid}
Remaining Balance: $${remainingBalance}

View your booking: ${process.env.APP_URL || 'http://localhost:3000'}/booking-lookup.html

Hotel Contact:
${process.env.HOTEL_NAME || 'Geeooh Hotel'}
${process.env.HOTEL_ADDRESS || '123 Luxury Avenue, Beverly Hills, CA 90210'}
Phone: ${process.env.HOTEL_PHONE || '+1 (555) 123-4567'}
        `;

        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Booking Confirmation - ${booking.booking_reference}`,
            html: html,
            text: text,
        };

        await this.sendEmail(msg);
        
        if (process.env.EMAIL_TO) {
            const adminMsg = {
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: process.env.EMAIL_TO,
                subject: `New Booking - ${booking.booking_reference}`,
                html: `
                    <h2>New Booking Received!</h2>
                    <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                    <p><strong>Guest:</strong> ${guest.first_name} ${guest.last_name}</p>
                    <p><strong>Email:</strong> ${guest.email}</p>
                    <p><strong>Phone:</strong> ${guest.phone}</p>
                    <p><strong>Room:</strong> ${roomName} (Room ${room.room_number})</p>
                    <p><strong>Dates:</strong> ${checkIn} to ${checkOut}</p>
                    <p><strong>Total:</strong> $${totalAmount}</p>
                    <p><a href="${process.env.APP_URL}/admin/dashboard">View in Admin Panel</a></p>
                `,
            };
            await this.sendEmail(adminMsg);
        }
        
        return true;
    }

    /**
     * Send password reset email
     */
    static async sendPasswordResetEmail(user, resetUrl) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reset Your Password</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
                    .header { background: #1a2a3a; color: #c5a028; padding: 20px; text-align: center; }
                    .button { display: inline-block; background: #c5a028; color: #1a2a3a; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${process.env.HOTEL_NAME || 'GEEOOH HOTEL'}</h1>
                    </div>
                    <div class="content">
                        <h2>Reset Your Password</h2>
                        <p>Hello ${user.first_name},</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        <p>If you didn't request this, you can ignore this email. This link will expire in 1 hour.</p>
                        <p>Or copy this link: ${resetUrl}</p>
                    </div>
                    <div class="footer">
                        <p>${process.env.HOTEL_NAME}<br>${process.env.HOTEL_PHONE}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: user.email,
            subject: `Reset Your Password - ${process.env.HOTEL_NAME || 'GEEOOH HOTEL'}`,
            html: html
        };
        
        await this.sendEmail(msg);
    }
    
    /**
     * Send check-in reminder email
     */
    static async sendCheckInReminder(booking, guest, room) {
        const checkIn = new Date(booking.check_in).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Check-in Reminder - Geeooh Hotel</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1a2a3a; color: #c5a028; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${process.env.HOTEL_NAME || 'Geeooh Hotel'}</h1>
                        <p>Check-in Reminder</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${guest.first_name},</h2>
                        <p>We're excited to welcome you soon! Your check-in is scheduled for <strong>${checkIn}</strong>.</p>
                        <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                        <h3>Important Information:</h3>
                        <ul>
                            <li>Check-in time: 3:00 PM</li>
                            <li>Check-out time: 11:00 AM</li>
                            <li>Please bring a valid ID and the credit card used for booking</li>
                            <li>Free Wi-Fi is available throughout the property</li>
                        </ul>
                        <p>If you have any special requests, please contact us.</p>
                    </div>
                    <div class="footer">
                        <p>${process.env.HOTEL_NAME}<br>${process.env.HOTEL_PHONE}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Check-in Reminder - ${booking.booking_reference}`,
            html: html,
        };

        await this.sendEmail(msg);
        return true;
    }
    
    /**
     * Send receipt email after check-out
     */
    static async sendReceipt(booking, guest, payments) {
        const checkOut = new Date(booking.check_out).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let paymentsHtml = '';
        payments.forEach(payment => {
            paymentsHtml += `
                <tr>
                    <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td>${payment.payment_method}</td>
                    <td>$${payment.amount}</td>
                </tr>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Your Receipt - Geeooh Hotel</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1a2a3a; color: #c5a028; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${process.env.HOTEL_NAME || 'Geeooh Hotel'}</h1>
                        <p>Payment Receipt</p>
                    </div>
                    <div class="content">
                        <h2>Thank you for staying with us, ${guest.first_name}!</h2>
                        <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                        <p><strong>Check-out Date:</strong> ${checkOut}</p>
                        <h3>Payment Summary:</h3>
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Method</th><th>Amount</th></td>
                            </thead>
                            <tbody>
                                ${paymentsHtml}
                                <tr style="font-weight: bold;">
                                    <td colspan="2">Total Paid</td>
                                    <td>$${booking.total_amount}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p>We hope you enjoyed your stay and look forward to welcoming you again!</p>
                    </div>
                    <div class="footer">
                        <p>${process.env.HOTEL_NAME}<br>${process.env.HOTEL_ADDRESS}<br>${process.env.HOTEL_PHONE}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Receipt - ${booking.booking_reference}`,
            html: html,
        };

        await this.sendEmail(msg);
        return true;
    }
    
    /**
     * Send request notification to hotel staff
     */
    static async sendRequestNotification(request, amenity) {
        const adminMsg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: process.env.EMAIL_TO || 'hotel@geeooohotel.com',
            subject: `New Request: ${amenity.name} - ${request.request_type || 'General'}`,
            html: `
                <h2>New Service Request</h2>
                <p><strong>Service:</strong> ${amenity.name}</p>
                <p><strong>Guest Name:</strong> ${request.guest_name}</p>
                <p><strong>Email:</strong> ${request.guest_email}</p>
                <p><strong>Phone:</strong> ${request.guest_phone}</p>
                <p><strong>Booking Reference:</strong> ${request.booking_reference || 'No booking yet'}</p>
                <p><strong>Request Details:</strong></p>
                <p>${request.request_details || 'N/A'}</p>
                ${request.preferred_date ? `<p><strong>Preferred Date:</strong> ${new Date(request.preferred_date).toLocaleString()}</p>` : ''}
                ${request.number_of_people ? `<p><strong>Number of People:</strong> ${request.number_of_people}</p>` : ''}
                ${request.number_of_tickets ? `<p><strong>Number of Tickets:</strong> ${request.number_of_tickets}</p>` : ''}
                <hr>
                <p><a href="${process.env.APP_URL}/admin/requests">View in Admin Panel</a></p>
            `
        };
        
        await this.sendEmail(adminMsg);
        
        const guestMsg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: request.guest_email,
            subject: `We received your request - ${amenity.name}`,
            html: `
                <h2>Thank you for your request!</h2>
                <p>Dear ${request.guest_name},</p>
                <p>We have received your request for <strong>${amenity.name}</strong> and our team will contact you within 24 hours.</p>
                <p><strong>Request Reference:</strong> #${request.id}</p>
                <p>If you have any questions, please call us at ${process.env.HOTEL_PHONE}.</p>
                <br>
                <p>Best regards,<br>${process.env.HOTEL_NAME} Team</p>
            `
        };
        
        await this.sendEmail(guestMsg);
    }

    /**
     * Send booking update email when services are added (using simple services array)
     */
    static async sendBookingUpdateSimple(booking, guest, services) {
        const servicesHtml = services.map(service => `
            <tr>
                <td>${service.name}</td>
                <td>${service.quantity}</td>
                <td>$${parseFloat(service.price).toFixed(2)}</td>
                <td>$${(parseFloat(service.price) * parseInt(service.quantity)).toFixed(2)}</td>
            </tr>
        `).join('');
        
        const servicesTotal = services.reduce((sum, s) => sum + (parseFloat(s.price) * parseInt(s.quantity)), 0);
        const newTotal = parseFloat(booking.total_amount);
        
        const html = `
            <h2>Your booking has been updated!</h2>
            <p>Dear ${guest.first_name} ${guest.last_name},</p>
            <p>Additional services have been added to your booking <strong>${booking.booking_reference}</strong>.</p>
            
            <h3>Added Services:</h3>
            <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${servicesHtml}
                </tbody>
                <tfoot>
                    <tr style="background: #f5f5f5;">
                        <td colspan="3"><strong>New Total Amount</strong></td>
                        <td><strong>$${newTotal.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/booking-lookup.html?ref=${booking.booking_reference}">View Your Updated Booking</a></p>
        `;
        
        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Booking Updated - ${booking.booking_reference}`,
            html: html
        };
        
        await this.sendEmail(msg);
    }

    /**
     * Send service payment receipt email (after successful Stripe payment)
     */
    static async sendServicePaymentReceipt(booking, guest, services, totalPaid) {
        const servicesHtml = services.map(service => `
            <tr>
                <td>${service.menu_item ? service.menu_item.name : service.name || 'Service'}</td>
                <td>${service.quantity}</td>
                <td>$${parseFloat(service.price_at_time || service.price).toFixed(2)}</td>
                <td>$${(parseFloat(service.price_at_time || service.price) * parseInt(service.quantity)).toFixed(2)}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Service Payment Receipt - ${booking.booking_reference}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1a2a3a; color: #c5a028; padding: 20px; text-align: center; }
                    .header h1 { margin: 0; }
                    .content { padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #f5f5f5; }
                    .total { font-size: 18px; font-weight: bold; color: #c5a028; text-align: right; margin-top: 20px; }
                    .button { display: inline-block; background: #c5a028; color: #1a2a3a; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${process.env.HOTEL_NAME || 'GEEOOH HOTEL'}</h1>
                        <p>Service Payment Receipt</p>
                    </div>
                    <div class="content">
                        <h2>Payment Confirmed!</h2>
                        <p>Dear ${guest.first_name} ${guest.last_name},</p>
                        <p>Your payment for additional services has been successfully processed.</p>
                        
                        <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                        
                        <h3>Services Paid:</h3>
                        <table>
                            <thead>
                                <tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                            </thead>
                            <tbody>
                                ${servicesHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background: #f5f5f5;">
                                    <td colspan="3"><strong>Total Paid</strong></td>
                                    <td><strong>$${parseFloat(totalPaid).toFixed(2)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <p>These services have been added to your booking and will be ready for you upon arrival.</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}/booking-lookup.html?ref=${booking.booking_reference}" class="button">View Your Booking</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>${process.env.HOTEL_NAME || 'Geeooh Hotel'}<br>${process.env.HOTEL_PHONE || '+1 (555) 123-4567'}</p>
                        <p>&copy; ${new Date().getFullYear()} ${process.env.HOTEL_NAME || 'Geeooh Hotel'}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Service Payment Receipt - ${booking.booking_reference}`,
            html: html
        };

        await this.sendEmail(msg);
    }

    /**
     * Send combined receipt email (room + services together)
     */
    static async sendCombinedReceipt(booking, guest, room, services) {
        const checkIn = new Date(booking.check_in).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const checkOut = new Date(booking.check_out).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const roomTypeData = room.RoomType || null;
        const roomName = roomTypeData ? roomTypeData.name : 'Standard Room';
        
        let servicesHtml = '';
        let servicesTotal = 0;
        
        if (services && services.length > 0) {
            servicesHtml = '<h3>Services Purchased:</h3><table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">';
            servicesHtml += '<thead><tr><th>Service</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>';
            
            for (const service of services) {
                const item = service.menu_item || {};
                const price = parseFloat(service.price_at_time);
                const qty = service.quantity;
                servicesHtml += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${qty}</td>
                        <td>$${price.toFixed(2)}</td>
                        <td>$${(price * qty).toFixed(2)}</td>
                    </tr>
                `;
                servicesTotal += price * qty;
            }
            servicesHtml += '</tbody><tr>';
        }
        
        const roomTotal = parseFloat(booking.total_amount) - servicesTotal;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Booking Receipt - ${booking.booking_reference}</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1a2a3a; color: #c5a028; padding: 20px; text-align: center; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #f5f5f5; }
                    .total { font-size: 18px; font-weight: bold; color: #c5a028; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${process.env.HOTEL_NAME || 'GEEOOH HOTEL'}</h1>
                        <p>Booking Receipt</p>
                    </div>
                    <div class="content">
                        <h2>Thank you for your booking!</h2>
                        <p>Dear ${guest.first_name} ${guest.last_name},</p>
                        <p>Your booking has been confirmed and paid in full.</p>
                        
                        <p><strong>Booking Reference:</strong> ${booking.booking_reference}</p>
                        <p><strong>Status:</strong> <span style="color: #28a745;">Paid in Full</span></p>
                        
                        <h3>Room Details:</h3>
                        <table>
                            <tr><th>Room Type:</th><td>${roomName} (Room ${room.room_number})</td></tr>
                            <tr><th>Check-in:</th><td>${checkIn} (3:00 PM)</td></tr>
                            <tr><th>Check-out:</th><td>${checkOut} (11:00 AM)</td></tr>
                            <tr><th>Nights:</th><td>${booking.total_nights}</td></tr>
                            <tr><th>Guests:</th><td>${booking.adults} adults, ${booking.children} children</td></tr>
                        </table>
                        
                        ${servicesHtml}
                        
                        <h3>Payment Summary:</h3>
                        <table>
                            <tr><td>Room Total:</td><td>$${roomTotal.toFixed(2)}</td></tr>
                            ${servicesTotal > 0 ? `<tr><td>Services Total:</td><td>$${servicesTotal.toFixed(2)}</td></tr>` : ''}
                            <tr style="font-weight: bold;"><td>Total Paid:</td><td>$${parseFloat(booking.total_amount).toFixed(2)}</td></tr>
                        </table>
                        
                        <p><a href="${process.env.APP_URL}/booking-lookup.html?ref=${booking.booking_reference}">View Your Booking</a></p>
                    </div>
                    <div class="footer">
                        <p>${process.env.HOTEL_NAME}<br>${process.env.HOTEL_PHONE}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Booking Receipt - ${booking.booking_reference}`,
            html: html
        };
        
        await this.sendEmail(msg);
    }

    /**
     * Send booking update email when services are added (using association)
     */
    static async sendBookingUpdate(booking, guest) {
        const servicesHtml = booking.services ? booking.services.map(service => `
            <tr>
                <td>${service.menu_item ? service.menu_item.name : 'Service'}</td>
                <td>${service.quantity}</td>
                <td>$${service.price_at_time}</td>
                <td>$${(service.quantity * service.price_at_time).toFixed(2)}</td>
            </tr>
        `).join('') : '<tr><td colspan="4">No services</td>' + '<\/tr>';
        
        const html = `
            <h2>Your booking has been updated!</h2>
            <p>Dear ${guest.first_name} ${guest.last_name},</p>
            <p>Additional services have been added to your booking <strong>${booking.booking_reference}</strong>.</p>
            
            <h3>Added Services:</h3>
            <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${servicesHtml}
                </tbody>
                <tfoot>
                    <tr><td colspan="3"><strong>New Total</strong></td>
                    <td><strong>$${booking.total_amount}</strong></td>
                </tr>
                </tfoot>
            </table>
            
            <p><a href="${process.env.APP_URL}/booking-lookup.html?ref=${booking.booking_reference}">View Your Updated Booking</a></p>
        `;
        
        const msg = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: guest.email,
            subject: `Booking Updated - ${booking.booking_reference}`,
            html: html
        };
        
        await this.sendEmail(msg);
    }
    
    /**
     * Generic email sender with fallback to console
     */
    static async sendEmail(msg) {
        if (resend) {
            try {
                const { data, error } = await resend.emails.send(msg);
                if (error) {
                    console.error('Resend error:', error);
                    return false;
                }
                console.log(`✅ Email sent to ${msg.to} - ID: ${data?.id}`);
                return true;
            } catch (error) {
                console.error('Email sending failed:', error.message);
                console.log('📧 Email would have been sent:');
                console.log('   To:', msg.to);
                console.log('   Subject:', msg.subject);
                return false;
            }
        } else {
            console.log('📧 [DEV] Email would be sent:');
            console.log('   To:', msg.to);
            console.log('   Subject:', msg.subject);
            console.log('   Content preview:', msg.html ? msg.html.substring(0, 200) + '...' : msg.text?.substring(0, 200));
            return true;
        }
    }
}

module.exports = EmailService;