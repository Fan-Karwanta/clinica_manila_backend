import jwt from 'jsonwebtoken'
import bcrypt from "bcrypt"
import appointmentModel from "../models/appointmentModel.js"
import doctorModel from "../models/doctorModel.js"
import userModel from "../models/userModel.js"
import validator from "validator"
import { v2 as cloudinary } from "cloudinary"
import { sendRegistrationEmail } from '../utils/emailService.js'
import { cancelPastAppointments } from '../utils/appointmentUtils.js'

// API for admin login
const loginAdmin = async (req, res) => {
    try {

        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}


// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
    try {
        // First, auto-cancel any past appointments
        await cancelPastAppointments();

        const appointments = await appointmentModel.find({})
        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.params;  // Get appointmentId from URL params
        const { cancellationReason } = req.body; // Get cancellation reason from request body
        
        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData) {
            return res.json({ success: false, message: 'Appointment not found' });
        }

        // Update appointment status to cancelled with reason
        await appointmentModel.findByIdAndUpdate(appointmentId, { 
            cancelled: true,
            cancellationReason: cancellationReason || 'Cancelled by admin',
            cancelledBy: 'admin'
        });

        // Release the doctor's slot
        const { docId, slotDate, slotTime } = appointmentData;
        const doctorData = await doctorModel.findById(docId);
        
        if (doctorData && doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
            let slots_booked = doctorData.slots_booked;
            slots_booked[slotDate] = slots_booked[slotDate].filter(time => time !== slotTime);
            await doctorModel.findByIdAndUpdate(docId, { slots_booked });
        }

        res.json({ success: true, message: 'Appointment Cancelled Successfully' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// API for adding Doctor
const addDoctor = async (req, res) => {

    try {

        const { name, name_extension, email, password, speciality, degree, experience, about, fees, address, doc_lic_ID } = req.body
        const imageFile = req.file

        // checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address || !doc_lic_ID) {
            return res.json({ success: false, message: "Missing Details" })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        // upload image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
        const imageUrl = imageUpload.secure_url

        const doctorData = {
            name,
            name_extension: name_extension || '',
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now(),
            doc_lic_ID
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()
        res.json({ success: true, message: 'Doctor Added' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {
        // Only return non-archived doctors
        const doctors = await doctorModel.find({ isArchived: { $ne: true } })
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
    try {

        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Get all pending registrations
const getPendingRegistrations = async (req, res) => {
    try {
        const pendingUsers = await userModel.find({ approval_status: 'pending' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            pendingUsers
        });
    } catch (error) {
        console.error('Error fetching pending registrations:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch pending registrations'
        });
    }
};

// Update user approval status
const updateApprovalStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['approved', 'declined', 'blocked'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid approval status'
            });
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            { approval_status: status },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Send email notification only for approved/declined status
        if (status !== 'blocked') {
            await sendRegistrationEmail(user.email, status);
        }

        res.status(200).json({
            success: true,
            message: `User ${status === 'blocked' ? 'blocked' : `registration ${status}`} successfully`,
            user
        });
    } catch (error) {
        console.error('Error updating approval status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update approval status'
        });
    }
};

// API for appointment approval
const approveAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        const appointment = await appointmentModel.findByIdAndUpdate(
            appointmentId,
            { status: 'approved' },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Appointment approved successfully',
            appointment
        });
    } catch (error) {
        console.error('Error approving appointment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to approve appointment'
        });
    }
};

// API to get all users list
const getAllUsers = async (req, res) => {
    try {
        // Only return non-archived users
        const users = await userModel.find({ isArchived: { $ne: true } });
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch users'
        });
    }
};

