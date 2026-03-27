import React, { useState } from "react";
import axios from 'axios';
import style from './Login.module.css';
import user from '../Assets/user-icon.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const res = await axios.post('http://localhost:1704/login', { userId: username, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userId', res.data.userId);
            window.location.href = `/Dashboard/${res.data.role}`;
        } catch (err) {
            if (err.response) {
                window.alert(err.response.data.message);
            } else {
                window.alert('Server is down');
            }
        }
    };

    return (
        <div className={style.container}>
            <div className={style.header}>
                <img src={user} alt="" className={style.userIcon} />
                <div className={style.text}>Sign in</div>
                <div className={style.underline}></div>
            </div>

            <div className={style.inputs}>
                <div className={style.input}>
                    <FontAwesomeIcon icon={faUser} className={style.inputFormIcon} />
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Username"
                        className={style.inputForm}
                    />
                </div>
                <div className={style.input}>
                    <FontAwesomeIcon icon={faLock} className={style.inputFormIcon} />
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        className={style.inputForm}
                    />
                </div>
            </div>

            <button className={style.submit} onClick={handleLogin}>Login</button>
        </div>
    );
}

export default Login;