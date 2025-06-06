import express from 'express';
import { 
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
} from '../controllers/adminController.js';
import authAdmin from '../middleware/authAdmin.js';
import upload from '../middleware/multer.js';

const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin);
adminRouter.get("/appointments", authAdmin, appointmentsAdmin);
adminRouter.put("/appointment-cancel/:appointmentId", authAdmin, appointmentCancel);
adminRouter.put("/appointment-approve/:appointmentId", authAdmin, approveAppointment);
adminRouter.get("/all-doctors", authAdmin, allDoctors);
adminRouter.get("/dashboard", authAdmin, adminDashboard);

// User management routes
adminRouter.get('/users', authAdmin, getAllUsers);
adminRouter.get('/pending-registrations', authAdmin, getPendingRegistrations);
adminRouter.put('/update-approval/:userId', authAdmin, updateApprovalStatus);
adminRouter.delete('/delete-user/:userId', authAdmin, deleteUser);
adminRouter.get('/users-appointment-stats', authAdmin, getUsersAppointmentStats);

// User archive routes
adminRouter.put('/archive-user/:userId', authAdmin, archiveUser);
adminRouter.put('/restore-user/:userId', authAdmin, restoreUser);
adminRouter.get('/archived-users', authAdmin, getArchivedUsers);

// Doctor management routes
adminRouter.post("/add-doctor", authAdmin, upload.single('image'), addDoctor);
adminRouter.get("/doctor/:id", authAdmin, getDoctorById);
adminRouter.put("/update-doctor/:id", authAdmin, upload.single('image'), updateDoctor);
adminRouter.delete("/delete-doctor/:id", authAdmin, deleteDoctor);
adminRouter.post("/change-availability", authAdmin, changeAvailability);

// Doctor archive routes
adminRouter.put("/archive-doctor/:id", authAdmin, archiveDoctor);
adminRouter.put("/restore-doctor/:id", authAdmin, restoreDoctor);
adminRouter.get("/archived-doctors", authAdmin, getArchivedDoctors);

// Day off management route
adminRouter.get("/manual-day-off-check", authAdmin, manualDayOffCheck);

export default adminRouter;