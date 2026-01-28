const { sendInquiryEmail } = require('../services/emailService');

const submitInquiry = async (req, res) => {
    try {
        const { name, email, phone, message, brokerName, branchName } = req.body;

        if (!name || !email || !phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const result = await sendInquiryEmail({
            name,
            email,
            phone,
            message,
            brokerName: brokerName || 'General Inquiry',
            branchName: branchName || 'N/A'
        });

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Inquiry sent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send email'
            });
        }

    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    submitInquiry
};
