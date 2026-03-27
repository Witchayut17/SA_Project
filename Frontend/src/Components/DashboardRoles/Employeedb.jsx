import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faRightFromBracket, faPersonArrowDownToLine, faPersonArrowUpFromLine, faUser } from '@fortawesome/free-solid-svg-icons';
import style from './Employee.module.css'
import { useState, useEffect } from 'react';
import Clock from '../Clock/Clock'
import Modal from 'react-modal';

const Employeedb = ({ userId }) => {
    const [employee, setEmployee] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(null);
    const [ot, setOt] = useState([]);
    const [myOt, setMyOt] = useState([]);
    const [expandedOtIds, setExpandedOtIds] = useState(new Set());
    const [leaveType, setLeaveType] = useState('annual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dayRequested, setDayRequested] = useState('');
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showFullPayslip, setShowFullPayslip] = useState(false);
    const [showPayslipModal, setShowPayslipModal] = useState(false);
    const [myLeaves, setMyLeaves] = useState([]);

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
        const fetchPayslip = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `http://localhost:1704/payslip-full/${userId}?month=${selectedMonth}&year=${selectedYear}`
                );
                if (!res.ok) throw new Error('Failed to fetch payslip');
                const data = await res.json();
                setPayslip(data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchPayslip();
    }, [userId, selectedMonth, selectedYear]);

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

    const loggedInUserId = localStorage.getItem('userId');

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

    const handleCheckIn = async () => {
        if (!loggedInUserId) return alert("User not logged in!");
        try {
            const response = await fetch('http://localhost:1704/attendance/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: loggedInUserId })
            });
            const data = await response.json();

            const time = data.checkin_time
                ? new Date(data.checkin_time).toLocaleTimeString('en-TH', { hour12: false })
                : null;

            if (data.alreadyCheckedIn || !response.ok) {
                alert(time ? `${data.message} เมื่อ ${time}` : data.message);
            } else {
                alert(`เช็คอินเรียบร้อยเมื่อ ${time}`);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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
            alert(response.ok ? `เช็คเอาท์เรียบร้อยเมื่อ ${time}` : `${data.message} เมื่อ ${time}`);
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
        <div className={style.container}>
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

            <div className={style.payslip}>
                <div className={style.slipheader}>

                    <h2>ใบเงินเดือน</h2>
                </div>
                <div className={style.slipFilters}>
                    <label>
                        เดือน:
                        <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        ปี:
                        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </label>
                </div>
                {loading ? (
                    <p>Loading payslip...</p>
                ) : error ? (
                    <p>Error: {error}</p>
                ) : !payslip ? (
                    <p>No data</p>
                ) : (
                    <div className={style.slipDetails}>
                        <p className={style.textp}>เงินเดือนพื้นฐาน: {payslip.base_salary?.toLocaleString() ?? 'null'} บาท</p>
                        <p>OT: {payslip?.total_ot ?? '-'} บาท</p>
                        <p className={style.textp}>
                            เงินเดือนสุทธิ: {payslip.calculated_salary?.toLocaleString() ?? '-'} บาท
                        </p>
                        <button className={style.textp}
                            disabled={!payslip}
                            style={{ marginTop: '10px', padding: '7px 10px', cursor: 'pointer' }}
                            onClick={() => setShowPayslipModal(true)}
                        >
                            ดูเพิ่มเติม / พิมพ์
                        </button>
                        <Modal
                            isOpen={showPayslipModal}
                            onRequestClose={() => setShowPayslipModal(false)}
                            contentLabel="Payslip Detail"
                            style={{
                                content: {
                                    maxWidth: '600px',
                                    margin: 'auto',
                                    padding: '20px'
                                }
                            }}
                        >
                            <h2>ใบเงินเดือน</h2>

                            <div>
                                <p>User ID: {payslip?.userId ?? '-'}</p>
                                <p>เดือน/ปี: {payslip?.month ?? '-'} / {payslip?.year ?? '-'}</p>
                                <p>ฐานเงินเดือน: {payslip?.base_salary?.toLocaleString() ?? '-'}</p>
                                <p>ประกันสังคม: {payslip?.social_tax?.toLocaleString() ?? '-'}</p>
                                <p>OT รวม: {payslip?.total_ot ?? '-'}</p>
                                <p>โบนัสรวม: {payslip?.total_bonus ?? '-'}</p>
                                <p>เงินเดือนคำนวณ: {payslip?.calculated_salary?.toLocaleString() ?? '-'}</p>
                                <p>
                                    วันที่สร้าง:{" "}
                                    {payslip?.created_at
                                        ? new Date(payslip.created_at).toLocaleString()
                                        : '-'}
                                </p>
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                <button onClick={() => window.print()}>พิมพ์ PDF</button>
                                <button onClick={() => setShowPayslipModal(false)}>ปิด</button>
                            </div>
                        </Modal>
                    </div>
                )}
            </div>
        </div >
    );
}

export default Employeedb;