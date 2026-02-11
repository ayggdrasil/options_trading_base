import { useEffect, useState } from "react";

export const CountdownTimer = ({ targetTimestamp, className, compactFormat } : { targetTimestamp: number; className: string; compactFormat?: boolean;}) => {
  const [timeLeft, setTimeLeft] = useState(compactFormat ? '00' : '00:00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime(); // Current time in milliseconds
      const targetTime = targetTimestamp * 1000; // Convert target time from seconds to milliseconds
      const difference = targetTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        if (compactFormat) {
          let compactTime = '';
          if (days > 0) {
            compactTime = `${days}d `;
          }
          if (hours > 0 || days > 0) {
            compactTime += `${hours.toString().padStart(2, '0')}:`;
          }
          compactTime += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          setTimeLeft(compactTime);
        } else {
          if (days > 0) {
            setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          } else {
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
          }
        }
      } else {
        clearInterval(interval);
        setTimeLeft(compactFormat ? '00' : '00:00:00'); // Countdown finished
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp, compactFormat]);

  return (
    <span className={className}>{timeLeft}</span>
  );
};