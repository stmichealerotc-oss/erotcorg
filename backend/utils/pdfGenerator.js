// Use @sparticuz/chromium for cloud environments (Azure/AWS compatible)
// On Windows (local dev), skip sparticuz and use regular puppeteer
let chromium;
let puppeteer;
let PDFDocument;
try {
    PDFDocument = require('pdfkit');
} catch (e) {
    PDFDocument = null;
}

const isWindows = process.platform === 'win32';
const isCloudEnv = !isWindows && (process.env.WEBSITE_SITE_NAME || process.env.AZURE_FUNCTIONS_ENVIRONMENT || process.env.NODE_ENV === 'production');

if (isCloudEnv) {
    try {
        chromium = require('@sparticuz/chromium');
        puppeteer = require('puppeteer-core');
        console.log('✅ Using @sparticuz/chromium for cloud environment');
    } catch (error) {
        console.log('⚠️ @sparticuz/chromium not available:', error.message);
        chromium = null;
        try {
            puppeteer = require('puppeteer');
        } catch (e) {
            puppeteer = require('puppeteer-core');
        }
    }
} else {
    // Local development (Windows or non-production Linux)
    chromium = null;
    console.log('ℹ️ Local environment detected, using regular puppeteer');
    try {
        puppeteer = require('puppeteer');
        console.log('✅ Using regular puppeteer (local development)');
    } catch (error) {
        console.log('⚠️ puppeteer not found, trying puppeteer-core:', error.message);
        try {
            puppeteer = require('puppeteer-core');
        } catch (e) {
            console.error('❌ No puppeteer available');
            puppeteer = null;
        }
    }
}

const path = require('path');
const fs = require('fs');
let QRCodeGenerator;
try {
  QRCodeGenerator = require('./qrCodeGenerator');
} catch (e) {
  console.warn('⚠️ qrCodeGenerator not available:', e.message);
  QRCodeGenerator = null;
}

class PDFGenerator {
    constructor() {
        this.browser = null;
    }

