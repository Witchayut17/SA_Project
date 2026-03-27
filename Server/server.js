const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cron = require('node-cron');

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect('mongodb://localhost:27017/Company')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

const usersSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    password: String,
    role: String
}, { versionKey: false })

const employeeSchema = new mongoose.Schema({
    userId: String,
    name: String,
    lastname: String,
    age: Number,
    dep_id: String,
    tel: Number,
    address: String,
    created_at: Date,
}, { versionKey: false })

const attendanceSchema = new mongoose.Schema({
    userId: String,
    date: String,
    checkin_time: Date,
    checkout_time: Date,
    status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
    created_at: { type: Date, default: Date.now }
}, { versionKey: false });
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const otSchema = new mongoose.Schema({
    max_people: Number,
    date: String,
    hours: Number,
    description: String,
    created_at: { type: Date, default: Date.now },
    ot_rate: Number,
    start_time: Date,
    end_time: Date
}, { versionKey: false });

const otEmployeeSchema = new mongoose.Schema({
    userId: String,
    ot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OT' },
    checked_in: Date,
    checked_out: Date
}, { versionKey: false });

const leaveRightSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    leave_type: { type: String, required: true },
    total_days: { type: Number, required: true },
    used_days: { type: Number, required: true },
    year: { type: Number, required: true }
}, { versionKey: false });

const leaveRequestSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    leave_type: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    day_requested: { type: Number, required: true },
    status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'] },
    created_at: { type: Date, default: Date.now }
}, { versionKey: false });
const defaultLeaveTypes = [
    { leave_type: 'annual', total_days: 15, used_days: 0 },
    { leave_type: 'sick', total_days: 30, used_days: 0 },
    { leave_type: 'casual', total_days: 7, used_days: 0 }
];

const baseSalarySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    base_salary: { type: Number, required: true },
    social_tax: { type: Number, required: true }
}, { versionKey: false });

const finalSalarySchema = new mongoose.Schema({
    basesal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BaseSalary', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    total_ot: { type: Number, required: true },
    total_bonus: { type: Number, required: true },
    calculated_salary: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
}, { versionKey: false })
finalSalarySchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const BaseSalary = mongoose.model('BaseSalary', baseSalarySchema, 'Basesalary');
const FinalSalary = mongoose.model('FinalSalary', finalSalarySchema, 'FinalSalary');
const LeaveRight = mongoose.model('LeaveRight', leaveRightSchema, 'Leaveright');
const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema, 'Leaverequest');
const OT_Employee = mongoose.model('OT_Employee', otEmployeeSchema, 'OT_Employee');
const OT = mongoose.model('OT', otSchema, 'OT');
const Attendance = mongoose.model('Attendance', attendanceSchema, 'Attendance');
const Users = mongoose.model('Users', usersSchema, 'users')
const Employee = mongoose.model('Employee', employeeSchema, 'Employee')

