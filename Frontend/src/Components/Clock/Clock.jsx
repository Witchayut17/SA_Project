import { useState, useEffect } from 'react';
import style from './Clock.module.css'

const Clock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const thaiDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
    const dayName = thaiDays[time.getDay()];

    const thaiMonth = ["ม.ค", "ก.พ", "มี.ค", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    const monthName = thaiMonth[time.getMonth()];

    const day = String(time.getDate()).padStart(2, '0');
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const year = time.getFullYear();

    const timeString = time.toLocaleTimeString('th-TH');

    return (
        <div className={style.container}>
            <h1 className={style.date}>{dayName} {day} {monthName}</h1>
            <h2 className={style.time}>{timeString}</h2>
        </div>
    )
}

export default Clock;