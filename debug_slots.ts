
import { calculateDailySlots } from "./src/server/availability/getSlots";
import { isWithinBusinessHours } from "./src/lib/scheduling";
import { startOfDay, addMinutes, format } from "date-fns";

const mockConfig = {
    businessHours: {
        mon: [["09:00", "18:00"]],
        tue: [["09:00", "18:00"]],
        wed: [["09:00", "18:00"]],
        thu: [["09:00", "18:00"]],
        fri: [["09:00", "18:00"]],
    },
    timeZone: "America/Argentina/Buenos_Aires",
    bufferMinutes: 0
};

const mockData = {
    appointments: [],
    blocks: []
};

const targetDate = new Date("2026-01-08T00:00:00Z"); // Thursday
const slots = calculateDailySlots(targetDate, mockConfig, mockData, {
    durationMinutes: 30,
    locationId: "loc1",
    providerId: "prov1"
});

console.log("Calculated Slots:", slots);

// Debug specific time
const testTime = new Date("2026-01-08T15:00:00Z"); // 12:00 Argentina
console.log("Is 15:00 UTC (12:00 ARG) within hours?", isWithinBusinessHours({
    start: testTime,
    end: addMinutes(testTime, 30),
    businessHours: mockConfig.businessHours,
    timeZone: mockConfig.timeZone
}));
