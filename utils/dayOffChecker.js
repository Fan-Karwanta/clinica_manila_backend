import doctorModel from '../models/doctorModel.js';

/**
 * Utility function to check if today is a doctor's day off and update availability accordingly
 * This function should be called on a schedule or when needed
 */
export const updateDoctorAvailabilityBasedOnDayOff = async () => {
    try {
        // Get the current day of the week
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const currentDayOfWeek = daysOfWeek[today.getDay()];
        
        // Find all doctors whose day off is today
        const doctorsWithDayOff = await doctorModel.find({ dayOff: currentDayOfWeek });
        
        // Update their availability status to unavailable
        for (const doctor of doctorsWithDayOff) {
            await doctorModel.findByIdAndUpdate(doctor._id, { available: false });
            console.log(`Updated availability for doctor ${doctor.name} (${doctor._id}) to unavailable because today is their day off (${currentDayOfWeek})`);
        }
        
        // Find all doctors whose day off is not today but might have been set to unavailable yesterday
        const doctorsWithoutDayOff = await doctorModel.find({ 
            dayOff: { $ne: currentDayOfWeek, $ne: '' } // Only consider doctors who have a day off set and it's not today
        });
        
        // Check if their day off was yesterday and if so, reset their availability to true
        const yesterdayIndex = (today.getDay() - 1 + 7) % 7; // Handle Sunday case
        const yesterday = daysOfWeek[yesterdayIndex];
        
        for (const doctor of doctorsWithoutDayOff) {
            if (doctor.dayOff === yesterday) {
                await doctorModel.findByIdAndUpdate(doctor._id, { available: true });
                console.log(`Reset availability for doctor ${doctor.name} (${doctor._id}) to available because yesterday was their day off (${yesterday})`);
            }
        }
        
        return { success: true, message: 'Doctor availability updated based on day off settings' };
    } catch (error) {
        console.error('Error updating doctor availability based on day off:', error);
        return { success: false, message: error.message };
    }
};