// API to get doctor by ID
const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const doctor = await doctorModel.findById(id).select('-password');
        
        if (!doctor) {
            return res.json({ success: false, message: 'Doctor not found' });
        }
        
        res.json({ success: true, doctor });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to update doctor
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            name_extension, 
            email, 
            speciality, 
            degree, 
            experience, 
            about, 
            fees, 
            address, 
            doc_lic_ID
        } = req.body;
        
        // Find the doctor
        const doctor = await doctorModel.findById(id);
        
        if (!doctor) {
            return res.json({ success: false, message: 'Doctor not found' });
        }
        
        // Update doctor data
        const updateData = {
            name: name || doctor.name,
            name_extension: name_extension !== undefined ? name_extension : doctor.name_extension,
            email: email || doctor.email,
            speciality: speciality || doctor.speciality,
            degree: degree || doctor.degree,
            experience: experience || doctor.experience,
            about: about || doctor.about,
            fees: fees ? Number(fees) : doctor.fees,
            address: address ? JSON.parse(address) : doctor.address,
            doc_lic_ID: doc_lic_ID || doctor.doc_lic_ID
        };
        
        // Password changes are now handled in the doctor's dashboard
        
        // Handle image update if provided
        if (req.file) {
            const imageUpload = await cloudinary.uploader.upload(req.file.path, { resource_type: "image" });
            updateData.image = imageUpload.secure_url;
        }
        
        // Check if day off field is included in the request
        const dayOff = req.body.dayOff;
        const dayOffChanged = dayOff !== undefined && dayOff !== doctor.dayOff;
        
        // Update the doctor
        await doctorModel.findByIdAndUpdate(id, updateData);
        
        // If day off has changed, immediately run the day off checker
        if (dayOffChanged) {
            const { updateDoctorAvailabilityBasedOnDayOff } = await import('../utils/dayOffChecker.js');
            await updateDoctorAvailabilityBasedOnDayOff();
        }
        
        res.json({ success: true, message: 'Doctor updated successfully' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to archive doctor instead of deleting
const archiveDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if doctor exists
        const doctor = await doctorModel.findById(id);
        
        if (!doctor) {
            return res.json({ success: false, message: 'Doctor not found' });
        }
        
        // Archive the doctor
        await doctorModel.findByIdAndUpdate(id, {
            isArchived: true,
            archivedAt: new Date()
        });
        
        res.json({ success: true, message: 'Doctor archived successfully' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to restore archived doctor
const restoreDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if doctor exists
        const doctor = await doctorModel.findById(id);
        
        if (!doctor) {
            return res.json({ success: false, message: 'Doctor not found' });
        }
        
        // Restore the doctor
        await doctorModel.findByIdAndUpdate(id, {
            isArchived: false,
            archivedAt: null
        });
        
        res.json({ success: true, message: 'Doctor restored successfully' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get all archived doctors
const getArchivedDoctors = async (req, res) => {
    try {
        const archivedDoctors = await doctorModel.find({ isArchived: true });
        res.json({ success: true, archivedDoctors });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to delete doctor (keeping for backward compatibility)
const deleteDoctor = async (req, res) => {
    try {
        // Instead of deleting, we now archive the doctor
        return await archiveDoctor(req, res);
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to change doctor availability
const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body;
        
        // Find the doctor
        const doctor = await doctorModel.findById(docId);
        
        if (!doctor) {
            return res.json({ success: false, message: 'Doctor not found' });
        }
        
        // Toggle availability
        doctor.available = !doctor.available;
        await doctor.save();
        
        res.json({ 
            success: true, 
            message: `Doctor is now ${doctor.available ? 'available' : 'unavailable'}`
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to archive user instead of deleting
const archiveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find the user
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Archive the user
        await userModel.findByIdAndUpdate(userId, {
            isArchived: true,
            archivedAt: new Date()
        });
        
        res.status(200).json({
            success: true,
            message: 'User archived successfully'
        });
    } catch (error) {
        console.error('Error archiving user:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to archive user'
        });
    }
};

// API to restore archived user
const restoreUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find the user
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Restore the user
        await userModel.findByIdAndUpdate(userId, {
            isArchived: false,
            archivedAt: null
        });
        
        res.status(200).json({
            success: true,
            message: 'User restored successfully'
        });
    } catch (error) {
        console.error('Error restoring user:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to restore user'
        });
    }
};

// API to get all archived users
const getArchivedUsers = async (req, res) => {
    try {
        const archivedUsers = await userModel.find({ isArchived: true });
        
        res.status(200).json({
            success: true,
            archivedUsers
        });
    } catch (error) {
        console.error('Error fetching archived users:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch archived users'
        });
    }
};

// API to delete user (keeping for backward compatibility)
const deleteUser = async (req, res) => {
    try {
        // Instead of deleting, we now archive the user
        return await archiveUser(req, res);
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete user'
        });
    }
};

// API to get appointment statistics for all users
const getUsersAppointmentStats = async (req, res) => {
    try {
        // Get all appointments
        const appointments = await appointmentModel.find({});
        
        // Create a map to store user stats
        const userStats = {};
        
        // Calculate stats for each appointment
        appointments.forEach(appointment => {
            const userId = appointment.userId?.toString();
            if (!userId) return;
            
            // Initialize user stats if not already done
            if (!userStats[userId]) {
                userStats[userId] = {
                    total: 0,
                    approved: 0,
                    pending: 0,
                    cancelled: 0
                };
            }
            
            // Increment total appointments
            userStats[userId].total += 1;
            
            // Check status and increment corresponding counter
            if (appointment.cancelled) {
                userStats[userId].cancelled += 1;
            } else if (appointment.isCompleted) {
                userStats[userId].approved += 1;
            } else {
                userStats[userId].pending += 1;
            }
        });
        
        res.status(200).json({
            success: true,
            userStats
        });
    } catch (error) {
        console.error('Error getting user appointment stats:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get user appointment statistics'
        });
    }
};

// API to manually trigger day off checker and update doctor availability
const manualDayOffCheck = async (req, res) => {
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

export { 
    loginAdmin,
    appointmentsAdmin,
    appointmentCancel,
    allDoctors,
    adminDashboard,
    getPendingRegistrations,
    updateApprovalStatus,
    approveAppointment,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorById,
    getAllUsers,
    changeAvailability,
    deleteUser,
    getUsersAppointmentStats,
    archiveDoctor,
    restoreDoctor,
    getArchivedDoctors,
    archiveUser,
    restoreUser,
    getArchivedUsers,
    manualDayOffCheck
}