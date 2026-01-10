const moment = require('moment-timezone');

// Set default timezone to Africa/Lagos (WAT - UTC+1)
moment.tz.setDefault('Africa/Lagos');

// Get current time in WAT
exports.getCurrentTime = () => {
  return moment();
};

// Get current time as ISO string in WAT
exports.getCurrentTimeISO = () => {
  return moment().toISOString();
};

// Format time to specific format in WAT
exports.formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

// Check if time is within event window
exports.isWithinEventWindow = (eventStartTime, eventEndTime, currentTime = moment()) => {
  const start = moment(eventStartTime);
  const end = moment(eventEndTime);
  const current = moment(currentTime);
  
  return current.isBetween(start, end, null, '[]'); // inclusive
};

// Check if user is late for event
exports.isLate = (eventStartTime, checkInTime, gracePeriodMinutes = 15) => {
  const start = moment(eventStartTime);
  const checkIn = moment(checkInTime);
  const graceLimit = start.clone().add(gracePeriodMinutes, 'minutes');
  
  return checkIn.isAfter(graceLimit);
};

// Calculate duration between two times
exports.calculateDuration = (startTime, endTime, unit = 'minutes') => {
  const start = moment(startTime);
  const end = moment(endTime);
  
  return end.diff(start, unit);
};

// Add time to a date
exports.addTime = (date, amount, unit = 'minutes') => {
  return moment(date).add(amount, unit);
};

// Check if date is today
exports.isToday = (date) => {
  return moment(date).isSame(moment(), 'day');
};

// Get start of day in WAT
exports.getStartOfDay = (date = moment()) => {
  return moment(date).startOf('day');
};

// Get end of day in WAT
exports.getEndOfDay = (date = moment()) => {
  return moment(date).endOf('day');
};

// Convert UTC time to WAT
exports.utcToWAT = (utcDate) => {
  return moment.utc(utcDate).tz('Africa/Lagos');
};

// Convert WAT time to UTC
exports.watToUTC = (watDate) => {
  return moment.tz(watDate, 'Africa/Lagos').utc();
};
