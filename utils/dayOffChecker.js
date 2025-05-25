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
        
        console.log(`Running day off check - Current day is: ${currentDayOfWeek}`);
        
        // PART 1: Handle doctors whose day off is TODAY - they should be unavailable
        // Get all doctors with today as their day off (regardless of current availability)
        const doctorsWithDayOffToday = await doctorModel.find({ dayOff: currentDayOfWeek });
        
        console.log(`Found ${doctorsWithDayOffToday.length} doctors with day off today (${currentDayOfWeek})`);
        
        // Force set their availability to unavailable
        for (const doctor of doctorsWithDayOffToday) {
            // Only update if they're currently available
            if (doctor.available) {
                await doctorModel.findByIdAndUpdate(doctor._id, { available: false });
                console.log(`TURNED OFF: Doctor ${doctor.name} (${doctor._id}) is now unavailable because today (${currentDayOfWeek}) is their day off`);
            } else {
                console.log(`Doctor ${doctor.name} is already unavailable on their day off (${currentDayOfWeek})`);
            }
        }
        
        // PART 2: Handle doctors whose day off is NOT today - they should be available
        // Get all doctors who have a day off set, but it's not today, and they're currently unavailable
        const doctorsToTurnOn = await doctorModel.find({
            dayOff: { $ne: currentDayOfWeek }, // Day off is not today
            available: false // Currently unavailable
        });
        
        console.log(`Found ${doctorsToTurnOn.length} doctors to turn available (not their day off today)`);
        
        // Turn them available
        for (const doctor of doctorsToTurnOn) {
            // Skip doctors with empty day off (they manage availability manually)
            if (!doctor.dayOff) {
                console.log(`Skipping doctor ${doctor.name} - no day off set, availability managed manually`);
                continue;
            }
            
            await doctorModel.findByIdAndUpdate(doctor._id, { available: true });
            console.log(`TURNED ON: Doctor ${doctor.name} (${doctor._id}) is now available because today (${currentDayOfWeek}) is not their day off (${doctor.dayOff})`);
        }
        
        return { 
            success: true, 
            message: 'Doctor availability updated based on day off settings',
            stats: {
                turnedOff: doctorsWithDayOffToday.filter(d => d.available).length,
                turnedOn: doctorsToTurnOn.filter(d => d.dayOff).length,
                currentDay: currentDayOfWeek
            }
        };
    } catch (error) {
        console.error('Error updating doctor availability based on day off:', error);
        return { success: false, message: error.message };
    }
};
