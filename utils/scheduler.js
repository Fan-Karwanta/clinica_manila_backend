import { updateDoctorAvailabilityBasedOnDayOff } from './dayOffChecker.js';

/**
 * Initialize the scheduler for periodic tasks
 */
export const initScheduler = async () => {
    try {
        console.log('Initializing scheduler for periodic tasks...');
        
        // Run the day off checker immediately when the server starts
        await updateDoctorAvailabilityBasedOnDayOff();
        console.log('Initial day off check completed');
        
        // Set up a daily check at midnight
        setInterval(async () => {
            console.log('Running scheduled day off check...');
            await updateDoctorAvailabilityBasedOnDayOff();
            console.log('Scheduled day off check completed');
        }, 24 * 60 * 60 * 1000); // Run every 24 hours
        
        console.log('Scheduler initialized successfully');
    } catch (error) {
        console.error('Error initializing scheduler:', error);
    }
};
