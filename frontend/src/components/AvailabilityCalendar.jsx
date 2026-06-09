import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Tooltip } from 'react-tooltip';

/**
 * AvailabilityCalendar
 * A lightweight visual preview of a sitter's weekly availability.
 * It renders a simple weekly grid (Mon‑Sun) with colored blocks for each time slot.
 * Disabled slots are shown in a muted color; available slots are highlighted.
 */
const AvailabilityCalendar = ({ availability, selectedDate, onSelectDate }) => {
  const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
  const times = ['manana', 'mediodia', 'tarde', 'noche'];

  const renderDayHeader = (day) => (
    <div key={day} className="text-center font-bold text-sm text-primary">
      {day}
    </div>
  );

  const handleClick = (day) => {
    if (onSelectDate) {
      const date = new Date();
      // set to the upcoming day matching the abbreviation
      const todayIdx = date.getDay(); // 0=Sun
      const targetIdx = days.indexOf(day);
      const diff = (targetIdx - todayIdx + 7) % 7;
      date.setDate(date.getDate() + diff);
      onSelectDate(date.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="overflow-x-auto py-4">
      <div className="grid grid-cols-8 gap-2 items-center">
        <div></div>
        {days.map(renderDayHeader)}
        {times.map((time) => (
          <React.Fragment key={time}>
            <div className="text-right pr-2 font-medium text-sm text-secondary">{time}</div>
            {days.map((day) => {
              const isAvailable = availability?.[day]?.[time];
              const bg = isAvailable ? 'bg-secondary' : 'bg-surface-dim';
              return (
                <div
                  key={day + time}
                  className={`w-6 h-6 rounded-md cursor-pointer ${bg}`}
                  onClick={() => isAvailable && handleClick(day)}
                  data-tooltip-id="avail-tooltip"
                  data-tooltip-content={`${day} - ${time}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <Tooltip id="avail-tooltip" place="top" effect="solid" />
    </div>
  );
};

export default AvailabilityCalendar;
