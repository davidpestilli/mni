import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, formatarCPF, formatarCNPJ, validarCPF, validarCNPJ, fileToBase64 } from '../utils/utils';

// Pessoas físicas pré-cadastradas
const PESSOAS_CADASTRADAS = [
    {
        id: 'pessoa1',
        nome: 'Mayara Mendes Cardoso Barbosa',
        cpf: '38569492839',
        dataNascimento: '1990-05-15',
        sexo: 'Feminino'
    },
    {
        id: 'pessoa2',
        nome: 'Sandra Cristina Pamio Lopes',
        cpf: '08380696816',
        dataNascimento: '1985-03-22',
        sexo: 'Feminino'
    },
    {
        id: 'pessoa3',
        nome: 'Marcio do Nascimento',
        cpf: '11776441850',
        dataNascimento: '1978-11-30',
        sexo: 'Masculino'
    }
];

// Empresas pré-cadastradas
const EMPRESAS_CADASTRADAS = [
    {
        id: 'empresa1',
        razaoSocial: 'Sociedade das Almas S/A',
        cnpj: '48725536000109'
    },
    {
        id: 'empresa2',
        razaoSocial: 'Hueco Mundo S/A',
        cnpj: '16526808000147'
    },
    {
        id: 'empresa3',
        razaoSocial: 'Full Bringer S/A',
        cnpj: '18933216000175'
    }
];

