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
            // Generate token for authentication
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            
            // Run the day off checker to ensure doctor's availability status is up-to-date
            try {
                const { updateDoctorAvailabilityBasedOnDayOff } = await import('../utils/dayOffChecker.js')
                await updateDoctorAvailabilityBasedOnDayOff()
                console.log(`Day off check completed on doctor login for ${user.name}`)
            } catch (dayOffError) {
                console.error('Error running day off check on login:', dayOffError)
                // Continue with login even if day off check fails
            }
            
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
        
        // Get the current doctor data to check if dayOff has changed
        const currentDoctor = await doctorModel.findById(docId);
        const dayOffChanged = currentDoctor.dayOff !== dayOff;
        
        // Update the doctor profile
        await doctorModel.findByIdAndUpdate(docId, { fees, address, available, dayOff, about })
        
        // If dayOff has changed, immediately run the day off checker
        if (dayOffChanged) {
            const { updateDoctorAvailabilityBasedOnDayOff } = await import('../utils/dayOffChecker.js');
            await updateDoctorAvailabilityBasedOnDayOff();
        }
        
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
        // Force a fresh import to ensure we get the latest version
        const { updateDoctorAvailabilityBasedOnDayOff } = await import('../utils/dayOffChecker.js?v=' + Date.now());
        const result = await updateDoctorAvailabilityBasedOnDayOff();
        
        // Get the current day of the week for the response
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const currentDayOfWeek = daysOfWeek[today.getDay()];
        
        // Get all doctors with their day off and availability status for the response
        const doctors = await doctorModel.find({}, 'name dayOff available');
        
        // Count statistics for the response
        const stats = {
            total: doctors.length,
            onDayOff: doctors.filter(doc => doc.dayOff === currentDayOfWeek).length,
            available: doctors.filter(doc => doc.available).length,
            unavailable: doctors.filter(doc => !doc.available).length,
            withDayOff: doctors.filter(doc => doc.dayOff).length,
            withoutDayOff: doctors.filter(doc => !doc.dayOff).length,
            ...result.stats
        };
        
        res.json({
            success: true,
            message: `Doctor availability updated. Today is ${currentDayOfWeek}. ${stats.onDayOff} doctors have today as their day off.`,
            currentDay: currentDayOfWeek,
            stats,
            doctors: doctors.map(doc => ({
                id: doc._id,
                name: doc.name,
                dayOff: doc.dayOff || 'None',
                available: doc.available,
                isOnDayOff: doc.dayOff === currentDayOfWeek,
                status: doc.available ? 'Available' : 'Unavailable',
                dayOffStatus: !doc.dayOff ? 'No day off set' : 
                              doc.dayOff === currentDayOfWeek ? 'Currently on day off' : 
                              `Day off is on ${doc.dayOff}`
            }))
        });
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