const QRCode = require('qrcode');

class QRCodeGenerator {
    /**
     * Generate QR code for a member
     * @param {Object} member - Member object
     * @param {Object} options - QR code options
     * @returns {Promise<string>} Base64 data URL of QR code
     */
    static async generateMemberQRCode(member, options = {}) {
        try {
            // Create member data for QR code
            const memberData = {
                id: member._id.toString(),
                name: `${member.firstName} ${member.lastName}`,
                email: member.email,
                phone: member.phone,
                membershipStatus: member.membershipStatus || 'active',
                joinDate: member.joinDate,
                membershipNumber: member.membershipNumber || member._id.toString().substring(18),
                church: 'St. Michael Eritrean Orthodox Tewahedo Church',
                generated: new Date().toISOString()
            };

            // Convert to JSON string
            const qrData = JSON.stringify(memberData);

            // QR code generation options
            const qrOptions = {
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: options.size || 200,
                ...options
            };

            // Generate QR code as data URL
            const qrCodeDataURL = await QRCode.toDataURL(qrData, qrOptions);
            
            console.log(`✅ QR code generated for member: ${member.firstName} ${member.lastName}`);
            return qrCodeDataURL;

        } catch (error) {
            console.error('❌ Error generating member QR code:', error);
            throw new Error(`QR code generation failed: ${error.message}`);
        }
    }

    /**
     * Generate simple QR code with custom data
     * @param {string} data - Data to encode
     * @param {Object} options - QR code options
     * @returns {Promise<string>} Base64 data URL of QR code
     */
    static async generateQRCode(data, options = {}) {
        try {
            const qrOptions = {
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: options.size || 200,
                ...options
            };

            const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
            console.log('✅ QR code generated successfully');
            return qrCodeDataURL;

        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            throw new Error(`QR code generation failed: ${error.message}`);
        }
    }

    /**
     * Generate QR code for member card with specific format
     * @param {Object} member - Member object
     * @returns {Promise<string>} Base64 data URL of QR code
     */
    static async generateMemberCardQRCode(member) {
        try {
            // Simplified data for member card QR code
            const cardData = {
                id: member._id.toString(),
                name: `${member.firstName} ${member.lastName}`,
                memberNo: member.membershipNumber || member._id.toString().substring(18),
                status: member.membershipStatus || 'active',
                church: 'SMEOTC' // Abbreviated church name
            };

            return await this.generateQRCode(JSON.stringify(cardData), {
                size: 150,
                margin: 2
            });

        } catch (error) {
            console.error('❌ Error generating member card QR code:', error);
            throw new Error(`Member card QR code generation failed: ${error.message}`);
        }
    }

    /**
     * Generate QR code for receipt with transaction info
     * @param {Object} transaction - Transaction object
     * @param {Object} member - Member object (optional)
     * @returns {Promise<string>} Base64 data URL of QR code
     */
    static async generateReceiptQRCode(transaction, member = null) {
        try {
            const receiptData = {
                transactionId: transaction._id.toString(),
                amount: transaction.amount,
                date: transaction.date,
                type: transaction.type,
                category: transaction.category,
                description: transaction.description,
                church: 'SMEOTC',
                generated: new Date().toISOString()
            };

            // Add member info if available
            if (member) {
                receiptData.member = {
                    id: member._id.toString(),
                    name: `${member.firstName} ${member.lastName}`
                };
            }

            return await this.generateQRCode(JSON.stringify(receiptData), {
                size: 120,
                margin: 1
            });

        } catch (error) {
            console.error('❌ Error generating receipt QR code:', error);
            throw new Error(`Receipt QR code generation failed: ${error.message}`);
        }
    }

    /**
     * Parse QR code data back to object
     * @param {string} qrData - QR code data string
     * @returns {Object} Parsed data object
     */
    static parseQRCodeData(qrData) {
        try {
            return JSON.parse(qrData);
        } catch (error) {
            console.error('❌ Error parsing QR code data:', error);
            throw new Error('Invalid QR code data format');
        }
    }
}

module.exports = QRCodeGenerator;