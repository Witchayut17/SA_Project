import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faRightFromBracket, faPersonArrowDownToLine, faPersonArrowUpFromLine, faUser } from '@fortawesome/free-solid-svg-icons';
import style from './Accountant.module.css'
import { useState, useEffect } from 'react';
import Clock from '../Clock/Clock'
import Modal from 'react-modal';

const Accountantdb = ({ userId }) => {

    const [employee, setEmployee] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [formData, setFormData] = useState(null);
    const [leaveType, setLeaveType] = useState('annual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dayRequested, setDayRequested] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [reportData, setReportData] = useState(null);
    const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
    const [isSlipSaved, setIsSlipSaved] = useState(false);
    const [ot, setOt] = useState([]);
    const [myOt, setMyOt] = useState([]);
    const [expandedOtIds, setExpandedOtIds] = useState(new Set());
    const [myLeaves, setMyLeaves] = useState([]);
    const [slipData, setSlipData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        total_ot: 0,
        total_bonus: 0,
        calculated_salary: 0
    });

    const loggedInUserId = localStorage.getItem('userId');

    useEffect(() => {
        const fetchMyLeaves = async () => {
            try {
                const res = await fetch(`http://localhost:1704/leaverequest/${userId}`);
                const data = await res.json();
                setMyLeaves(data);
            } catch (err) {
                console.error(err);
            }
        };

        if (userId) fetchMyLeaves();
    }, [userId]);

    useEffect(() => {
        const fetchExistingSlip = async () => {
            if (isSlipModalOpen && selectedUserId) {
                try {
                    const res = await fetch(
                        `http://localhost:1704/finalsalary/${selectedUserId}?month=${slipData.month}&year=${slipData.year}`
                    );
                    const data = await res.json();

                    if (res.ok && data) {
                        setSlipData(prev => ({
                            ...prev,
                            total_bonus: data.total_bonus || 0,
                            total_ot: data.total_ot || prev.total_ot,
                            calculated_salary: data.calculated_salary || prev.calculated_salary
                        }));
                        setIsSlipSaved(!!data._id);
                    } else {
                        setIsSlipSaved(false);
                    }
                } catch (err) {
                    console.error('Fetch existing slip failed', err);
                    setIsSlipSaved(false);
                }
            }
        };

        fetchExistingSlip();
    }, [isSlipModalOpen, selectedUserId, slipData.month, slipData.year]);

    const handleSaveSlip = async () => {
        try {
            const salaryRes = await fetch(`http://localhost:1704/salary/${selectedUserId}`);
            const salaryData = await salaryRes.json();

            const res = await fetch('http://localhost:1704/finalsalary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    basesal_id: salaryData._id,
                    month: slipData.month,
                    year: slipData.year,
                    total_ot: slipData.total_ot,
                    total_bonus: slipData.total_bonus,
                    calculated_salary: slipData.calculated_salary
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert('บันทึกสลิปสำเร็จ');
                setIsSlipModalOpen(false);
            } else {
                alert(data.message);
            }

        } catch (err) {
            console.error(err);
            alert('บันทึกไม่สำเร็จ');
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setDayRequested(diffDays > 0 ? diffDays : 0);
        } else {
            setDayRequested('');
        }
    }, [startDate, endDate]);

    const parseDate = (d) => {
        if (!d || d === '-') return '-';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return d;
        return dt.toLocaleTimeString('en-TH', { hour12: false, hour: '2-digit', minute: '2-digit' });
    };

    const handleCheckInOT = async (otId) => {
        if (!loggedInUserId) return alert("User not logged in!");
        try {
            const res = await fetch('http://localhost:1704/ot/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId, otId })
            });
            const data = await res.json();

            if (res.ok) {
                const time = parseDate(data.checkin_time);
                alert(data.checkin_time ? `เช็คอิน OT เรียบร้อย เวลา: ${time}` : `คุณเช็คอินแล้วเวลา ${time}`);
                setMyOt(prev => prev.map(o => o._id === data._id ? { ...o, checked_in: time } : o));
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
    };
    const handleCheckoutOT = async (otId) => {
        if (!loggedInUserId) return alert("User not logged in!");
        try {
            const res = await fetch('http://localhost:1704/ot/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId, otId })
            });
            const data = await res.json();
            if (res.ok) {
                const time = parseDate(data.checkout_time);
                alert(`เช็คเอาท์ OT เรียบร้อย เวลา: ${time}`);
                setMyOt(prev => prev.map(o => o._id === data._id ? { ...o, checked_out: time } : o));
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
    };

    const handleApplyOt = async (otId) => {
        if (!loggedInUserId) return alert("User not logged in!");

        try {
            const res = await fetch('http://localhost:1704/ot/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId, ot_id: otId })
            });

            const data = await res.json();
            const otItem = ot.find(o => o._id === otId);

            if (res.ok) {
                alert('สมัคร OT สำเร็จ');

                setMyOt(prev => [
                    ...prev,
                    {
                        _id: data.otEmployeeId || otId,
                        ot: otItem,
                        checked_in: '-',
                        checked_out: '-'
                    }
                ]);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
    };

    useEffect(() => {
        const fetchMyOT = async () => {
            try {
                const res = await fetch(`http://localhost:1704/my-ot/${userId}`);
                const data = await res.json();

                const today = new Date();
                const todayString = today.toISOString().split('T')[0];

                const todayOT = data
                    .filter(item => item.ot_date?.split('T')[0] === todayString)
                    .map(item => ({
                        ...item,
                        checked_in: item.checked_in ? new Date(item.checked_in).toLocaleTimeString('en-TH', { hour12: false }) : '-',
                        checked_out: item.checked_out ? new Date(item.checked_out).toLocaleTimeString('en-TH', { hour12: false }) : '-'
                    }));

                setMyOt(todayOT);
            } catch (err) {
                console.error(err);
            }
        };
        fetchMyOT();
    }, [userId]);

    const toggleOt = (id) => {
        setExpandedOtIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const fetchOT = async () => {
            try {
                const res = await fetch('http://localhost:1704/ot-today');
                const data = await res.json();

                const formatted = data.map(item => ({
                    ...item,
                    start_time: item.start_time
                        ? new Date(item.start_time).toLocaleTimeString('en-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '-',
                    end_time: item.end_time
                        ? new Date(item.end_time).toLocaleTimeString('en-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '-'
                }));

                setOt(formatted);
            } catch (err) {
                console.error(err);
            }
        };

        fetchOT();
    }, []);

    useEffect(() => {
        if (isSlipModalOpen && selectedUserId) {
            calculateSalary(slipData.month, slipData.year, slipData.total_bonus);
        }
    }, [isSlipModalOpen, selectedUserId, slipData.month, slipData.year, slipData.total_bonus]);

    useEffect(() => {
        const fetchExistingSlip = async () => {
            if (isSlipModalOpen && selectedUserId) {
                try {
                    const res = await fetch(
                        `http://localhost:1704/finalsalary/${selectedUserId}?month=${slipData.month}&year=${slipData.year}`
                    );
                    const data = await res.json();

                    if (res.ok && data) {
                        setSlipData(prev => ({
                            ...prev,
                            total_bonus: data.total_bonus || 0,
                            total_ot: data.total_ot || prev.total_ot,
                            calculated_salary: data.calculated_salary || prev.calculated_salary
                        }));
                    }
                } catch (err) {
                    console.error('Fetch existing slip failed', err);
                }
            }
        };

        fetchExistingSlip();
    }, [isSlipModalOpen, selectedUserId, slipData.month, slipData.year]);

    const calculateSalary = async (month, year, bonus) => {
        try {
            const [otRes, salaryRes] = await Promise.all([
                fetch(`http://localhost:1704/my-ot/${selectedUserId}`), // OT records for the employee
                fetch(`http://localhost:1704/salary/${selectedUserId}`)
            ]);

            const otData = await otRes.json();
            const salaryData = await salaryRes.json();

            const baseSalary = salaryData.base_salary;
            const socialTax = salaryData.social_tax;

            const otFiltered = otData.filter(item => {
                if (!item.checked_in || !item.checked_out || !item.ot) return false;

                const date = new Date(item.checked_in);

                const itemMonth = date.getMonth() + 1;
                const itemYear = date.getFullYear();

                console.log('CHECK DATE:', { itemMonth, itemYear, month, year });

                return itemMonth === month && itemYear === year;
            });

            const totalOTAmount = otFiltered.reduce((sum, item) => {
                if (!item.checked_in || !item.checked_out || !item.ot) return sum;

                const start = new Date(item.checked_in);
                const end = new Date(item.checked_out);
                const diffMs = end - start;
                const hoursWorked = diffMs / (1000 * 60 * 60);

                const baseSalary = salaryData.base_salary;
                const hourlyRate = (baseSalary / 20) / 8;
                const otRate = parseFloat(item.ot.ot_rate.$numberDecimal) || 1;

                console.log('TIME DEBUG:', { start: item.checked_in, end: item.checked_out, diffMs, hoursWorked, otRate });

                return sum + hoursWorked * hourlyRate * otRate;
            }, 0);

            const calculatedSalary = baseSalary - socialTax + totalOTAmount + bonus;

            setSlipData(prev => ({
                ...prev,
                total_ot: Number(totalOTAmount.toFixed(2)),
                calculated_salary: Number(calculatedSalary.toFixed(2))
            }));

        } catch (err) {
            console.error(err);
            alert('คำนวณเงินเดือนล้มเหลว');
        }
    };

    useEffect(() => {
        fetch('http://localhost:1704/employees')
            .then(res => res.json())
            .then(data => setEmployees(data))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (selectedUserId && isModalOpen) {
            fetchReport();
        }
    }, [selectedMonth, selectedUserId, isModalOpen]);

    const handleSelectEmployee = (userId) => {
        setSelectedUserId(userId);
        const emp = employees.find(e => e.userId === userId);
        setSelectedEmployee(emp);
    };

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
            setDayRequested(diff > 0 ? diff : 0);
        }
    }, [startDate, endDate]);

    const handlePrintSlip = () => {
        if (!selectedUserId) return alert('เลือกพนักงานก่อน');
        calculateSalary(slipData.month, slipData.year, slipData.total_bonus);
        setIsSlipModalOpen(true);
    };

    useEffect(() => {
        if (isSlipModalOpen && selectedUserId) {
            calculateSalary(slipData.month, slipData.year, slipData.total_bonus);
        }
    }, [slipData.month, slipData.year, slipData.total_bonus, isSlipModalOpen, selectedUserId]);

    const fetchReport = async () => {
        try {
            const [attendanceRes, otRes, salaryRes] = await Promise.all([
                fetch(`http://localhost:1704/attendance/${selectedUserId}?month=${selectedMonth}`),
                fetch(`http://localhost:1704/my-ot/${selectedUserId}`),
                fetch(`http://localhost:1704/salary/${selectedUserId}`)
            ]);

            const attendanceData = await attendanceRes.json();
            const otData = await otRes.json();
            const salaryData = await salaryRes.json();
            const baseSalary = salaryData.base_salary || 0;
            const socialTax = salaryData.social_tax || 0;

            let present = 0, absent = 0, late = 0, leave = 0;

            attendanceData.forEach(item => {
                switch (item.status) {
                    case 'Present': present++; break;
                    case 'Absent': absent++; break;
                    case 'Late': late++; break;
                    case 'Leave': leave++; break;
                }
            });

            const finalSalaryRes = await fetch(
                `http://localhost:1704/finalsalary/${selectedUserId}?month=${selectedMonth}`
            );
            const finalSalaryData = await finalSalaryRes.json();

            const attendanceCount = attendanceData.length;

            const otFiltered = otData.filter(item => {
                if (!item.checked_in) return false;
                const date = new Date(item.checked_in);
                return date.getMonth() + 1 === selectedMonth;
            });

            const hourlyRate = (baseSalary / 20) / 8;

            let totalOT = otFiltered.reduce((sum, item) => {
                if (item.checked_in && item.checked_out) {
                    const start = new Date(item.checked_in);
                    const end = new Date(item.checked_out);
                    const hours = (end - start) / (1000 * 60 * 60); // hours
                    return sum + hours;
                }
                return sum;
            }, 0);

            setReportData({
                attendanceCount,
                present,
                absent,
                late,
                leave,
                totalOtHours: totalOT,
                socialTax,
                bonus: finalSalaryData?.total_bonus || 0,
                netSalary: finalSalaryData?.calculated_salary || 0
            });

            setIsModalOpen(true);

        } catch (err) {
            console.error(err);
            alert('โหลดข้อมูลไม่สำเร็จ');
        }
    };

    const handleLeaveSubmit = async () => {
        if (!leaveType || !startDate || !endDate || !dayRequested) {
            return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        try {
            const res = await fetch('http://localhost:1704/leaverequest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: loggedInUserId,
                    leave_type: leaveType,
                    start_date: startDate,
                    end_date: endDate,
                    day_requested: parseInt(dayRequested)
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert(`ส่งคำขอเรียบร้อย! วันลาเหลือ: ${data.remaining_days}`);
                setLeaveType('annual');
                setStartDate('');
                setEndDate('');
                setDayRequested('');
            } else {
                alert(`${data.message}`);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการส่งคำขอ');
        }
    };

    useEffect(() => {
        fetch(`http://localhost:1704/employee/${userId}`)
            .then(res => res.json())
            .then(data => {
                setEmployee(data);
                setFormData({
                    name: data.name,
                    lastname: data.lastname,
                    tel: data.tel,
                    age: data.age,
                    address: data.address
                });
            })
            .catch(err => console.error(err));
    }, [userId]);
    if (!employee || !formData) return <p>Loading...</p>;

    const handleCheckIn = async () => {
        if (!loggedInUserId) return alert("User not logged in!");
        try {
            const response = await fetch('http://localhost:1704/attendance/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId })
            });
            const data = await response.json();
            const time = data.checkin_time ? new Date(data.checkin_time).toLocaleTimeString('en-TH', { hour12: false }) : 'unknown';
            alert(data.alreadyCheckedIn ? `คุณเช็คอินไปแล้ว เมื่อ ${time}` : `เช็คอินเมื่อ ${time}`);
        } catch (err) {
            console.error(err);
            alert('Something went wrong');
        }
    };

    const handleCheckout = async () => {
        if (!loggedInUserId) return alert("User not logged in!");
        try {
            const response = await fetch('http://localhost:1704/attendance/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId })
            });
            const data = await response.json();
            const time = data.checkout_time ? new Date(data.checkout_time).toLocaleTimeString('en-TH', { hour12: false }) : 'unknown';
            alert(response.ok ? `เช็คเอาท์เมื่อ ${time}` : `${data.message} เมื่อ ${time}`);
        } catch (err) {
            console.error(err);
            alert('Something went wrong');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/';
    };

    return (
        <div>
            <div className={style.header}>
                <FontAwesomeIcon icon={faCircleUser} className={style.userIcon} />
                <div className={style.textcontainer}>
                    <h2 className={style.name}>{employee.name} {employee.lastname}</h2>
                    <h3 className={style.role}>ตำแหน่ง : {employee.role}</h3>
                </div>
                <div className={style.logoutcontainer}>
                    <FontAwesomeIcon icon={faRightFromBracket} className={style.logoutIcon} />
                    <button className={style.logoutbtn} onClick={handleLogout}>ออกจากระบบ</button>
                </div>
            </div>

            <div className={style.checkinsection}>
                <div className={style.clockcontainer}><Clock /></div>
                <div className={style.checker}>
                    <div className={style.checkincontainer}>
                        <FontAwesomeIcon icon={faPersonArrowDownToLine} />
                        <button className={style.checkin} onClick={handleCheckIn}>บันทึกเข้างาน</button>
                    </div>
                    <div className={style.checkoutcontainer}>
                        <FontAwesomeIcon icon={faPersonArrowUpFromLine} />
                        <button className={style.checkout} onClick={handleCheckout}>บันทึกออกงาน</button>
                    </div>
                </div>
            </div>

            <div className={style.leaverequest}>
                <div className={style.leaveheader}>
                    <h2>ส่งคำขอการลา</h2>
                </div>

                <div className={style.leaveform}>
                    <label>
                        ประเภทการลา:
                        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                            <option value="annual">ลาประจำปี</option>
                            <option value="sick">ลาป่วย</option>
                            <option value="casual">ลากิจ</option>
                        </select>
                    </label>

                    <label>
                        วันที่เริ่ม:
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                    </label>

                    <label>
                        วันที่สิ้นสุด:
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} />
                    </label>

                    <label>
                        จำนวนวันลา:
                        <input
                            type="number"
                            value={dayRequested}
                            readOnly
                        />
                    </label>
                    <button onClick={handleLeaveSubmit}>ส่งคำขอการลา</button>
                </div>
            </div>

            <div className={style.myleave}>
                <h2>สถานะการลาของฉัน</h2>

                {myLeaves.length === 0 ? (
                    <p>ยังไม่มีรายการลา</p>
                ) : (
                    myLeaves.map(item => (
                        <div key={item._id} className={style.leaveItem}>
                            <p>ประเภท: {item.leave_type}</p>
                            <p>
                                วันที่:{" "}
                                {new Date(item.start_date).toLocaleDateString()} -{" "}
                                {new Date(item.end_date).toLocaleDateString()}
                            </p>
                            <p>จำนวนวัน: {item.day_requested}</p>

                            <p>
                                สถานะ:{" "}
                                <span
                                    style={{
                                        color:
                                            item.status === 'approved'
                                                ? 'green'
                                                : item.status === 'rejected'
                                                    ? 'red'
                                                    : 'orange',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {item.status === 'pending'
                                        ? 'รออนุมัติ'
                                        : item.status === 'approved'
                                            ? 'อนุมัติแล้ว'
                                            : 'ถูกปฏิเสธ'}
                                </span>
                            </p>

                            <hr />
                        </div>
                    ))
                )}
            </div>

            <div className={style.otsection}>
                <div className={style.otheader}>
                    <h2>OT ประจำวัน</h2>
                    {ot.length === 0 ? (
                        <p>No OT today</p>
                    ) : (
                        ot.map(item => (
                            <div key={item._id} className={style.otItem}>
                                <div className={style.otSummary}>
                                    <h3>จำนวน {item.hours} ชม.</h3>
                                    <h3>เวลา {item.start_time} - {item.end_time}</h3>
                                    <button onClick={() => toggleOt(item._id)}>
                                        {expandedOtIds.has(item._id) ? 'ย่อ' : 'เพิ่มเติม'}
                                    </button>
                                </div>
                                {expandedOtIds.has(item._id) && (
                                    <div className={style.otDetails}>
                                        <p>รายละเอียด : {item.description}</p>
                                        <p>จำนวนคนสูงสุด : {item.max_people}</p>
                                        <p>OT Rate : {item.ot_rate}</p>
                                        <button
                                            onClick={() => handleApplyOt(item._id)}
                                            disabled={myOt.some(o => o.ot?._id === item._id)}
                                        >
                                            {myOt.some(o => o.ot?._id === item._id) ? 'สมัครแล้ว' : 'สมัคร'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={style.myot}>
                <h2>OT ของฉัน</h2>
                {myOt.length === 0 ? (
                    <p>ยังไม่มี OT</p>
                ) : (
                    myOt.map(item => (
                        <div key={item._id} className={style.otItem}>
                            <div className={style.otSummary}>
                                <h3>
                                    จำนวน: {item.ot?.hours} ชม. เวลา {" "}
                                    {parseDate(item.ot?.start_time)}
                                    {" - "}
                                    {parseDate(item.ot?.end_time)}
                                </h3>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => toggleOt(item._id)}>
                                        {expandedOtIds.has(item._id) ? 'ย่อ' : 'เพิ่มเติม'}
                                    </button>
                                </div>
                            </div>

                            {expandedOtIds.has(item._id) && (
                                <div className={style.otDetails}>
                                    <p>รายละเอียด: {item.ot?.description}</p>
                                    <p>จำนวนคนสูงสุด: {item.ot?.max_people}</p>
                                    <p>OT Rate: {item.ot?.ot_rate?.$numberDecimal ? parseFloat(item.ot.ot_rate.$numberDecimal) : item.ot?.ot_rate}</p>
                                    <div className={style.otAction}>
                                        <span>Check-in: {item.checked_in}</span>
                                        <button
                                            onClick={() => handleCheckInOT(item.ot._id)}
                                            disabled={item.checked_in !== '-'}
                                        >
                                            เข้า OT
                                        </button>
                                    </div>
                                    <div className={style.otAction}>
                                        <span>Check-out: {item.checked_out}</span>
                                        <button
                                            onClick={() => handleCheckoutOT(item.ot._id)}
                                            disabled={item.checked_out !== '-'}
                                        >
                                            ออก OT
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className={style.account}>
                <h2>ระบบบัญชี</h2>

                <select
                    value={selectedUserId}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                >
                    <option value="">-- เลือกพนักงาน --</option>
                    {employees.map(emp => (
                        <option key={emp.userId} value={emp.userId}>
                            {emp.name} {emp.lastname} ({userId})
                        </option>
                    ))}
                </select>

                <div className={style.accountButtons}>
                    <button onClick={fetchReport} disabled={!selectedUserId}>
                        ตรวจสอบบันทึกการทำงาน
                    </button>

                    <button onClick={handlePrintSlip} disabled={!selectedUserId}>
                        พิมพ์สลิปเงินเดือน
                    </button>
                </div>
                <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
                    <h2>รายงานพนักงาน</h2>

                    <label>
                        เลือกเดือน:
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                    </label>

                    {selectedEmployee && reportData && (
                        <div>
                            <p>
                                ชื่อ: {selectedEmployee.name} {selectedEmployee.lastname}
                            </p>

                            <p>
                                จำนวนวันมาทำงาน | Present | Absent | Late | Leave
                            </p>
                            <p>
                                {reportData.attendanceCount} |
                                {reportData.present} |
                                {reportData.absent} |
                                {reportData.late} |
                                {reportData.leave}
                            </p>
                            <p>
                                OT รวม: {reportData.totalOtHours.toFixed(2)} ชั่วโมง
                            </p>

                            <p>
                                ประกันสังคม: {reportData.socialTax}
                            </p>

                            <p>
                                โบนัส: {reportData?.bonus != null ? reportData.bonus : 0}
                            </p>

                            <p>
                                เงินเดือนสุทธิ: {reportData.netSalary || 0}
                            </p>
                        </div>
                    )}

                    <button onClick={() => setIsModalOpen(false)}>ปิด</button>
                </Modal>
                <Modal isOpen={isSlipModalOpen} onRequestClose={() => setIsSlipModalOpen(false)}>
                    <h2>สร้างสลิปเงินเดือน</h2>

                    <label>
                        เดือน:
                        <select
                            value={slipData.month}
                            onChange={(e) =>
                                setSlipData({ ...slipData, month: parseInt(e.target.value) })
                            }
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        ปี:
                        <input
                            type="number"
                            value={slipData.year}
                            onChange={(e) =>
                                setSlipData({ ...slipData, year: parseInt(e.target.value) })
                            }
                        />
                    </label>

                    <label>
                        OT รวม:
                        <input
                            type="number"
                            value={isNaN(slipData.total_ot) ? 0 : Number(slipData.total_ot.toFixed(2))}
                            readOnly
                        />
                    </label>

                    <label>
                        โบนัส:
                        <input
                            type="number"
                            value={slipData.total_bonus}
                            onChange={(e) =>
                                setSlipData({ ...slipData, total_bonus: parseFloat(e.target.value) || 0 })
                            }
                        />
                    </label>

                    <label>
                        เงินเดือนสุทธิ:
                        <input type="number" value={slipData.calculated_salary.toFixed(2)} readOnly />
                    </label>

                    <button
                        onClick={handleSaveSlip}
                        disabled={isSlipSaved}
                    >
                        บันทึก
                    </button>
                    <button onClick={() => setIsSlipModalOpen(false)}>ปิด</button>
                </Modal>
            </div>
        </div>
    )
}

export default Accountantdb;