const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const QRCodeGenerator = require('./qrCodeGenerator');

class PDFGenerator {
    constructor() {
        this.browser = null;
    }

    async initBrowser() {
        if (!this.browser) {
            try {
                this.browser = await puppeteer.launch({
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-extensions',
                        '--disable-plugins',
                        '--disable-default-apps',
                        '--no-default-browser-check',
                        '--disable-hang-monitor',
                        '--disable-prompt-on-repost',
                        '--disable-sync',
                        '--metrics-recording-only',
                        '--no-first-run',
                        '--safebrowsing-disable-auto-update',
                        '--disable-background-networking'
                    ],
                    timeout: 30000 // Reduced from 60000
                });
                console.log('✅ Puppeteer browser initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Puppeteer browser:', error.message);
                throw new Error(`PDF generation unavailable: ${error.message}`);
            }
        }
        return this.browser;
    }

    async generateReceiptPDF(transaction, signatureInfo = null) {
        let browser = null;
        let page = null;
        
        try {
            console.log('🔄 Starting PDF generation...');
            browser = await this.initBrowser();
            page = await browser.newPage();

            // Set page format for receipt with optimized settings
            await page.setViewport({ width: 800, height: 1200 });
            
            // Disable images and CSS to speed up loading
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
                    // Allow only specific church images, block others
                    const url = req.url();
                    if (url.includes('church-logo.png') || url.includes('kdus-mikaeal.jpg')) {
                        req.continue();
                    } else {
                        req.abort();
                    }
                } else {
                    req.continue();
                }
            });

            // Generate QR code for the receipt
            let receiptQRCode = null;
            try {
                const member = transaction.payee?.memberId;
                receiptQRCode = await QRCodeGenerator.generateReceiptQRCode(transaction, member);
                console.log('✅ Receipt QR code generated');
            } catch (qrError) {
                console.warn('⚠️ Could not generate QR code for receipt:', qrError.message);
            }

            // Generate HTML content with QR code
            const htmlContent = this.generateReceiptHTML(transaction, signatureInfo, receiptQRCode);
            console.log('📄 HTML content generated');

            // Set HTML content with reduced timeout and faster loading
            await page.setContent(htmlContent, { 
                waitUntil: 'domcontentloaded', // Changed from 'networkidle0' to 'domcontentloaded'
                timeout: 15000 // Reduced from 30000 to 15000
            });
            console.log('📄 HTML content loaded in page');

            // Wait a bit for any remaining content to load
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate PDF with optimized settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                },
                timeout: 10000 // Add PDF generation timeout
            });
            console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);

            return pdfBuffer;

        } catch (error) {
            console.error('❌ Error generating PDF:', error);
            
            // If it's a timeout error, try a simpler approach
            if (error.message.includes('timeout') || error.message.includes('Navigation')) {
                console.log('🔄 Timeout detected, trying simplified PDF generation...');
                return await this.generateSimplifiedPDF(transaction, signatureInfo);
            }
            
            throw new Error(`PDF generation failed: ${error.message}`);
        } finally {
            // Always close the page
            if (page) {
                try {
                    await page.close();
                    console.log('📄 PDF page closed');
                } catch (closeError) {
                    console.warn('⚠️ Warning: Could not close PDF page:', closeError.message);
                }
            }
        }
    }

    // Fallback method for simplified PDF generation
    async generateSimplifiedPDF(transaction, signatureInfo = null) {
        let browser = null;
        let page = null;
        
        try {
            console.log('🔄 Starting simplified PDF generation...');
            browser = await this.initBrowser();
            page = await browser.newPage();

            // Set page format for receipt
            await page.setViewport({ width: 800, height: 1200 });
            
            // Block all external resources for faster loading
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Generate simplified HTML content (without images)
            const htmlContent = this.generateSimplifiedReceiptHTML(transaction, signatureInfo);
            console.log('📄 Simplified HTML content generated');

            // Set HTML content with minimal waiting
            await page.setContent(htmlContent, { 
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            console.log('📄 Simplified HTML content loaded in page');

            // Generate PDF quickly
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                },
                timeout: 5000
            });
            console.log(`✅ Simplified PDF generated successfully (${pdfBuffer.length} bytes)`);

            return pdfBuffer;

        } catch (error) {
            console.error('❌ Error generating simplified PDF:', error);
            throw new Error(`Simplified PDF generation failed: ${error.message}`);
        } finally {
            if (page) {
                try {
                    await page.close();
                    console.log('📄 Simplified PDF page closed');
                } catch (closeError) {
                    console.warn('⚠️ Warning: Could not close simplified PDF page:', closeError.message);
                }
            }
        }
    }

    generateReceiptHTML(transaction, signatureInfo = null, qrCode = null) {
        const receiptDate = new Date().toLocaleDateString();
        const transactionDate = new Date(transaction.date).toLocaleDateString();
        
        // Get payee information (no total contributions calculation needed)
        let payeeName = 'Unknown';
        let payeeAddress = '';
        
        if (transaction.payee) {
            if (transaction.payee.type === 'member' && transaction.payee.memberId) {
                const member = transaction.payee.memberId;
                if (typeof member === 'object') {
                    payeeName = `${member.firstName} ${member.lastName}`;
                    payeeAddress = member.address || '';
                }
            } else {
                payeeName = transaction.payee.name || 'Unknown';
                payeeAddress = transaction.payee.address || '';
            }
        }

        // Format category
        const formatCategory = (category) => {
            const categoryMap = {
                'tithe': 'Tithe',
                'offering': 'Offering',
                'donation': 'Donation',
                'pledge': 'Pledge',
                'building': 'Building Fund',
                'missions': 'Missions'
            };
            return categoryMap[category] || category;
        };

        // Format payment method
        const formatPaymentMethod = (method) => {
            const methods = {
                'cash': 'Cash',
                'check': 'Check',
                'card': 'Credit/Debit Card',
                'online': 'Online Transfer',
                'transfer': 'Bank Transfer'
            };
            return methods[method] || method;
        };

        // Generate signature section
        let signatureSection = `
            <div class="signature-line">
                <div style="margin-top: 10px; font-size: 12px; color: #999;">No signature on file</div>
            </div>
        `;

        if (signatureInfo && signatureInfo.signature) {
            const sig = signatureInfo.signature;
            
            if (sig.approvedBy) {
                signatureSection = `
                    <div class="signature-section" style="margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <h4 style="margin: 0 0 15px 0; color: #4a6fa5;">Authorized Signature</h4>
                        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                            <div>
                                <div style="border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 6px; min-width: 220px; text-align: center;">
                                    <strong style="font-size: 15px;">${sig.approvedBy.name}</strong>
                                </div>
                                <div style="font-size: 13px; font-weight: bold; text-align: center;">${sig.signatureTitle}</div>
                                <div style="font-size: 10px; color: #666; text-align: center;">Digitally approved: ${new Date(sig.approvedBy.timestamp).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Donation Receipt</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        max-width: 600px; 
                        margin: 0 auto; 
                        padding: 15px;
                        line-height: 1.4;
                        color: #333;
                    }
                    .header { 
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px solid #333; 
                        padding-bottom: 10px; 
                        margin-bottom: 15px;
                        position: relative;
                        min-height: 60px;
                    }
                    .logo {
                        width: 45px;
                        height: 45px;
                        object-fit: contain;
                        flex-shrink: 0;
                    }
                    .logo-left {
                        position: absolute;
                        left: 0;
                        top: 5px;
                    }
                    .logo-right {
                        position: absolute;
                        right: 0;
                        top: 5px;
                    }
                    .church-info {
                        text-align: center;
                        flex: 1;
                        margin: 0 60px;
                        padding: 0 15px;
                    }
                    .church-name { 
                        font-size: 20px; 
                        font-weight: bold; 
                        color: #2c3e50;
                        margin-bottom: 5px;
                    }
                    .church-address { 
                        color: #666; 
                        font-size: 12px;
                        line-height: 1.3;
                    }
                    .receipt-title { 
                        font-size: 18px; 
                        font-weight: bold; 
                        text-align: center; 
                        margin: 15px 0;
                        color: #2c3e50;
                    }
                    .receipt-info { 
                        background: #f8f9fa; 
                        padding: 15px; 
                        border-radius: 6px; 
                        margin: 15px 0;
                    }
                    .info-row { 
                        display: flex; 
                        justify-content: space-between; 
                        margin: 8px 0;
                        padding: 3px 0;
                    }
                    .receipt-header-row {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 10px;
                        padding: 8px;
                        background: #e9ecef;
                        border-radius: 4px;
                        margin-bottom: 10px;
                        font-size: 13px;
                    }
                    .summary-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    .summary-table th,
                    .summary-table td {
                        border: 1px solid #ddd;
                        padding: 6px;
                        text-align: left;
                        font-size: 13px;
                    }
                    .summary-table th {
                        background: #f8f9fa;
                        font-weight: bold;
                    }
                    .contribution-notice { 
                        background: #fff3cd; 
                        border: 1px solid #ffeaa7; 
                        padding: 10px; 
                        border-radius: 6px; 
                        margin: 15px 0;
                        font-size: 13px;
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 20px; 
                        padding-top: 15px; 
                        border-top: 1px solid #ddd;
                        font-size: 11px;
                        color: #666;
                    }
                    .signature-line {
                        margin-top: 25px;
                        border-bottom: 1px solid #333;
                        width: 250px;
                        margin-left: auto;
                        margin-right: auto;
                        text-align: center;
                        padding-bottom: 3px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <!-- <img src="https://churchmanagement.erotc.org/images/church-logo.png" alt="Church Logo" class="logo-img logo-left" />-->
                                                    <img src="https://church-management-vjfw.onrender.com/images/church-logo.png" alt="Church Logo" class="logo logo-left">
                    <div class="church-info">
                        <div class="church-name">St Michael Eritrean Orthodox Church</div>
                        <div class="church-address">
                            60 Osborne Street, Joondanna, WA 6060<br>
                            ABN: 80798549161 | stmichaelerotc@gmail.com | erotc.org
                        </div>
                    </div>
                   <!-- <img src="https://churchmanagement.erotc.org/images/kdus-mikaeal.jpg" alt="Kdus Mikaeal" class="logo-img logo-right" />-->
                                                   <img src="https://church-management-vjfw.onrender.com/images/kdus-mikaeal.jpg" alt="Kdus Mikaeal" class="logo logo-right">
                </div>

                <div class="receipt-title">DONATION RECEIPT</div>

                <div class="receipt-info">
                    <div class="receipt-header-row">
                        <span><strong>Receipt Date:</strong> ${receiptDate}</span>
                        <span><strong>Transaction Date:</strong> ${transactionDate}</span>
                        <span><strong>Receipt #:</strong> ${transaction._id.toString().substring(18)}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Donor Name:</strong></span>
                        <span>${payeeName}</span>
                    </div>
                    ${payeeAddress ? `
                    <div class="info-row">
                        <span><strong>Address:</strong></span>
                        <span>${payeeAddress}</span>
                    </div>
                    ` : ''}
                </div>

                <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Contribution Details</h3>
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Payment Method</th>
                            ${transaction.reference ? '<th>Reference</th>' : ''}
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${transactionDate}</td>
                            <td>${transaction.description}</td>
                            <td>${formatCategory(transaction.category)}</td>
                            <td>${formatPaymentMethod(transaction.paymentMethod)}</td>
                            ${transaction.reference ? `<td>${transaction.reference}</td>` : ''}
                            <td><strong>$${transaction.amount.toLocaleString()}</strong></td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="${transaction.reference ? '5' : '4'}"><strong>Total Contribution</strong></td>
                            <td><strong>$${transaction.amount.toLocaleString()}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="contribution-notice">
                    <strong>Important Notice:</strong> No goods or services were provided in exchange for this contribution.
                </div>

                ${signatureSection}

                ${qrCode ? `
                <div style="text-align: center; margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #f8f9fa;">
                    <h4 style="margin: 0 0 10px 0; color: #4a6fa5;">Receipt Verification</h4>
                    <img src="${qrCode}" alt="Receipt QR Code" style="width: 120px; height: 120px; margin: 10px 0;">
                    <p style="margin: 5px 0; font-size: 11px; color: #666;">Scan QR code to verify receipt authenticity</p>
                </div>
                ` : ''}

                <div class="footer">
                    <p style="margin: 5px 0;">Thank you for your generous contribution!</p>
                    <p style="margin: 5px 0;"><strong>St Michael Eritrean Orthodox Church</strong></p>
                    <p style="margin: 5px 0;">60 Osborne Street, Joondanna, WA 6060 | ABN: 80798549161</p>
                    <p style="margin: 5px 0;">stmichaelerotc@gmail.com | erotc.org</p>
                    <p style="margin: 10px 0 5px 0; font-style: italic;">Generated on ${receiptDate}</p>
                </div>
            </body>
            </html>
        `;
    }

    generateSimplifiedReceiptHTML(transaction, signatureInfo = null) {
        const receiptDate = new Date().toLocaleDateString();
        const transactionDate = new Date(transaction.date).toLocaleDateString();
        
        // Get payee information
        let payeeName = 'Unknown';
        let payeeAddress = '';
        
        if (transaction.payee) {
            if (transaction.payee.type === 'member' && transaction.payee.memberId) {
                const member = transaction.payee.memberId;
                if (typeof member === 'object') {
                    payeeName = `${member.firstName} ${member.lastName}`;
                    payeeAddress = member.address || '';
                }
            } else {
                payeeName = transaction.payee.name || 'Unknown';
                payeeAddress = transaction.payee.address || '';
            }
        }

        // Format category
        const formatCategory = (category) => {
            const categoryMap = {
                'tithe': 'Tithe',
                'offering': 'Offering',
                'donation': 'Donation',
                'pledge': 'Pledge',
                'building': 'Building Fund',
                'missions': 'Missions'
            };
            return categoryMap[category] || category;
        };

        // Format payment method
        const formatPaymentMethod = (method) => {
            const methods = {
                'cash': 'Cash',
                'check': 'Check',
                'card': 'Credit/Debit Card',
                'online': 'Online Transfer',
                'transfer': 'Bank Transfer'
            };
            return methods[method] || method;
        };

        // Generate signature section (simplified)
        let signatureSection = `
            <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #999;">
                No signature on file
            </div>
        `;

        if (signatureInfo && signatureInfo.signature && signatureInfo.signature.approvedBy) {
            const sig = signatureInfo.signature;
            signatureSection = `
                <div style="margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <h4 style="margin: 0 0 15px 0; color: #4a6fa5;">Authorized Signature</h4>
                    <div style="text-align: center;">
                        <div style="border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 6px; display: inline-block; min-width: 220px;">
                            <strong style="font-size: 15px;">${sig.approvedBy.name}</strong>
                        </div>
                        <div style="font-size: 13px; font-weight: bold;">${sig.signatureTitle}</div>
                        <div style="font-size: 10px; color: #666;">Digitally approved: ${new Date(sig.approvedBy.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Donation Receipt</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        max-width: 600px; 
                        margin: 0 auto; 
                        padding: 15px;
                        line-height: 1.4;
                        color: #333;
                    }
                    .header { 
                        text-align: center;
                        border-bottom: 2px solid #333; 
                        padding-bottom: 15px; 
                        margin-bottom: 20px;
                    }
                    .church-name { 
                        font-size: 20px; 
                        font-weight: bold; 
                        color: #2c3e50;
                        margin-bottom: 8px;
                    }
                    .church-address { 
                        color: #666; 
                        font-size: 12px;
                        line-height: 1.3;
                    }
                    .receipt-title { 
                        font-size: 18px; 
                        font-weight: bold; 
                        text-align: center; 
                        margin: 15px 0;
                        color: #2c3e50;
                    }
                    .receipt-info { 
                        background: #f8f9fa; 
                        padding: 15px; 
                        border-radius: 6px; 
                        margin: 15px 0;
                    }
                    .info-row { 
                        display: flex; 
                        justify-content: space-between; 
                        margin: 8px 0;
                        padding: 3px 0;
                    }
                    .receipt-header-row {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 10px;
                        padding: 8px;
                        background: #e9ecef;
                        border-radius: 4px;
                        margin-bottom: 10px;
                        font-size: 13px;
                    }
                    .summary-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    .summary-table th,
                    .summary-table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                        font-size: 13px;
                    }
                    .summary-table th {
                        background: #f8f9fa;
                        font-weight: bold;
                    }
                    .contribution-notice { 
                        background: #fff3cd; 
                        border: 1px solid #ffeaa7; 
                        padding: 10px; 
                        border-radius: 6px; 
                        margin: 15px 0;
                        font-size: 13px;
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 20px; 
                        padding-top: 15px; 
                        border-top: 1px solid #ddd;
                        font-size: 11px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="church-name">ST. MICHAEL ERITREAN ORTHODOX TEWAHEDO CHURCH</div>
                    <div class="church-address">
                        Perth, Western Australia<br>
                        ABN: 80 798 549 161<br>
                        60 Osborne Street, Joondanna, WA 6060<br>
                        stmichaelerotc@gmail.com | erotc.org
                    </div>
                </div>

                <div class="receipt-title">DONATION RECEIPT</div>

                <div class="receipt-info">
                    <div class="receipt-header-row">
                        <span><strong>Receipt Date:</strong> ${receiptDate}</span>
                        <span><strong>Transaction Date:</strong> ${transactionDate}</span>
                        <span><strong>Receipt #:</strong> ${transaction._id.toString().substring(18)}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>Donor Name:</strong></span>
                        <span>${payeeName}</span>
                    </div>
                    ${payeeAddress ? `
                    <div class="info-row">
                        <span><strong>Address:</strong></span>
                        <span>${payeeAddress}</span>
                    </div>
                    ` : ''}
                </div>

                <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Contribution Details</h3>
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Payment Method</th>
                            ${transaction.reference ? '<th>Reference</th>' : ''}
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${transactionDate}</td>
                            <td>${transaction.description}</td>
                            <td>${formatCategory(transaction.category)}</td>
                            <td>${formatPaymentMethod(transaction.paymentMethod)}</td>
                            ${transaction.reference ? `<td>${transaction.reference}</td>` : ''}
                            <td><strong>$${transaction.amount.toLocaleString()}</strong></td>
                        </tr>
                        <tr style="background: #f8f9fa; font-weight: bold;">
                            <td colspan="${transaction.reference ? '5' : '4'}"><strong>Total Contribution</strong></td>
                            <td><strong>$${transaction.amount.toLocaleString()}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="contribution-notice">
                    <strong>Important Notice:</strong> No goods or services were provided in exchange for this contribution.
                </div>

                ${signatureSection}

                <div class="footer">
                    <p style="margin: 5px 0;">Thank you for your generous contribution!</p>
                    <p style="margin: 5px 0;"><strong>St Michael Eritrean Orthodox Tewahedo Church</strong></p>
                    <p style="margin: 5px 0;">60 Osborne Street, Joondanna, WA 6060 | ABN: 80 798 549 161</p>
                    <p style="margin: 5px 0;">stmichaelerotc@gmail.com | erotc.org</p>
                    <p style="margin: 10px 0 5px 0; font-style: italic;">Generated on ${receiptDate}</p>
                </div>
            </body>
            </html>
        `;
    }

    async generateBankStatementPDF(htmlContent) {
        let browser = null;
        let page = null;
        
        try {
            browser = await this.initBrowser();
            page = await browser.newPage();
            
            // Set page size and margins for bank statement
            await page.setContent(htmlContent, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Generate PDF with appropriate settings for bank statement
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '15mm',
                    right: '7mm',
                    bottom: '15mm',
                    left: '7mm'
                },
                printBackground: true,
                displayHeaderFooter: false
            });
            
            console.log('✅ Bank statement PDF generated successfully');
            return pdfBuffer;
            
        } catch (error) {
            console.error('❌ Error generating bank statement PDF:', error);
            throw new Error(`Bank statement PDF generation failed: ${error.message}`);
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    console.warn('⚠️ Warning: Could not close bank statement PDF page:', closeError.message);
                }
            }
        }
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Create singleton instance
const pdfGenerator = new PDFGenerator();

// Graceful shutdown
process.on('SIGINT', async () => {
    await pdfGenerator.closeBrowser();
});

process.on('SIGTERM', async () => {
    await pdfGenerator.closeBrowser();
});

module.exports = pdfGenerator;