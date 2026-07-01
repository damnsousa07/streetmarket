// ================================================================
// REGISTER.JSX – Página de registo com verificação de email
// ================================================================
// Este componente permite ao utilizador criar uma nova conta.
// O registo é feito em duas etapas:
// 1. Preenchimento do formulário de registo (dados pessoais, morada, etc.)
// 2. Verificação do email com código de 6 dígitos enviado por email.
// Após verificação bem-sucedida, o utilizador é redirecionado para o login.
// ================================================================

// Importação dos módulos necessários
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { registerUser } from '../services/auth';

// ================================================================
// COMPONENTE: Register
// ================================================================

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state || {};

    // ----- ESTADOS DO FORMULÁRIO -----
    const [formData, setFormData] = useState({
        primeiro_nome: '',
        ultimo_nome: '',
        email: locationState.email || '',
        password: '',
        confirm_password: '',
        morada: '',
        codigo_postal: '',
        telefone: '',
        distrito: '',
        concelho: ''
    });

    // ----- ESTADOS DE LOCALIZAÇÃO (distritos e concelhos) -----
    const [districts, setDistricts] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);

    // ----- ESTADOS DE FLUXO -----
    const [step, setStep] = useState(locationState.step || 'register'); // 'register' ou 'verify'
    const [verificationCode, setVerificationCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [registeredEmail, setRegisteredEmail] = useState(locationState.email || '');

    // ================================================================
    // EFFECT: Recuperar estado do Login (se vier para verificação)
    // ================================================================

    useEffect(() => {
        if (locationState.step === 'verify' && locationState.email) {
            setRegisteredEmail(locationState.email);
            setStep('verify');
            if (!formData.email) {
                setFormData(prev => ({ ...prev, email: locationState.email }));
            }
        }
    }, [locationState]);

    // ================================================================
    // EFFECT: Carregar distritos da API
    // ================================================================

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

    // ================================================================
    // EFFECT: Carregar concelhos quando o distrito mudar
    // ================================================================

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

    // ================================================================
    // HANDLERS: Mudanças nos campos do formulário
    // ================================================================

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Formatação automática do código postal (XXXX-XXX)
    const handleCodigoPostalChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4, 7);
        }
        setFormData({ ...formData, codigo_postal: value });
    };

    // Validação do telefone (apenas números, máximo 9 dígitos)
    const handleTelefoneChange = (e) => {
        const numericValue = e.target.value.replace(/\D/g, '');
        if (numericValue.length <= 9) {
            setFormData({ ...formData, telefone: numericValue });
        }
    };

    // ================================================================
    // FUNÇÃO: Submeter registo
    // ================================================================

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // ----- VALIDAÇÕES LOCAIS -----
        // Password: mínimo 8 caracteres
        if (formData.password.length < 8) {
            setError('A palavra-passe deve ter pelo menos 8 caracteres.');
            return;
        }
        // Confirmar password
        if (formData.password !== formData.confirm_password) {
            setError('As palavras-passe não coincidem.');
            return;
        }
        // Código postal: formato XXXX-XXX
        const cpRegex = /^\d{4}-\d{3}$/;
        if (!cpRegex.test(formData.codigo_postal)) {
            setError('Código postal inválido (formato XXXX-XXX).');
            return;
        }
        // Telefone: 9 dígitos, começa por 9
        const telefoneRegex = /^[9][0-9]{8}$/;
        if (!telefoneRegex.test(formData.telefone)) {
            setError('Número de telefone inválido (9 dígitos, começa por 9).');
            return;
        }
        // Distrito e concelho são obrigatórios
        if (!formData.distrito) {
            setError('Selecciona um distrito.');
            return;
        }
        if (!formData.concelho) {
            setError('Selecciona um concelho.');
            return;
        }

        try {
            // Chama a API para registar o utilizador
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
            setStep('verify'); // Passa para a etapa de verificação
        } catch (err) {
            setError(err.response?.data?.message || 'Erro no registo.');
        }
    };

    // ================================================================
    // FUNÇÃO: Verificar código de email
    // ================================================================

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
            setTimeout(() => navigate('/login'), 3000); // Redireciona para login após 3s
        } catch (err) {
            setError(err.response?.data?.message || 'Código inválido.');
        }
    };

    // ================================================================
    // FUNÇÃO: Reenviar código de verificação
    // ================================================================

    const handleResend = async () => {
        try {
            await api.post('/users/resend-verification', { email: registeredEmail });
            setMessage('Novo código enviado para o teu email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao reenviar código.');
        }
    };

    // ================================================================
    // RENDERIZAÇÃO
    // ================================================================

    return (
        <div className="container" style={{ padding: '32px 0', maxWidth: '600px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px' }}>
                {/* Título (varia conforme o passo) */}
                <h1>{step === 'register' ? 'Criar conta' : 'Verificar email'}</h1>

                {/* ===== PASSO 1: REGISTO ===== */}
                {step === 'register' && (
                    <form onSubmit={handleRegister}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {/* Nome: Primeiro e Último (2 colunas) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input
                                    type="text"
                                    name="primeiro_nome"
                                    placeholder="Primeiro nome *"
                                    value={formData.primeiro_nome}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                />
                                <input
                                    type="text"
                                    name="ultimo_nome"
                                    placeholder="Último nome *"
                                    value={formData.ultimo_nome}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <input
                                type="email"
                                name="email"
                                placeholder="Email *"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                required
                            />

                            {/* Password (com min 8 caracteres) */}
                            <input
                                type="password"
                                name="password"
                                placeholder="Palavra-passe *"
                                value={formData.password}
                                onChange={handleChange}
                                className="input"
                                required
                                minLength={8}
                            />

                            {/* Confirmar Password */}
                            <input
                                type="password"
                                name="confirm_password"
                                placeholder="Confirmar palavra-passe *"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                className="input"
                                required
                                minLength={8}
                            />

                            {/* Morada */}
                            <input
                                type="text"
                                name="morada"
                                placeholder="Morada *"
                                value={formData.morada}
                                onChange={handleChange}
                                className="input"
                                required
                            />

                            {/* Código Postal (com formatação automática) */}
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

                            {/* Distrito e Concelho (2 colunas) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <select
                                    name="distrito"
                                    value={formData.distrito}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    <option value="">Selecionar distrito</option>
                                    {districts.map(d => (
                                        <option key={d.id} value={d.nome}>{d.nome}</option>
                                    ))}
                                </select>
                                <select
                                    name="concelho"
                                    value={formData.concelho}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                    disabled={!formData.distrito}
                                >
                                    <option value="">Selecionar concelho</option>
                                    {municipalities.map(m => (
                                        <option key={m.id} value={m.nome}>{m.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Telefone (apenas números, 9 dígitos) */}
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

                        {/* Mensagens de erro/sucesso */}
                        {error && <p style={{ color: 'salmon', marginTop: '12px' }}>{error}</p>}
                        {message && <p style={{ color: 'lightgreen', marginTop: '12px' }}>{message}</p>}

                        {/* Botão de registo */}
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>
                            Registar
                        </button>
                    </form>
                )}

                {/* ===== PASSO 2: VERIFICAÇÃO DE EMAIL ===== */}
                {step === 'verify' && (
                    <div>
                        <p>Enviamos um código de 6 dígitos para <strong>{registeredEmail}</strong>.</p>

                        {/* Formulário de verificação */}
                        <form onSubmit={handleVerify}>
                            <input
                                type="text"
                                placeholder="Código de verificação"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="input"
                                required
                            />
                            {error && <p style={{ color: 'salmon', marginTop: '12px' }}>{error}</p>}
                            {message && <p style={{ color: 'lightgreen', marginTop: '12px' }}>{message}</p>}
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                                Verificar
                            </button>
                        </form>

                        {/* Botão para reenviar código */}
                        <p style={{ marginTop: '12px' }}>
                            Não recebeste o código?{' '}
                            <button type="button" onClick={handleResend} className="btn btn-ghost">
                                Reenviar
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}