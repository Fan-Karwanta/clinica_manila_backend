import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { cancelPastAppointments } from "../utils/appointmentUtils.js";
import { sendPatientAppointmentStatusNotification } from "../utils/emailService.js";
import userModel from "../models/userModel.js";

// API for doctor Login 
const loginDoctor = async (req, res) => {

    try {

        const { email, password } = req.body
        const user = await doctorModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
    try {

        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
    try {

        const { docId, appointmentId, cancellationReason } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { 
                cancelled: true,
                cancellationReason: cancellationReason || 'Cancelled by doctor',
                cancelledBy: 'doctor'
            })
            
            // Get patient email from userId
            const patient = await userModel.findById(appointmentData.userId);
            
            // Send email notification to patient about appointment cancellation
            try {
                if (patient && patient.email) {
                    await sendPatientAppointmentStatusNotification(
                        patient.email,
                        appointmentData,
                        'cancelled'
                    );
                    console.log('Patient cancellation email sent successfully');
                }
            } catch (emailError) {
                // Log error but don't fail the appointment cancellation
                console.error('Failed to send patient cancellation email:', emailError);
            }
            
            return res.json({ success: true, message: 'Appointment Cancelled' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
    try {

        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            
            // Get patient email from userId
            const patient = await userModel.findById(appointmentData.userId);
            
            // Send email notification to patient about appointment approval
            try {
                if (patient && patient.email) {
                    await sendPatientAppointmentStatusNotification(
                        patient.email,
                        appointmentData,
                        'completed'
                    );
                    console.log('Patient approval email sent successfully');
                }
            } catch (emailError) {
                // Log error but don't fail the appointment approval
                console.error('Failed to send patient approval email:', emailError);
            }
            
            return res.json({ success: true, message: 'Appointment Approved' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to change doctor availablity for Admin and Doctor Panel
const changeAvailablity = async (req, res) => {
    try {

        const { docId } = req.body

        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availablity Changed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor profile for  Doctor Panel
const doctorProfile = async (req, res) => {
    try {

        const { docId } = req.body
        const profileData = await doctorModel.findById(docId).select('-password')

        res.json({ success: true, profileData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update doctor profile data from  Doctor Panel
const updateDoctorProfile = async (req, res) => {
    try {

        const { docId, fees, address, available, dayOff, about } = req.body

        await doctorModel.findByIdAndUpdate(docId, { fees, address, available, dayOff, about })

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
    try {

        const { docId } = req.body

        const appointments = await appointmentModel.find({ docId })

        let earnings = 0

        appointments.map((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount
            }
        })

        let patients = []

        appointments.map((item) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })



        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to change doctor password from Doctor Panel
const changePassword = async (req, res) => {
    try {
        const { docId } = req.body
        const { currentPassword, newPassword } = req.body

        // Validate inputs
        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: "Both current and new password are required" })
        }

        // Find the doctor
        const doctor = await doctorModel.findById(docId)
        if (!doctor) {
            return res.json({ success: false, message: "Doctor not found" })
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, doctor.password)
        if (!isMatch) {
            return res.json({ success: false, message: "Current password is incorrect" })
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        // Update the password
        await doctorModel.findByIdAndUpdate(docId, { password: hashedPassword })

        res.json({ success: true, message: "Password updated successfully" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update doctor availability based on day off
const updateDayOffAvailability = async (req, res) => {
    try {
        const { updateDoctorAvailabilityBasedOnDayOff } = await import('../utils/dayOffChecker.js');
        const result = await updateDoctorAvailabilityBasedOnDayOff();
        
        res.json(result);
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to add consultation summary to a completed appointment
const addConsultationSummary = async (req, res) => {
    try {
        const { docId, appointmentId, consultationSummary } = req.body

        if (!consultationSummary || consultationSummary.trim() === '') {
            return res.json({ success: false, message: 'Consultation summary is required' })
        }

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId && appointmentData.isCompleted) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { consultationSummary })
            
            // Get patient email from userId
            const patient = await userModel.findById(appointmentData.userId);
            
            // Send email notification to patient about consultation summary
            try {
                if (patient && patient.email) {
                    await sendPatientAppointmentStatusNotification(
                        patient.email,
                        appointmentData,
                        'summary_added'
                    );
                    console.log('Patient consultation summary notification sent successfully');
                }
            } catch (emailError) {
                // Log error but don't fail the summary addition
                console.error('Failed to send patient consultation summary notification:', emailError);
            }
            
            return res.json({ success: true, message: 'Consultation summary added successfully' })
        }

        res.json({ success: false, message: 'Unable to add consultation summary' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get appointment history for doctor (completed appointments)
const appointmentHistory = async (req, res) => {
    try {
        const { docId } = req.body
        const appointments = await appointmentModel.find({ 
            docId, 
            isCompleted: true,
            cancelled: false
        })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginDoctor,
    appointmentsDoctor,
    appointmentCancel,
    doctorList,
    changeAvailablity,
    appointmentComplete,
    doctorDashboard,
    doctorProfile,
    updateDoctorProfile,
    changePassword,
    updateDayOffAvailability,
    addConsultationSummary,
    appointmentHistory
}