import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    name_extension: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    doc_lic_ID: { type: String, required: true },
    dayOff: { type: String, default: '' }, // Day of the week that doctor is off (Monday, Tuesday, etc.)
    isArchived: { type: Boolean, default: false }, // Flag to indicate if doctor is archived
    archivedAt: { type: Date } // Date when doctor was archived
}, { minimize: false })

const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);
export default doctorModel;