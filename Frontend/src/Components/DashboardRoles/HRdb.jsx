import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faRightFromBracket, faPersonArrowDownToLine, faPersonArrowUpFromLine, faUser, faBell, faBriefcase } from '@fortawesome/free-solid-svg-icons';
import style from './HR.module.css'
import { useState, useEffect } from 'react';
import Clock from '../Clock/Clock'
import Modal from 'react-modal';

const HRdb = ({ userId }) => {

    const [employee, setEmployee] = useState(null);
    const [formData, setFormData] = useState(null);
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [salaryData, setSalaryData] = useState({
        base_salary: '',
        social_tax: ''
    });
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [selectedLeaveId, setSelectedLeaveId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [otFormData, setOtFormData] = useState({
        max_people: '',
        date: '',
        hours: '',
        description: '',
        ot_rate: '',
        start_time: '',
        end_time: ''
    });
    const [allOTs, setAllOTs] = useState([]);
    const [selectedOtId, setSelectedOtId] = useState(null);
    const [otParticipants, setOtParticipants] = useState([]);

    const loggedInUserId = localStorage.getItem('userId');

    useEffect(() => {
        if (!selectedOtId) {
            setOtParticipants([]);
            return;
        }

        fetch(`http://localhost:1704/ot/${selectedOtId}/participants`)
            .then(res => res.json())
            .then(data => setOtParticipants(data))
            .catch(err => console.error(err));
    }, [selectedOtId]);

    useEffect(() => {
        fetch('http://localhost:1704/ot')
            .then(res => res.json())
            .then(data => setAllOTs(data))
            .catch(err => console.error(err));
    }, []);

    const handleOtSave = async () => {
        const { userId, date, hours, start_time } = otFormData;

        if (!date || !hours || !start_time) {
            alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
            return;
        }

        const start = new Date(start_time);
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

        try {
            const res = await fetch('http://localhost:1704/ot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...otFormData,
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                })
            });

            const data = await res.json();
            alert(data.message || 'สร้าง OT สำเร็จ');

            setOtFormData({
                max_people: '',
                date: '',
                hours: '',
                description: '',
                ot_rate: '',
                start_time: '',
                end_time: ''
            });

        } catch (err) {
            console.error(err);
            alert('บันทึก OT ล้มเหลว');
        }
    };

    const updateStatus = async (status) => {
        try {
            const res = await fetch(
                `http://localhost:1704/leaverequest/${selectedLeaveId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                }
            );

            const data = await res.json();

            alert(data.message);

            setLeaveRequests(prev =>
                prev.map(l =>
                    l._id === selectedLeaveId ? { ...l, status } : l
                )
            );

            setSelectedLeaveId(null);

        } catch (err) {
            console.error(err);
            alert('บันทึกล้มเหลว');
        }
    };

    useEffect(() => {
        fetch('http://localhost:1704/leaverequest')
            .then(res => res.json())
            .then(data => {
                const today = new Date();

                const sorted = data.sort((a, b) => {
                    const diffA = Math.abs(new Date(a.start_date) - today);
                    const diffB = Math.abs(new Date(b.start_date) - today);
                    return diffA - diffB;
                });

                setLeaveRequests(sorted);
            })
            .catch(err => console.error(err));
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

    useEffect(() => {
        fetch('http://localhost:1704/employees')
            .then(res => res.json())
            .then(data => setAllEmployees(data))
            .catch(err => console.error(err));
    }, []);

    if (!employee || !formData) return <p>Loading...</p>;

    const handleSelectEmployee = async (userId) => {
        setSelectedUserId(userId);

        const emp = allEmployees.find(e => e.userId === userId);
        if (emp) {
            setFormData({
                name: emp.name,
                lastname: emp.lastname,
                tel: emp.tel,
                age: emp.age,
                address: emp.address
            });
        }

        try {
            const res = await fetch(`http://localhost:1704/salary/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setSalaryData({
                    base_salary: data.base_salary,
                    social_tax: data.social_tax
                });
            } else {
                setSalaryData({ base_salary: '', social_tax: '' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleOtChange = (e) => {
        const { name, value } = e.target;
        setOtFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSalaryChange = (e) => {
        const { name, value } = e.target;
        setSalaryData(prev => ({ ...prev, [name]: value }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSave = async () => {
        try {
            await fetch(`http://localhost:1704/employee/${selectedUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            await fetch(`http://localhost:1704/salary/${selectedUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(salaryData)
            });

            alert('บันทึกสำเร็จ');

        } catch (err) {
            console.error(err);
            alert('บันทึกล้มเหลว');
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

            <div className={style.hredit}>
                <FontAwesomeIcon icon={faUser} className={style.profileIcon} />
                <h3>ข้อมูลพนักงาน</h3>
                <select
                    value={selectedUserId || ''}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                >
                    <option value="">-- เลือกพนักงาน --</option>
                    {allEmployees.map(emp => (
                        <option key={emp.userId} value={emp.userId}>
                            {emp.name} {emp.lastname} ({emp.userId})
                        </option>
                    ))}
                </select>

                {selectedUserId && (
                    <div className={style.editForm}>
                        <label>ชื่อ:</label>
                        <input name="name" value={formData.name} onChange={handleChange} />

                        <label>นามสกุล:</label>
                        <input name="lastname" value={formData.lastname} onChange={handleChange} />

                        <label>เบอร์โทร:</label>
                        <input name="tel" value={formData.tel} onChange={handleChange} />

                        <label>อายุ:</label>
                        <input name="age" value={formData.age} onChange={handleChange} />

                        <label>ที่อยู่:</label>
                        <input name="address" value={formData.address} onChange={handleChange} />

                        <label>เงินเดือน:</label>
                        <input
                            name="base_salary"
                            value={salaryData.base_salary || ''}
                            placeholder="กรอกเป็นเลข"
                            onChange={handleSalaryChange}
                        />

                        <label>ภาษีประกันสังคม:</label>
                        <input
                            name="social_tax"
                            value={salaryData.social_tax || ''}
                            placeholder="กรอกเป็นเลข(ค่าเริ่มต้น 750)"
                            onChange={handleSalaryChange}
                        />

                        <button onClick={handleSave}>บันทึก</button>
                    </div>
                )}
            </div>

            <div className={style.leaverequest}>
                <div className={style.leaveheader}>
                    <FontAwesomeIcon icon={faBell} className={style.userIcon2} />
                    <h3>คำขอลา</h3>
                </div>

                <div className={style.leaveFilter}>
                    <div>
                        <label>
                            <input
                                type="radio"
                                name="status"
                                value=""
                                checked={statusFilter === ''}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            />
                            ทุกสถานะ
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="status"
                                value="pending"
                                checked={statusFilter === 'pending'}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            />
                            Pending
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="status"
                                value="approved"
                                checked={statusFilter === 'approved'}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            />
                            Approved
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="status"
                                value="rejected"
                                checked={statusFilter === 'rejected'}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            />
                            Rejected
                        </label>
                    </div>
                </div>

                <select
                    value={selectedLeaveId || ''}
                    onChange={(e) => setSelectedLeaveId(e.target.value)}
                >
                    <option value="">-- เลือกคำขอลา --</option>
                    {leaveRequests
                        .filter(leave => !statusFilter || leave.status === statusFilter)
                        .map(leave => (
                            <option
                                key={leave._id}
                                value={leave._id}
                                style={{
                                    color:
                                        leave.status === 'approved' ? 'green' :
                                            leave.status === 'rejected' ? 'red' : 'orange'
                                }}
                            >
                                {leave.userId} | {leave.leave_type} | {new Date(leave.start_date).toLocaleDateString()} ({leave.status})
                            </option>
                        ))}
                </select>

                {selectedLeaveId && (
                    <div className={style.leaveDetail}>
                        {(() => {
                            const leave = leaveRequests.find(l => l._id === selectedLeaveId);
                            if (!leave) return null;

                            return (
                                <>
                                    <p><strong>รหัสพนักงาน:</strong> {leave.userId}</p>
                                    <p><strong>ประเภท:</strong> {leave.leave_type}</p>
                                    <p>
                                        <strong>วันที่:</strong>{' '}
                                        {new Date(leave.start_date).toLocaleDateString()} -{' '}
                                        {new Date(leave.end_date).toLocaleDateString()}
                                    </p>
                                    <p><strong>จำนวนวัน:</strong> {leave.day_requested}</p>
                                    <p>
                                        <strong>สถานะ:</strong>{' '}
                                        <span style={{
                                            color:
                                                leave.status === 'approved' ? 'green' :
                                                    leave.status === 'rejected' ? 'red' : 'orange'
                                        }}>
                                            {leave.status}
                                        </span>
                                    </p>
                                    <div className={style.btnContainer}>
                                        <button
                                            disabled={leave.status !== 'pending'}
                                            onClick={() => updateStatus('approved')}
                                            className={style.approveBtn}
                                        >
                                            อนุมัติ
                                        </button>

                                        <button
                                            disabled={leave.status !== 'pending'}
                                            onClick={() => updateStatus('rejected')}
                                            className={style.rejectBtn}
                                        >
                                            ปฏิเสธ
                                        </button>
                                    </div >
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            <div className={style.otCreate}>
                <div className={style.otheader}>
                    <FontAwesomeIcon icon={faBriefcase} className={style.userIcon3} />
                    <h3>สร้าง OT</h3>
                </div>
                <div className={style.otForm}>
                    <label>วันที่ OT:</label>
                    <input
                        type="date"
                        name="date"
                        value={otFormData.date}
                        onChange={handleOtChange}
                    />

                    {otFormData.date && (
                        <div>
                            <label>จำนวนชั่วโมง</label>
                            <input type="number" name="hours" value={otFormData.hours} onChange={handleOtChange} placeholder='ใส่ตัวเลข' />

                            <label>จำนวนคนสูงสุด</label>
                            <input type="number" name="max_people" value={otFormData.max_people} onChange={handleOtChange} placeholder='ใส่ตัวเลข' />

                            <label>อัตรา OT ต่อชั่วโมง</label>
                            <input type="number" name="ot_rate" value={otFormData.ot_rate} onChange={handleOtChange} placeholder='ใส่ตัวเลขเท่าเช่น 1 หรือ 1.5 เท่า' />

                            <label>เวลาเริ่ม</label>
                            <input type="datetime-local" name="start_time" value={otFormData.start_time} onChange={handleOtChange} />

                            <label>รายละเอียดงาน</label>
                            <input type="text" name="description" value={otFormData.description} onChange={handleOtChange} placeholder='ใส่ข้อมูลงาน' />

                            <button onClick={handleOtSave}>บันทึก</button>
                        </div>
                    )}
                </div>
            </div>

            <div className={style.otcheck}>
                <FontAwesomeIcon icon={faUser} className={style.profileIcon} />
                <h3>ตรวจสอบ OT</h3>
                <select
                    value={selectedOtId || ''}
                    onChange={e => setSelectedOtId(e.target.value)}
                >
                    <option value="">-- เลือก OT --</option>
                    {allOTs.map(ot => (
                        <option key={ot._id} value={ot._id}>
                            {new Date(ot.date).toLocaleDateString()} | {ot.description}
                        </option>
                    ))}
                </select>

                {selectedOtId && (
                    <div className={style.participantList}>
                        <h4>ผู้เข้าร่วม OT</h4>
                        {otParticipants.length > 0 ? (
                            <ul>
                                {otParticipants.map(p => (
                                    <li key={p.userId}>
                                        {p.userId} | {p.name} {p.lastname}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>ยังไม่มีผู้เข้าร่วม</p>
                        )}
                    </div>
                )}
            </div>

        </div>
    )
}

export default HRdb;