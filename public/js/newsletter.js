// Newsletter subscription handler for all pages
document.addEventListener('DOMContentLoaded', function() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    const emailInput = document.getElementById('newsletter-email');
    
    if (!subscribeBtn || !emailInput) return;
    
    subscribeBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        const email = emailInput.value;
        
        if (!email) {
            showToastMessage('Please enter your email address', 'warning');
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            showToastMessage('Please enter a valid email address', 'warning');
            return;
        }
        
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.disabled = true;
        
        try {
            const response = await fetch('/api/contact/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();
            
            if (data.success) {
                showToastMessage('? ' + data.message, 'success');
                emailInput.value = '';
            } else {
                showToastMessage('? ' + (data.error || 'Subscription failed'), 'error');
            }
        } catch (error) {
            showToastMessage('? Network error. Please try again.', 'error');
        } finally {
            this.innerHTML = originalText;
            this.disabled = false;
        }
    });
});

function showToastMessage(message, type) {
    let container = document.getElementById('global-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'global-toast-container';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#fff3cd'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#856404'};
        border-left: 4px solid ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 250px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `<span>${message}</span><button style="background:none;border:none;font-size:1.2rem;cursor:pointer;margin-left:10px;" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast && toast.remove) toast.remove(); }, 5000);
}

if (!document.querySelector('#toast-animation-style')) {
    const style = document.createElement('style');
    style.id = 'toast-animation-style';
    style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
    document.head.appendChild(style);
}