function PeticionamentoInicial() {
    const navigate = useNavigate();

    // Estado do formulário
    const [formData, setFormData] = useState({
        signatario: '',
        localidade: '',
        competencia: '',
        classe: '',
        processoOriginario: '40038851320258260960', // Processo originário para Ação Rescisória e Agravo
        seqEventoAgravado: '29', // Número do evento da decisão agravada (Agravo de Instrumento)
        assuntoPrincipal: '',
        assuntosSecundarios: [],
        valorCausa: '',
        nivelSigilo: '0',
        // CDA (Execução Fiscal)
        numeroCDA: '',
        codigoTributoFiscal: '',
        valorCDA: '',
        dataApuracaoCDA: ''
    });

    // Dados das cascatas
    const [localidades, setLocalidades] = useState([]);
    const [competencias, setCompetencias] = useState([]);
    const [classes, setClasses] = useState([]);
    const [assuntosPrincipais, setAssuntosPrincipais] = useState([]);
    const [assuntosSecundarios, setAssuntosSecundarios] = useState([]);

    // Partes
    const [poloAtivo, setPoloAtivo] = useState([{
        tipoPessoa: 'fisica',
        nomeCompleto: '',
        cpf: '',
        dataNascimento: '',
        sexo: 'Masculino',
        razaoSocial: '',
        cnpj: ''
    }]);

    const [poloPassivo, setPoloPassivo] = useState([{
        tipoPessoa: 'fisica',
        nomeCompleto: '',
        cpf: '',
        dataNascimento: '',
        sexo: 'Masculino',
        razaoSocial: '',
        cnpj: ''
    }]);

    // Documentos
    const [peticaoInicial, setPeticaoInicial] = useState(null);
    const [documentosAdicionais, setDocumentosAdicionais] = useState([]);

    // Assuntos secundários selecionados
    const [assuntosSecundariosSelecionados, setAssuntosSecundariosSelecionados] = useState([]);

    // Estado da UI
    const [loading, setLoading] = useState(false);
    const [loadingCascata, setLoadingCascata] = useState({});
    const [sucesso, setSucesso] = useState(null);
    const [error, setError] = useState(null);
    const [mostrarCDA, setMostrarCDA] = useState(false);

    // Resultado do peticionamento
    const [resultado, setResultado] = useState(null);
    const [soapDebug, setSoapDebug] = useState({ request: '', response: '' });
    const [soapExpanded, setSoapExpanded] = useState(false);

    // Carregar localidades ao montar
    useEffect(() => {
        carregarLocalidades();
    }, []);

    // Carregar competências e classes quando localidade muda
    useEffect(() => {
        if (formData.localidade) {
            carregarCompetencias(formData.localidade);
            carregarClasses(formData.localidade, formData.competencia);
        }
    }, [formData.localidade]);

    // Recarregar classes quando competência muda
    useEffect(() => {
        if (formData.localidade) {
            carregarClasses(formData.localidade, formData.competencia);
        }
    }, [formData.competencia]);

    // Carregar assuntos quando classe muda
    useEffect(() => {
        if (formData.classe && formData.localidade) {
            carregarAssuntos(formData.localidade, formData.classe, formData.competencia);

            // Mostrar campos CDA se for Execução Fiscal (classe 1116)
            setMostrarCDA(formData.classe === '1116');
        }
    }, [formData.classe]);

    const carregarLocalidades = async () => {
        try {
            setLoadingCascata(prev => ({ ...prev, localidades: true }));
            const response = await apiRequest('/api/mni3/localidades?estado=SP');
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                const ordenadas = data.data.sort((a, b) =>
                    (a.descricao || '').localeCompare(b.descricao || '')
                );
                setLocalidades(ordenadas);
            }
        } catch (error) {
            console.error('Erro ao carregar localidades:', error);
            setError('Erro ao carregar localidades');
        } finally {
            setLoadingCascata(prev => ({ ...prev, localidades: false }));
        }
    };

    const carregarCompetencias = async (codigoLocalidade) => {
        try {
            setLoadingCascata(prev => ({ ...prev, competencias: true }));
            const response = await apiRequest(`/api/mni3/competencias/${codigoLocalidade}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setCompetencias(data.data);
            } else {
                setCompetencias([]);
            }
        } catch (error) {
            console.error('Erro ao carregar competências:', error);
            setCompetencias([]);
        } finally {
            setLoadingCascata(prev => ({ ...prev, competencias: false }));
        }
    };

    const carregarClasses = async (codigoLocalidade, codigoCompetencia = null) => {
        try {
            setLoadingCascata(prev => ({ ...prev, classes: true }));
            let url = `/api/mni3/classes/${codigoLocalidade}`;
            if (codigoCompetencia) url += `?competencia=${codigoCompetencia}`;

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                const ordenadas = data.data.sort((a, b) =>
                    (a.descricao || '').localeCompare(b.descricao || '')
                );
                setClasses(ordenadas);
            } else {
                setClasses([]);
            }
        } catch (error) {
            console.error('Erro ao carregar classes:', error);
            setClasses([]);
        } finally {
            setLoadingCascata(prev => ({ ...prev, classes: false }));
        }
    };

    const carregarAssuntos = async (codigoLocalidade, codigoClasse, codigoCompetencia = null) => {
        try {
            setLoadingCascata(prev => ({ ...prev, assuntos: true }));
            let url = `/api/mni3/assuntos/${codigoLocalidade}/${codigoClasse}`;
            if (codigoCompetencia) url += `?competencia=${codigoCompetencia}`;

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                const principais = data.data.filter(a => a.principal === true);
                const secundarios = data.data.filter(a => a.principal === false);

                setAssuntosPrincipais(principais);
                setAssuntosSecundarios(secundarios);
            } else {
                setAssuntosPrincipais([]);
                setAssuntosSecundarios([]);
            }
        } catch (error) {
            console.error('Erro ao carregar assuntos:', error);
            setAssuntosPrincipais([]);
            setAssuntosSecundarios([]);
        } finally {
            setLoadingCascata(prev => ({ ...prev, assuntos: false }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleParteChange = (polo, index, field, value) => {
        const setter = polo === 'ativo' ? setPoloAtivo : setPoloPassivo;
        setter(prev => {
            const novo = [...prev];
            novo[index] = { ...novo[index], [field]: value };
            return novo;
        });
    };

    const adicionarParte = (polo) => {
        const setter = polo === 'ativo' ? setPoloAtivo : setPoloPassivo;
        setter(prev => [...prev, {
            tipoPessoa: 'fisica',
            nomeCompleto: '',
            cpf: '',
            dataNascimento: '',
            sexo: 'Masculino',
            razaoSocial: '',
            cnpj: ''
        }]);
    };

    const removerParte = (polo, index) => {
        const setter = polo === 'ativo' ? setPoloAtivo : setPoloPassivo;
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const adicionarAssuntoSecundario = () => {
        setAssuntosSecundariosSelecionados(prev => [...prev, '']);
    };

    const removerAssuntoSecundario = (index) => {
        setAssuntosSecundariosSelecionados(prev => prev.filter((_, i) => i !== index));
    };

    const handleAssuntoSecundarioChange = (index, value) => {
        setAssuntosSecundariosSelecionados(prev => {
            const novo = [...prev];
            novo[index] = value;
            return novo;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError(null);
            setSucesso(null);

            // Validações
            if (!formData.signatario || formData.signatario.replace(/\D/g, '').length !== 11) {
                setError('CPF do signatário inválido');
                return;
            }

            if (!formData.localidade || !formData.classe) {
                setError('Preencha todos os campos obrigatórios da cascata');
                return;
            }

            if (!peticaoInicial) {
                setError('Selecione o arquivo da petição inicial');
                return;
            }

            // Validar CDA se for Execução Fiscal
            if (mostrarCDA) {
                if (!formData.numeroCDA || !formData.codigoTributoFiscal || !formData.valorCDA || !formData.dataApuracaoCDA) {
                    setError('Preencha todos os campos obrigatórios da CDA');
                    return;
                }
            }

            // Converter documentos para Base64
            const peticaoBase64 = await fileToBase64(peticaoInicial);

            // Montar array de documentos no formato esperado pelo backend
            const documentos = [];

            // Adicionar petição inicial como primeiro documento (tipoDocumento = 1)
            documentos.push({
                tipoDocumento: 1,
                conteudo: peticaoBase64,
                nomeDocumento: peticaoInicial.name,
                mimetype: 'application/pdf',
                nivelSigilo: parseInt(formData.nivelSigilo),
                signatario: formData.signatario.replace(/\D/g, '')
            });

            // Adicionar documentos adicionais (tipoDocumento = 2)
            for (const doc of documentosAdicionais) {
                const docBase64 = await fileToBase64(doc);
                documentos.push({
                    tipoDocumento: 2,
                    conteudo: docBase64,
                    nomeDocumento: doc.name,
                    mimetype: 'application/pdf',
                    nivelSigilo: parseInt(formData.nivelSigilo)
                });
            }

            // Montar dados de CDA se for Execução Fiscal
            const dadosCDA = mostrarCDA ? {
                numero: formData.numeroCDA,
                codigoTributo: formData.codigoTributoFiscal,
                valor: parseFloat(formData.valorCDA),
                dataApuracao: formData.dataApuracaoCDA
            } : null;

            // Montar request body no formato esperado pelo backend
            const requestBody = {
                signatario: formData.signatario.replace(/\D/g, ''),
                codigoLocalidade: formData.localidade,
                competencia: formData.competencia || null,
                classeProcessual: formData.classe,
                ...(formData.classe === '47' || formData.classe === '202' ? {
                    processoOriginario: formData.processoOriginario
                } : {}),
                ...(formData.classe === '202' ? {
                    seqEventoAgravado: formData.seqEventoAgravado
                } : {}),
                assunto: formData.assuntoPrincipal || null,
                assuntosSecundarios: assuntosSecundariosSelecionados.length > 0 ? assuntosSecundariosSelecionados : null,
                valorCausa: formData.valorCausa ? parseFloat(formData.valorCausa) : null,
                nivelSigilo: parseInt(formData.nivelSigilo),
                poloAtivo: poloAtivo.map(p => ({
                    tipoPessoa: p.tipoPessoa,
                    ...(p.tipoPessoa === 'fisica' ? {
                        nome: p.nomeCompleto,
                        cpf: p.cpf.replace(/\D/g, ''),
                        dataNascimento: p.dataNascimento,
                        sexo: p.sexo
                    } : {
                        nome: p.razaoSocial,
                        razaoSocial: p.razaoSocial,
                        cnpj: p.cnpj.replace(/\D/g, '')
                    })
                })),
                poloPassivo: poloPassivo.map(p => ({
                    tipoPessoa: p.tipoPessoa,
                    ...(p.tipoPessoa === 'fisica' ? {
                        nome: p.nomeCompleto,
                        cpf: p.cpf.replace(/\D/g, ''),
                        dataNascimento: p.dataNascimento,
                        sexo: p.sexo
                    } : {
                        nome: p.razaoSocial,
                        razaoSocial: p.razaoSocial,
                        cnpj: p.cnpj.replace(/\D/g, '')
                    })
                })),
                documentos,
                dadosCDA
            };

            const response = await apiRequest('/api/peticionamento/inicial', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success) {
                // Armazenar resultado completo
                setResultado(data.data);
                setSucesso('✅ Petição inicial enviada com sucesso!');
                setError(null);

                // Buscar XMLs SOAP para debug
                await carregarSoapDebug();

                // Scroll para o resultado
                setTimeout(() => {
                    document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                setError(data.message || 'Erro ao enviar petição');
                setResultado(null);
            }

        } catch (error) {
            console.error('Erro ao enviar petição:', error);
            setError('Erro ao conectar com o servidor');
            setResultado(null);
        } finally {
            setLoading(false);
        }
    };

    // Função para carregar XMLs SOAP de debug
    const carregarSoapDebug = async () => {
        try {
            console.log('[SOAP DEBUG] Carregando XMLs...');
            const response = await apiRequest('/api/peticionamento/debug/last-soap');
            const data = await response.json();

            console.log('[SOAP DEBUG] Resposta recebida:', data);
            console.log('[SOAP DEBUG] Request existe?', !!data.data?.request);
            console.log('[SOAP DEBUG] Response existe?', !!data.data?.response);
            console.log('[SOAP DEBUG] Request length:', data.data?.request?.length || 0);
            console.log('[SOAP DEBUG] Response length:', data.data?.response?.length || 0);

            if (data.success && data.data) {
                const requestFormatted = formatarXML(data.data.request || 'Nenhuma requisição SOAP ainda');
                const responseFormatted = formatarXML(data.data.response || 'Nenhuma resposta SOAP ainda');

                console.log('[SOAP DEBUG] Request formatado:', requestFormatted?.substring(0, 100));
                console.log('[SOAP DEBUG] Response formatado:', responseFormatted?.substring(0, 100));

                setSoapDebug({
                    request: requestFormatted,
                    response: responseFormatted
                });

                console.log('[SOAP DEBUG] Estado soapDebug atualizado!');
                console.log('[SOAP DEBUG] request está definido?', !!requestFormatted);
                console.log('[SOAP DEBUG] response está definido?', !!responseFormatted);
            }
        } catch (error) {
            console.error('Erro ao carregar SOAP debug:', error);
        }
    };

    // Função para formatar XML (indentação)
    const formatarXML = (xml) => {
        if (!xml || xml === 'Nenhuma requisição SOAP ainda' || xml === 'Nenhuma resposta SOAP ainda') {
            return xml;
        }

        try {
            const reg = /(>)(<)(\/*)/g;
            let formatted = xml.replace(reg, '$1\n$2$3');
            let pad = 0;
            const lines = formatted.split('\n');
            formatted = lines.map(line => {
                let indent = 0;
                if (line.match(/.+<\/\w[^>]*>$/)) {
                    indent = 0;
                } else if (line.match(/^<\/\w/)) {
                    if (pad !== 0) {
                        pad -= 1;
                    }
                } else if (line.match(/^<\w([^>]*[^\/])?>.*$/)) {
                    indent = 1;
                } else {
                    indent = 0;
                }
                const padding = '  '.repeat(pad);
                pad += indent;
                return padding + line;
            }).join('\n');
            return formatted;
        } catch (e) {
            console.error('Erro ao formatar XML:', e);
            return xml;
        }
    };

    // Função para copiar XML
    const copiarXML = async (tipo) => {
        try {
            const xml = tipo === 'request' ? soapDebug.request : soapDebug.response;
            await navigator.clipboard.writeText(xml);
            alert(`✅ XML ${tipo === 'request' ? 'de requisição' : 'de resposta'} copiado!`);
        } catch (error) {
            console.error('Erro ao copiar XML:', error);
            alert('Erro ao copiar XML');
        }
    };

    // Função para baixar XML
    const baixarXML = (tipo) => {
        const xml = tipo === 'request' ? soapDebug.request : soapDebug.response;
        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soap-${tipo}-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Função para preencher dados de pessoa pré-cadastrada
    const selecionarPessoa = (polo, index, idPessoa) => {
        if (!idPessoa) return; // Opção vazia selecionada

        const pessoa = PESSOAS_CADASTRADAS.find(p => p.id === idPessoa);
        if (pessoa) {
            const arrayPolo = polo === 'ativo' ? [...poloAtivo] : [...poloPassivo];
            arrayPolo[index] = {
                ...arrayPolo[index],
                nomeCompleto: pessoa.nome,
                cpf: formatarCPF(pessoa.cpf),
                dataNascimento: pessoa.dataNascimento,
                sexo: pessoa.sexo
            };
            polo === 'ativo' ? setPoloAtivo(arrayPolo) : setPoloPassivo(arrayPolo);
        }
    };

    // Função para preencher dados de empresa pré-cadastrada
    const selecionarEmpresa = (polo, index, idEmpresa) => {
        if (!idEmpresa) return; // Opção vazia selecionada

        const empresa = EMPRESAS_CADASTRADAS.find(e => e.id === idEmpresa);
        if (empresa) {
            const arrayPolo = polo === 'ativo' ? [...poloAtivo] : [...poloPassivo];
            arrayPolo[index] = {
                ...arrayPolo[index],
                razaoSocial: empresa.razaoSocial,
                cnpj: formatarCNPJ(empresa.cnpj)
            };
            polo === 'ativo' ? setPoloAtivo(arrayPolo) : setPoloPassivo(arrayPolo);
        }
    };

    const ParteFormulario = ({ parte, index, polo }) => (
        <div className="card mb-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Parte {index + 1}</h4>
                {index > 0 && (
                    <button
                        type="button"
                        onClick={() => removerParte(polo, index)}
                        className="btn btn-danger btn-sm"
                    >
                        🗑️ Remover
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="label">Tipo de Pessoa</label>
                    <select
                        value={parte.tipoPessoa}
                        onChange={(e) => handleParteChange(polo, index, 'tipoPessoa', e.target.value)}
                        className="select"
                    >
                        <option value="fisica">Pessoa Física</option>
                        <option value="juridica">Pessoa Jurídica</option>
                    </select>
                </div>

                {parte.tipoPessoa === 'fisica' ? (
                    <>
                        {/* Select de pessoa pré-cadastrada */}
                        <div>
                            <label className="label">Selecionar Pessoa Pré-cadastrada (Opcional)</label>
                            <select
                                onChange={(e) => selecionarPessoa(polo, index, e.target.value)}
                                className="select bg-blue-50 border-blue-300"
                            >
                                <option value="">-- Preencher Manualmente --</option>
                                {PESSOAS_CADASTRADAS.map(pessoa => (
                                    <option key={pessoa.id} value={pessoa.id}>
                                        {pessoa.nome} - CPF: {formatarCPF(pessoa.cpf)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Selecione para preencher automaticamente os dados
                            </p>
                        </div>

                        <div>
                            <label className="label">Nome Completo</label>
                            <input
                                type="text"
                                value={parte.nomeCompleto}
                                onChange={(e) => handleParteChange(polo, index, 'nomeCompleto', e.target.value)}
                                className="input"
                                placeholder="Ex: João da Silva"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">CPF</label>
                                <input
                                    type="text"
                                    value={parte.cpf}
                                    onChange={(e) => handleParteChange(polo, index, 'cpf', formatarCPF(e.target.value))}
                                    className="input"
                                    placeholder="000.000.000-00"
                                    maxLength="14"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={parte.dataNascimento}
                                    onChange={(e) => handleParteChange(polo, index, 'dataNascimento', e.target.value)}
                                    className="input"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Sexo</label>
                            <select
                                value={parte.sexo}
                                onChange={(e) => handleParteChange(polo, index, 'sexo', e.target.value)}
                                className="select"
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Select de empresa pré-cadastrada */}
                        <div>
                            <label className="label">Selecionar Empresa Pré-cadastrada (Opcional)</label>
                            <select
                                onChange={(e) => selecionarEmpresa(polo, index, e.target.value)}
                                className="select bg-green-50 border-green-300"
                            >
                                <option value="">-- Preencher Manualmente --</option>
                                {EMPRESAS_CADASTRADAS.map(empresa => (
                                    <option key={empresa.id} value={empresa.id}>
                                        {empresa.razaoSocial} - CNPJ: {formatarCNPJ(empresa.cnpj)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Selecione para preencher automaticamente os dados
                            </p>
                        </div>

                        <div>
                            <label className="label">Razão Social</label>
                            <input
                                type="text"
                                value={parte.razaoSocial}
                                onChange={(e) => handleParteChange(polo, index, 'razaoSocial', e.target.value)}
                                className="input"
                                placeholder="Ex: Empresa LTDA"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">CNPJ</label>
                            <input
                                type="text"
                                value={parte.cnpj}
                                onChange={(e) => handleParteChange(polo, index, 'cnpj', formatarCNPJ(e.target.value))}
                                className="input"
                                placeholder="00.000.000/0000-00"
                                maxLength="18"
                                required
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-secondary mb-4"
                    >
                        ← Voltar ao Dashboard
                    </button>

                    <div className="card bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <h1 className="text-3xl font-bold mb-2">📝 Peticionamento Inicial</h1>
                        <p className="opacity-90">Criar novo processo judicial via MNI 3.0</p>
                    </div>

                    <div className="card bg-blue-50 border-l-4 border-blue-600 mt-4">
                        <p className="text-sm">
                            <strong>ℹ️ Importante:</strong> Preencha todos os campos obrigatórios.
                            Este formulário usa seleção em cascata para garantir dados válidos.
                        </p>
                    </div>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Signatário */}
                    <div className="card">
                        <h3 className="text-xl font-semibold mb-4">✍️ Signatário</h3>
                        <div>
                            <label className="label">CPF do Signatário *</label>
                            <input
                                type="text"
                                name="signatario"
                                value={formData.signatario}
                                onChange={(e) => setFormData(prev => ({ ...prev, signatario: formatarCPF(e.target.value) }))}
                                className="input"
                                placeholder="000.000.000-00"
                                maxLength="14"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                CPF de quem assina a petição
                            </p>
                        </div>
                    </div>

                    {/* Dados do Processo - Cascata */}
                    <div className="card">
                        <h3 className="text-xl font-semibold mb-4">⚖️ Dados do Processo (Seleção em Cascata)</h3>

                        <div className="space-y-4">
                            {/* Localidade */}
                            <div>
                                <label className="label">
                                    <span className="badge bg-indigo-600 text-white mr-2">PASSO 1</span>
                                    Comarca/Localidade *
                                </label>
                                <select
                                    name="localidade"
                                    value={formData.localidade}
                                    onChange={handleInputChange}
                                    className="select"
                                    required
                                    disabled={loadingCascata.localidades}
                                >
                                    <option value="">
                                        {loadingCascata.localidades ? '🔄 Carregando...' : '📍 Selecione uma comarca...'}
                                    </option>
                                    {localidades.map(loc => (
                                        <option key={loc.codigo} value={loc.codigo}>
                                            {loc.descricao} - SP
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Competência */}
                            <div>
                                <label className="label">
                                    <span className="badge bg-purple-600 text-white mr-2">PASSO 2</span>
                                    Competência (Opcional)
                                </label>
                                <select
                                    name="competencia"
                                    value={formData.competencia}
                                    onChange={handleInputChange}
                                    className="select"
                                    disabled={!formData.localidade || loadingCascata.competencias}
                                >
                                    <option value="">
                                        {!formData.localidade ? '📍 Selecione localidade primeiro' :
                                         loadingCascata.competencias ? '🔄 Carregando...' :
                                         '⚖️ Selecione uma competência (opcional)'}
                                    </option>
                                    {competencias.map(comp => (
                                        <option key={comp.codigo} value={comp.codigo}>
                                            {comp.codigo} - {comp.descricao}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Classe */}
                            <div>
                                <label className="label">
                                    <span className="badge bg-indigo-600 text-white mr-2">PASSO 3</span>
                                    Classe Processual *
                                </label>
                                <select
                                    name="classe"
                                    value={formData.classe}
                                    onChange={handleInputChange}
                                    className="select"
                                    required
                                    disabled={!formData.localidade || loadingCascata.classes}
                                >
                                    <option value="">
                                        {!formData.localidade ? '📍 Selecione localidade primeiro' :
                                         loadingCascata.classes ? '🔄 Carregando...' :
                                         '📋 Selecione uma classe...'}
                                    </option>
                                    {classes.map(classe => (
                                        <option key={classe.codigo} value={classe.codigo}>
                                            {classe.codigo} - {classe.descricao}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Processo Originário (para Ação Rescisória e Agravo de Instrumento) */}
                            {(formData.classe === '47' || formData.classe === '202') && (
                                <>
                                    <div>
                                        <label className="label">
                                            <span className="badge bg-yellow-600 text-white mr-2">⚠️</span>
                                            Processo Originário Vinculado *
                                        </label>
                                        <input
                                            type="text"
                                            name="processoOriginario"
                                            value={formData.processoOriginario}
                                            onChange={handleInputChange}
                                            className="input"
                                            placeholder="Número do processo originário (20 dígitos)"
                                            maxLength="20"
                                            required
                                        />
                                        <small className="text-gray-600 text-sm mt-1 block">
                                            📌 Obrigatório para {formData.classe === '47' ? 'Ação Rescisória' : 'Agravo de Instrumento'}
                                        </small>
                                    </div>

                                    {/* Número do Evento Agravado (apenas para Agravo de Instrumento) */}
                                    {formData.classe === '202' && (
                                        <div>
                                            <label className="label">
                                                <span className="badge bg-orange-600 text-white mr-2">📋</span>
                                                Número do Evento da Decisão Agravada *
                                            </label>
                                            <input
                                                type="number"
                                                name="seqEventoAgravado"
                                                value={formData.seqEventoAgravado}
                                                onChange={handleInputChange}
                                                className="input"
                                                placeholder="Número do evento (ex: 29)"
                                                min="1"
                                                required
                                            />
                                            <small className="text-gray-600 text-sm mt-1 block">
                                                📌 Número do evento que contém a decisão a ser agravada
                                            </small>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Assunto Principal */}
                            <div>
                                <label className="label">
                                    <span className="badge bg-purple-600 text-white mr-2">PASSO 4</span>
                                    Assunto Principal (Opcional)
                                </label>
                                <select
                                    name="assuntoPrincipal"
                                    value={formData.assuntoPrincipal}
                                    onChange={handleInputChange}
                                    className="select"
                                    disabled={!formData.classe || loadingCascata.assuntos}
                                >
                                    <option value="">
                                        {!formData.classe ? '📍 Selecione classe primeiro' :
                                         loadingCascata.assuntos ? '🔄 Carregando...' :
                                         '⭐ Selecione um assunto principal (opcional)'}
                                    </option>
                                    {assuntosPrincipais.map(assunto => (
                                        <option key={assunto.codigo} value={assunto.codigo}>
                                            {assunto.codigo} - {assunto.descricao}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Assuntos Secundários */}
                            {assuntosSecundarios.length > 0 && (
                                <div>
                                    <label className="label">
                                        <span className="badge bg-purple-700 text-white mr-2">OPCIONAL</span>
                                        Assuntos Secundários
                                    </label>

                                    <div className="space-y-2 mb-2">
                                        {assuntosSecundariosSelecionados.map((assunto, index) => (
                                            <div key={index} className="flex gap-2">
                                                <select
                                                    value={assunto}
                                                    onChange={(e) => handleAssuntoSecundarioChange(index, e.target.value)}
                                                    className="select flex-1"
                                                >
                                                    <option value="">📎 Selecione...</option>
                                                    {assuntosSecundarios.map(a => (
                                                        <option key={a.codigo} value={a.codigo}>
                                                            {a.codigo} - {a.descricao}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removerAssuntoSecundario(index)}
                                                    className="btn btn-danger"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={adicionarAssuntoSecundario}
                                        className="btn btn-secondary"
                                    >
                                        + Adicionar Assunto Secundário
                                    </button>
                                </div>
                            )}

                            {/* Campos CDA (Execução Fiscal) */}
                            {mostrarCDA && (
                                <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-900 mb-3">
                                        ⚖️ Dados da CDA (Certidão de Dívida Ativa)
                                    </h4>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="label">Número da CDA *</label>
                                            <input
                                                type="text"
                                                name="numeroCDA"
                                                value={formData.numeroCDA}
                                                onChange={handleInputChange}
                                                className="input"
                                                placeholder="Ex: 2020/1"
                                                required={mostrarCDA}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="label">Código do Tributo *</label>
                                                <input
                                                    type="text"
                                                    name="codigoTributoFiscal"
                                                    value={formData.codigoTributoFiscal}
                                                    onChange={handleInputChange}
                                                    className="input"
                                                    placeholder="Ex: 10005"
                                                    required={mostrarCDA}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Valor (R$) *</label>
                                                <input
                                                    type="number"
                                                    name="valorCDA"
                                                    value={formData.valorCDA}
                                                    onChange={handleInputChange}
                                                    className="input"
                                                    step="0.01"
                                                    min="0"
                                                    required={mostrarCDA}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label">Data de Apuração *</label>
                                            <input
                                                type="date"
                                                name="dataApuracaoCDA"
                                                value={formData.dataApuracaoCDA}
                                                onChange={handleInputChange}
                                                className="input"
                                                required={mostrarCDA}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Valor da Causa e Sigilo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Valor da Causa (R$)</label>
                                    <input
                                        type="number"
                                        name="valorCausa"
                                        value={formData.valorCausa}
                                        onChange={handleInputChange}
                                        className="input"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="label">Nível de Sigilo</label>
                                    <select
                                        name="nivelSigilo"
                                        value={formData.nivelSigilo}
                                        onChange={handleInputChange}
                                        className="select"
                                    >
                                        <option value="0">🌐 Público (Padrão)</option>
                                        <option value="1">🔒 Segredo de Justiça</option>
                                        <option value="2">🔐 Sigilo</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Polo Ativo */}
                    <div className="card">
                        <h3 className="text-xl font-semibold mb-4">👤 Polo Ativo (Autor/Autores)</h3>

                        {poloAtivo.map((parte, index) => (
                            <ParteFormulario key={index} parte={parte} index={index} polo="ativo" />
                        ))}

                        <button
                            type="button"
                            onClick={() => adicionarParte('ativo')}
                            className="btn btn-secondary"
                        >
                            + Adicionar Autor
                        </button>
                    </div>

                    {/* Polo Passivo */}
                    <div className="card">
                        <h3 className="text-xl font-semibold mb-4">👥 Polo Passivo (Réu/Réus)</h3>

                        {poloPassivo.map((parte, index) => (
                            <ParteFormulario key={index} parte={parte} index={index} polo="passivo" />
                        ))}

                        <button
                            type="button"
                            onClick={() => adicionarParte('passivo')}
                            className="btn btn-secondary"
                        >
                            + Adicionar Réu
                        </button>
                    </div>

                    {/* Documentos */}
                    <div className="card">
                        <h3 className="text-xl font-semibold mb-4">📎 Documentos</h3>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>⚠️ Atenção:</strong> Apenas arquivos PDF. Tamanho máximo: 11MB por arquivo.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Petição Inicial (PDF) *</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setPeticaoInicial(e.target.files[0])}
                                    className="input"
                                    required
                                />
                                {peticaoInicial && (
                                    <p className="text-sm text-green-600 mt-1">
                                        ✓ {peticaoInicial.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="label">Documentos Adicionais</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    onChange={(e) => setDocumentosAdicionais(Array.from(e.target.files))}
                                    className="input"
                                />
                                {documentosAdicionais.length > 0 && (
                                    <div className="text-sm text-green-600 mt-1">
                                        ✓ {documentosAdicionais.length} arquivo(s) selecionado(s)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mensagens */}
                    {error && (
                        <div className="bg-red-100 text-red-800 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {sucesso && (
                        <div className="bg-green-100 text-green-800 p-4 rounded-lg">
                            {sucesso}
                        </div>
                    )}

                    {/* Botões */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary flex-1"
                        >
                            {loading ? (
                                <>
                                    <span className="loading-spinner w-4 h-4 mr-2"></span>
                                    Enviando...
                                </>
                            ) : (
                                <>📨 Enviar Petição Inicial</>
                            )}
                        </button>
                        <button
                            type="reset"
                            className="btn btn-secondary"
                        >
                            🔄 Limpar
                        </button>
                    </div>
                </form>

                {/* Resultado do Peticionamento */}
                {resultado && (
                    <div id="resultado" className="mt-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                        <h3 className="text-xl font-bold text-green-800 mb-4">
                            ✅ Petição Inicial Enviada com Sucesso! (MNI 3.0)
                        </h3>
                        <div className="space-y-2 text-gray-700">
                            <p>
                                <strong>Número do Processo:</strong>{' '}
                                <span className="text-blue-600 font-mono">{resultado.numeroProcesso || 'N/A'}</span>
                            </p>
                            <p>
                                <strong>Protocolo de Recebimento:</strong>{' '}
                                <span className="font-mono">{resultado.protocoloRecebimento || 'N/A'}</span>
                            </p>
                            <p>
                                <strong>Data da Operação:</strong>{' '}
                                <span className="font-mono">{resultado.dataOperacao || 'N/A'}</span>
                            </p>
                            {resultado.recibo && (
                                <p>
                                    <strong>Recibo:</strong>{' '}
                                    <a
                                        href={`data:application/pdf;base64,${resultado.recibo}`}
                                        download="recibo.pdf"
                                        className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                        📥 Baixar Recibo PDF
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Debug SOAP XML */}
                {(() => {
                    const shouldShow = soapDebug.request && soapDebug.request !== 'Nenhuma requisição SOAP ainda';
                    console.log('[RENDER] Deve exibir SOAP?', shouldShow);
                    console.log('[RENDER] soapDebug.request existe?', !!soapDebug.request);
                    console.log('[RENDER] soapDebug.request length:', soapDebug.request?.length || 0);
                    return shouldShow;
                })() && (
                    <div className="mt-8 border-2 border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800">
                                🔍 Debug SOAP - XML Completo
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSoapExpanded(!soapExpanded)}
                                className="btn btn-secondary text-sm"
                            >
                                {soapExpanded ? '▲' : '▼'} {soapExpanded ? 'Recolher' : 'Expandir'}
                            </button>
                        </div>

                        {soapExpanded && (
                            <div className="p-6 bg-white space-y-6">
                                {/* Requisição SOAP */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-md font-bold text-gray-700">
                                            📤 Requisição SOAP Enviada
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => copiarXML('request')}
                                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                            >
                                                📋 Copiar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => baixarXML('request')}
                                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                            >
                                                💾 Baixar
                                            </button>
                                        </div>
                                    </div>
                                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
                                        {soapDebug.request}
                                    </pre>
                                </div>

                                {/* Resposta SOAP */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-md font-bold text-gray-700">
                                            📥 Resposta SOAP Recebida
                                        </h4>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => copiarXML('response')}
                                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                            >
                                                📋 Copiar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => baixarXML('response')}
                                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                            >
                                                💾 Baixar
                                            </button>
                                        </div>
                                    </div>
                                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
                                        {soapDebug.response}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PeticionamentoInicial;
