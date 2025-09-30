// utils/BusinessHoursSLACalculator.ts
import { addDays, startOfDay } from "date-fns";

export class BusinessHoursSLACalculator {
  // Calculate SLA deadline considering business hours and weekends
  static calculateSLADeadline(
    startTime: Date,
    hoursToAdd: number,
    config: {
      business_hours_only: boolean;
      business_start_time: string; // "09:00:00"
      business_end_time: string; // "17:00:00"
      include_weekends: boolean;
    }
  ): Date {
    // If 24/7 SLA, use simple calculation
    if (!config.business_hours_only) {
      return new Date(startTime.getTime() + hoursToAdd * 60 * 60 * 1000);
    }

    // Business hours calculation
    return this.addBusinessHours(startTime, hoursToAdd, config);
  }

  // Add business hours to a date
  static addBusinessHours(
    startDate: Date,
    hoursToAdd: number,
    config: {
      business_start_time: string;
      business_end_time: string;
      include_weekends: boolean;
    }
  ): Date {
    let currentTime = new Date(startDate);
    let remainingHours = hoursToAdd;

    // Parse business hours
    const businessStart = this.parseTime(config.business_start_time);
    const businessEnd = this.parseTime(config.business_end_time);

    console.log(
      `🕐 Calculating ${hoursToAdd}h from ${startDate} with business hours ${config.business_start_time}-${config.business_end_time}`
    );

    while (remainingHours > 0) {
      // Skip weekends if not included
      if (!config.include_weekends && this.isWeekend(currentTime)) {
        currentTime = this.getNextBusinessDay(
          currentTime,
          config.include_weekends
        );
        continue;
      }

      // Get business hours for current day
      const dayStart = this.getBusinessDayStart(currentTime, businessStart);
      const dayEnd = this.getBusinessDayEnd(currentTime, businessEnd);

      // If current time is before business start, move to business start
      if (currentTime < dayStart) {
        currentTime = dayStart;
      }

      // If current time is after business end, move to next business day
      if (currentTime >= dayEnd) {
        currentTime = this.getNextBusinessDay(dayEnd, config.include_weekends);
        currentTime = this.getBusinessDayStart(currentTime, businessStart);
        continue;
      }

      // Calculate hours remaining in current business day
      const hoursLeftInDay =
        (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

      if (remainingHours <= hoursLeftInDay) {
        // Can finish within current business day
        const finalTime = new Date(
          currentTime.getTime() + remainingHours * 60 * 60 * 1000
        );
        console.log(`✅ SLA deadline calculated: ${finalTime}`);
        return finalTime;
      } else {
        // Need to continue to next business day
        remainingHours -= hoursLeftInDay;
        currentTime = this.getNextBusinessDay(dayEnd, config.include_weekends);
        currentTime = this.getBusinessDayStart(currentTime, businessStart);
      }
    }

    return currentTime;
  }

  // Check if date is weekend
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  // Get next business day
  static getNextBusinessDay(date: Date, includeWeekends: boolean): Date {
    let nextDay = addDays(startOfDay(date), 1);

    if (!includeWeekends) {
      while (this.isWeekend(nextDay)) {
        nextDay = addDays(nextDay, 1);
      }
    }

    return nextDay;
  }

  // Parse time string "09:00:00" to hours and minutes
  static parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(":").map(Number);
    return { hours, minutes };
  }

  // Get business day start time
  static getBusinessDayStart(
    date: Date,
    businessStart: { hours: number; minutes: number }
  ): Date {
    const dayStart = startOfDay(date);
    dayStart.setHours(businessStart.hours, businessStart.minutes, 0, 0);
    return dayStart;
  }

  // Get business day end time
  static getBusinessDayEnd(
    date: Date,
    businessEnd: { hours: number; minutes: number }
  ): Date {
    const dayEnd = startOfDay(date);
    dayEnd.setHours(businessEnd.hours, businessEnd.minutes, 0, 0);
    return dayEnd;
  }

  // Calculate business hours between two dates
  static calculateBusinessHoursBetween(
    startDate: Date,
    endDate: Date,
    config: {
      business_start_time: string;
      business_end_time: string;
      include_weekends: boolean;
    }
  ): number {
    if (endDate <= startDate) return 0;

    const businessStart = this.parseTime(config.business_start_time);
    const businessEnd = this.parseTime(config.business_end_time);

    let currentDate = new Date(startDate);
    let totalHours = 0;

    while (currentDate < endDate) {
      // Skip weekends if not included
      if (!config.include_weekends && this.isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      const dayStart = this.getBusinessDayStart(currentDate, businessStart);
      const dayEnd = this.getBusinessDayEnd(currentDate, businessEnd);

      // Calculate overlap with business hours for this day
      const periodStart = currentDate < dayStart ? dayStart : currentDate;
      const periodEnd = endDate < dayEnd ? endDate : dayEnd;

      if (periodStart < periodEnd) {
        const hoursThisDay =
          (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
        totalHours += hoursThisDay;
      }

      currentDate = addDays(startOfDay(currentDate), 1);
    }

    return totalHours;
  }

  // Check if current time is within business hours
  static isWithinBusinessHours(
    date: Date,
    config: {
      business_start_time: string;
      business_end_time: string;
      include_weekends: boolean;
    }
  ): boolean {
    // Check weekend
    if (!config.include_weekends && this.isWeekend(date)) {
      return false;
    }

    const businessStart = this.parseTime(config.business_start_time);
    const businessEnd = this.parseTime(config.business_end_time);

    const dayStart = this.getBusinessDayStart(date, businessStart);
    const dayEnd = this.getBusinessDayEnd(date, businessEnd);

    return date >= dayStart && date < dayEnd;
  }
}
