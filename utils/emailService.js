import nodemailer from 'nodemailer';

// Common feedback button for all emails
const getFeedbackButton = () => {
    // Use the FRONTEND_URL from environment variables instead of hardcoded localhost
    const frontendUrl = process.env.FRONTEND_URL || 'https://clinica-manila.vercel.app';
    
    return `
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="color: #666; font-size: 14px;">We value your feedback!</p>
            <div style="text-align: center; margin: 15px 0;">
                <a href="${frontendUrl}/feedback" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Send Feedback</a>
            </div>
        </div>
    `;
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.APP_EMAIL,
        pass: process.env.APP_PASSWORD
    }
});

export const sendRegistrationEmail = async (userEmail, status) => {
    const subject = status === 'approved' 
        ? 'Registration Approved - Clinica Manila'
        : 'Registration Update - Clinica Manila';

    const message = status === 'approved'
        ? 'Congratulations! Your registration has been APPROVED. You can now LOG IN to your account to access our website.'
        : 'We regret to inform you that your registration has been DECLINED. Please contact Clinica Manila Support for more information.';

    const mailOptions = {
        from: '"Clinica Manila Support" <' + process.env.APP_EMAIL + '>',
        to: userEmail,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Clinica Manila Registration Status</h2>
                <p style="color: #666; font-size: 16px;">${message}</p>
                <div style="margin-top: 30px; color: #888; font-size: 14px;">
                    <p>Best regards,</p>
                    <p>Clinica Manila Support</p>
                </div>
                ${getFeedbackButton()}
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const sendAdminNewRegistrationAlert = async (userData) => {
    const { firstName, lastName, middleName } = userData;
    
    const mailOptions = {
        from: '"Clinica Manila System" <' + process.env.APP_EMAIL + '>',
        to: process.env.APP_EMAIL,
        subject: 'New User Registration - Clinica Manila',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New User Registration</h2>
                <p style="color: #666; font-size: 16px;">A new user has registered in the Clinica Manila platform:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>First Name:</strong> ${firstName}</p>
                    <p><strong>Middle Name:</strong> ${middleName || 'N/A'}</p>
                    <p><strong>Last Name:</strong> ${lastName}</p>
                </div>
                
                <p style="color: #666; font-size: 16px;">Please review this registration in the PENDING REGISTRATIONS section of the admin panel.</p>
                
                <div style="margin-top: 30px; color: #888; font-size: 14px;">
                    <p>This is an automated message from the Clinica Manila System.</p>
                </div>
                ${getFeedbackButton()}
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending admin notification email:', error);
        return false;
    }
};

export const sendDoctorAppointmentNotification = async (doctorEmail, appointmentData) => {
    const { userData, slotDate, slotTime } = appointmentData;
    const { firstName, lastName, middleName } = userData;
    
    // Format the date from day_month_year to a more readable format
    const [day, month, year] = slotDate.split('_').map(num => parseInt(num));
    
    // Convert month number to month name
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    const formattedDate = `${monthNames[month-1]} ${day}, ${year}`;
    
    const mailOptions = {
        from: '"Clinica Manila Appointments" <' + process.env.APP_EMAIL + '>',
        to: doctorEmail,
        subject: 'New Patient Appointment - Clinica Manila',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Patient Appointment</h2>
                <p style="color: #666; font-size: 16px;">A new patient has booked an appointment with you:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Patient Name:</strong> ${firstName} ${middleName ? middleName + ' ' : ''}${lastName}</p>
                    <p><strong>Appointment Date:</strong> ${formattedDate}</p>
                    <p><strong>Appointment Time:</strong> ${slotTime}</p>
                </div>
                
                <p style="color: #666; font-size: 16px;">You can view all your appointments in your doctor dashboard.</p>
                
                <div style="margin-top: 30px; color: #888; font-size: 14px;">
                    <p>Best regards,</p>
                    <p>Clinica Manila Appointments</p>
                </div>
                ${getFeedbackButton()}
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending doctor appointment notification:', error);
        return false;
    }
};

export const sendPatientAppointmentStatusNotification = async (patientEmail, appointmentData, status) => {
    const { docData, slotDate, slotTime } = appointmentData;
    
    // Format the date from day_month_year to a more readable format
    const [day, month, year] = slotDate.split('_').map(num => parseInt(num));
    
    // Convert month number to month name
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    const formattedDate = `${monthNames[month-1]} ${day}, ${year}`;
    
    // Determine subject and message based on status
    const isApproved = status === 'completed';
    
    const subject = isApproved 
        ? 'Appointment Approved - Clinica Manila'
        : 'Appointment Canceled - Clinica Manila';
    
    const statusText = isApproved ? 'APPROVED' : 'CANCELED';
    const statusColor = isApproved ? '#28a745' : '#dc3545'; // Green for approved, red for canceled
    
    const message = isApproved
        ? `Your appointment has been <strong style="color: ${statusColor};">APPROVED</strong> by the doctor. Please arrive at the clinic at least 15 minutes before your scheduled appointment time.`
        : `We regret to inform you that your appointment has been <strong style="color: ${statusColor};">CANCELED</strong> by the doctor. Please schedule another appointment at your convenience or contact Clinica Manila support for assistance.`;
    
    const mailOptions = {
        from: '"Clinica Manila Appointments" <' + process.env.APP_EMAIL + '>',
        to: patientEmail,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Appointment Status Update</h2>
                <p style="color: #666; font-size: 16px;">${message}</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Doctor:</strong> ${docData.name} ${docData.name_extension || ''}</p>
                    <p><strong>Speciality:</strong> ${docData.speciality ? docData.speciality.replace(/_/g, ' ') : ''}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${slotTime}</p>
                    <p><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
                </div>
                
                <div style="margin-top: 30px; color: #888; font-size: 14px;">
                    <p>If you have any questions, please contact Clinica Manila Support.</p>
                    <p>Email : clinica.manila.supp@gmail.com</p>
                    <p>Phone : +632 8661 7777</p>
                    <p>Best regards,</p>
                    <p>Clinica Manila Team</p>
                </div>
                ${getFeedbackButton()}
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending patient appointment status notification:', error);
        return false;
    }
};

export const sendFeedbackEmail = async (feedbackData) => {
    const { name, number, email, feedback } = feedbackData;
    
    const mailOptions = {
        from: '"Clinica Manila Feedback System" <' + process.env.APP_EMAIL + '>',
        to: 'clinica.manila.supp@gmail.com',
        subject: 'New Feedback Submission - Clinica Manila',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Feedback Submission</h2>
                <p style="color: #666; font-size: 16px;">A new feedback has been submitted through the website:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Phone Number:</strong> ${number || 'Not provided'}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Feedback:</strong></p>
                    <p style="background-color: #fff; padding: 10px; border-radius: 3px;">${feedback}</p>
                </div>
                
                <div style="margin-top: 30px; color: #888; font-size: 14px;">
                    <p>This is an automated message from the Clinica Manila Feedback System.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending feedback email:', error);
        return false;
    }
};

export const sendPasswordResetEmail = async (userEmail, resetUrl) => {
    const mailOptions = {
        from: '"Clinica Manila Support" <' + process.env.APP_EMAIL + '>',
        to: userEmail,
        subject: 'Password Reset - Clinica Manila',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Clinica Manila Password Reset</h2>
                <p style="color: #666; font-size: 16px;">You requested a password reset for your Clinica Manila account. Please click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
                </div>
                
                <p style="color: #666; font-size: 16px;">If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
                
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                    <p>If you need assistance, please contact us:</p>
                    <p>Email: clinica.manila.supp@gmail.com</p>
                    <p>Phone: +632 8661 7777</p>
                </div>
                
                <div style="margin-top: 20px; color: #888; font-size: 14px;">
                    <p>Best regards,</p>
                    <p>Clinica Manila Support</p>
                </div>
                ${getFeedbackButton()}
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};