app.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const user = await Users.findOne({ userId });

        if (!user) return res.status(400).json({ message: 'User not found' });
        if (user.password !== password) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user._id, userId: user.userId }, 'secretkey');
        res.json({ message: 'Login successful', token, role: user.role, userId: user.userId });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/employee/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const employee = await Employee.findOne({ userId }).lean();
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const user = await Users.findOne({ userId }, 'role').lean();

        const result = {
            ...employee,
            role: user ? user.role : null
        };

        res.json(result);
    } catch (err) {
        console.error('Get Employee Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/attendance/checkin', async (req, res) => {
    try {
        const { userId } = req.body;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const existing = await Attendance.findOne({ userId, date: todayStr });
        if (existing) {
            return res.status(200).json({
                message: 'คุณเช็คอินไปแล้ว',
                alreadyCheckedIn: true,
                checkin_time: existing.checkin_time
            });
        }

        let status = 'Present';
        if (now.getHours() >= 8) {
            status = 'Late';
        }

        const attendance = new Attendance({
            userId,
            date: todayStr,
            checkin_time: now,
            status: status
        });
        await attendance.save();

        res.status(200).json({
            message: `เช็คอินสำเร็จ (${status})`,
            status,
            checkin_time: now
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

cron.schedule('1 0 * * *', async () => {
    try {
        console.log('--- เริ่มการตรวจสอบการขาดงาน (Absent Check) ---');

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const allEmployees = await Employee.find({}, 'userId');

        for (const emp of allEmployees) {
            const record = await Attendance.findOne({
                userId: emp.userId,
                date: dateStr
            });

            if (!record) {
                await Attendance.create({
                    userId: emp.userId,
                    date: dateStr,
                    status: 'Absent',
                    checkin_time: null,
                    checkout_time: null
                });
                console.log(`สร้างสถานะ Absent ให้ User: ${emp.userId}`);
            }
        }
        console.log('--- จบกระบวนการตรวจสอบ ---');
    } catch (err) {
        console.error('Cron Job Error:', err);
    }
});

app.post('/attendance/checkout', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'UserId is required' });

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const attendance = await Attendance.findOne({ userId, date: todayStr });

        if (!attendance) {
            return res.status(400).json({ message: 'ไม่พบการเช็คอินวันนี้' });
        }

        if (attendance.checkout_time) {
            return res.status(400).json({
                message: 'คุณเช็คเอาท์ไปแล้ว',
                checkout_time: attendance.checkout_time
            });
        }

        attendance.checkout_time = now;

        const checkinHour = attendance.checkin_time.getHours();
        if (checkinHour >= 8) attendance.status = 'Late';

        await attendance.save();

        res.json({ message: 'Checked out successfully', checkout_time: attendance.checkout_time });

    } catch (err) {
        console.error('Check-Out Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/employee/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, lastname, tel, age, address } = req.body;

        if (!userId || userId === 'undefined') {
            return res.status(400).json({ message: 'Valid userId is required' });
        }

        const employee = await Employee.findOneAndUpdate(
            { userId: userId },
            {
                userId: userId,
                name: name,
                lastname: lastname,
                tel: tel,
                age: age,
                address: address,
                $setOnInsert: { created_at: new Date() }
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        res.json({
            message: 'Employee updated successfully',
            data: employee
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/ot-today', async (req, res) => {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const ot = await OT.find({
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { date: todayStr }
            ]
        });

        res.json(ot);
    } catch (err) {
        console.error('Get Today OT Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/ot/apply', async (req, res) => {
    try {
        const { userId, ot_id } = req.body;

        if (!userId || !ot_id) {
            return res.status(400).json({ message: 'Missing data' });
        }

        const existing = await OT_Employee.findOne({ userId, ot_id });
        if (existing) {
            return res.status(400).json({ message: 'You already applied for this OT' });
        }

        const otDoc = await OT.findById(ot_id);
        if (!otDoc) {
            return res.status(404).json({ message: 'OT not found' });
        }

        const currentCount = await OT_Employee.countDocuments({ ot_id });

        if (currentCount >= otDoc.max_people) {
            return res.status(400).json({ message: 'This OT is full' });
        }

        const newApply = new OT_Employee({
            userId,
            ot_id,
            checked_in: null,
            checked_out: null
        });

        await newApply.save();

        res.json({ message: 'OT application successful' });

    } catch (err) {
        console.error('Apply OT Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/my-ot/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const myOt = await OT_Employee.find({ userId })
            .populate('ot_id')
            .lean();

        const formatted = myOt.map(item => ({
            _id: item._id,
            checked_in: item.checked_in ? item.checked_in.toISOString() : null,
            checked_out: item.checked_out ? item.checked_out.toISOString() : null,
            ot: item.ot_id
        }));

        res.json(formatted);

    } catch (err) {
        console.error('Get My OT Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/ot/checkin', async (req, res) => {
    try {
        const { userId, otId } = req.body;
        if (!userId || !otId) return res.status(400).json({ message: 'Missing data' });

        const otEmp = await OT_Employee.findOne({ userId, ot_id: otId });
        if (!otEmp) return res.status(404).json({ message: 'OT not found for user' });

        if (otEmp.checked_in) {
            return res.json({
                message: 'คุณเช็คอินแล้ว',
                checkin_time: otEmp.checked_in.toISOString(),
                _id: otEmp._id
            });
        }

        otEmp.checked_in = new Date();
        await otEmp.save();

        res.json({
            message: 'เช็คอินเรียบร้อย',
            checkin_time: otEmp.checked_in.toISOString(),
            _id: otEmp._id
        });

    } catch (err) {
        console.error('OT Check-in Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/ot/checkout', async (req, res) => {
    try {
        const { userId, otId } = req.body;
        if (!userId || !otId) return res.status(400).json({ message: 'Missing data' });

        const otEmp = await OT_Employee.findOne({ userId, ot_id: otId });
        if (!otEmp) return res.status(404).json({ message: 'OT not found for user' });

        if (otEmp.checked_out) {
            return res.json({
                message: 'คุณเช็คเอาท์แล้ว',
                checkout_time: otEmp.checked_out.toISOString(),
                _id: otEmp._id
            });
        }

        otEmp.checked_out = new Date();
        await otEmp.save();

        res.json({
            message: 'เช็คเอาท์เรียบร้อย',
            checkout_time: otEmp.checked_out.toISOString(),
            _id: otEmp._id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/leaverequest', async (req, res) => {
    try {
        const { userId, leave_type, start_date, end_date, day_requested } = req.body;
        if (!userId || !leave_type || !start_date || !end_date || !day_requested)
            return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบ' });

        const year = new Date(start_date).getFullYear();

        let leaveRight = await LeaveRight.findOne({ userId, leave_type, year });

        if (!leaveRight) {
            const defaultType = defaultLeaveTypes.find(l => l.leave_type === leave_type);
            if (!defaultType) {
                return res.status(400).json({ message: `การลาหมวด ${leave_type} ไม่ซัพพอร์ต` });
            }

            leaveRight = await LeaveRight.create({
                userId,
                leave_type,
                total_days: defaultType.total_days,
                used_days: 0,
                year
            });
        }

        const remaining = leaveRight.total_days - leaveRight.used_days;
        if (remaining < day_requested) {
            return res.status(400).json({ message: `ลาเกินจำนวนสิทธิ์ที่มี. สิทธิ์คงเหลือ: ${remaining}` });
        }

        const leaveReq = await LeaveRequest.create({
            userId,
            leave_type,
            start_date,
            end_date,
            day_requested,
            status: 'pending'
        });

        leaveRight.used_days += day_requested;
        await leaveRight.save();

        res.json({
            message: 'การอนุมัติได้รับการยืนยัน',
            leaveReq,
            remaining_days: leaveRight.total_days - leaveRight.used_days
        });

    } catch (err) {
        console.error('Leave Request Error:', err);
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/salary/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const salary = await BaseSalary.findOne({ userId }).lean();
        if (!salary) return res.status(404).json({ message: 'หาเงินเดือนไม่พบ' });

        res.json(salary);
    } catch (err) {
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.put('/salary/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { base_salary, social_tax } = req.body;

        const updated = await BaseSalary.findOneAndUpdate(
            { userId },
            { base_salary, social_tax },
            { new: true, upsert: true }
        );

        res.json({ message: 'อัพเดทเงินเดือนแล้ว', data: updated });
    } catch (err) {
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/leaverequest', async (req, res) => {
    try {
        const leaves = await LeaveRequest.find().lean();
        res.json(leaves);
    } catch (err) {
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.put('/leaverequest/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await LeaveRequest.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        res.json({ message: 'อัพเดทแล้ว', data: updated });
    } catch (err) {
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.post('/ot', async (req, res) => {
    try {
        const { max_people, date, hours, description, ot_rate, start_time, end_time } = req.body;

        if (!max_people || !date || !hours || !start_time || !end_time) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
        }

        const start = new Date(start_time);
        const end = new Date(end_time);

        if (start >= end) {
            return res.status(400).json({ message: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด' });
        }

        const newOT = new OT({
            max_people,
            date,
            hours,
            description,
            ot_rate,
            start_time: start,
            end_time: end,
            created_at: new Date()
        });

        await newOT.save();

        res.status(201).json({ message: 'สร้าง OT สำเร็จ', ot: newOT });

    } catch (err) {
        console.error('Create OT Error:', err);
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/ot', async (req, res) => {
    try {
        const ots = await OT.find();
        res.json(ots);
    } catch (err) {
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/ot/:otId/participants', async (req, res) => {
    try {
        const { otId } = req.params;

        const participants = await OT_Employee.find({ ot_id: otId }).lean();

        const formatted = await Promise.all(
            participants.map(async p => {
                const emp = await Employee.findOne({ userId: p.userId }).lean();
                return {
                    userId: p.userId,
                    name: emp ? emp.name : 'ไม่พบชื่อ',
                    lastname: emp ? emp.lastname : 'ไม่พบนามสกุล'
                };
            })
        );

        res.json(formatted);
    } catch (err) {
        console.error('Get OT participants error:', err);
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/attendance/:userId', async (req, res) => {
    const { userId } = req.params;
    const { month } = req.query;

    const start = new Date(new Date().getFullYear(), month - 1, 1);
    const end = new Date(new Date().getFullYear(), month, 0);

    const data = await Attendance.find({
        userId,
        checkin_time: { $gte: start, $lte: end }
    });

    res.json(data);
});

app.post('/finalsalary', async (req, res) => {
    try {
        const data = await FinalSalary.create(req.body);
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'error' });
    }
});

app.get('/finalsalary/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { month, year } = req.query;

        const baseSalary = await BaseSalary.findOne({ userId });
        if (!baseSalary) {
            return res.json(null);
        }

        const final = await FinalSalary.findOne({
            basesal_id: baseSalary._id,
            month: parseInt(month),
            year: parseInt(year || new Date().getFullYear())
        });

        res.json(final || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'error' });
    }
});

app.get('/payslip/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let { month, year } = req.query;

        const today = new Date();
        month = month ? parseInt(month) : today.getMonth() + 1;
        year = year ? parseInt(year) : today.getFullYear();

        const baseSalaryDoc = await BaseSalary.findOne({ userId }).lean();
        if (!baseSalaryDoc) return res.status(404).json({ message: 'หาเงินเดือนพื้นฐานไม่พบ' });

        const base_salary = baseSalaryDoc.base_salary;

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        const otEmployees = await OT_Employee.find({ userId })
            .populate({
                path: 'ot_id',
                match: { start_time: { $gte: start, $lte: end } }
            })
            .lean();

        let totalOT = 0;

        otEmployees.forEach(otEmp => {
            console.log('RAW OT EMP:', otEmp);

            if (otEmp.ot_id && otEmp.checked_in && otEmp.checked_out) {
                console.log('OT DEBUG:', {
                    hours: otEmp.ot_id.hours,
                    rate: otEmp.ot_id.ot_rate,
                    base: base_salary
                });

                const otHours = otEmp.ot_id.hours;
                const otRate = otEmp.ot_id.ot_rate;

                totalOT += (base_salary / 20 / 8) * otHours * otRate;
            }
        });

        const finalSalaryDoc = await FinalSalary.findOne({
            basesal_id: baseSalaryDoc._id,
            month,
            year
        }).lean();

        const calculated_salary = finalSalaryDoc ? finalSalaryDoc.calculated_salary : base_salary + totalOT;

        res.json({
            base_salary,
            OT: totalOT,
            calculated_salary,
            month,
            year
        });

    } catch (err) {
        console.error('Get Payslip Error:', err);
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/payslip-full/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let { month, year } = req.query;

        const today = new Date();
        month = month ? parseInt(month) : today.getMonth() + 1;
        year = year ? parseInt(year) : today.getFullYear();

        const baseSalaryDoc = await BaseSalary.findOne({ userId }).lean();
        if (!baseSalaryDoc) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลเงินเดือน' });
        }

        const base_salary = baseSalaryDoc.base_salary;
        const social_tax = baseSalaryDoc.social_tax;

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        const otEmployees = await OT_Employee.find({ userId })
            .populate({
                path: 'ot_id',
                match: { start_time: { $gte: start, $lte: end } }
            })
            .lean();

        let total_ot = 0;

        otEmployees.forEach(otEmp => {
            if (otEmp.ot_id && otEmp.checked_in && otEmp.checked_out) {
                const otHours = otEmp.ot_id.hours;
                const otRate = otEmp.ot_id.ot_rate;

                total_ot += (base_salary / 20 / 8) * otHours * otRate;
            }
        });

        const finalSalaryDoc = await FinalSalary.findOne({
            basesal_id: baseSalaryDoc._id,
            month,
            year
        }).lean();

        const total_bonus = finalSalaryDoc?.total_bonus ?? 0;

        const calculated_salary = finalSalaryDoc
            ? finalSalaryDoc.calculated_salary
            : base_salary + total_ot - social_tax + total_bonus;

        res.json({
            userId,
            base_salary,
            social_tax,
            total_ot,
            total_bonus,
            calculated_salary,
            month,
            year,
            created_at: finalSalaryDoc?.created_at ?? new Date()
        });

    } catch (err) {
        console.error('Get Full Payslip Error:', err);
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.get('/leaverequest/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const leaves = await LeaveRequest.find({ userId })
            .sort({ created_at: -1 })
            .lean();

        res.json(leaves);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});


app.get('/', (req, res) => {
    res.send('Server is running')
});

app.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.find().lean();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: 'เซิฟเวอร์ล้มเหลว' });
    }
});

app.listen(1704, () => console.log('Server is running'))