    async initBrowser() {
        if (!puppeteer) {
            throw new Error('PDF generation unavailable: No puppeteer library found. Run: npm install puppeteer');
        }
        if (!this.browser) {
            try {
                console.log('🔄 Initializing Puppeteer browser...');
                
                // Use @sparticuz/chromium if available (for Azure/AWS)
                if (chromium) {
                    console.log('📦 Loading Chromium binary for cloud environment...');
                    
                    // Get the executable path first to verify it exists
                    const executablePath = await chromium.executablePath();
                    console.log('📍 Chromium executable path:', executablePath);
                    
                    // Set font config for Azure environment
                    await chromium.font(
                        'https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'
                    );
                    
                    this.browser = await puppeteer.launch({
                        args: [
                            ...chromium.args,
                            '--disable-gpu',
                            '--disable-dev-shm-usage',
                            '--disable-setuid-sandbox',
                            '--no-first-run',
                            '--no-sandbox',
                            '--no-zygote',
                            '--single-process'
                        ],
                        defaultViewport: chromium.defaultViewport,
                        executablePath: executablePath,
                        headless: chromium.headless,
                        ignoreHTTPSErrors: true,
                    });
                    console.log('✅ Puppeteer browser initialized with @sparticuz/chromium');
                } else {
                    // Fallback to regular puppeteer (local development)
                    console.log('📦 Using local Puppeteer installation...');
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
                            '--safebrowsing-disable-auto-update',
                            '--disable-background-networking'
                        ],
                        timeout: 30000
                    });
                    console.log('✅ Puppeteer browser initialized with regular puppeteer');
                }
            } catch (error) {
                console.error('❌ Failed to initialize Puppeteer browser:', error.message);
                console.error('❌ Error stack:', error.stack);
                throw new Error(`PDF generation unavailable: ${error.message}`);
            }
        }
        return this.browser;
    }

    // Pure Node.js PDF generation using pdfkit — no Chrome required
    // Matches the existing receipt layout: header, info row, donor, table, signature, QR, footer
    generateReceiptPDFWithPDFKit(transaction, signatureInfo = null) {
        return new Promise((resolve, reject) => {
            if (!PDFDocument) return reject(new Error('pdfkit not installed'));

            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const blue = '#4a6fa5';
            const grey = '#666666';
            const lightGrey = '#f8f9fa';
            const dark = '#333333';
            const L = 50, R = 545, W = 495;

            const receiptId = transaction._id.toString().substring(18);
            const txDate = new Date(transaction.date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const receiptDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const amount = `$${Number(transaction.amount).toFixed(2)}`;

            // ── Church name & address header ──────────────────────────────
            doc.fontSize(18).fillColor(blue).font('Helvetica-Bold')
               .text('St Michael Eritrean Orthodox Church', { align: 'center' });
            doc.fontSize(9).fillColor(grey).font('Helvetica')
               .text('60 Osborne Street, Joondanna, WA 6060', { align: 'center' })
               .text('ABN: 80798549161  |  stmichaelerotc@gmail.com  |  erotc.org', { align: 'center' });

            doc.moveDown(0.4);
            doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor(blue).lineWidth(2).stroke();
            doc.moveDown(0.6);

            // ── Title ─────────────────────────────────────────────────────
            doc.fontSize(14).fillColor(dark).font('Helvetica-Bold')
               .text('DONATION RECEIPT', { align: 'center' });
            doc.moveDown(0.8);

            // ── Info row: Receipt Date | Transaction Date | Receipt # ─────
            let y = doc.y;
            doc.rect(L, y, W, 28).fillColor(lightGrey).fill();
            doc.rect(L, y, W, 28).strokeColor('#dddddd').lineWidth(0.5).stroke();

            doc.fontSize(9).fillColor(grey).font('Helvetica-Bold');
            doc.text('Receipt Date:', L + 8, y + 5, { width: 120 });
            doc.text('Transaction Date:', L + 175, y + 5, { width: 130 });
            doc.text('Receipt #:', L + 355, y + 5, { width: 130 });

            doc.fontSize(9).fillColor(dark).font('Helvetica');
            doc.text(receiptDate, L + 8, y + 16, { width: 120 });
            doc.text(txDate, L + 175, y + 16, { width: 130 });
            doc.text(receiptId, L + 355, y + 16, { width: 130 });
            y += 36;

            // ── Donor info ────────────────────────────────────────────────
            let donorName = 'Valued Donor';
            let donorAddress = '';
            if (transaction.payee) {
                if (transaction.payee.type === 'member' && transaction.payee.memberId && typeof transaction.payee.memberId === 'object') {
                    const m = transaction.payee.memberId;
                    donorName = `${m.firstName || ''} ${m.lastName || ''}`.trim();
                    if (m.address) donorAddress = m.address;
                } else {
                    donorName = transaction.payee.name || donorName;
                }
            }

            doc.rect(L, y, W, 28).fillColor('#ffffff').fill();
            doc.rect(L, y, W, 28).strokeColor('#dddddd').lineWidth(0.5).stroke();
            doc.fontSize(9).fillColor(grey).font('Helvetica-Bold').text('Donor Name:', L + 8, y + 9, { width: 100 });
            doc.fontSize(9).fillColor(dark).font('Helvetica').text(donorName, L + 110, y + 9, { width: 380 });
            y += 28;

            if (donorAddress) {
                doc.rect(L, y, W, 24).fillColor(lightGrey).fill();
                doc.rect(L, y, W, 24).strokeColor('#dddddd').lineWidth(0.5).stroke();
                doc.fontSize(9).fillColor(grey).font('Helvetica-Bold').text('Address:', L + 8, y + 7, { width: 100 });
                doc.fontSize(9).fillColor(dark).font('Helvetica').text(donorAddress, L + 110, y + 7, { width: 380 });
                y += 24;
            }

            y += 14;

            // ── Contribution Details table ────────────────────────────────
            doc.fontSize(11).fillColor(dark).font('Helvetica-Bold').text('Contribution Details', L, y);
            y += 18;

            // Table header
            const cols = { date: L, desc: L + 75, cat: L + 255, pay: L + 335, amt: L + 430 };
            doc.rect(L, y, W, 22).fillColor(blue).fill();
            doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold');
            doc.text('Date',           cols.date + 4, y + 7, { width: 70 });
            doc.text('Description',    cols.desc + 4, y + 7, { width: 175 });
            doc.text('Category',       cols.cat  + 4, y + 7, { width: 75 });
            doc.text('Payment Method', cols.pay  + 4, y + 7, { width: 90 });
            doc.text('Amount',         cols.amt  + 4, y + 7, { width: 65 });
            y += 22;

            // Table row
            doc.rect(L, y, W, 24).fillColor(lightGrey).fill();
            doc.rect(L, y, W, 24).strokeColor('#dddddd').lineWidth(0.5).stroke();
            doc.fontSize(8).fillColor(dark).font('Helvetica');
            doc.text(txDate,                              cols.date + 4, y + 8, { width: 70 });
            doc.text(transaction.description || '—',     cols.desc + 4, y + 8, { width: 175 });
            doc.text(transaction.category || '—',        cols.cat  + 4, y + 8, { width: 75 });
            doc.text(transaction.paymentMethod || '—',   cols.pay  + 4, y + 8, { width: 90 });
            doc.fontSize(8).font('Helvetica-Bold').text(amount, cols.amt + 4, y + 8, { width: 65 });
            y += 24;

            // Total row
            doc.rect(L, y, W, 24).fillColor('#f0f0f0').fill();
            doc.rect(L, y, W, 24).strokeColor('#dddddd').lineWidth(0.5).stroke();
            doc.fontSize(9).fillColor(dark).font('Helvetica-Bold')
               .text('Total Contribution', L + 4, y + 8, { width: 420 })
               .text(amount, cols.amt + 4, y + 8, { width: 65 });
            y += 32;

            // ── Important notice ──────────────────────────────────────────
            doc.rect(L, y, W, 28).fillColor('#fff8e1').fill();
            doc.rect(L, y, W, 28).strokeColor('#ffe082').lineWidth(0.5).stroke();
            doc.fontSize(8).fillColor('#7a6000').font('Helvetica-Bold').text('Important Notice: ', L + 8, y + 10, { continued: true });
            doc.font('Helvetica').text('No goods or services were provided in exchange for this contribution.');
            y += 38;

            // ── Signature section ─────────────────────────────────────────
            if (signatureInfo && signatureInfo.signerName) {
                doc.rect(L, y, W, 70).fillColor('#ffffff').fill();
                doc.rect(L, y, W, 70).strokeColor('#dddddd').lineWidth(0.5).stroke();
                doc.fontSize(10).fillColor(blue).font('Helvetica-Bold').text('Authorized Signature', L + 10, y + 8);
                doc.moveDown(0.3);
                const sigY = y + 28;
                doc.moveTo(L + 10, sigY + 18).lineTo(L + 160, sigY + 18).strokeColor(dark).lineWidth(1).stroke();
                doc.fontSize(10).fillColor(dark).font('Helvetica-Bold').text(signatureInfo.signerName, L + 10, sigY + 20);
                doc.fontSize(9).fillColor(grey).font('Helvetica').text(signatureInfo.signerRole || 'Chairperson', L + 10, sigY + 32);
                const approvedDate = signatureInfo.signedAt
                    ? new Date(signatureInfo.signedAt).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : receiptDate;
                doc.text(`Digitally approved: ${approvedDate}`, L + 10, sigY + 44);
                y += 80;
            }

            // ── Footer ────────────────────────────────────────────────────
            y += 10;
            doc.moveTo(L, y).lineTo(R, y).strokeColor('#dddddd').lineWidth(1).stroke();
            y += 10;
            doc.fontSize(9).fillColor(grey).font('Helvetica')
               .text('Thank you for your generous contribution!', L, y, { align: 'center', width: W });
            doc.fontSize(9).fillColor(dark).font('Helvetica-Bold')
               .text('St Michael Eritrean Orthodox Church', L, y + 14, { align: 'center', width: W });
            doc.fontSize(8).fillColor(grey).font('Helvetica')
               .text('60 Osborne Street, Joondanna, WA 6060  |  ABN: 80798549161', L, y + 26, { align: 'center', width: W })
               .text('stmichaelerotc@gmail.com  |  erotc.org', L, y + 36, { align: 'center', width: W })
               .text(`Generated on ${receiptDate}`, L, y + 48, { align: 'center', width: W });

            doc.end();
        });
    }

    async generateReceiptPDF(transaction, signatureInfo = null) {
        // Try pdfkit first — no Chrome needed, works reliably on Azure
        if (PDFDocument) {
            try {
                console.log('🔄 Generating PDF with pdfkit...');
                const buffer = await this.generateReceiptPDFWithPDFKit(transaction, signatureInfo);
                console.log(`✅ pdfkit PDF generated (${buffer.length} bytes)`);
                return buffer;
            } catch (pdfkitError) {
                console.warn('⚠️ pdfkit failed, falling back to Puppeteer:', pdfkitError.message);
            }
        }

        // Fallback: Puppeteer / headless Chrome
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

    // Pure Node.js bank statement PDF using pdfkit
    generateBankStatementPDFWithPDFKit(data) {
        return new Promise((resolve, reject) => {
            if (!PDFDocument) return reject(new Error('pdfkit not installed'));

            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const { startDate, endDate, openingBalance, closingBalance, totalDebits, totalCredits, transactions, churchName, churchAddress, churchABN } = data;

            const blue = '#4a6fa5';
            const grey = '#666666';
            const L = 40, R = 555, W = 515;

            // Header
            doc.fontSize(18).fillColor(blue).font('Helvetica-Bold')
               .text(churchName || 'St. Michael Eritrean Orthodox Tewahedo Church', { align: 'center' });
            doc.fontSize(10).fillColor(grey).font('Helvetica')
               .text(churchAddress || '60 Osborne Street, Joondanna, WA 6060', { align: 'center' })
               .text(churchABN || 'ABN: 80 798 549 161', { align: 'center' });
            doc.moveDown(0.3);
            doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor(blue).lineWidth(2).stroke();
            doc.moveDown(0.5);

            // Title
            doc.fontSize(14).fillColor('#333333').font('Helvetica-Bold')
               .text('FINANCIAL STATEMENT', { align: 'center' });
            doc.moveDown(0.8);

            // Summary section
            const startStr = new Date(startDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
            const endStr = new Date(endDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
            
            let y = doc.y;
            doc.rect(L, y, W, 60).fillColor('#f8f9fa').fill();
            doc.rect(L, y, W, 60).strokeColor('#dddddd').lineWidth(0.5).stroke();

            doc.fontSize(11).fillColor('#333333').font('Helvetica-Bold')
               .text(`Period: ${startStr} to ${endStr}`, L + 10, y + 10, { width: W - 20 });

            const summaryY = y + 28;
            const col1 = L + 10, col2 = L + 140, col3 = L + 280, col4 = L + 420;
            doc.fontSize(9).fillColor(grey).font('Helvetica');
            doc.text('Opening Balance:', col1, summaryY);
            doc.text('Total Credits:', col2, summaryY);
            doc.text('Total Debits:', col3, summaryY);
            doc.text('Closing Balance:', col4, summaryY);

            doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold');
            doc.text(`$${Number(openingBalance || 0).toFixed(2)}`, col1, summaryY + 12);
            doc.text(`$${Number(totalCredits).toFixed(2)}`, col2, summaryY + 12);
            doc.text(`$${Number(totalDebits).toFixed(2)}`, col3, summaryY + 12);
            doc.text(`$${Number(closingBalance).toFixed(2)}`, col4, summaryY + 12);

            y += 70;

            // Table header
            const cols = { date: L, desc: L + 70, ref: L + 260, debit: L + 330, credit: L + 405, balance: L + 480 };
            doc.rect(L, y, W, 20).fillColor(blue).fill();
            doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold');
            doc.text('Date', cols.date + 3, y + 6, { width: 65 });
            doc.text('Description', cols.desc + 3, y + 6, { width: 185 });
            doc.text('Ref', cols.ref + 3, y + 6, { width: 65 });
            doc.text('Debit', cols.debit + 3, y + 6, { width: 70, align: 'right' });
            doc.text('Credit', cols.credit + 3, y + 6, { width: 70, align: 'right' });
            doc.text('Balance', cols.balance + 3, y + 6, { width: 70, align: 'right' });
            y += 20;

            // Transactions
            let runningBalance = openingBalance || 0;
            transactions.forEach((tx, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
                const rowHeight = 18;

                if (y + rowHeight > 750) {
                    doc.addPage();
                    y = 40;
                }

                doc.rect(L, y, W, rowHeight).fillColor(bg).fill();
                doc.rect(L, y, W, rowHeight).strokeColor('#dddddd').lineWidth(0.3).stroke();

                const txDate = new Date(tx.date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const desc = (tx.description || 'No description').substring(0, 40);
                const ref = (tx.reference || '-').substring(0, 15);

                let debit = '-', credit = '-';
                if (tx.type === 'expense') {
                    debit = tx.amount.toFixed(2);
                    runningBalance -= tx.amount;
                } else {
                    credit = tx.amount.toFixed(2);
                    runningBalance += tx.amount;
                }

                doc.fontSize(7).fillColor('#333333').font('Helvetica');
                doc.text(txDate, cols.date + 3, y + 5, { width: 65 });
                doc.text(desc, cols.desc + 3, y + 5, { width: 185 });
                doc.text(ref, cols.ref + 3, y + 5, { width: 65 });
                doc.text(debit, cols.debit + 3, y + 5, { width: 70, align: 'right' });
                doc.text(credit, cols.credit + 3, y + 5, { width: 70, align: 'right' });
                doc.text(runningBalance.toFixed(2), cols.balance + 3, y + 5, { width: 70, align: 'right' });

                y += rowHeight;
            });

            // Footer
            y += 10;
            doc.moveTo(L, y).lineTo(R, y).strokeColor('#dddddd').lineWidth(1).stroke();
            y += 8;
            const genDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
            doc.fontSize(8).fillColor(grey).font('Helvetica')
               .text(`Generated on ${genDate}`, L, y, { align: 'center', width: W });

            doc.end();
        });
    }

    async generateBankStatementPDF(htmlContent) {
        // Try pdfkit-based generation first (no Chrome needed)
        if (PDFDocument && typeof htmlContent === 'object' && htmlContent.transactions) {
            try {
                console.log('🔄 Generating bank statement with pdfkit...');
                const buffer = await this.generateBankStatementPDFWithPDFKit(htmlContent);
                console.log(`✅ pdfkit bank statement generated (${buffer.length} bytes)`);
                return buffer;
            } catch (pdfkitError) {
                console.warn('⚠️ pdfkit bank statement failed, falling back to Puppeteer:', pdfkitError.message);
            }
        }

        // Fallback: Puppeteer-based HTML rendering
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