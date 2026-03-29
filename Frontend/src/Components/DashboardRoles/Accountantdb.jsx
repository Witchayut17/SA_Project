import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faRightFromBracket, faPersonArrowDownToLine, faPersonArrowUpFromLine, faUser } from '@fortawesome/free-solid-svg-icons';
import style from './Accountant.module.css'
import { useState, useEffect } from 'react';
import Clock from '../Clock/Clock'
import Modal from 'react-modal';

const Accountantdb = ({ userId }) => {

    const [employee, setEmployee] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
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
        other_deduction: 0,
        calculated_salary: 0
    });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const loggedInUserId = localStorage.getItem('userId');

    const fetchMyOT = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`http://localhost:1704/my-ot/${userId}`);
            const data = await res.json();

            const today = new Date();
            const todayString = today.toISOString().split('T')[0];

            const todayOT = data
                .filter(item => {
                    const itemDate = item.ot_date ? item.ot_date.split('T')[0] : "";
                    return itemDate === todayString;
                })
                .map(item => ({
                    ...item,
                    original_ot_id: item.ot_id || item.ot?._id || item._id,
                    display_hours: item.hours || '-',
                    display_hours: item.hours || '-',
                    display_start: item.start_time || null,
                    display_end: item.end_time || null,
                    display_desc: item.description || '-',
                    display_max: item.max_people || '-',
                    display_rate: item.ot_rate ?
                        (item.ot_rate.$numberDecimal ? parseFloat(item.ot_rate.$numberDecimal) : item.ot_rate)
                        : '-',
                    checked_in: item.checked_in
                        ? new Date(item.checked_in).toLocaleTimeString('en-TH', { hour12: false, hour: '2-digit', minute: '2-digit' })
                        : '-',
                    checked_out: item.checked_out
                        ? new Date(item.checked_out).toLocaleTimeString('en-TH', { hour12: false, hour: '2-digit', minute: '2-digit' })
                        : '-'
                }));

            setMyOt(todayOT);
        } catch (err) {
            console.error("Fetch My OT Error:", err);
        }
    };

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
                    other_deduction: slipData.other_deduction,
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
                body: JSON.stringify({
                    userId: loggedInUserId,
                    ot_id: otId
                })
            });
            const data = await res.json();

            if (res.ok) {
                alert("เช็คอิน OT เรียบร้อย");
                fetchMyOT();
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
                alert("เช็คเอาท์ OT เรียบร้อย");
                fetchMyOT();
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
                fetch(`http://localhost:1704/my-ot/${selectedUserId}`),
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

            const calculatedSalary = baseSalary - socialTax + totalOTAmount + bonus - (slipData.other_deduction || 0);

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
    }, [isSlipModalOpen, selectedUserId, slipData.month, slipData.year, slipData.total_bonus, slipData.other_deduction]);

    const fetchReport = async () => {
        try {
            const [attendanceRes, otRes, salaryRes] = await Promise.all([
                fetch(`http://localhost:1704/attendance/${selectedUserId}?month=${selectedMonth}&year=${selectedYear}`),
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
                    const hours = (end - start) / (1000 * 60 * 60);
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
                other_deduction: finalSalaryData?.other_deduction || 0,
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const res = await fetch(`http://localhost:1704/employee/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('ข้อมูลอัปเดตเรียบร้อยแล้ว');
                setEmployee(prev => ({ ...prev, ...formData }));
                setIsEditing(false);
            } else {
                const data = await res.json();
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong');
        }
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

            <div className={style.profilesection}>
                <div className={style.profileheader}>
                    <FontAwesomeIcon icon={faUser} className={style.profileIcon} />
                    <h2>ข้อมูลส่วนบุคคล</h2>
                </div>

                <div className={style.profileinfo}>
                    {isEditing ? (
                        <>
                            <input name="name" value={formData.name} onChange={handleChange} placeholder='ชื่อจริงไม่ต้องมีคำนำหน้า' />
                            <input name="lastname" value={formData.lastname} onChange={handleChange} placeholder='นามสกุล' />
                            <input name="tel" value={formData.tel} onChange={handleChange} placeholder='เบอร์โทร' />
                            <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder='อายุ' />
                            <input name="address" value={formData.address} onChange={handleChange} placeholder='ที่อยู่' />
                        </>
                    ) : (
                        <>
                            <h2>ชื่อ : {employee.name}</h2>
                            <h2>นามสกุล : {employee.lastname}</h2>
                            <h2>เบอร์โทรศัพท์ : {employee.tel}</h2>
                            <h2>อายุ : {employee.age}</h2>
                            <h2>ที่อยู่ : {employee.address}</h2>
                        </>
                    )}
                </div>

                {isEditing ? (
                    <div className={style.btncontainer} style={{ marginTop: '10px' }}>
                        <button onClick={handleSave} className={style.saveBtn}>บันทึก</button>
                        <button onClick={() => setIsEditing(false)} className={style.cancelBtn}>ยกเลิก</button>
                    </div>
                ) : (
                    <button className={style.editBtn} onClick={() => setIsEditing(true)}>
                        แก้ไขข้อมูล
                    </button>
                )}
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
                                    จำนวน: {item.display_hours} ชม. เวลา {" "}
                                    {parseDate(item.display_start)}
                                    {" - "}
                                    {parseDate(item.display_end)}
                                </h3>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => toggleOt(item._id)}>
                                        {expandedOtIds.has(item._id) ? 'ย่อ' : 'เพิ่มเติม'}
                                    </button>
                                </div>
                            </div>

                            {expandedOtIds.has(item._id) && (
                                <div className={style.otDetails}>
                                    <p>รายละเอียด: {item.display_desc}</p>
                                    <p>จำนวนคนสูงสุด: {item.display_max}</p>
                                    <p>OT Rate: {item.display_rate}</p>
                                    <div className={style.otAction}>
                                        <span>Check-in: {item.checked_in}</span>
                                        <button
                                            onClick={() => handleCheckInOT(item.original_ot_id)}
                                            disabled={item.checked_in !== '-'}
                                        >
                                            เข้า OT
                                        </button>
                                    </div>
                                    <div className={style.otAction}>
                                        <span>Check-out: {item.checked_out}</span>
                                        <button
                                            onClick={() => handleCheckoutOT(item.original_ot_id)}
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
                            {emp.name} {emp.lastname} ({emp.userId})
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
                <Modal
                    isOpen={isModalOpen}
                    onRequestClose={() => setIsModalOpen(false)}
                    className={style.modalContent}
                    overlayClassName={style.modalOverlay}
                >
                    <div className={style.modalBody}>
                        <h2>รายงานพนักงาน</h2>

                        <div className={style.modalField}>
                            <label>เลือกเดือน:</label>
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div className={style.modalField}>
                            <label>เลือกปี:</label>
                            <input
                                type="number"
                                value={selectedYear || new Date().getFullYear()}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            />
                        </div>

                        {selectedEmployee && reportData && (
                            <div className={style.reportDetails}>
                                <p><strong>ชื่อ:</strong> {selectedEmployee.name} {selectedEmployee.lastname}</p>

                                <div className={style.attendanceBox}>
                                    <h4>จำนวนวันมาทำงาน</h4>
                                    <p className={style.totalCount}>ทั้งหมด {reportData.attendanceCount} วัน</p>
                                    <div className={style.statsGrid}>
                                        <span>มา {reportData.present}</span>
                                        <span>ขาด {reportData.absent}</span>
                                        <span>สาย {reportData.late}</span>
                                        <span>ลา {reportData.leave}</span>
                                    </div>
                                </div>

                                <div className={style.financialInfo}>
                                    <p>OT รวม: <span>{reportData.totalOtHours.toFixed(2)} ชม.</span></p>
                                    <p>ประกันสังคม: <span>{reportData.socialTax}</span></p>
                                    <p>โบนัส: <span>{reportData?.bonus || 0}</span></p>
                                    <p>หักค่าต่างๆ: <span>-{reportData?.other_deduction || 0}</span></p>
                                    <p className={style.netSalary}>เงินเดือนสุทธิ: <span>{reportData.netSalary || 0}</span></p>
                                </div>
                            </div>
                        )}

                        <button className={style.closeModalBtn} onClick={() => setIsModalOpen(false)}>ปิด</button>
                    </div>
                </Modal>

                <Modal
                    isOpen={isSlipModalOpen}
                    onRequestClose={() => setIsSlipModalOpen(false)}
                    className={style.modalContent} // ใช้ class เดียวกับ modal รายงาน
                    overlayClassName={style.modalOverlay}
                >
                    <div className={style.modalBody}>
                        <h2>สร้างสลิปเงินเดือน</h2>

                        <div className={style.modalForm}>
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

                            <div className={style.divider}></div>

                            <label className={style.readOnlyField}>
                                OT รวม (ชั่วโมง):
                                <input
                                    type="number"
                                    value={isNaN(slipData.total_ot) ? 0 : Number(slipData.total_ot.toFixed(2))}
                                    readOnly
                                />
                            </label>

                            <label>
                                โบนัสพิเศษ:
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={slipData.total_bonus}
                                    onChange={(e) =>
                                        setSlipData({ ...slipData, total_bonus: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </label>

                            <label>
                                หักอื่นๆ (ขาด/สาย/วินัย):
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={slipData.other_deduction || 0}
                                    onChange={(e) =>
                                        setSlipData({ ...slipData, other_deduction: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </label>

                            <label className={style.highlightField}>
                                เงินเดือนสุทธิ:
                                <input type="number" value={slipData.calculated_salary.toFixed(2)} readOnly />
                            </label>
                        </div>

                        <div className={style.modalActions}>
                            <button
                                className={style.saveBtn}
                                onClick={handleSaveSlip}
                                disabled={isSlipSaved}
                            >
                                {isSlipSaved ? 'บันทึกสำเร็จแล้ว' : 'บันทึกสลิป'}
                            </button>
                            <button className={style.closeModalBtn} onClick={() => setIsSlipModalOpen(false)}>
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    )
}

export default Accountantdb;