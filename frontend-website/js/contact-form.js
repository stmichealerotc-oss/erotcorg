// Contact Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
});

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    // Remove any existing messages
    removeFormMessages();
    
    try {
        // Validate required fields
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject');
        const message = formData.get('message');
        
        if (!name || !email || !subject || !message) {
            throw new Error('Please fill in all required fields.');
        }
        
        // Validate email format
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        // Validate message length
        if (message.length < 10) {
            throw new Error('Message must be at least 10 characters long.');
        }
        
        // Prepare data for backend API
        const data = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: formData.get('phone') ? formData.get('phone').trim() : '',
            subject: subject,
            message: message.trim(),
            newsletter: formData.get('newsletter') === 'on',
            timestamp: new Date().toISOString(),
            source: 'website_contact_form'
        };
        
        // Send to backend API
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.errors && errorData.errors.length > 0) {
                // Show validation errors
                const errorMessages = errorData.errors.map(err => err.msg).join(', ');
                throw new Error(errorMessages);
            }
            throw new Error(errorData.message || 'Failed to send message. Please try again.');
        }
        
        const result = await response.json();
        
        // Show success message
        showFormMessage('success', 'Thank you for your message! We will get back to you within 24 hours.');
        
        // Reset form
        form.reset();
        
        // Track form submission (if analytics is available)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_submit', {
                'event_category': 'Contact',
                'event_label': subject
            });
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showFormMessage('error', error.message || 'Sorry, there was an error sending your message. Please try again or contact us directly.');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }
}

function showFormMessage(type, message) {
    const form = document.getElementById('contact-form');
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
    
    form.insertBefore(messageDiv, form.firstChild);
    
    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto-remove success messages after 10 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 10000);
    }
}

function removeFormMessages() {
    const messages = document.querySelectorAll('.form-message');
    messages.forEach(message => message.remove());
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Form field enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Auto-format phone number
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.startsWith('61')) {
                    // International format
                    value = '+' + value;
                } else if (value.startsWith('0')) {
                    // Australian format
                    value = value.replace(/^0/, '0');
                }
            }
            e.target.value = value;
        });
    }
    
    // Character counter for message field
    const messageField = document.getElementById('message');
    if (messageField) {
        const maxLength = 1000;
        const counter = document.createElement('div');
        counter.style.cssText = 'text-align: right; font-size: 0.8rem; color: #666; margin-top: 0.25rem;';
        messageField.parentNode.appendChild(counter);
        
        function updateCounter() {
            const remaining = maxLength - messageField.value.length;
            counter.textContent = `${messageField.value.length}/${maxLength} characters`;
            counter.style.color = remaining < 50 ? '#d32f2f' : '#666';
        }
        
        messageField.addEventListener('input', updateCounter);
        messageField.setAttribute('maxlength', maxLength);
        updateCounter();
    }
    
    // Subject-specific message placeholders
    const subjectField = document.getElementById('subject');
    if (subjectField && messageField) {
        const placeholders = {
            'general': 'Please share your question or how we can help you...',
            'services': 'Tell us about your interest in our church services...',
            'kids-program': 'Ask about our Kids Sunday School program...',
            'volunteer': 'Let us know how you\'d like to volunteer...',
            'donation': 'Ask about donation methods or tax receipts...',
            'pastoral': 'Share your pastoral care needs (confidential)...',
            'events': 'Ask about upcoming events or celebrations...',
            'other': 'Please describe your inquiry...'
        };
        
        subjectField.addEventListener('change', function() {
            const placeholder = placeholders[this.value] || placeholders['other'];
            messageField.setAttribute('placeholder', placeholder);
        });
    }
});