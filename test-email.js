require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    console.log('Testing Resend email...');
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'ganiyuusman43@gmail.com',  // Change to YOUR email
            subject: 'Test Email from Geeooh Hotel',
            html: '<h1>Hello!</h1><p>Your Resend email service is working!</p>',
        });
        
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('✅ Email sent! ID:', data.id);
        }
    } catch (error) {
        console.error('Failed:', error.message);
    }
}

testEmail();