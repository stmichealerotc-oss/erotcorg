const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { authenticateToken, committeeOnly } = require('../middleware/auth');
const emailService = require('../utils/emailService');

// ========================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ========================================

// GET /api/member-cards/public/:id - Public access to member card
router.get('/public/:id', async (req, res) => {
    try {
        console.log(`🔓 Public card request for ID: ${req.params.id}`);
        
        const member = await Member.findByAnyId(req.params.id);
        if (!member) {
            console.log(`❌ Member not found for ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Member card not found' });
        }

        console.log(`✅ Found member: ${member.firstName} ${member.lastName} (${member.displayId})`);

        // Generate public-friendly card HTML (same as web version but with public notice)
        const cardHTML = generatePublicMemberCardHTML(member);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(cardHTML);
        
    } catch (error) {
        console.error('❌ Error generating public member card:', error);
        res.status(500).json({ error: 'Failed to generate member card' });
    }
});

// ========================================
// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ========================================

// Create a separate router for protected routes
const protectedRouter = express.Router();

// Apply authentication to protected routes only
protectedRouter.use(authenticateToken);
protectedRouter.use(committeeOnly);

// Generate Public Member ID Card HTML (no authentication required)
function generatePublicMemberCardHTML(member) {
    const currentYear = new Date().getFullYear();
    const joinYear = member.joinDate ? new Date(member.joinDate).getFullYear() : currentYear;
    const status = member.status || 'active';
    const statusColor = status === 'active' ? '#28a745' : '#dc3545';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Member ID Card - ${member.displayId}</title>
        <style>
            /* Base styles for web view */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                margin: 0;
                padding: 60px 20px 20px;
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            /* PUBLIC NOTICE STYLES */
            .public-notice {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #e8f5e8;
                padding: 12px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                max-width: 400px;
                text-align: center;
                border-left: 4px solid #28a745;
                font-size: 13px;
            }
            
            .public-notice h4 {
                color: #155724;
                margin: 0 0 5px 0;
                font-size: 14px;
            }
            
            .public-notice p {
                color: #2d5a2d;
                margin: 0;
                line-height: 1.4;
            }
            
            /* PRINT & SAVE CONTROLS */
            .print-controls {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                gap: 10px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.95);
                padding: 12px 18px;
                border-radius: 12px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                border: 1px solid #d1e7ff;
            }
            
            .print-button, .download-button {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.3s ease;
                box-shadow: 0 3px 8px rgba(30, 60, 114, 0.3);
                min-width: 120px;
                justify-content: center;
            }
            
            .download-button {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                box-shadow: 0 3px 8px rgba(40, 167, 69, 0.3);
            }
            
            .print-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(30, 60, 114, 0.4);
                background: linear-gradient(135deg, #2a5298 0%, #1e3c72 100%);
            }
            
            .download-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(40, 167, 69, 0.4);
                background: linear-gradient(135deg, #20c997 0%, #28a745 100%);
            }
            
            .print-icon, .download-icon {
                font-size: 16px;
            }
            
            /* Card container */
            .card-container {
                width: 336px;
                height: 192px;
                background: white;
                border: 2px solid #1e3c72;
                border-radius: 4px;
                position: relative;
                font-family: 'Courier New', monospace, Arial, sans-serif;
                box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                margin-top: 40px;
                overflow: hidden;
            }
            
            /* Print-specific styles */
            @media print {
                body {
                    background: white !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                    flex-direction: unset !important;
                    align-items: unset !important;
                    justify-content: unset !important;
                    min-height: unset !important;
                }
                
                .print-controls,
                .public-notice {
                    display: none !important;
                }
                
                .card-container {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 336px !important;
                    height: 192px !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: 2px solid #1e3c72 !important;
                    page-break-inside: avoid !important;
                }
                
                /* Hide everything except the card */
                body > *:not(.card-container) {
                    display: none !important;
                }
                
                @page {
                    size: 3.5in 2in;
                    margin: 0;
                }
            }
        </style>
    </head>
    <body>
        <!-- Public Access Notice -->
        <div class="public-notice">
            <h4>🔓 Public Member Card</h4>
            <p>This is your secure member ID card. You can print or save it safely.</p>
        </div>
        
        <!-- Print & Save Controls -->
        <div class="print-controls">
            <button class="print-button" onclick="printCard()">
                <span class="print-icon">🖨️</span>
                Print Card
            </button>
            <button class="download-button" onclick="downloadCard()">
                <span class="download-icon">💾</span>
                Save Card
            </button>
        </div>
        
        <!-- Member Card (Simple Table Version) -->
        <table class="card-container" cellpadding="0" cellspacing="0" border="0" width="336" height="192" style="width: 336px; height: 192px; max-width: 336px; max-height: 192px; margin: 0 auto; background: white; border: 2px solid #1e3c72; border-collapse: collapse; font-family: 'Courier New', monospace, Arial, sans-serif;">
            
            <!-- HEADER ROW 1 -->
            <tr>
                <td colspan="2" align="center" style="background: #1e3c72; color: #ffffff; padding: 4px 8px; border-bottom: 1px solid #1e3c72; font-weight: bold; font-size: 11px; line-height: 1.2;">
                    ST. MICHAEL EROTC
                </td>
            </tr>
            
            <!-- HEADER ROW 2 -->
            <tr>
                <td colspan="2" align="center" style="background: #2a5298; color: #ffffff; padding: 2px 8px 4px 8px; border-bottom: 1px solid #2a5298; font-size: 9px; line-height: 1.2;">
                    ERITREAN ORTHODOX CHURCH
                </td>
            </tr>
            
            <!-- ID SECTION -->
            <tr>
                <td colspan="2" align="center" style="background: #f0f0f0; padding: 6px 8px; border-bottom: 1px solid #1e3c72; font-weight: bold; font-size: 16px; line-height: 1.2;">
                    ID: ${member.displayId}
                </td>
            </tr>
            
            <!-- MEMBER INFO ROWS -->
            <tr>
                <td style="padding: 3px 8px; font-size: 9px; font-weight: bold; color: #666666; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #e0e0e0; width: 40%;">
                    NAME
                </td>
                <td align="right" style="padding: 3px 8px; font-size: 9px; font-weight: bold; color: #1e3c72; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    ${member.firstName} ${member.lastName}
                </td>
            </tr>
            
            ${member.phone ? `
            <tr>
                <td style="padding: 3px 8px; font-size: 9px; font-weight: bold; color: #666666; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    PHONE
                </td>
                <td align="right" style="padding: 3px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    ${member.phone}
                </td>
            </tr>` : ''}
            
            <tr>
                <td style="padding: 3px 8px; font-size: 9px; font-weight: bold; color: #666666; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    STATUS
                </td>
                <td align="right" style="padding: 3px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    <span style="background: ${statusColor}; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold; text-transform: uppercase; display: inline-block;">
                        ${status.toUpperCase()}
                    </span>
                </td>
            </tr>
            
            <tr>
                <td style="padding: 3px 8px; font-size: 9px; font-weight: bold; color: #666666; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    MEMBER SINCE
                </td>
                <td align="right" style="padding: 3px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    ${joinYear}
                </td>
            </tr>
            
            <tr>
                <td style="padding: 3px 8px; font-size: 9px; font-weight: bold; color: #666666; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    VALID UNTIL
                </td>
                <td align="right" style="padding: 3px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #e0e0e0;">
                    Dec ${currentYear}
                </td>
            </tr>
            
            <!-- FOOTER ROW -->
            <tr>
                <td colspan="2" align="center" style="background: #f8f9fa; color: #666666; padding: 3px 8px; border-top: 1px solid #e9ecef; font-size: 7px; line-height: 1.3;">
                    60 OSBORNE ST, JOONDANNA WA 6060 | STMICHAELEROTC@GMAIL.COM
                </td>
            </tr>
        </table>
        
        <!-- Load html2canvas for download functionality -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        
        <!-- JavaScript for print and download functionality -->
        <script>
            function printCard() {
                window.print();
            }
            
            function downloadCard() {
                const card = document.querySelector('.card-container');
                
                if (typeof html2canvas !== 'undefined') {
                    html2canvas(card, {
                        width: 336,
                        height: 192,
                        scale: 3,
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        allowTaint: true
                    }).then(canvas => {
                        const link = document.createElement('a');
                        link.download = 'member-card-${member.displayId}.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        
                        // Show success message
                        alert('✅ Card saved successfully!\\n\\nThe card has been downloaded as a PNG image file.');
                    }).catch(error => {
                        console.error('Error generating image:', error);
                        fallbackDownload();
                    });
                } else {
                    fallbackDownload();
                }
            }
            
            function fallbackDownload() {
                alert('To save the card:\\n\\n1. Press Ctrl+P (or Cmd+P on Mac)\\n2. Select "Save as PDF" as destination\\n3. Choose "More settings" and set:\\n   - Paper size: Custom (3.5 x 2 inches)\\n   - Margins: None\\n4. Click Save');
                window.print();
            }
            
            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                    e.preventDefault();
                    printCard();
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    downloadCard();
                }
            });
            
            // Button animations
            document.querySelector('.print-button').addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
            
            document.querySelector('.download-button').addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        </script>
    </body>
    </html>`;
}

// Generate Digital Member ID Card HTML (WEB VIEW VERSION)
function generateMemberCardHTML(member) {
    const currentYear = new Date().getFullYear();
    const joinYear = member.joinDate ? new Date(member.joinDate).getFullYear() : currentYear;
    const status = member.status || 'active';
    const statusColor = status === 'active' ? '#28a745' : '#dc3545';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Member ID Card - ${member.displayId}</title>
        <style>
            /* Base styles for web view */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                margin: 0;
                padding: 60px 20px 20px;
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            /* PRINT BUTTON STYLES */
            .print-controls {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                gap: 10px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.95);
                padding: 12px 18px;
                border-radius: 12px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                border: 1px solid #d1e7ff;
            }
            
            .print-button, .download-button {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.3s ease;
                box-shadow: 0 3px 8px rgba(30, 60, 114, 0.3);
                min-width: 120px;
                justify-content: center;
            }
            
            .download-button {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                box-shadow: 0 3px 8px rgba(40, 167, 69, 0.3);
            }
            
            .print-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(30, 60, 114, 0.4);
                background: linear-gradient(135deg, #2a5298 0%, #1e3c72 100%);
            }
            
            .download-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(40, 167, 69, 0.4);
                background: linear-gradient(135deg, #20c997 0%, #28a745 100%);
            }
            
            .print-icon {
                font-size: 18px;
            }
            
            .print-instructions {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 15px 25px;
                border-radius: 12px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                z-index: 1000;
                max-width: 320px;
                text-align: center;
                border-left: 5px solid #1e3c72;
                border-top: 1px solid #e9ecef;
                border-bottom: 1px solid #e9ecef;
                border-right: 1px solid #e9ecef;
            }
            
            .print-instructions h3 {
                color: #1e3c72;
                margin-bottom: 8px;
                font-size: 15px;
            }
            
            .print-instructions p {
                color: #666;
                font-size: 13px;
                line-height: 1.5;
                margin-bottom: 5px;
            }
            
            .print-instructions .keyboard-shortcut {
                background: #f8f9fa;
                padding: 3px 8px;
                border-radius: 4px;
                font-family: monospace;
                color: #1e3c72;
                font-weight: bold;
            }
            
            /* Card container for web view */
            .card-wrapper {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 40px;
                padding: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                border: 1px solid #e9ecef;
            }
            
            /* Card container for print - DIFFERENT STYLES */
            #printable-card {
                width: 336px !important;
                height: 192px !important;
                background: white;
                border: 2px solid #1e3c72 !important;
                border-radius: 4px;
                position: relative;
                font-family: 'Courier New', monospace, Arial, sans-serif;
                box-shadow: none;
                overflow: hidden;
                display: none; /* Hidden by default, shown only during print */
            }
            
            /* View-only version (for display on webpage) */
            .view-card {
                width: 336px;
                height: 192px;
                background: white;
                border: 2px solid #1e3c72;
                border-radius: 4px;
                position: relative;
                font-family: 'Courier New', monospace, Arial, sans-serif;
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                overflow: hidden;
            }
            
            /* Print-specific styles */
            @media print {
                /* Hide everything on the page */
                body * {
                    display: none !important;
                }
                
                /* Only show the printable card */
                #printable-card,
                #printable-card * {
                    display: block !important;
                    visibility: visible !important;
                }
                
                #printable-card {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 336px !important;
                    height: 192px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: 2px solid #1e3c72 !important;
                    background: white !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                
                /* Ensure no margins on the page */
                @page {
                    size: 3.5in 2in !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                html, body {
                    width: 336px !important;
                    height: 192px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                }
            }
            
            /* Card sections (shared by both view and print) */
            .card-header {
                display: flex;
                background: #1e3c72;
                color: white;
                height: 40px;
                border-bottom: 1px solid #ffffff;
            }
            
            .logo-left, .logo-right {
                width: 15%;
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1px solid rgba(255,255,255,0.3);
                overflow: hidden;
            }
            
            .logo-right {
                border-right: none;
                border-left: 1px solid rgba(255,255,255,0.3);
            }
            
            .header-img {
                width: 24px;
                height: 24px;
                object-fit: contain;
                filter: brightness(0) invert(1);
            }
            
            .church-name {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                text-align: center;
                padding: 0 5px;
            }
            
            .church-subtitle {
                background: #2a5298;
                color: white;
                text-align: center;
                padding: 3px 0;
                font-size: 9px;
                border-bottom: 1px solid #1e3c72;
            }
            
            .id-section {
                background: #e8f4ff;
                text-align: center;
                padding: 8px 0;
                border-bottom: 2px solid #1e3c72;
                font-weight: bold;
                font-size: 16px;
                color: #1e3c72;
            }
            
            .member-info {
                padding: 0;
            }
            
            .info-row {
                display: flex;
                padding: 4px 8px;
                font-size: 9px;
                background: #f0f8ff;
                border-bottom: 1px solid #d1e7ff;
            }
            
            .info-row:last-child {
                border-bottom: none;
            }
            
            .info-label {
                font-weight: bold;
                text-transform: uppercase;
                width: 40%;
                color: #1e3c72;
            }
            
            .info-value {
                flex: 1;
                text-align: right;
                color: #333;
            }
            
            .member-name {
                font-size: 10px;
                font-weight: bold;
                color: #1e3c72 !important;
            }
            
            .status-badge {
                background: ${statusColor};
                color: white;
                padding: 3px 8px;
                border-radius: 12px;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 8px;
                display: inline-block;
            }
            
            .card-footer {
                display: flex;
                background: #1e3c72;
                color: white;
                height: 30px;
                border-top: 1px solid #ffffff;
            }
            
            .footer-block {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 7px;
                border-right: 1px solid rgba(255,255,255,0.3);
                padding: 0 5px;
                text-align: center;
            }
            
            .footer-block:last-child {
                border-right: none;
            }
            
            .footer-block.middle {
                background: #2a5298;
            }
            
            .footer-bottom {
                background: #2a5298;
                color: white;
                text-align: center;
                padding: 2px 0 3px 0;
                font-size: 7px;
            }
        </style>
    </head>
    <body>
        <!-- Print Controls -->
        <div class="print-controls">
            <button class="print-button" onclick="printCard()">
                <span class="print-icon">🖨️</span>
                Print Card
            </button>
            <button class="download-button" onclick="downloadCard()">
                <span class="download-icon">💾</span>
                Save Card
            </button>
        </div>
        
        <!-- Print Instructions -->
        <div class="print-instructions">
            <h3>📄 Card Options</h3>
            <p><strong>🖨️ Print:</strong> Print directly on cardstock paper</p>
            <p><strong>💾 Save:</strong> Download as PNG image to save on phone/computer</p>
            <p><strong>⌨️ Shortcut:</strong> Press <span class="keyboard-shortcut">Ctrl+P</span> to print</p>
        </div>
        
        <!-- View-Only Card (for display) -->
        <div class="card-wrapper">
            <div class="view-card">
                <!-- Header with church images -->
                <div class="card-header">
                    <div class="logo-left">
                        <img src="https://i.pinimg.com/736x/55/c3/10/55c310adca255f4aaa3c0fe42f2352a3.jpg" alt="Church Icon" class="header-img">
                    </div>
                    <div class="church-name">ST. MICHAEL EROTC</div>
                    <div class="logo-right">
                        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0DSSxnr990Od7vwChi8zT3NhnsB5rhpyTXQ&s" alt="Church Icon" class="header-img">
                    </div>
                </div>
                
                <!-- Subtitle -->
                <div class="church-subtitle">
                    ERITREAN ORTHODOX CHURCH
                </div>
                
                <!-- ID Section -->
                <div class="id-section">
                    ID: ${member.displayId}
                </div>
                
                <!-- Member Info -->
                <div class="member-info">
                    <div class="info-row">
                        <span class="info-label">NAME</span>
                        <span class="info-value member-name">${member.firstName} ${member.lastName}</span>
                    </div>
                    
                    ${member.phone ? `
                    <div class="info-row">
                        <span class="info-label">PHONE</span>
                        <span class="info-value">${member.phone}</span>
                    </div>
                    ` : ''}
                    
                    <div class="info-row">
                        <span class="info-label">STATUS</span>
                        <span class="info-value">
                            <span class="status-badge">${status.toUpperCase()}</span>
                        </span>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">MEMBER SINCE</span>
                        <span class="info-value">${joinYear}</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">VALID UNTIL</span>
                        <span class="info-value">DEC ${currentYear}</span>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="card-footer">
                    <div class="footer-block">⛪ CHURCH</div>
                    <div class="footer-block middle">60 OSBORNE ST</div>
                    <div class="footer-block">WA 6060</div>
                </div>
                
                <div class="footer-bottom">
                    STMICHAELEROTC@GMAIL.COM
                </div>
            </div>
        </div>
        
        <!-- Printable Card (hidden, only for printing) -->
        <div id="printable-card">
            <!-- Header with church images -->
            <div class="card-header">
                <div class="logo-left">
                    <img src="https://i.pinimg.com/736x/55/c3/10/55c310adca255f4aaa3c0fe42f2352a3.jpg" alt="Church Icon" class="header-img">
                </div>
                <div class="church-name">ST. MICHAEL EROTC</div>
                <div class="logo-right">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0DSSxnr990Od7vwChi8zT3NhnsB5rhpyTXQ&s" alt="Church Icon" class="header-img">
                </div>
            </div>
            
            <!-- Subtitle -->
            <div class="church-subtitle">
                ERITREAN ORTHODOX CHURCH
            </div>
            
            <!-- ID Section -->
            <div class="id-section">
                ID: ${member.displayId}
            </div>
            
            <!-- Member Info -->
            <div class="member-info">
                <div class="info-row">
                    <span class="info-label">NAME</span>
                    <span class="info-value member-name">${member.firstName} ${member.lastName}</span>
                </div>
                
                ${member.phone ? `
                <div class="info-row">
                    <span class="info-label">PHONE</span>
                    <span class="info-value">${member.phone}</span>
                </div>
                ` : ''}
                
                <div class="info-row">
                    <span class="info-label">STATUS</span>
                    <span class="info-value">
                        <span class="status-badge">${status.toUpperCase()}</span>
                    </span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">MEMBER SINCE</span>
                    <span class="info-value">${joinYear}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">VALID UNTIL</span>
                    <span class="info-value">DEC ${currentYear}</span>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="card-footer">
                <div class="footer-block">⛪ CHURCH</div>
                <div class="footer-block middle">60 OSBORNE ST</div>
                <div class="footer-block">WA 6060</div>
            </div>
            
            <div class="footer-bottom">
                STMICHAELEROTC@GMAIL.COM
            </div>
        </div>
        
        <!-- JavaScript for print and download functionality -->
        <script>
            function printCard() {
                // Trigger the browser's print dialog
                window.print();
            }
            
            function downloadCard() {
                // Create a canvas to capture the card as an image
                const card = document.querySelector('.card-container');
                
                // Use html2canvas library if available, otherwise use a fallback method
                if (typeof html2canvas !== 'undefined') {
                    html2canvas(card, {
                        width: 336,
                        height: 192,
                        scale: 3, // Higher resolution
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        allowTaint: true
                    }).then(canvas => {
                        // Create download link
                        const link = document.createElement('a');
                        link.download = 'member-card-${member.displayId}.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    }).catch(error => {
                        console.error('Error generating image:', error);
                        fallbackDownload();
                    });
                } else {
                    // Fallback method using browser's built-in functionality
                    fallbackDownload();
                }
            }
            
            function fallbackDownload() {
                // Alternative method: Open print dialog with instructions to save as PDF
                alert('To save the card:\\n\\n1. Press Ctrl+P (or Cmd+P on Mac)\\n2. Select "Save as PDF" as destination\\n3. Choose "More settings" and set:\\n   - Paper size: Custom (3.5 x 2 inches)\\n   - Margins: None\\n4. Click Save');
                window.print();
            }
            
            // Load html2canvas library dynamically for better download functionality
            function loadHtml2Canvas() {
                if (typeof html2canvas === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = function() {
                        console.log('html2canvas loaded successfully');
                    };
                    script.onerror = function() {
                        console.log('html2canvas failed to load, using fallback method');
                    };
                    document.head.appendChild(script);
                }
            }
            
            // Load the library when page loads
            window.addEventListener('load', function() {
                loadHtml2Canvas();
            });
            
            // Add keyboard shortcuts (Ctrl+P for print, Ctrl+S for save)
            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                    e.preventDefault();
                    printCard();
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    downloadCard();
                }
            });
            
            // Add click animations to both buttons
            document.querySelector('.print-button').addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
            
            document.querySelector('.download-button').addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
            
            // Show a temporary message when printing starts
            window.addEventListener('beforeprint', function() {
                console.log('🖨️ Printing card... Ensure you select "Save as PDF" or use cardstock paper.');
            });
            
            // Auto-focus print button for accessibility
            window.addEventListener('load', function() {
                document.querySelector('.print-button').focus();
            });
            
            // Add confirmation message for print
            const originalPrint = window.print;
            window.print = function() {
                if (confirm('Ready to print your member ID card?\n\nTips:\\n• Select "Save as PDF" to save digital copy\\n• Use cardstock paper for best results\\n• Set page size to 3.5" x 2"')) {
                    originalPrint.call(window);
                }
            };
        </script>
    </body>
    </html>`;
}

// Generate Email-Compatible HTML (for email sending only) - SAME AS BEFORE
function generateEmailCompatibleCardHTML(member) {
    const currentYear = new Date().getFullYear();
    const joinYear = member.joinDate ? new Date(member.joinDate).getFullYear() : currentYear;
    const status = member.status || 'active';
    const statusColor = status === 'active' ? '#28a745' : '#dc3545';
    
    return `
    <!-- EMAIL-ONLY VERSION WITH CHURCH IMAGES -->
    <table cellpadding="0" cellspacing="0" border="0" width="336" height="192" style="width: 336px; height: 192px; max-width: 336px; max-height: 192px; background: white; border: 2px solid #1e3c72; border-collapse: collapse; font-family: 'Courier New', monospace, Arial, sans-serif; margin: 20px auto;">
        
        <!-- HEADER WITH CHURCH IMAGES -->
        <tr>
            <!-- Left Church Image -->
            <td width="15%" align="center" style="background: #1e3c72; color: #ffffff; padding: 4px 0; border-right: 1px solid #ffffff; vertical-align: middle;">
                <img src="https://i.pinimg.com/736x/55/c3/10/55c310adca255f4aaa3c0fe42f2352a3.jpg" alt="Church Icon" width="20" height="20" style="width: 20px; height: 20px; display: block; margin: 0 auto; filter: brightness(0) invert(1);">
            </td>
            
            <!-- Church Name (Center) -->
            <td width="70%" align="center" style="background: #1e3c72; color: #ffffff; padding: 4px 0; font-weight: bold; font-size: 11px; line-height: 1.2; vertical-align: middle;">
                ST. MICHAEL EROTC
            </td>
            
            <!-- Right Church Image -->
            <td width="15%" align="center" style="background: #1e3c72; color: #ffffff; padding: 4px 0; border-left: 1px solid #ffffff; vertical-align: middle;">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0DSSxnr990Od7vwChi8zT3NhnsB5rhpyTXQ&s" alt="Church Icon" width="20" height="20" style="width: 20px; height: 20px; display: block; margin: 0 auto; filter: brightness(0) invert(1);">
            </td>
        </tr>
        
        <!-- SUBTITLE ROW -->
        <tr>
            <td colspan="3" align="center" style="background: #2a5298; color: #ffffff; padding: 2px 0 3px 0; font-size: 9px; line-height: 1.2;">
                ERITREAN ORTHODOX CHURCH
            </td>
        </tr>
        
        <!-- ID SECTION - BLUE BACKGROUND -->
        <tr>
            <td colspan="3" align="center" style="background: #e8f4ff; padding: 6px 8px; border-bottom: 2px solid #1e3c72; font-weight: bold; font-size: 16px; line-height: 1.2; color: #1e3c72;">
                ID: ${member.displayId}
            </td>
        </tr>
        
        <!-- MEMBER INFO ROWS - LIGHT BLUE BACKGROUND -->
        <!-- Name -->
        <tr>
            <td width="40%" style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #d1e7ff;">
                NAME
            </td>
            <td width="60%" align="right" colspan="2" style="background: #f0f8ff; padding: 4px 8px; font-size: 10px; font-weight: bold; vertical-align: middle; border-bottom: 1px solid #d1e7ff; color: #1e3c72;">
                ${member.firstName} ${member.lastName}
            </td>
        </tr>
        
        <!-- Phone (if available) -->
        ${member.phone ? `
        <tr>
            <td style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #d1e7ff;">
                PHONE
            </td>
            <td align="right" colspan="2" style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #d1e7ff; color: #333;">
                ${member.phone}
            </td>
        </tr>
        ` : ''}
        
        <!-- Status -->
        <tr>
            <td style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #d1e7ff;">
                STATUS
            </td>
            <td align="right" colspan="2" style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #d1e7ff;">
                <span style="background: ${statusColor}; color: #ffffff; padding: 3px 8px; border-radius: 12px; font-weight: bold; text-transform: uppercase; display: inline-block; font-size: 8px;">
                    ${status.toUpperCase()}
                </span>
            </td>
        </tr>
        
        <!-- Member Since -->
        <tr>
            <td style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle; border-bottom: 1px solid #d1e7ff;">
                MEMBER SINCE
            </td>
            <td align="right" colspan="2" style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; vertical-align: middle; border-bottom: 1px solid #d1e7ff; color: #333;">
                ${joinYear}
            </td>
        </tr>
        
        <!-- Valid Until -->
        <tr>
            <td style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle;">
                VALID UNTIL
            </td>
            <td align="right" colspan="2" style="background: #f0f8ff; padding: 4px 8px; font-size: 9px; vertical-align: middle; color: #333;">
                DEC ${currentYear}
            </td>
        </tr>
        
        <!-- FOOTER WITH COLORED BLOCKS -->
        <tr>
            <!-- Left Footer Block -->
            <td width="33%" align="center" style="background: #1e3c72; color: #ffffff; padding: 4px 0; border-right: 1px solid #ffffff; font-size: 7px; line-height: 1.3; vertical-align: middle;">
                ⛪ CHURCH
            </td>
            
            <!-- Center Footer Block -->
            <td width="34%" align="center" style="background: #2a5298; color: #ffffff; padding: 4px 0; font-size: 7px; line-height: 1.3; vertical-align: middle;">
                60 OSBORNE ST
            </td>
            
            <!-- Right Footer Block -->
            <td width="33%" align="center" style="background: #1e3c72; color: #ffffff; padding: 4px 0; border-left: 1px solid #ffffff; font-size: 7px; line-height: 1.3; vertical-align: middle;">
                WA 6060
            </td>
        </tr>
        
        <!-- FOOTER SECOND ROW -->
        <tr>
            <td colspan="3" align="center" style="background: #2a5298; color: #ffffff; padding: 2px 0 4px 0; font-size: 7px; line-height: 1.3;">
                STMICHAELEROTC@GMAIL.COM
            </td>
        </tr>
        
    </table>`;
}

// GET /api/member-cards/:id - Generate digital member card
protectedRouter.get('/:id', async (req, res) => {
    try {
        const member = await Member.findByAnyId(req.params.id);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const cardHTML = generateMemberCardHTML(member);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(cardHTML);
        
    } catch (error) {
        console.error('Error generating member card:', error);
        res.status(500).json({ error: 'Failed to generate member card' });
    }
});

// POST /api/member-cards/:id/email - Email digital member card
protectedRouter.post('/:id/email', async (req, res) => {
    try {
        const member = await Member.findByAnyId(req.params.id);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (!member.email) {
            return res.status(400).json({ error: 'Member has no email address' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(member.email)) {
            return res.status(400).json({ error: 'Member has invalid email address format' });
        }

        console.log(`📧 Sending digital card to: ${member.email} for member: ${member.firstName} ${member.lastName}`);

        // Use EMAIL-COMPATIBLE version for emails
        const emailCardHTML = generateEmailCompatibleCardHTML(member);
        
        // Send email with member card
        try {
            await emailService.sendEmail({
                to: member.email,
                subject: `Your Digital Member ID Card - ${member.displayId}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1e3c72; font-family: Arial, sans-serif; margin-bottom: 15px;">Your Digital Member ID Card</h2>
                        <p style="font-family: Arial, sans-serif; margin-bottom: 20px;">Dear ${member.firstName} ${member.lastName},</p>
                        <p style="font-family: Arial, sans-serif; margin-bottom: 20px;">Please find your digital member ID card below. You can save this card to your phone or print it for your records.</p>
                        
                        ${emailCardHTML}
                        
                        <!-- Direct Link Button -->
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${process.env.BACKEND_URL || 'https://church-management-vjfw.onrender.com'}/api/member-cards/public/${member._id}" 
                               style="display: inline-block; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(30, 60, 114, 0.3);">
                                🔗 Open Card in Browser
                            </a>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                                Click above to open your card with Print & Save buttons
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border-radius: 10px; border: 1px solid #d1e7ff; font-family: Arial, sans-serif;">
                            <h3 style="color: #1e3c72; margin-top: 0; font-family: Arial, sans-serif; margin-bottom: 15px;">📱 How to use your Member ID:</h3>
                            <ul style="color: #2a5298; font-family: Arial, sans-serif; padding-left: 20px;">
                                <li style="margin-bottom: 8px;"><strong>Show this card</strong> at church events and services</li>
                                <li style="margin-bottom: 8px;"><strong>Use your Member ID</strong> <span style="background: #e8f4ff; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${member.displayId}</span> for quick lookup</li>
                                <li style="margin-bottom: 8px;"><strong>Screenshot this card</strong> on your phone for offline use</li>
                                <li style="margin-bottom: 8px;"><strong>Save this email</strong> to your phone's favorites for easy access</li>
                                <li><strong>Print or download</strong> using the options below</li>
                            </ul>
                        </div>
                        
                        <div style="margin-top: 25px; padding: 20px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ffb300; font-family: Arial, sans-serif;">
                            <h4 style="color: #e65100; margin-top: 0; font-size: 16px; margin-bottom: 15px;">🖨️ Print & Save Options:</h4>
                            
                            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #ffe0b3;">
                                <h5 style="color: #1e3c72; margin-top: 0; margin-bottom: 10px; font-size: 14px;">📱 On Mobile (Phone/Tablet):</h5>
                                <ol style="color: #5d4037; padding-left: 20px; font-size: 13px; margin: 0;">
                                    <li style="margin-bottom: 5px;"><strong>Screenshot:</strong> Take a screenshot of the card above</li>
                                    <li style="margin-bottom: 5px;"><strong>Save Image:</strong> Long-press the card → "Save Image"</li>
                                    <li style="margin-bottom: 5px;"><strong>Print:</strong> Use your phone's print option to print wirelessly</li>
                                </ol>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #ffe0b3;">
                                <h5 style="color: #1e3c72; margin-top: 0; margin-bottom: 10px; font-size: 14px;">💻 On Computer:</h5>
                                <ol style="color: #5d4037; padding-left: 20px; font-size: 13px; margin: 0;">
                                    <li style="margin-bottom: 5px;"><strong>Right-click the card</strong> → "Save image as..." → Save as PNG</li>
                                    <li style="margin-bottom: 5px;"><strong>Print directly:</strong> Ctrl+P → Select "Print" or "Save as PDF"</li>
                                    <li style="margin-bottom: 5px;"><strong>Best quality:</strong> Copy this email link and open in browser for print/download buttons</li>
                                </ol>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745; font-family: Arial, sans-serif;">
                            <h4 style="color: #155724; margin-top: 0; font-size: 14px; margin-bottom: 10px;">💡 Pro Tip:</h4>
                            <p style="color: #2d5a2d; margin: 0; font-size: 13px;">
                                <strong>For best print quality:</strong> Visit <a href="${process.env.BACKEND_URL || 'https://church-management-vjfw.onrender.com'}/api/member-cards/public/${member._id}" style="color: #1e3c72; text-decoration: none; font-weight: bold;">your secure card link</a> in a web browser. 
                                You'll get dedicated Print and Save buttons with high-resolution download options!
                            </p>
                        </div>
                        
                        <p style="margin-top: 30px; color: #2a5298; font-family: Arial, sans-serif; line-height: 1.5;">
                            Blessings,<br>
                            <strong>St. Michael EROTC</strong><br>
                            60 Osborne Street, Joondanna, WA 6060<br>
                            stmichealerotc@gmail.com | erotc.org
                        </p>
                    </div>
                `
            });

            console.log(`✅ Digital card email sent successfully to: ${member.email}`);

            res.json({ 
                success: true, 
                message: `Digital member card sent to ${member.email}`,
                memberId: member.displayId
            });
            
        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            res.status(500).json({ 
                error: 'Failed to send email',
                details: emailError.message,
                memberEmail: member.email
            });
        }
        
    } catch (error) {
        console.error('Error emailing member card:', error);
        res.status(500).json({ error: 'Failed to email member card' });
    }
});

// POST /api/member-cards/bulk/email - Email cards to all members with email
protectedRouter.post('/bulk/email', async (req, res) => {
    try {
        // SAFETY CHECK: Only allow bulk email in test mode or with explicit confirmation
        const { testMode = false, confirmBulkEmail = false } = req.body;
        
        if (!testMode && !confirmBulkEmail) {
            return res.status(400).json({ 
                error: 'Bulk email requires explicit confirmation. Set confirmBulkEmail: true or use testMode: true',
                safety: 'This prevents accidental bulk emails to all members'
            });
        }

        let members;
        
        if (testMode) {
            // TEST MODE: Only send to debesay304@gmail.com
            console.log('🧪 TEST MODE: Bulk email will only be sent to debesay304@gmail.com');
            members = await Member.find({ 
                email: 'debesay304@gmail.com'
            });
            
            if (members.length === 0) {
                return res.status(404).json({ 
                    error: 'Test email debesay304@gmail.com not found in members',
                    suggestion: 'Make sure there is a member with email debesay304@gmail.com'
                });
            }
        } else {
            // PRODUCTION MODE: Send to all members with email
            console.log('📧 PRODUCTION MODE: Bulk email will be sent to ALL active members with email');
            members = await Member.find({ 
                email: { $exists: true, $ne: null, $ne: '' },
                status: 'active'
            });
        }

        let successful = 0;
        let failed = 0;
        const errors = [];

        console.log(`📊 Starting bulk email to ${members.length} members (${testMode ? 'TEST MODE' : 'PRODUCTION MODE'})`);

        for (const member of members) {
            try {
                // Use EMAIL-COMPATIBLE version for bulk emails
                const emailCardHTML = generateEmailCompatibleCardHTML(member);
                
                await emailService.sendEmail({
                    to: member.email,
                    subject: `${testMode ? '[TEST] ' : ''}Your Digital Member ID Card - ${member.displayId}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            ${testMode ? '<div style="background: #fff3cd; padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #ffeaa7; font-family: Arial, sans-serif;"><strong>🧪 TEST EMAIL</strong> - This is a test of the Digital Member ID system</div>' : ''}
                            <h2 style="color: #1e3c72; font-family: Arial, sans-serif; margin-bottom: 15px;">Your Digital Member ID Card</h2>
                            <p style="font-family: Arial, sans-serif; margin-bottom: 20px;">Dear ${member.firstName} ${member.lastName},</p>
                            <p style="font-family: Arial, sans-serif; margin-bottom: 20px;">Please find your digital member ID card below.</p>
                            
                            ${emailCardHTML}
                            
                            <!-- Direct Link Button -->
                            <div style="text-align: center; margin: 25px 0;">
                                <a href="${process.env.BACKEND_URL || 'https://church-management-vjfw.onrender.com'}/api/member-cards/public/${member._id}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(30, 60, 114, 0.3);">
                                    🔗 Open Card in Browser
                                </a>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                                    Click above to open your card with Print & Save buttons
                                </p>
                            </div>
                            
                            <div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border-radius: 10px; border: 1px solid #d1e7ff; font-family: Arial, sans-serif;">
                                <h3 style="color: #1e3c72; margin-top: 0; font-family: Arial, sans-serif; margin-bottom: 15px;">📱 How to use your Member ID:</h3>
                                <ul style="color: #2a5298; font-family: Arial, sans-serif; padding-left: 20px;">
                                    <li style="margin-bottom: 8px;"><strong>Show this card</strong> at church events and services</li>
                                    <li style="margin-bottom: 8px;"><strong>Use your Member ID</strong> <span style="background: #e8f4ff; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${member.displayId}</span> for quick lookup</li>
                                    <li style="margin-bottom: 8px;"><strong>Screenshot this card</strong> on your phone for offline use</li>
                                    <li style="margin-bottom: 8px;"><strong>Save this email</strong> to your phone's favorites for easy access</li>
                                    <li><strong>Print or download</strong> using the options below</li>
                                </ul>
                            </div>
                            
                            <div style="margin-top: 25px; padding: 20px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ffb300; font-family: Arial, sans-serif;">
                                <h4 style="color: #e65100; margin-top: 0; font-size: 16px; margin-bottom: 15px;">🖨️ Print & Save Options:</h4>
                                
                                <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #ffe0b3;">
                                    <h5 style="color: #1e3c72; margin-top: 0; margin-bottom: 10px; font-size: 14px;">📱 On Mobile (Phone/Tablet):</h5>
                                    <ol style="color: #5d4037; padding-left: 20px; font-size: 13px; margin: 0;">
                                        <li style="margin-bottom: 5px;"><strong>Screenshot:</strong> Take a screenshot of the card above</li>
                                        <li style="margin-bottom: 5px;"><strong>Save Image:</strong> Long-press the card → "Save Image"</li>
                                        <li style="margin-bottom: 5px;"><strong>Print:</strong> Use your phone's print option to print wirelessly</li>
                                    </ol>
                                </div>
                                
                                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #ffe0b3;">
                                    <h5 style="color: #1e3c72; margin-top: 0; margin-bottom: 10px; font-size: 14px;">💻 On Computer:</h5>
                                    <ol style="color: #5d4037; padding-left: 20px; font-size: 13px; margin: 0;">
                                        <li style="margin-bottom: 5px;"><strong>Right-click the card</strong> → "Save image as..." → Save as PNG</li>
                                        <li style="margin-bottom: 5px;"><strong>Print directly:</strong> Ctrl+P → Select "Print" or "Save as PDF"</li>
                                        <li style="margin-bottom: 5px;"><strong>Best quality:</strong> Visit the direct card link for print/download buttons</li>
                                    </ol>
                                </div>
                            </div>
                            
                            <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745; font-family: Arial, sans-serif;">
                                <h4 style="color: #155724; margin-top: 0; font-size: 14px; margin-bottom: 10px;">💡 Pro Tip:</h4>
                                <p style="color: #2d5a2d; margin: 0; font-size: 13px;">
                                    <strong>For best print quality:</strong> Visit <a href="${process.env.BACKEND_URL || 'https://church-management-vjfw.onrender.com'}/api/member-cards/public/${member._id}" style="color: #1e3c72; text-decoration: none; font-weight: bold;">your secure card link</a> in a web browser. 
                                    You'll get dedicated Print and Save buttons with high-resolution download options!
                                </p>
                            </div>
                            
                            <p style="margin-top: 30px; color: #2a5298; font-family: Arial, sans-serif; line-height: 1.5;">
                                Blessings,<br>
                                <strong>St. Michael EROTC</strong><br>
                                Eritrean Orthodox Church
                            </p>
                        </div>
                    `
                });
                
                successful++;
                console.log(`✅ Email sent to: ${member.email} (${member.firstName} ${member.lastName})`);
                
                // Small delay to avoid overwhelming email service
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                failed++;
                errors.push({
                    member: `${member.firstName} ${member.lastName}`,
                    email: member.email,
                    error: error.message
                });
                console.error(`❌ Failed to send to: ${member.email} - ${error.message}`);
            }
        }

        res.json({
            success: true,
            message: `Bulk email completed: ${successful} sent, ${failed} failed`,
            mode: testMode ? 'TEST MODE' : 'PRODUCTION MODE',
            stats: {
                total: members.length,
                successful,
                failed,
                errors: errors.slice(0, 5)
            }
        });
        
    } catch (error) {
        console.error('Error in bulk email:', error);
        res.status(500).json({ error: 'Failed to send bulk member cards' });
    }
});

// Mount protected routes under the main router
router.use('/', protectedRouter);

module.exports = router;