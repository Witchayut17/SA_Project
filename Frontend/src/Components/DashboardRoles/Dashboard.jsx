import React from 'react';
import { useParams } from 'react-router-dom';
import Employeedb from './Employeedb'
import HRdb from './HRdb'
import Accountantdb from './Accountantdb'


const Dashboard = () => {
    const { role } = useParams();

    const userId = localStorage.getItem('userId');

    return (
        <div>
            {role === 'Employee' && <Employeedb userId={userId} />}
            {role === 'HR' && <HRdb userId={userId} />}
            {role === 'Accountant' && <Accountantdb userId={userId} />}
        </div>
    );
};

export default Dashboard;