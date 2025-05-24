import { sendFeedbackEmail } from '../utils/emailService.js';

export const submitFeedback = async (req, res) => {
    try {
        const { name, number, email, feedback } = req.body;
        
        // Validate required fields
        if (!name || !email || !feedback) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and feedback are required fields'
            });
        }
        
        // Send the feedback email
        const emailSent = await sendFeedbackEmail({
            name,
            number,
            email,
            feedback
        });
        
        if (emailSent) {
            return res.status(200).json({
                success: true,
                message: 'Feedback submitted successfully'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Failed to send feedback email'
            });
        }
    } catch (error) {
        console.error('Error in submitFeedback controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
