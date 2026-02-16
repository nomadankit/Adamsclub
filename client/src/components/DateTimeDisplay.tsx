import { useState, useEffect } from "react";
import { format } from "date-fns";

export function DateTimeDisplay() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="hidden md:flex flex-col items-end mr-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
            <span>{format(currentTime, "EEEE, MMMM do")}</span>
            <span className="text-xs opacity-80">{format(currentTime, "h:mm a")}</span>
        </div>
    );
}
