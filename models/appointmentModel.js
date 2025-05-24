import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    appointmentReason: { type: String, default: '' }, // Reason for booking the appointment
    cancelled: { type: Boolean, default: false },
    cancellationReason: { type: String, default: '' },
    cancelledBy: { type: String, default: '' }, // 'admin', 'doctor', or 'user'
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    consultationSummary: { type: String, default: '' } // Summary of the consultation by the doctor
})

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema)
export default appointmentModel