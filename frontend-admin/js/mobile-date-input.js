/**
 * Mobile-Friendly Date Input Component
 * Provides better UX for date input on mobile devices
 * Supports manual typing with auto-formatting and mobile-optimized pickers
 */

class MobileDateInput {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            format: 'DD/MM/YYYY',
            placeholder: 'DD/MM/YYYY',
            allowManualInput: true,
            showNativePicker: true,
            minYear: 1900,
            maxYear: new Date().getFullYear() + 10,
            ...options
        };
        
        this.init();
    }

    init() {
        this.setupInput();
        this.addEventListeners();
        this.createMobileInterface();
    }

    setupInput() {
        // Set input attributes for better mobile experience
        this.input.setAttribute('placeholder', this.options.placeholder);
        this.input.setAttribute('inputmode', 'numeric');
        this.input.setAttribute('pattern', '[0-9/]*');
        this.input.style.position = 'relative';
        
        // Add CSS class for styling
        this.input.classList.add('mobile-date-input');
    }

    addEventListeners() {
        // Auto-formatting while typing
        this.input.addEventListener('input', (e) => {
            this.formatInput(e);
        });

        // Handle paste events
        this.input.addEventListener('paste', (e) => {
            setTimeout(() => this.formatInput(e), 10);
        });

        // Show mobile picker on focus (mobile devices)
        this.input.addEventListener('focus', (e) => {
            if (this.isMobileDevice()) {
                this.showMobilePicker();
            }
        });

        // Validate on blur
        this.input.addEventListener('blur', (e) => {
            this.validateDate();
        });
    }

    formatInput(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        let formattedValue = '';

        // Format as DD/MM/YYYY
        if (value.length >= 1) {
            formattedValue = value.substring(0, 2);
        }
        if (value.length >= 3) {
            formattedValue += '/' + value.substring(2, 4);
        }
        if (value.length >= 5) {
            formattedValue += '/' + value.substring(4, 8);
        }

        // Update input value
        e.target.value = formattedValue;

        // Auto-advance cursor after complete sections
        if (formattedValue.length === 3 || formattedValue.length === 6) {
            // Cursor is automatically positioned after the slash
        }
    }

    createMobileInterface() {
        // Create container for mobile picker
        this.pickerContainer = document.createElement('div');
        this.pickerContainer.className = 'mobile-date-picker';
        this.pickerContainer.style.display = 'none';
        
        // Create the mobile-friendly picker HTML
        this.pickerContainer.innerHTML = `
            <div class="date-picker-overlay">
                <div class="date-picker-modal">
                    <div class="date-picker-header">
                        <h3>Select Date</h3>
                        <button type="button" class="close-picker">&times;</button>
                    </div>
                    <div class="date-picker-body">
                        <div class="date-input-row">
                            <label>Manual Input:</label>
                            <input type="text" class="manual-date-input" placeholder="DD/MM/YYYY" maxlength="10">
                        </div>
                        <div class="date-selectors">
                            <div class="selector-group">
                                <label>Day</label>
                                <select class="day-select">
                                    ${this.generateDayOptions()}
                                </select>
                            </div>
                            <div class="selector-group">
                                <label>Month</label>
                                <select class="month-select">
                                    ${this.generateMonthOptions()}
                                </select>
                            </div>
                            <div class="selector-group">
                                <label>Year</label>
                                <select class="year-select">
                                    ${this.generateYearOptions()}
                                </select>
                            </div>
                        </div>
                        <div class="quick-dates">
                            <button type="button" class="quick-date-btn" data-date="today">Today</button>
                            <button type="button" class="quick-date-btn" data-date="yesterday">Yesterday</button>
                            <button type="button" class="quick-date-btn" data-date="week-ago">1 Week Ago</button>
                            <button type="button" class="quick-date-btn" data-date="month-ago">1 Month Ago</button>
                        </div>
                    </div>
                    <div class="date-picker-footer">
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                        <button type="button" class="btn btn-primary confirm-btn">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        // Insert after the input
        this.input.parentNode.insertBefore(this.pickerContainer, this.input.nextSibling);
        
        // Add event listeners to picker
        this.setupPickerEvents();
    }

    generateDayOptions() {
        let options = '<option value="">Day</option>';
        for (let i = 1; i <= 31; i++) {
            const day = i.toString().padStart(2, '0');
            options += `<option value="${day}">${day}</option>`;
        }
        return options;
    }

    generateMonthOptions() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        let options = '<option value="">Month</option>';
        months.forEach((month, index) => {
            const monthNum = (index + 1).toString().padStart(2, '0');
            options += `<option value="${monthNum}">${month}</option>`;
        });
        return options;
    }

    generateYearOptions() {
        let options = '<option value="">Year</option>';
        // Start from current year and go backwards (better for birth dates)
        for (let year = this.options.maxYear; year >= this.options.minYear; year--) {
            options += `<option value="${year}">${year}</option>`;
        }
        return options;
    }

    setupPickerEvents() {
        const modal = this.pickerContainer.querySelector('.date-picker-modal');
        const overlay = this.pickerContainer.querySelector('.date-picker-overlay');
        const closeBtn = this.pickerContainer.querySelector('.close-picker');
        const cancelBtn = this.pickerContainer.querySelector('.cancel-btn');
        const confirmBtn = this.pickerContainer.querySelector('.confirm-btn');
        const manualInput = this.pickerContainer.querySelector('.manual-date-input');
        const daySelect = this.pickerContainer.querySelector('.day-select');
        const monthSelect = this.pickerContainer.querySelector('.month-select');
        const yearSelect = this.pickerContainer.querySelector('.year-select');
        const quickDateBtns = this.pickerContainer.querySelectorAll('.quick-date-btn');

        // Close picker events
        closeBtn.addEventListener('click', () => this.hideMobilePicker());
        cancelBtn.addEventListener('click', () => this.hideMobilePicker());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hideMobilePicker();
        });

        // Confirm selection
        confirmBtn.addEventListener('click', () => {
            const selectedDate = this.getSelectedDate();
            if (selectedDate) {
                this.input.value = selectedDate;
                this.input.dispatchEvent(new Event('change'));
                this.hideMobilePicker();
            }
        });

        // Manual input formatting
        manualInput.addEventListener('input', (e) => {
            this.formatInput(e);
            this.syncSelectorsFromManual(e.target.value);
        });

        // Selector changes
        [daySelect, monthSelect, yearSelect].forEach(select => {
            select.addEventListener('change', () => {
                this.syncManualFromSelectors();
            });
        });

        // Quick date buttons
        quickDateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const dateType = btn.dataset.date;
                const quickDate = this.getQuickDate(dateType);
                manualInput.value = quickDate;
                this.syncSelectorsFromManual(quickDate);
            });
        });
    }

    showMobilePicker() {
        // Populate current value
        const currentValue = this.input.value;
        const manualInput = this.pickerContainer.querySelector('.manual-date-input');
        manualInput.value = currentValue;
        
        if (currentValue) {
            this.syncSelectorsFromManual(currentValue);
        }

        // Show picker
        this.pickerContainer.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    hideMobilePicker() {
        this.pickerContainer.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }

    syncSelectorsFromManual(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            
            const daySelect = this.pickerContainer.querySelector('.day-select');
            const monthSelect = this.pickerContainer.querySelector('.month-select');
            const yearSelect = this.pickerContainer.querySelector('.year-select');
            
            daySelect.value = day;
            monthSelect.value = month;
            yearSelect.value = year;
        }
    }

    syncManualFromSelectors() {
        const daySelect = this.pickerContainer.querySelector('.day-select');
        const monthSelect = this.pickerContainer.querySelector('.month-select');
        const yearSelect = this.pickerContainer.querySelector('.year-select');
        const manualInput = this.pickerContainer.querySelector('.manual-date-input');
        
        const day = daySelect.value;
        const month = monthSelect.value;
        const year = yearSelect.value;
        
        if (day && month && year) {
            manualInput.value = `${day}/${month}/${year}`;
        }
    }

    getSelectedDate() {
        const manualInput = this.pickerContainer.querySelector('.manual-date-input');
        return manualInput.value;
    }

    getQuickDate(type) {
        const today = new Date();
        let targetDate = new Date(today);
        
        switch (type) {
            case 'today':
                break;
            case 'yesterday':
                targetDate.setDate(today.getDate() - 1);
                break;
            case 'week-ago':
                targetDate.setDate(today.getDate() - 7);
                break;
            case 'month-ago':
                targetDate.setMonth(today.getMonth() - 1);
                break;
        }
        
        const day = targetDate.getDate().toString().padStart(2, '0');
        const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
        const year = targetDate.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    validateDate() {
        const value = this.input.value;
        if (!value) return true;
        
        const parts = value.split('/');
        if (parts.length !== 3) {
            this.showError('Please enter date in DD/MM/YYYY format');
            return false;
        }
        
        const [day, month, year] = parts.map(p => parseInt(p));
        const date = new Date(year, month - 1, day);
        
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
            this.showError('Please enter a valid date');
            return false;
        }
        
        this.clearError();
        return true;
    }

    showError(message) {
        // Remove existing error
        this.clearError();
        
        // Add error styling
        this.input.classList.add('error');
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'date-input-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #dc3545;
            font-size: 12px;
            margin-top: 4px;
        `;
        
        this.input.parentNode.insertBefore(errorDiv, this.input.nextSibling);
    }

    clearError() {
        this.input.classList.remove('error');
        const existingError = this.input.parentNode.querySelector('.date-input-error');
        if (existingError) {
            existingError.remove();
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // Get the date value in various formats
    getValue(format = 'DD/MM/YYYY') {
        const value = this.input.value;
        if (!value) return '';
        
        const parts = value.split('/');
        if (parts.length !== 3) return value;
        
        const [day, month, year] = parts;
        
        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
            default:
                return value;
        }
    }

    // Set the date value
    setValue(dateStr, format = 'DD/MM/YYYY') {
        if (!dateStr) {
            this.input.value = '';
            return;
        }
        
        let day, month, year;
        
        if (format === 'YYYY-MM-DD') {
            [year, month, day] = dateStr.split('-');
        } else if (format === 'MM/DD/YYYY') {
            [month, day, year] = dateStr.split('/');
        } else {
            [day, month, year] = dateStr.split('/');
        }
        
        if (day && month && year) {
            this.input.value = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
    }
}

// Auto-initialize for inputs with mobile-date class
document.addEventListener('DOMContentLoaded', function() {
    const mobileDateInputs = document.querySelectorAll('input[type="date"], .mobile-date');
    mobileDateInputs.forEach(input => {
        // Don't initialize if already initialized
        if (!input.mobileDateInput) {
            input.mobileDateInput = new MobileDateInput(input);
        }
    });
});

// Export for manual initialization
window.MobileDateInput = MobileDateInput;