// Register.jsx
// Página de registo com verificação de email.
// Aceita estado da navegação (ex: vindo do Login) para preencher email e ir diretamente para a verificação.

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <-- adicionado useLocation
import { api } from '../api/client';
import { registerUser } from '../services/auth';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state || {};

    const [formData, setFormData] = useState({
        primeiro_nome: '',
        ultimo_nome: '',
        email: locationState.email || '',   // preenchido se vier do login
        password: '',
        confirm_password: '',
        morada: '',
        codigo_postal: '',
        telefone: '',
        distrito: '',
        concelho: ''
    });
    const [districts, setDistricts] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [step, setStep] = useState(locationState.step || 'register');
    const [verificationCode, setVerificationCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [registeredEmail, setRegisteredEmail] = useState(locationState.email || '');

    // Se recebermos estado a indicar que devemos ir diretamente para verificação,
    // atualizamos o passo e o email (caso ainda não esteja definido).
    useEffect(() => {
        if (locationState.step === 'verify' && locationState.email) {
            setRegisteredEmail(locationState.email);
            setStep('verify');
            // Se o email não estiver já no formData, preenchemo-lo
            if (!formData.email) {
                setFormData(prev => ({ ...prev, email: locationState.email }));
            }
        }
    }, [locationState]);

    // Carregar distritos
    useEffect(() => {
        const loadDistricts = async () => {
            try {
                const res = await api.get('/locations/districts');
                setDistricts(res.data);
            } catch (err) {
                console.error('Erro ao carregar distritos', err);
            }
        };
        loadDistricts();
    }, []);

    // Carregar concelhos quando o distrito muda
    useEffect(() => {
        if (!formData.distrito) {
            setMunicipalities([]);
            return;
        }
        const districtObj = districts.find(d => d.nome === formData.distrito);
        if (!districtObj) return;
        const loadMunicipalities = async () => {
            try {
                const res = await api.get(`/locations/municipalities/${districtObj.id}`);
                setMunicipalities(res.data);
                if (!formData.concelho) {
                    setFormData(prev => ({ ...prev, concelho: '' }));
                }
            } catch (err) {
                console.error('Erro ao carregar concelhos', err);
            }
        };
        loadMunicipalities();
    }, [formData.distrito, districts]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCodigoPostalChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4, 7);
        }
        setFormData({ ...formData, codigo_postal: value });
    };

    const handleTelefoneChange = (e) => {
        const numericValue = e.target.value.replace(/\D/g, '');
        if (numericValue.length <= 9) {
            setFormData({ ...formData, telefone: numericValue });
        }
    };

    // ------------------------------------------------------------
    // SUBMISSÃO DO REGISTO
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.password !== formData.confirm_password) {
            setError('As palavras-passe não coincidem.');
            return;
        }
        const cpRegex = /^\d{4}-\d{3}$/;
        if (!cpRegex.test(formData.codigo_postal)) {
            setError('Código postal inválido (formato XXXX-XXX).');
            return;
        }
        const telefoneRegex = /^[9][0-9]{8}$/;
        if (!telefoneRegex.test(formData.telefone)) {
            setError('Número de telefone inválido (9 dígitos, começa por 9).');
            return;
        }
        if (!formData.distrito) {
            setError('Selecciona um distrito.');
            return;
        }
        if (!formData.concelho) {
            setError('Selecciona um concelho.');
            return;
        }

        try {
            const result = await registerUser({
                primeiro_nome: formData.primeiro_nome,
                ultimo_nome: formData.ultimo_nome,
                email: formData.email,
                password: formData.password,
                morada: formData.morada,
                codigo_postal: formData.codigo_postal,
                telefone: formData.telefone,
                distrito: formData.distrito,
                concelho: formData.concelho
            });
            setMessage(result.message);
            setRegisteredEmail(formData.email);
            setStep('verify');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro no registo.');
        }
    };

    // Verificação do código
    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const response = await api.post('/users/verify-email', {
                email: registeredEmail,
                codigo: verificationCode
            });
            setMessage(response.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Código inválido.');
        }
    };

    // Reenviar código
    const handleResend = async () => {
        try {
            await api.post('/users/resend-verification', { email: registeredEmail });
            setMessage('Novo código enviado para o teu email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao reenviar código.');
        }
    };

    return (
        <div className="container" style={{ padding: '32px 0', maxWidth: '600px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px' }}>
                <h1>{step === 'register' ? 'Criar conta' : 'Verificar email'}</h1>
                {step === 'register' && (
                    <form onSubmit={handleRegister}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input type="text" name="primeiro_nome" placeholder="Primeiro nome *" value={formData.primeiro_nome} onChange={handleChange} className="input" required />
                                <input type="text" name="ultimo_nome" placeholder="Último nome *" value={formData.ultimo_nome} onChange={handleChange} className="input" required />
                            </div>
                            <input type="email" name="email" placeholder="Email *" value={formData.email} onChange={handleChange} className="input" required />
                            <input type="password" name="password" placeholder="Palavra-passe *" value={formData.password} onChange={handleChange} className="input" required />
                            <input type="password" name="confirm_password" placeholder="Confirmar palavra-passe *" value={formData.confirm_password} onChange={handleChange} className="input" required />
                            <input type="text" name="morada" placeholder="Morada *" value={formData.morada} onChange={handleChange} className="input" required />
                            <input
                                type="text"
                                name="codigo_postal"
                                placeholder="Código postal (XXXX-XXX) *"
                                value={formData.codigo_postal}
                                onChange={handleCodigoPostalChange}
                                className="input"
                                required
                                maxLength={8}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <select name="distrito" value={formData.distrito} onChange={handleChange} className="input" required>
                                    <option value="">Selecionar distrito</option>
                                    {districts.map(d => (
                                        <option key={d.id} value={d.nome}>{d.nome}</option>
                                    ))}
                                </select>
                                <select name="concelho" value={formData.concelho} onChange={handleChange} className="input" required disabled={!formData.distrito}>
                                    <option value="">Selecionar concelho</option>
                                    {municipalities.map(m => (
                                        <option key={m.id} value={m.nome}>{m.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="tel"
                                name="telefone"
                                placeholder="Telemóvel (9 dígitos) *"
                                value={formData.telefone}
                                onChange={handleTelefoneChange}
                                className="input"
                                required
                                maxLength={9}
                            />
                        </div>
                        {error && <p style={{ color: 'salmon', marginTop: '12px' }}>{error}</p>}
                        {message && <p style={{ color: 'lightgreen', marginTop: '12px' }}>{message}</p>}
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>Registar</button>
                    </form>
                )}
                {step === 'verify' && (
                    <div>
                        <p>Enviamos um código de 6 dígitos para <strong>{registeredEmail}</strong>.</p>
                        <form onSubmit={handleVerify}>
                            <input type="text" placeholder="Código de verificação" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="input" required />
                            {error && <p style={{ color: 'salmon', marginTop: '12px' }}>{error}</p>}
                            {message && <p style={{ color: 'lightgreen', marginTop: '12px' }}>{message}</p>}
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }}>Verificar</button>
                        </form>
                        <p style={{ marginTop: '12px' }}>Não recebeste o código? <button type="button" onClick={handleResend} className="btn btn-ghost">Reenviar</button></p>
                    </div>
                )}
            </div>
        </div>
    );
}