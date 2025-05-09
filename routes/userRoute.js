import express from "express";
import { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe, markAppointmentRead, checkEmailStatus, forgotPassword, verifyResetToken, resetPassword, createResetToken, getUserBookedSlots } from '../controllers/userController.js';
import authUser from "../middleware/authUser.js";
import upload from "../middleware/multer.js";

const userRouter = express.Router();

userRouter.post("/register", upload.single('validId'), registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/check-email", checkEmailStatus);
userRouter.get("/get-profile", authUser, getProfile);
userRouter.put("/update-profile", authUser, upload.single('image'), updateProfile);
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.get("/booked-slots", authUser, getUserBookedSlots)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)
userRouter.post("/payment-razorpay", authUser, paymentRazorpay)
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay)
userRouter.post("/payment-stripe", authUser, paymentStripe)
userRouter.post("/verifyStripe", authUser, verifyStripe)
userRouter.post("/mark-appointment-read", authUser, markAppointmentRead)
userRouter.post("/forgot-password", forgotPassword)
userRouter.get("/reset-password/:token", verifyResetToken)
userRouter.post("/reset-password/:token", resetPassword)
userRouter.post("/create-reset-token", authUser, createResetToken)

export default userRouter;