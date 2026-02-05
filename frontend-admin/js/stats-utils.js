/**
 * Simple Stats Toggle Functions
 * Updated: Stats start expanded and fold when clicked
 */

// Simple stats toggle for members
function toggleStats() {
    const content = document.getElementById('stats-content');
    const toggle = document.getElementById('stats-toggle');
    
    if (content && toggle) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            toggle.style.transform = 'rotate(0deg)';
        }
    }
}

// Simple stats toggle for accounting
function toggleAccountingStats() {
    const content = document.getElementById('accounting-stats-content');
    const toggle = document.getElementById('accounting-stats-toggle');
    
    if (content && toggle) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.classList.remove('fa-chevron-right');
            toggle.classList.add('fa-chevron-down');
        } else {
            content.style.display = 'none';
            toggle.classList.remove('fa-chevron-down');
            toggle.classList.add('fa-chevron-right');
        }
    }
}

// Initialize stats - start collapsed for accounting, expanded for members
document.addEventListener('DOMContentLoaded', function() {
    // Members stats - start expanded
    const membersContent = document.getElementById('stats-content');
    const membersToggle = document.getElementById('stats-toggle');
    if (membersContent && membersToggle) {
        membersContent.style.display = 'block'; // Start expanded
        membersToggle.style.transform = 'rotate(180deg)'; // Arrow pointing up
    }
    
    // Accounting stats - start collapsed
    const accountingContent = document.getElementById('accounting-stats-content');
    const accountingToggle = document.getElementById('accounting-stats-toggle');
    if (accountingContent && accountingToggle) {
        accountingContent.style.display = 'none'; // Start collapsed
        accountingToggle.classList.remove('fa-chevron-down');
        accountingToggle.classList.add('fa-chevron-right'); // Arrow pointing right
    }
});

console.log('✅ Simple stats loaded - accounting starts collapsed, members expanded');